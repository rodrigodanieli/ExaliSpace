import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendBoardShareEmail } from "@/lib/email";
import { Role } from "@prisma/client";

// GET /api/boards/[boardId]/share - Get sharing settings & collaborator list
export async function GET(
  req: Request,
  { params }: { params: { boardId: string } }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const board = await db.board.findUnique({
    where: { id: params.boardId },
    include: {
      shares: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      workspace: {
        include: {
          members: {
            where: { userId: currentUser.id },
          },
        },
      },
    },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const isMember = board.workspace.members.length > 0;
  const isCreator = board.creatorId === currentUser.id;
  const isPlatformAdmin = !!currentUser.isPlatformAdmin;

  if (!isMember && !isCreator && !isPlatformAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    boardId: board.id,
    title: board.title,
    isPublic: board.isPublic,
    publicAccess: board.publicAccess,
    shareToken: board.shareToken,
    shares: board.shares,
  });
}

// PATCH /api/boards/[boardId]/share - Toggle public access and default role
export async function PATCH(
  req: Request,
  { params }: { params: { boardId: string } }
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
    return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
  }

  try {
    const { isPublic, publicAccess } = await req.json();

    const updated = await db.board.update({
      where: { id: params.boardId },
      data: {
        ...(isPublic !== undefined ? { isPublic: !!isPublic } : {}),
        ...(publicAccess && ["VIEWER", "EDITOR"].includes(publicAccess)
          ? { publicAccess: publicAccess as Role }
          : {}),
      },
    });

    return NextResponse.json({
      isPublic: updated.isPublic,
      publicAccess: updated.publicAccess,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update public share" }, { status: 500 });
  }
}

// POST /api/boards/[boardId]/share - Share board with a specific email
export async function POST(
  req: Request,
  { params }: { params: { boardId: string } }
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
    const { email, role = "VIEWER" } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const targetUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    const shareRole = (["VIEWER", "EDITOR"].includes(role) ? role : "VIEWER") as Role;

    // Upsert board share
    const share = await db.boardShare.upsert({
      where: {
        boardId_email: {
          boardId: params.boardId,
          email: normalizedEmail,
        },
      },
      update: {
        role: shareRole,
        ...(targetUser ? { userId: targetUser.id } : {}),
      },
      create: {
        boardId: params.boardId,
        email: normalizedEmail,
        role: shareRole,
        ...(targetUser ? { userId: targetUser.id } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Trigger Board Share Email
    sendBoardShareEmail({
      to: normalizedEmail,
      inviterName: currentUser.name || currentUser.email || "A collaborator",
      boardTitle: board.title,
      role: shareRole,
      boardId: board.id,
      isPublic: board.isPublic,
    }).catch((err) => console.error("Board share email error:", err));

    return NextResponse.json(share, { status: 201 });
  } catch (error: any) {
    console.error("Board share error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to share board" },
      { status: 500 }
    );
  }
}
