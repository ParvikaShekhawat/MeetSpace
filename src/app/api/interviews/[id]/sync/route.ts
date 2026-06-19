import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

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

    const since = request.nextUrl.searchParams.get("since");
    const sinceMs = since ? parseInt(since) : 0;

    const [roomStates, newEvents] = await Promise.all([
      prisma.roomState.findMany({ where: { interviewId: id } }),
      prisma.interviewEvent.findMany({
        where: {
          interviewId: id,
          ...(sinceMs > 0 ? { timestampMs: { gte: sinceMs } } : {}),
        },
        orderBy: { timestampMs: "asc" },
        take: 50,
      }),
    ]);

    const latestEventMs = await prisma.interviewEvent.findFirst({
      where: { interviewId: id },
      orderBy: { timestampMs: "desc" },
      select: { timestampMs: true },
    });

    return NextResponse.json({
      roomStates,
      events: newEvents.map((e) => ({
        ...e,
        payload: JSON.parse(e.payload || "{}"),
      })),
      serverTime: Date.now(),
      latestEventMs: latestEventMs?.timestampMs ?? 0,
    });
  } catch {
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

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

    const { questionId, code, workspaceData, language, version } = await request.json();

    if (!questionId) {
      return NextResponse.json({ error: "questionId required" }, { status: 400 });
    }

    const existing = await prisma.roomState.findUnique({
      where: { interviewId_questionId: { interviewId: id, questionId } },
    });

    if (existing && version && version < existing.version) {
      return NextResponse.json({ conflict: true, state: existing }, { status: 409 });
    }

    const state = await prisma.roomState.upsert({
      where: { interviewId_questionId: { interviewId: id, questionId } },
      create: {
        interviewId: id,
        questionId,
        code: code ?? null,
        workspaceData: workspaceData ? JSON.stringify(workspaceData) : null,
        language: language ?? "javascript",
        updatedBy: session.id,
        version: 1,
      },
      update: {
        code: code !== undefined ? code : undefined,
        workspaceData: workspaceData !== undefined ? JSON.stringify(workspaceData) : undefined,
        language: language ?? undefined,
        updatedBy: session.id,
        version: { increment: 1 },
      },
    });

    if (code !== undefined) {
      await prisma.interviewQuestion.updateMany({
        where: { interviewId: id, questionId },
        data: { finalCode: code },
      });
    }

    return NextResponse.json(state);
  } catch {
    return NextResponse.json({ error: "Sync update failed" }, { status: 500 });
  }
}
