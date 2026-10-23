import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { isPlatformAdmin: true, email: true },
  });

  if (!dbUser?.isPlatformAdmin) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    const { to, smtpHost, smtpPort, smtpUser, smtpPassword, smtpSecure, smtpFrom } = await req.json();

    const targetEmail = to || dbUser.email;

    let customConfig: any = null;
    if (smtpHost && smtpUser && smtpPassword) {
      customConfig = {
        host: smtpHost,
        port: parseInt(smtpPort, 10) || 587,
        secure: smtpSecure === true || parseInt(smtpPort, 10) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
        from: smtpFrom || `"ExcaliSpace Test" <${smtpUser}>`,
      };
    }

    const testHtml = `
      <div style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; max-width: 480px;">
        <h2 style="color: #6366f1;">🧪 ExcaliSpace SMTP Connection Test</h2>
        <p>This is a test email verifying that your SMTP server and app credentials are functioning correctly.</p>
        <div style="background: #1e293b; padding: 12px; border-radius: 8px; margin: 16px 0; font-size: 13px;">
          <div><strong>Timestamp:</strong> ${new Date().toLocaleString()}</div>
          <div><strong>Server:</strong> ${smtpHost || "Default Configuration"}</div>
          <div><strong>Status:</strong> Connection established successfully!</div>
        </div>
        <p style="font-size: 12px; color: #94a3b8;">ExcaliSpace Self-Hosted Canvas</p>
      </div>
    `;

    const result = await sendEmail({
      to: targetEmail,
      subject: "🧪 SMTP Connection Test - ExcaliSpace",
      html: testHtml,
      text: "ExcaliSpace SMTP connection test successful!",
      customConfig,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${targetEmail}`,
    });
  } catch (error: any) {
    console.error("Test email error:", error);
    return NextResponse.json({ error: error?.message || "Failed to send test email" }, { status: 500 });
  }
}
