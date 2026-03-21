import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { smartObjectiveReorderSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorised." }, { status: 403 });
  }

  const student = await prisma.studentProfile.findUnique({ where: { userId: session.user.id } });
  if (!student) return NextResponse.json({ error: "Student profile missing." }, { status: 404 });

  const payload = smartObjectiveReorderSchema.safeParse(await req.json());
  if (!payload.success) return NextResponse.json({ error: "Invalid reorder data." }, { status: 400 });

  const owned = await prisma.smartObjective.findMany({
    where: { studentId: student.id },
    select: { id: true }
  });
  const ownedIds = new Set(owned.map((o) => o.id));

  if (!payload.data.ids.every((id) => ownedIds.has(id))) {
    return NextResponse.json({ error: "Invalid objective IDs." }, { status: 403 });
  }

  await prisma.$transaction(
    payload.data.ids.map((id, index) =>
      prisma.smartObjective.update({ where: { id }, data: { sortOrder: index } })
    )
  );

  return NextResponse.json({ ok: true });
}
