import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const interviewerPassword = await bcrypt.hash("interviewer123", 10);
  const candidatePassword = await bcrypt.hash("candidate123", 10);

  const interviewer = await prisma.user.upsert({
    where: { email: "interviewer@meetspace.com" },
    update: {},
    create: {
      email: "interviewer@meetspace.com",
      name: "Alex Morgan",
      password: interviewerPassword,
      role: "INTERVIEWER",
    },
  });

  const candidateUser = await prisma.user.upsert({
    where: { email: "parvika@gmail.com" },
    update: {},
    create: {
      email: "parvika@gmail.com",
      name: "Parvika Shekhawat",
      password: candidatePassword,
      role: "CANDIDATE",
    },
  });

  const questions = [
    {
      id: "seed-q1",
      title: "Two Sum",
      type: "CODING" as const,
      difficulty: "Easy",
      statement:
        "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
      constraints: "2 <= nums.length <= 10^4",
      hints: "Try using a hash map to store complements.",
    },
    {
      id: "seed-q2",
      title: "LRU Cache",
      type: "CODING" as const,
      difficulty: "Medium",
      statement:
        "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.",
      constraints: "1 <= capacity <= 3000",
      hints: "Consider hashmap + doubly linked list.",
    },
    {
      id: "seed-q4",
      title: "Design URL Shortener",
      type: "SYSTEM_DESIGN" as const,
      difficulty: "Medium",
      statement:
        "Design a URL shortening service like bit.ly. Discuss API design, storage, scalability, and collision handling.",
      constraints: "100M URLs/day write, 500M reads/day",
      hints: "Consider base62 encoding and distributed ID generation.",
    },
    {
      id: "seed-q5",
      title: "Top Customers by Orders",
      type: "SQL" as const,
      difficulty: "Easy",
      statement:
        "Write a SQL query to find customers who have placed more than 3 orders, returning customer_id and order count sorted by count descending.",
      constraints: "Use the provided schema",
      hints: "Use GROUP BY with HAVING clause.",
    },
    {
      id: "seed-q6",
      title: "Conflict with Teammate",
      type: "BEHAVIORAL" as const,
      difficulty: "Medium",
      statement:
        "Tell me about a time you had a disagreement with a teammate about a technical decision. How did you handle it?",
      constraints: "Use STAR method (Situation, Task, Action, Result)",
      hints: "Focus on collaboration and outcome, not blame.",
    },
  ];

  for (const q of questions) {
    await prisma.question.upsert({
      where: { id: q.id },
      update: {},
      create: q,
    });
  }

  const position = await prisma.position.upsert({
    where: { id: "seed-position-101" },
    update: {},
    create: {
      id: "seed-position-101",
      title: "Backend Engineer Intern",
      durationMins: 60,
      interviewType: "Technical Round",
      interviewerId: interviewer.id,
    },
  });

  const candidate = await prisma.candidate.upsert({
    where: {
      email_positionId: { email: "parvika@gmail.com", positionId: position.id },
    },
    update: {},
    create: {
      name: "Parvika Shekhawat",
      email: "parvika@gmail.com",
      resumeUrl: "/resumes/parvika.pdf",
      positionId: position.id,
      userId: candidateUser.id,
    },
  });

  const scheduledAt = new Date();
  scheduledAt.setDate(scheduledAt.getDate() + 2);
  scheduledAt.setHours(14, 0, 0, 0);

  const existing = await prisma.interview.findUnique({ where: { code: "INT-9001" } });
  if (!existing) {
    await prisma.interview.create({
      data: {
        code: "INT-9001",
        candidateId: candidate.id,
        positionId: position.id,
        scheduledAt,
        durationMins: 60,
        status: "SCHEDULED",
        questions: {
          create: [
            { questionId: "seed-q1", order: 0 },
            { questionId: "seed-q2", order: 1 },
            { questionId: "seed-q4", order: 2 },
            { questionId: "seed-q5", order: 3 },
            { questionId: "seed-q6", order: 4 },
          ],
        },
      },
    });
  }

  console.log("✅ Seed complete (Phase 2 — mixed question types)");
  console.log("Interviewer: interviewer@meetspace.com / interviewer123");
  console.log("Candidate:   parvika@gmail.com / candidate123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
