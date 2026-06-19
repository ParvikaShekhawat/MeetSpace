import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest, requireRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = requireRole(await getSessionFromRequest(request), "INTERVIEWER");
    const positions = await prisma.position.findMany({
      where: { interviewerId: user.id },
      include: {
        _count: { select: { candidates: true, interviews: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(positions);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 403 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireRole(await getSessionFromRequest(request), "INTERVIEWER");
    const { title, durationMins, interviewType } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const position = await prisma.position.create({
      data: {
        title,
        durationMins: durationMins ?? 60,
        interviewType: interviewType ?? "Technical Round",
        interviewerId: user.id,
      },
    });

    return NextResponse.json(position, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 403 });
  }
}
