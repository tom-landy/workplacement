import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { UserRole } from "@prisma/client";
import * as XLSX from "xlsx";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditEvent } from "@/lib/audit";

const allowedRoles = new Set<UserRole>(["ADMIN", "PLACEMENT_OFFICER"]);

type Row = Record<string, unknown>;

function normalise(value: unknown): string {
  return String(value ?? "").trim();
}

function pick(row: Row, keys: string[]): string {
  const lowered = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]));
  for (const key of keys) {
    const value = lowered[key.toLowerCase()];
    if (value !== undefined && normalise(value)) {
      return normalise(value);
    }
  }
  return "";
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !allowedRoles.has(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload file is required." }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const wb = XLSX.read(Buffer.from(bytes), { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Row>(ws, { raw: false, defval: "" });

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [index, row] of rows.entries()) {
    const line = index + 2;

    const studentEmail = pick(row, ["studentemail", "student_email", "student email"]);
    const employerName = pick(row, ["employername", "employer_name", "employer name"]);
    const supervisorEmail = pick(row, ["supervisoremail", "supervisor_email", "supervisor email"]);
    const startDateRaw = pick(row, ["startdate", "start_date", "start date"]);
    const endDateRaw = pick(row, ["enddate", "end_date", "end date"]);
    const hoursTargetRaw = pick(row, ["hourstarget", "hours_target", "hours target"]);

    if (!studentEmail || !employerName || !supervisorEmail || !startDateRaw || !endDateRaw || !hoursTargetRaw) {
      skipped += 1;
      errors.push(`Row ${line}: missing required columns.`);
      continue;
    }

    const startDate = new Date(startDateRaw);
    const endDate = new Date(endDateRaw);
    const hoursTarget = Number(hoursTargetRaw);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || !Number.isFinite(hoursTarget)) {
      skipped += 1;
      errors.push(`Row ${line}: invalid date or hours target.`);
      continue;
    }

    const studentUser = await prisma.user.findFirst({
      where: { email: studentEmail.toLowerCase(), role: "STUDENT" },
      include: { studentProfile: true }
    });

    const employer = await prisma.employer.findFirst({
      where: { name: { equals: employerName, mode: "insensitive" } }
    });

    const supervisor = await prisma.employerContact.findFirst({
      where: { email: supervisorEmail.toLowerCase(), employerId: employer?.id }
    });

    if (!studentUser?.studentProfile || !employer || !supervisor) {
      skipped += 1;
      errors.push(`Row ${line}: student, employer, or supervisor not found.`);
      continue;
    }

    const existing = await prisma.placement.findFirst({
      where: {
        studentId: studentUser.studentProfile.id,
        employerId: employer.id,
        startDate,
        endDate
      }
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    const placement = await prisma.$transaction(async (tx) => {
      const createdPlacement = await tx.placement.create({
        data: {
          studentId: studentUser.studentProfile!.id,
          employerId: employer.id,
          supervisorContactId: supervisor.id,
          startDate,
          endDate,
          hoursTarget: Math.round(hoursTarget),
          status: "PENDING",
          employerConfirmationStatus: "PENDING"
        }
      });

      await tx.complianceChecklist.create({
        data: { placementId: createdPlacement.id, itemsJson: [] }
      });

      await tx.placementStatusHistory.create({
        data: {
          placementId: createdPlacement.id,
          fromStatus: null,
          toStatus: "PENDING",
          changedByUserId: session.user.id
        }
      });

      await tx.auditEvent.create({
        data: {
          actorUserId: session.user.id,
          action: "placement.import.create",
          entityType: "Placement",
          entityId: createdPlacement.id,
          summary: `Placement imported for ${studentEmail}`,
          afterJson: createdPlacement
        }
      });

      return createdPlacement;
    });

    created += 1;

    await writeAuditEvent({
      actorUserId: session.user.id,
      action: "placement.create",
      entityType: "Placement",
      entityId: placement.id,
      summary: "Placement created from spreadsheet import"
    });
  }

  await writeAuditEvent({
    actorUserId: session.user.id,
    action: "placement.import.batch",
    entityType: "Placement",
    entityId: "batch",
    summary: `Placement import completed. Created=${created}, Skipped=${skipped}`,
    afterJson: { created, skipped, errorCount: errors.length }
  });

  return NextResponse.json({ created, skipped, errors });
}
