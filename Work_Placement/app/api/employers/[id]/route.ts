import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditEvent } from "@/lib/audit";

const employerUpdateSchema = z.object({
  name: z.string().min(1).max(200),
  sector: z.string().min(1).max(120),
  address: z.string().min(1).max(500),
  website: z.string().trim().max(300).optional()
});

function canManageEmployers(role?: string): boolean {
  return role === "ADMIN" || role === "PLACEMENT_OFFICER";
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !canManageEmployers(session.user.role)) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 403 });
  }

  const payload = await req.json().catch(() => null);
  const parsed = employerUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid employer data." }, { status: 400 });
  }

  const { id } = await context.params;
  const existing = await prisma.employer.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Employer not found." }, { status: 404 });
  }

  const nextWebsite = parsed.data.website?.trim() ? parsed.data.website.trim() : null;
  const updated = await prisma.employer.update({
    where: { id },
    data: {
      name: parsed.data.name.trim(),
      sector: parsed.data.sector.trim(),
      address: parsed.data.address.trim(),
      website: nextWebsite
    }
  });

  await writeAuditEvent({
    actorUserId: session.user.id,
    action: "employer.update",
    entityType: "Employer",
    entityId: id,
    summary: `Employer updated: ${updated.name}`,
    beforeJson: {
      name: existing.name,
      sector: existing.sector,
      address: existing.address,
      website: existing.website
    },
    afterJson: {
      name: updated.name,
      sector: updated.sector,
      address: updated.address,
      website: updated.website
    }
  });

  return NextResponse.json({ ok: true, employer: updated });
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !canManageEmployers(session.user.role)) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await prisma.employer.findUnique({
    where: { id },
    include: {
      contacts: { select: { id: true, name: true, email: true } },
      _count: { select: { placements: true, opportunities: true, interactions: true } }
    }
  });

  if (!existing) {
    return NextResponse.json({ error: "Employer not found." }, { status: 404 });
  }

  const beforeJson = {
    id: existing.id,
    name: existing.name,
    sector: existing.sector,
    address: existing.address,
    website: existing.website,
    contacts: existing.contacts,
    counts: existing._count
  };

  try {
    await prisma.$transaction(async (tx) => {
      // Placement has a required supervisorContact relation with onDelete: Restrict.
      // Remove placements for this employer first so contact cascade can complete safely.
      await tx.placement.deleteMany({ where: { employerId: id } });
      await tx.employer.delete({ where: { id } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json(
        { error: "Employer cannot be deleted yet because linked records still exist." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Could not delete employer." }, { status: 500 });
  }

  await writeAuditEvent({
    actorUserId: session.user.id,
    action: "employer.delete",
    entityType: "Employer",
    entityId: id,
    summary: `Employer deleted: ${existing.name}`,
    beforeJson,
    afterJson: { deleted: true }
  });

  return NextResponse.json({ ok: true });
}
