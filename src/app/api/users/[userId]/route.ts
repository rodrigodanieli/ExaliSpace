import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Prevent user from deleting themselves
  if (currentUser.id === params.userId) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 }
    );
  }

  try {
    await db.user.delete({
      where: { id: params.userId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, password, isPlatformAdmin } = await req.json();
    const updateData: any = {};

    if (name) updateData.name = name.trim();
    if (isPlatformAdmin !== undefined) updateData.isPlatformAdmin = !!isPlatformAdmin;
    if (password && password.length >= 6) {
      updateData.passwordHash = await hashPassword(password);
    }

    const updated = await db.user.update({
      where: { id: params.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        isPlatformAdmin: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update user" },
      { status: 500 }
    );
  }
}
