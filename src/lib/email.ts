import nodemailer from "nodemailer";
import { db } from "./db";

const defaultHost = process.env.SMTP_HOST;
const defaultPort = parseInt(process.env.SMTP_PORT || "587", 10);
const defaultUser = process.env.SMTP_USER;
const defaultPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
const defaultSecure = process.env.SMTP_SECURE === "true" || defaultPort === 465;
const defaultFrom = process.env.SMTP_FROM || `"ExcaliSpace" <${defaultUser || "noreply@excalispace.local"}>`;
const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3001";

export async function getTransporterConfig() {
  // Check database first
  try {
    const setting = await db.systemSetting.findUnique({
      where: { id: "global" },
    });

    if (setting?.smtpHost && setting?.smtpUser && setting?.smtpPassword) {
      return {
        host: setting.smtpHost,
        port: setting.smtpPort || 587,
        secure: setting.smtpSecure || setting.smtpPort === 465,
        auth: {
          user: setting.smtpUser,
          pass: setting.smtpPassword,
        },
        from: setting.smtpFrom || defaultFrom,
      };
    }
  } catch (err) {
    // Database might not have table yet or fail
  }

  // Fallback to environment variables
  if (defaultHost && defaultUser && defaultPass) {
    return {
      host: defaultHost,
      port: defaultPort,
      secure: defaultSecure,
      auth: {
        user: defaultUser,
        pass: defaultPass,
      },
      from: defaultFrom,
    };
  }

  return null;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  customConfig?: any;
}

export async function sendEmail({ to, subject, html, text, customConfig }: SendEmailOptions): Promise<{ success: boolean; message?: string }> {
  const config = customConfig || (await getTransporterConfig());

  if (!config) {
    console.log("------------------------------------------------------------");
    console.log("📨 [SMTP Simulation] SMTP not fully configured in environment or DB.");
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Text preview: ${text || "See HTML content"}`);
    console.log("------------------------------------------------------------");
    return { success: true, message: "Email simulated (SMTP not configured)" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });

    const info = await transporter.sendMail({
      from: config.from || defaultFrom,
      to,
      subject,
      text: text || subject,
      html,
    });

    console.log(`✅ [Email Sent] Message ID: ${info.messageId} to ${to}`);
    return { success: true, message: `Email sent (ID: ${info.messageId})` };
  } catch (error: any) {
    console.error(`❌ [Email Error] Failed to send email to ${to}:`, error);
    return { success: false, message: error?.message || "Failed to send email" };
  }
}

// 1. Welcome Email
export async function sendWelcomeEmail({
  to,
  name,
  workspaceName,
  tempPassword,
}: {
  to: string;
  name?: string | null;
  workspaceName?: string;
  tempPassword?: string;
}) {
  const loginUrl = `${appUrl}/login`;
  const displayName = name || to.split("@")[0];

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; margin: 0; padding: 24px; }
    .card { max-width: 560px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 36px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .logo { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background: #4f46e5; border-radius: 12px; color: #ffffff; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
    h1 { color: #ffffff; font-size: 24px; font-weight: 700; margin: 0 0 12px 0; }
    p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0; }
    .highlight-box { background: #1e293b; border-left: 4px solid #6366f1; padding: 14px 18px; border-radius: 8px; margin: 20px 0; }
    .btn { display: inline-block; background: #4f46e5; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 600; font-size: 14px; margin-top: 10px; }
    .btn:hover { background: #4338ca; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #1e293b; color: #64748b; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🎨</div>
    <h1>Welcome to ExcaliSpace!</h1>
    <p>Hello <strong>${displayName}</strong>,</p>
    <p>Your account was successfully created on <strong>ExcaliSpace</strong>. You now have access to a collaborative infinite canvas ecosystem with workspace organization, folder hierarchies, and real-time diagramming.</p>
    
    ${
      workspaceName
        ? `<div class="highlight-box">
             <p style="margin: 0; color: #cbd5e1;">🏢 <strong>Initial Workspace:</strong> ${workspaceName}</p>
             ${tempPassword ? `<p style="margin: 8px 0 0 0; color: #cbd5e1;">🔑 <strong>Temporary Password:</strong> <code>${tempPassword}</code></p>` : ""}
           </div>`
        : ""
    }

    <p>To start creating and collaborating on diagrams, flows, and ideas, click the button below:</p>
    <p style="text-align: center; margin: 28px 0;">
      <a href="${loginUrl}" class="btn">Access Platform</a>
    </p>

    <div class="footer">
      ExcaliSpace • Self-Hosted Infinite Canvas Platform<br>
      This is an automated system email.
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to,
    subject: `Welcome to ExcaliSpace! 🎨`,
    html,
    text: `Hello ${displayName}, welcome to ExcaliSpace! Sign in at: ${loginUrl}`,
  });
}

// 2. Board Sharing Notification Email
export async function sendBoardShareEmail({
  to,
  inviterName,
  boardTitle,
  role,
  boardId,
  isPublic = false,
}: {
  to: string;
  inviterName: string;
  boardTitle: string;
  role: string;
  boardId: string;
  isPublic?: boolean;
}) {
  const boardUrl = `${appUrl}/board/${boardId}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; margin: 0; padding: 24px; }
    .card { max-width: 560px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 36px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .badge { display: inline-block; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); color: #818cf8; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }
    h1 { color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 12px 0; }
    p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0; }
    .board-info { background: #1e293b; border-radius: 12px; padding: 18px; margin: 20px 0; border: 1px solid #334155; }
    .btn { display: inline-block; background: #4f46e5; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 600; font-size: 14px; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #1e293b; color: #64748b; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Board Sharing</div>
    <h1>New Board Shared with You</h1>
    <p><strong>${inviterName}</strong> shared a canvas board with you on ExcaliSpace.</p>

    <div class="board-info">
      <div style="font-size: 17px; font-weight: 700; color: #ffffff; margin-bottom: 6px;">📐 ${boardTitle}</div>
      <div style="font-size: 13px; color: #94a3b8;">
        Granted permission: <strong style="color: #818cf8;">${role}</strong>
        ${isPublic ? " • Public link active" : ""}
      </div>
    </div>

    <p style="text-align: center; margin: 28px 0;">
      <a href="${boardUrl}" class="btn">Open Canvas in ExcaliSpace</a>
    </p>

    <div class="footer">
      ExcaliSpace • Self-Hosted Infinite Canvas Platform
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to,
    subject: `${inviterName} shared the board "${boardTitle}" with you 📐`,
    html,
    text: `${inviterName} shared the board "${boardTitle}" (${role}). Open at: ${boardUrl}`,
  });
}

// 3. Workspace / Team Invitation Email
export async function sendWorkspaceInviteEmail({
  to,
  inviterName,
  workspaceName,
  role,
  workspaceSlug,
}: {
  to: string;
  inviterName: string;
  workspaceName: string;
  role: string;
  workspaceSlug: string;
}) {
  const workspaceUrl = `${appUrl}/${workspaceSlug}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; margin: 0; padding: 24px; }
    .card { max-width: 560px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 36px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .badge { display: inline-block; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }
    h1 { color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 12px 0; }
    p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0; }
    .team-info { background: #1e293b; border-radius: 12px; padding: 18px; margin: 20px 0; border: 1px solid #334155; }
    .btn { display: inline-block; background: #10b981; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 600; font-size: 14px; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #1e293b; color: #64748b; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Team & Project Invitation</div>
    <h1>You've been invited to a Workspace!</h1>
    <p><strong>${inviterName}</strong> added you as a collaborator to the <strong>${workspaceName}</strong> workspace on ExcaliSpace.</p>

    <div class="team-info">
      <div style="font-size: 17px; font-weight: 700; color: #ffffff; margin-bottom: 6px;">🏢 ${workspaceName}</div>
      <div style="font-size: 13px; color: #94a3b8;">Assigned role: <strong style="color: #34d399;">${role}</strong></div>
    </div>

    <p>You can now access all folders, boards, and resources linked to this team:</p>
    <p style="text-align: center; margin: 28px 0;">
      <a href="${workspaceUrl}" class="btn">Join Workspace</a>
    </p>

    <div class="footer">
      ExcaliSpace • Self-Hosted Infinite Canvas Platform
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to,
    subject: `You've been invited to workspace "${workspaceName}" on ExcaliSpace 🚀`,
    html,
    text: `${inviterName} invited you to the workspace "${workspaceName}" (${role}). Open at: ${workspaceUrl}`,
  });
}
