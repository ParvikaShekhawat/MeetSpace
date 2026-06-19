import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { createLiveKitToken, getLiveKitUrl, isLiveKitConfigured } from "@/lib/livekit";
import { prisma } from "@/lib/db";

export async function GET() {
  return NextResponse.json({
    configured: isLiveKitConfigured(),
    url: getLiveKitUrl(),
  });
}

export async function POST(request: NextRequest) {
  try {
    if (!isLiveKitConfigured()) {
      return NextResponse.json({ error: "LiveKit not configured" }, { status: 503 });
    }

    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { interviewId } = await request.json();
    if (!interviewId) {
      return NextResponse.json({ error: "interviewId required" }, { status: 400 });
    }

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: { position: true, candidate: true },
    });

    if (!interview) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isInterviewer = interview.position.interviewerId === session.id;
    const isCandidate = interview.candidate.userId === session.id;
    if (!isInterviewer && !isCandidate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const token = await createLiveKitToken(
      `interview-${interview.code}`,
      session.name,
      session.id
    );

    return NextResponse.json({
      token,
      url: getLiveKitUrl(),
      roomName: `interview-${interview.code}`,
    });
  } catch {
    return NextResponse.json({ error: "Failed to create token" }, { status: 500 });
  }
}
