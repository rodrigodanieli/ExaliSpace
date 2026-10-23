import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";

export async function DELETE(
  req: Request,
  { params }: { params: { boardId: string; shareId: string } }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const board = await db.board.findUnique({
    where: { id: params.boardId },
    include: {
      workspace: {
        include: {
          members: { where: { userId: currentUser.id } },
        },
      },
    },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const currentMember = board.workspace.members[0];
  const canManage =
    currentUser.isPlatformAdmin ||
    board.creatorId === currentUser.id ||
    (currentMember && currentMember.role !== "VIEWER");

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await db.boardShare.delete({
      where: { id: params.shareId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to remove collaborator" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { boardId: string; shareId: string } }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const board = await db.board.findUnique({
    where: { id: params.boardId },
    include: {
      workspace: {
        include: {
          members: { where: { userId: currentUser.id } },
        },
      },
    },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const currentMember = board.workspace.members[0];
  const canManage =
    currentUser.isPlatformAdmin ||
    board.creatorId === currentUser.id ||
    (currentMember && currentMember.role !== "VIEWER");

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { role } = await req.json();
    if (!["VIEWER", "EDITOR"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const updated = await db.boardShare.update({
      where: { id: params.shareId },
      data: { role: role as Role },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update role" }, { status: 500 });
  }
}
