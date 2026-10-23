import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword, comparePassword } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: currentUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      isPlatformAdmin: true,
      lastLoginAt: true,
      accentColor: true,
      preferredTheme: true,
      createdAt: true,
      _count: {
        select: {
          workspaces: true,
          createdBoards: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const updateData: any = {};

    if (body.name !== undefined) {
      updateData.name = body.name ? body.name.trim() : null;
    }
    if (body.accentColor !== undefined) {
      updateData.accentColor = body.accentColor || "#4f46e5";
    }
    if (body.preferredTheme !== undefined) {
      updateData.preferredTheme = body.preferredTheme || "dark";
    }

    // Password change
    if (body.newPassword) {
      if (body.newPassword.length < 6) {
        return NextResponse.json(
          { error: "New password must be at least 6 characters" },
          { status: 400 }
        );
      }

      if (!body.currentPassword) {
        return NextResponse.json(
          { error: "Current password is required to change password" },
          { status: 400 }
        );
      }

      const existingUser = await db.user.findUnique({
        where: { id: currentUser.id },
      });

      if (!existingUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const isMatch = await comparePassword(body.currentPassword, existingUser.passwordHash);
      if (!isMatch) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }

      updateData.passwordHash = await hashPassword(body.newPassword);
    }

    const updated = await db.user.update({
      where: { id: currentUser.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        accentColor: true,
        preferredTheme: true,
        isPlatformAdmin: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}
