import type { QuestionData } from "@/components/interview/types";

interface SnapshotEvent {
  type: string;
  timestampMs: number;
  payload: Record<string, string | undefined>;
}

export function generateMinuteSnapshot(
  events: SnapshotEvent[],
  activeQuestion: QuestionData | undefined,
  minute: number
): string {
  const windowStart = (minute - 1) * 60000;
  const windowEnd = minute * 60000;
  const windowEvents = events.filter(
    (e) => e.timestampMs >= windowStart && e.timestampMs < windowEnd
  );

  const flags = windowEvents.filter((e) => e.type === "FLAG");
  const hints = windowEvents.filter((e) => e.type === "HINT");
  const notes = windowEvents.filter((e) => e.type === "NOTE");
  const codeChanges = windowEvents.filter((e) => e.type === "CODE_CHANGE");
  const questions = windowEvents.filter((e) => e.type === "QUESTION_STARTED");

  const observations: string[] = [];

  if (questions.length > 0) {
    observations.push(`Started question: ${questions[0].payload.title || "new task"}.`);
  }
  if (codeChanges.length > 0) {
    observations.push(`Made ${codeChanges.length} code edit(s).`);
  } else if (activeQuestion?.question.type === "CODING") {
    observations.push("No coding activity recorded this minute.");
  }

  flags.forEach((f) => {
    if (f.payload.flag) observations.push(`Flag: ${f.payload.flag}.`);
  });

  if (hints.length > 0) {
    observations.push(`Interviewer gave ${hints.length} hint(s).`);
  }

  notes.forEach((n) => {
    if (n.payload.text && n.payload.kind !== "minute_snapshot") {
      observations.push(`Note: ${n.payload.text}`);
    }
  });

  if (observations.length === 0) {
    observations.push("Steady progress — discussion and problem exploration ongoing.");
  }

  return `Minute ${minute} (${String(minute - 1).padStart(2, "0")}:00–${String(minute).padStart(2, "0")}:00): ${observations.join(" ")}`;
}
