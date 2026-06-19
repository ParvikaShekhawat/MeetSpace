import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest, requireRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = requireRole(await getSessionFromRequest(request), "INTERVIEWER");
    const positionId = request.nextUrl.searchParams.get("positionId");

    const where = positionId
      ? { positionId, position: { interviewerId: user.id } }
      : { position: { interviewerId: user.id } };

    const candidates = await prisma.candidate.findMany({
      where,
      include: { position: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(candidates);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 403 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireRole(await getSessionFromRequest(request), "INTERVIEWER");
    const { name, email, positionId, resumeUrl } = await request.json();

    if (!name || !email || !positionId) {
      return NextResponse.json({ error: "Name, email, and position are required" }, { status: 400 });
    }

    const position = await prisma.position.findFirst({
      where: { id: positionId, interviewerId: user.id },
    });
    if (!position) {
      return NextResponse.json({ error: "Position not found" }, { status: 404 });
    }

    let candidateUser = await prisma.user.findUnique({ where: { email } });
    if (!candidateUser) {
      const bcrypt = await import("bcryptjs");
      candidateUser = await prisma.user.create({
        data: {
          email,
          name,
          password: await bcrypt.hash("candidate123", 10),
          role: "CANDIDATE",
        },
      });
    }

    const candidate = await prisma.candidate.create({
      data: {
        name,
        email,
        resumeUrl: resumeUrl ?? null,
        positionId,
        userId: candidateUser.id,
      },
      include: { position: { select: { title: true } } },
    });

    return NextResponse.json(candidate, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "Candidate already exists for this position" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 403 });
  }
}
