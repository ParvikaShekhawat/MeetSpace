interface InterviewInviteParams {
  to: string;
  candidateName: string;
  positionTitle: string;
  scheduledAt: Date;
  durationMins: number;
  interviewCode: string;
  interviewId: string;
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function buildInviteHtml(params: InterviewInviteParams): string {
  const { candidateName, positionTitle, scheduledAt, durationMins, interviewCode } = params;
  const appUrl = getAppUrl();
  const dateStr = scheduledAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = scheduledAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; padding: 32px;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #4f46e5, #0ea5e9); padding: 28px 32px;">
      <h1 style="color: white; margin: 0; font-size: 22px;">Interview Scheduled</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">MeetSpace Technical Interview</p>
    </div>
    <div style="padding: 32px;">
      <p style="color: #334155; font-size: 15px;">Hi ${candidateName},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        Your interview has been scheduled. Log in to your MeetSpace account to join at the scheduled time.
      </p>
      <table style="width: 100%; margin: 24px 0; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Role</td><td style="padding: 8px 0; color: #0f172a; font-weight: 600; font-size: 13px;">${positionTitle}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Date</td><td style="padding: 8px 0; color: #0f172a; font-weight: 600; font-size: 13px;">${dateStr}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Time</td><td style="padding: 8px 0; color: #0f172a; font-weight: 600; font-size: 13px;">${timeStr}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Duration</td><td style="padding: 8px 0; color: #0f172a; font-weight: 600; font-size: 13px;">${durationMins} minutes</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Interview ID</td><td style="padding: 8px 0; color: #0f172a; font-weight: 600; font-size: 13px;">${interviewCode}</td></tr>
      </table>
      <a href="${appUrl}/login" style="display: block; text-align: center; background: #4f46e5; color: white; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
        Open MeetSpace
      </a>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 20px; text-align: center;">
        After logging in, go to <strong>Upcoming Interviews</strong> and click <strong>Join Interview</strong>.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendInterviewInvite(params: InterviewInviteParams): Promise<{ sent: boolean; mode: string }> {
  const subject = `Interview Scheduled — ${params.positionTitle} (${params.interviewCode})`;
  const html = buildInviteHtml(params);
  const text = `Hi ${params.candidateName},\n\nYour interview for ${params.positionTitle} is scheduled.\n\nDate: ${params.scheduledAt.toLocaleString()}\nDuration: ${params.durationMins} min\nInterview ID: ${params.interviewCode}\n\nLog in at ${getAppUrl()}/login and go to Upcoming Interviews to join.`;

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || "587", 10),
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"MeetSpace" <${smtpUser}>`,
        to: params.to,
        subject,
        text,
        html,
      });

      return { sent: true, mode: "smtp" };
    } catch (err) {
      console.error("[email] SMTP failed:", err);
    }
  }

  console.log("\n📧 INTERVIEW INVITE EMAIL");
  console.log(`To: ${params.to}`);
  console.log(`Subject: ${subject}`);
  console.log(text);
  console.log(`Interview room: ${getAppUrl()}/interview/${params.interviewId}`);
  console.log("---\n");

  return { sent: false, mode: "console" };
}
