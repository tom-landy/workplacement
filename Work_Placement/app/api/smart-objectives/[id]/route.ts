import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { smartObjectiveSchema } from "@/lib/validation";
import { writeAuditEvent } from "@/lib/audit";

async function resolveStudentObjective(objectiveId: string, userId: string) {
  const student = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!student) return null;
  const objective = await prisma.smartObjective.findFirst({
    where: { id: objectiveId, studentId: student.id }
  });
  return objective;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorised." }, { status: 403 });
  }

  const objective = await resolveStudentObjective(id, session.user.id);
  if (!objective) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (objective.status !== "DRAFT" && objective.status !== "REJECTED") {
    return NextResponse.json({ error: "Only DRAFT or REJECTED objectives can be edited." }, { status: 409 });
  }

  const payload = smartObjectiveSchema.safeParse(await req.json());
  if (!payload.success) return NextResponse.json({ error: "Invalid objective data." }, { status: 400 });

  const before = { ...objective };
  const updated = await prisma.smartObjective.update({
    where: { id },
    data: { ...payload.data, status: "DRAFT", reviewComment: null, reviewedAt: null, reviewedById: null }
  });

  await writeAuditEvent({
    actorUserId: session.user.id,
    action: "smart_objective.update",
    entityType: "SmartObjective",
    entityId: id,
    summary: `SMART objective updated: ${updated.title}`,
    beforeJson: before,
    afterJson: updated
  });

  return NextResponse.json({ objective: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorised." }, { status: 403 });
  }

  const objective = await resolveStudentObjective(id, session.user.id);
  if (!objective) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (objective.status !== "DRAFT" && objective.status !== "REJECTED") {
    return NextResponse.json({ error: "Only DRAFT or REJECTED objectives can be deleted." }, { status: 409 });
  }

  await prisma.smartObjective.delete({ where: { id } });

  await writeAuditEvent({
    actorUserId: session.user.id,
    action: "smart_objective.delete",
    entityType: "SmartObjective",
    entityId: id,
    summary: `SMART objective deleted: ${objective.title}`,
    beforeJson: objective
  });

  return NextResponse.json({ ok: true });
}
