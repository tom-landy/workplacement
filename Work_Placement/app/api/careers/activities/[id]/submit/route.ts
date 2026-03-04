import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditEvent } from "@/lib/audit";

const submitSchema = z.object({
  evidenceReference: z.string().min(1)
});

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorised." }, { status: 403 });
  }

  const { id } = await context.params;
  const activity = await prisma.careersActivity.findUnique({ where: { id } });
  if (!activity) {
    return NextResponse.json({ error: "Activity not found." }, { status: 404 });
  }

  const student = await prisma.studentProfile.findUnique({ where: { userId: session.user.id } });
  if (!student) {
    return NextResponse.json({ error: "Student profile missing." }, { status: 404 });
  }

  const parsed = submitSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Evidence reference is required." }, { status: 400 });
  }

  const existing = await prisma.studentActivityCompletion.findUnique({
    where: { studentId_activityId: { studentId: student.id, activityId: id } }
  });

  const completion = await prisma.studentActivityCompletion.upsert({
    where: { studentId_activityId: { studentId: student.id, activityId: id } },
    create: {
      studentId: student.id,
      activityId: id,
      status: "SUBMITTED",
      evidenceObjectKey: parsed.data.evidenceReference,
      submittedAt: new Date()
    },
    update: {
      status: "SUBMITTED",
      evidenceObjectKey: parsed.data.evidenceReference,
      submittedAt: new Date()
    }
  });

  await writeAuditEvent({
    actorUserId: session.user.id,
    action: "careers.activity.submit",
    entityType: "StudentActivityCompletion",
    entityId: completion.id,
    summary: "Careers activity submitted by student",
    beforeJson: existing ?? undefined,
    afterJson: completion
  });

  return NextResponse.json({ completion });
}
