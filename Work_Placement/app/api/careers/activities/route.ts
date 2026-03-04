import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditEvent } from "@/lib/audit";

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(5),
  yearGroup: z.string().min(1),
  dueDate: z.string().min(1),
  gatsbyTags: z.array(z.string().min(1)).min(1)
});

const canCreate = new Set<UserRole>(["ADMIN", "CAREERS_LEAD", "PLACEMENT_OFFICER"]);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const role = session.user.role as UserRole;

  if (role === "STUDENT") {
    const student = await prisma.studentProfile.findUnique({ where: { userId: session.user.id } });
    if (!student) {
      return NextResponse.json({ rows: [] });
    }

    const rows = await prisma.careersActivity.findMany({
      where: { yearGroup: student.yearGroup },
      orderBy: { dueDate: "asc" }
    });
    return NextResponse.json({ rows });
  }

  const rows = await prisma.careersActivity.findMany({ orderBy: { dueDate: "asc" } });
  return NextResponse.json({ rows });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !canCreate.has(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid activity data." }, { status: 400 });
  }

  const activity = await prisma.careersActivity.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      yearGroup: parsed.data.yearGroup,
      dueDate: new Date(parsed.data.dueDate),
      gatsbyTags: parsed.data.gatsbyTags
    }
  });

  await writeAuditEvent({
    actorUserId: session.user.id,
    action: "careers.activity.create",
    entityType: "CareersActivity",
    entityId: activity.id,
    summary: `Careers activity created: ${activity.title}`,
    afterJson: activity
  });

  return NextResponse.json({ activity });
}
