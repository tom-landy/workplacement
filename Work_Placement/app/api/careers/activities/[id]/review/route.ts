import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditEvent } from "@/lib/audit";

const reviewSchema = z.object({
  completionId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
  comment: z.string().max(500).optional().default("")
});

const reviewerRoles = new Set<UserRole>(["ADMIN", "CAREERS_LEAD", "PLACEMENT_OFFICER", "TUTOR"]);

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !reviewerRoles.has(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 403 });
  }

  const { id } = await context.params;
  const activity = await prisma.careersActivity.findUnique({ where: { id } });
  if (!activity) {
    return NextResponse.json({ error: "Activity not found." }, { status: 404 });
  }

  const parsed = reviewSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review payload." }, { status: 400 });
  }

  const existing = await prisma.studentActivityCompletion.findUnique({ where: { id: parsed.data.completionId } });
  if (!existing || existing.activityId !== id) {
    return NextResponse.json({ error: "Completion not found." }, { status: 404 });
  }

  const completion = await prisma.studentActivityCompletion.update({
    where: { id: parsed.data.completionId },
    data: {
      status: parsed.data.decision,
      markedById: session.user.id,
      markedAt: new Date(),
      markerComment: parsed.data.comment
    }
  });

  await writeAuditEvent({
    actorUserId: session.user.id,
    action: `careers.activity.${parsed.data.decision.toLowerCase()}`,
    entityType: "StudentActivityCompletion",
    entityId: completion.id,
    summary: `Careers activity ${parsed.data.decision.toLowerCase()} by staff`,
    beforeJson: existing,
    afterJson: completion
  });

  return NextResponse.json({ completion });
}
