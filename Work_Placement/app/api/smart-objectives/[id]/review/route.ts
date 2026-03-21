import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { smartObjectiveReviewSchema } from "@/lib/validation";
import { writeAuditEvent } from "@/lib/audit";

const REVIEWER_ROLES = ["ADMIN", "CAREERS_LEAD", "PLACEMENT_OFFICER", "TUTOR"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !REVIEWER_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 403 });
  }

  const objective = await prisma.smartObjective.findUnique({ where: { id } });
  if (!objective) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (objective.status !== "SUBMITTED") {
    return NextResponse.json({ error: "Only SUBMITTED objectives can be reviewed." }, { status: 409 });
  }

  const payload = smartObjectiveReviewSchema.safeParse(await req.json());
  if (!payload.success) return NextResponse.json({ error: "Invalid review data." }, { status: 400 });

  const newStatus = payload.data.approved ? "APPROVED" : "REJECTED";
  const before = { ...objective };
  const updated = await prisma.smartObjective.update({
    where: { id },
    data: {
      status: newStatus,
      reviewedAt: new Date(),
      reviewedById: session.user.id,
      reviewComment: payload.data.comment ?? null
    }
  });

  await writeAuditEvent({
    actorUserId: session.user.id,
    action: "smart_objective.review",
    entityType: "SmartObjective",
    entityId: id,
    summary: `SMART objective ${newStatus.toLowerCase()}: ${objective.title}`,
    beforeJson: before,
    afterJson: updated
  });

  return NextResponse.json({ objective: updated });
}
