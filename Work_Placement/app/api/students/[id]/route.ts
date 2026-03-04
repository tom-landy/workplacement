import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditEvent } from "@/lib/audit";

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorised." }, { status: 403 });
  }

  const { id } = await context.params;

  const student = await prisma.studentProfile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } }
    }
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found." }, { status: 404 });
  }

  const beforeJson = {
    studentId: student.id,
    userId: student.user.id,
    name: student.user.name,
    email: student.user.email,
    yearGroup: student.yearGroup,
    tutorGroup: student.tutorGroup
  };

  await prisma.$transaction(async (tx) => {
    await tx.user.delete({ where: { id: student.user.id } });

    await tx.auditEvent.create({
      data: {
        actorUserId: session.user.id,
        action: "student.delete",
        entityType: "StudentProfile",
        entityId: student.id,
        summary: `Student deleted: ${student.user.email}`,
        beforeJson,
        afterJson: { deleted: true }
      }
    });
  });

  await writeAuditEvent({
    actorUserId: session.user.id,
    action: "user.delete",
    entityType: "User",
    entityId: student.user.id,
    summary: `Student user deleted: ${student.user.email}`,
    beforeJson,
    afterJson: { deleted: true }
  });

  return NextResponse.json({ ok: true });
}
