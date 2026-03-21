import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { smartObjectiveSchema } from "@/lib/validation";
import { writeAuditEvent } from "@/lib/audit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorised." }, { status: 403 });
  }

  const student = await prisma.studentProfile.findUnique({ where: { userId: session.user.id } });
  if (!student) return NextResponse.json({ rows: [] });

  const rows = await prisma.smartObjective.findMany({
    where: { studentId: student.id },
    orderBy: { sortOrder: "asc" }
  });

  return NextResponse.json({ rows });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorised." }, { status: 403 });
  }

  const student = await prisma.studentProfile.findUnique({ where: { userId: session.user.id } });
  if (!student) return NextResponse.json({ error: "Student profile missing." }, { status: 404 });

  const payload = smartObjectiveSchema.safeParse(await req.json());
  if (!payload.success) return NextResponse.json({ error: "Invalid objective data." }, { status: 400 });

  const maxOrder = await prisma.smartObjective.aggregate({
    where: { studentId: student.id },
    _max: { sortOrder: true }
  });

  const objective = await prisma.smartObjective.create({
    data: {
      studentId: student.id,
      ...payload.data,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      status: "DRAFT"
    }
  });

  await writeAuditEvent({
    actorUserId: session.user.id,
    action: "smart_objective.create",
    entityType: "SmartObjective",
    entityId: objective.id,
    summary: `SMART objective created: ${objective.title}`,
    afterJson: objective
  });

  return NextResponse.json({ objective });
}
