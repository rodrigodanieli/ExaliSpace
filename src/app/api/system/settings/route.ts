import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// Helper: Ensure user is platform admin
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user?.id) return { error: "Unauthorized", status: 401 };

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { isPlatformAdmin: true },
  });

  if (!dbUser?.isPlatformAdmin) {
    return { error: "Forbidden: Platform Administrator access required", status: 403 };
  }

  return { user };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let setting = await db.systemSetting.findUnique({
    where: { id: "global" },
  });

  if (!setting) {
    setting = await db.systemSetting.create({
      data: {
        id: "global",
        smtpHost: process.env.SMTP_HOST || "",
        smtpPort: parseInt(process.env.SMTP_PORT || "587", 10),
        smtpUser: process.env.SMTP_USER || "",
        smtpFrom: process.env.SMTP_FROM || "",
        smtpSecure: process.env.SMTP_SECURE === "true",
      },
    });
  }

  return NextResponse.json({
    id: setting.id,
    smtpHost: setting.smtpHost || "",
    smtpPort: setting.smtpPort || 587,
    smtpUser: setting.smtpUser || "",
    smtpPasswordConfigured: !!(setting.smtpPassword || process.env.SMTP_PASSWORD),
    smtpSecure: setting.smtpSecure,
    smtpFrom: setting.smtpFrom || "",
    globalLibraries: setting.globalLibraries,
    defaultGridMode: setting.defaultGridMode,
    defaultTheme: setting.defaultTheme,
    updatedAt: setting.updatedAt,
  });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const updateData: any = {};

    if (body.smtpHost !== undefined) updateData.smtpHost = body.smtpHost?.trim() || null;
    if (body.smtpPort !== undefined) updateData.smtpPort = parseInt(body.smtpPort, 10) || 587;
    if (body.smtpUser !== undefined) updateData.smtpUser = body.smtpUser?.trim() || null;
    if (body.smtpPassword) updateData.smtpPassword = body.smtpPassword;
    if (body.smtpSecure !== undefined) updateData.smtpSecure = !!body.smtpSecure;
    if (body.smtpFrom !== undefined) updateData.smtpFrom = body.smtpFrom?.trim() || null;

    if (body.globalLibraries !== undefined) updateData.globalLibraries = body.globalLibraries;
    if (body.defaultGridMode !== undefined) updateData.defaultGridMode = !!body.defaultGridMode;
    if (body.defaultTheme !== undefined) updateData.defaultTheme = body.defaultTheme;

    const updated = await db.systemSetting.upsert({
      where: { id: "global" },
      update: updateData,
      create: {
        id: "global",
        ...updateData,
      },
    });

    return NextResponse.json({
      success: true,
      smtpHost: updated.smtpHost,
      smtpPort: updated.smtpPort,
      smtpUser: updated.smtpUser,
      smtpPasswordConfigured: !!updated.smtpPassword,
      smtpSecure: updated.smtpSecure,
      smtpFrom: updated.smtpFrom,
      globalLibraries: updated.globalLibraries,
      defaultGridMode: updated.defaultGridMode,
      defaultTheme: updated.defaultTheme,
    });
  } catch (error: any) {
    console.error("Failed to update system settings:", error);
    return NextResponse.json({ error: error?.message || "Failed to save settings" }, { status: 500 });
  }
}
