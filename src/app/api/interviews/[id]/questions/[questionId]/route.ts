import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    const { id, questionId } = await params;
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

    const body = await request.json();
    const updated = await prisma.interviewQuestion.update({
      where: { id: questionId },
      data: {
        finalCode: body.finalCode,
        workspaceData: body.workspaceData,
        notes: body.notes,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update question" }, { status: 500 });
  }
}
