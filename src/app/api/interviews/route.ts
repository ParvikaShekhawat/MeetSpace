import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { generateInterviewCode } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get("status");

    // ==========================================
    // 1. INTERVIEWER WORKFLOW (Bifurcated Structure)
    // ==========================================
    if (session.role === "INTERVIEWER") {
      // Instead of pulling flat interviews, we query Positions directly 
      // to build out the hierarchical cascade structure cleanly
      const positionsData = await prisma.position.findMany({
        where: { interviewerId: session.id },
        include: {
          interviews: {
            where: {
              ...(status ? { status: status as "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" } : {}),
            },
            include: {
              candidate: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: { scheduledAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json(positionsData);
    }

    // ==========================================
    // 2. CANDIDATE WORKFLOW (Flat List stays fine)
    // ==========================================
    const candidateProfiles = await prisma.candidate.findMany({
      where: { userId: session.id },
      select: { id: true },
    });
    const candidateIds = candidateProfiles.map((c) => c.id);

    const interviews = await prisma.interview.findMany({
      where: {
        candidateId: { in: candidateIds },
        ...(status ? { status: status as "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" } : {}),
      },
      include: {
        candidate: { select: { name: true } },
        position: { select: { title: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });

    return NextResponse.json(interviews);
  } catch (error) {
    console.error("API Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch interviews" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== "INTERVIEWER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { candidateId, scheduledAt, durationMins, questionIds } = await request.json();

    if (!candidateId || !scheduledAt) {
      return NextResponse.json({ error: "Candidate and date are required" }, { status: 400 });
    }

    // Check if the candidate belongs to an active position owned by this interviewer
    const candidate = await prisma.candidate.findFirst({
      where: { id: candidateId, position: { interviewerId: session.id } },
    });
    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // Secure generation of a completely unique short code string
    let code = generateInterviewCode();
    let exists = await prisma.interview.findUnique({ where: { code } });
    while (exists) {
      code = generateInterviewCode();
      exists = await prisma.interview.findUnique({ where: { code } });
    }

    // Assign custom selected questions, or fall back dynamically if none were checked
    let finalQuestionIds = questionIds || [];
    if (finalQuestionIds.length === 0) {
      const fallbackQuestions = await prisma.question.findMany({
        take: 3,
        orderBy: { createdAt: "asc" },
      });
      finalQuestionIds = fallbackQuestions.map((q) => q.id);
    }

    const interview = await prisma.interview.create({
      data: {
        code,
        candidateId,
        positionId: candidate.positionId,
        scheduledAt: new Date(scheduledAt),
        durationMins: durationMins ? parseInt(durationMins) : 60,
        questions: {
          create: finalQuestionIds.map((qId: string, index: number) => ({
            questionId: qId,
            order: index,
          })),
        },
      },
      include: {
        candidate: { select: { name: true, email: true } },
        position: { select: { title: true } },
        questions: { include: { question: true } },
      },
    });

    const { sendInterviewInvite } = await import("@/lib/email");
    await sendInterviewInvite({
      to: interview.candidate.email,
      candidateName: interview.candidate.name,
      positionTitle: interview.position.title,
      scheduledAt: new Date(scheduledAt),
      durationMins: interview.durationMins,
      interviewCode: interview.code,
      interviewId: interview.id,
    });

    return NextResponse.json(interview, { status: 201 });
  } catch (error) {
    console.error("API Create Error:", error);
    return NextResponse.json({ error: "Failed to schedule interview" }, { status: 500 });
  }
}