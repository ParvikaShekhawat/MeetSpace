import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function DashboardRedirect() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "INTERVIEWER") redirect("/interviewer/dashboard");
  redirect("/candidate/dashboard");
}
