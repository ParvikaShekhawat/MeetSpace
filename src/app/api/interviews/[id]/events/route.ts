import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const interview = await prisma.interview.findUnique({
      where: { id },
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

    const { type, timestampMs, payload } = await request.json();

    const event = await prisma.interviewEvent.create({
      data: {
        interviewId: id,
        type,
        timestampMs: timestampMs ?? 0,
        payload: JSON.stringify(payload ?? {}),
      },
    });

    if (type === "CODE_CHANGE" && payload?.questionId && payload?.code) {
      await prisma.interviewQuestion.updateMany({
        where: { interviewId: id, questionId: payload.questionId },
        data: { finalCode: payload.code },
      });
    }

    if (type === "WHITEBOARD_CHANGE" && payload?.questionId && payload?.workspaceData) {
      await prisma.interviewQuestion.updateMany({
        where: { interviewId: id, questionId: payload.questionId },
        data: { workspaceData: payload.workspaceData },
      });
    }

    return NextResponse.json(event, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const events = await prisma.interviewEvent.findMany({
      where: { interviewId: id },
      orderBy: { timestampMs: "asc" },
    });

    return NextResponse.json(events);
  } catch {
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}
