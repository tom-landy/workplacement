import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditEvent } from "@/lib/audit";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorised." }, { status: 403 });
  }

  const student = await prisma.studentProfile.findUnique({ where: { userId: session.user.id } });
  if (!student) return NextResponse.json({ error: "Student profile missing." }, { status: 404 });

  const objective = await prisma.smartObjective.findFirst({ where: { id, studentId: student.id } });
  if (!objective) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (objective.status !== "DRAFT" && objective.status !== "REJECTED") {
    return NextResponse.json({ error: "Only DRAFT or REJECTED objectives can be submitted." }, { status: 409 });
  }

  const updated = await prisma.smartObjective.update({
    where: { id },
    data: { status: "SUBMITTED", submittedAt: new Date() }
  });

  await writeAuditEvent({
    actorUserId: session.user.id,
    action: "smart_objective.submit",
    entityType: "SmartObjective",
    entityId: id,
    summary: `SMART objective submitted for review: ${objective.title}`,
    afterJson: updated
  });

  return NextResponse.json({ objective: updated });
}
