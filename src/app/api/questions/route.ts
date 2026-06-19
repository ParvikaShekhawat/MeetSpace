import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth"; // Make sure this matches your exact auth import

export async function GET(request: NextRequest) {
  try {
    const questions = await prisma.question.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(questions);
  } catch (error) {
    console.error("GET Questions Error:", error);
    return NextResponse.json({ error: "Failed to load questions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "INTERVIEWER") {
      return NextResponse.json({ error: "Forbidden: Interviewers only" }, { status: 403 });
    }

    // Parse payload safely
    const body = await request.json();
    const { title, type, difficulty, statement, constraints, hints } = body;

    // Validation guardrail
    if (!title || !type || !statement) {
      return NextResponse.json({ error: "Missing required fields: title, type, or statement" }, { status: 400 });
    }

    // Save to database
    const newQuestion = await prisma.question.create({
      data: {
        title,
        type: type.toUpperCase(), // Ensure match with layout filters
        difficulty,
        statement,
        constraints: constraints || null,
        hints: hints || null,
      },
    });

    // 🚀 Always return proper JSON response
    return NextResponse.json(newQuestion, { status: 201 });

  } catch (error) {
    console.error("POST Question DB Error:", error);
    // 🚀 Prevents "Unexpected end of JSON input" by forcing a JSON backup message
    return NextResponse.json(
      { error: "Database transaction failed. Check your Prisma server logs." }, 
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "INTERVIEWER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Question ID required" }, { status: 400 });
    }

    await prisma.question.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE Question Error:", error);
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 });
  }
}