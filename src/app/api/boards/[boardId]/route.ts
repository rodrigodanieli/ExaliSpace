import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { boardId: string } }
) {
  const user = await getCurrentUser();

  const board = await db.board.findUnique({
    where: { id: params.boardId },
    include: {
      workspace: true,
      folder: true,
      creator: {
        select: { id: true, name: true, email: true },
      },
      shares: user?.email ? { where: { email: user.email.toLowerCase() } } : false,
    },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  // Public access check
  if (board.isPublic) {
    return NextResponse.json({
      ...board,
      currentUserRole: board.publicAccess,
      canEdit: board.publicAccess !== "VIEWER",
    });
  }

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Creator or platform admin always have full access
  if (user?.id && (user.isPlatformAdmin || board.creatorId === user.id)) {
    return NextResponse.json({
      ...board,
      currentUserRole: "OWNER",
      canEdit: true,
    });
  }

  // Check user workspace membership
  const member = await db.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId: board.workspaceId,
      },
    },
  });

  const directShare = board.shares && board.shares.length > 0 ? board.shares[0] : null;

  if (!member && !directShare) {
    return NextResponse.json({ error: "Forbidden: Not authorized" }, { status: 403 });
  }

  const role = member ? member.role : directShare!.role;

  return NextResponse.json({
    ...board,
    currentUserRole: role,
    canEdit: role !== "VIEWER",
  });
}

// Clean appState to only persist visual viewport and styling configuration
// CRITICAL: Collaborators, pointers, selections and runtime elements must NEVER be persisted in JSONB
function cleanAppState(appState: any) {
  if (!appState || typeof appState !== "object") return {};
  return {
    viewBackgroundColor: appState.viewBackgroundColor || "#121212",
    gridSize: appState.gridSize ?? null,
    theme: appState.theme || "dark",
    zoom: appState.zoom || { value: 1 },
    scrollX: appState.scrollX ?? 0,
    scrollY: appState.scrollY ?? 0,
  };
}

export async function PATCH(
  req: Request,
  { params }: { params: { boardId: string } }
) {
  const user = await getCurrentUser();

  const board = await db.board.findUnique({
    where: { id: params.boardId },
    include: {
      shares: user?.email ? { where: { email: user.email.toLowerCase() } } : false,
    },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  // Determine canEdit
  let canEdit = false;

  if (user?.id) {
    if (user.isPlatformAdmin || board.creatorId === user.id) {
      canEdit = true;
    } else {
      const member = await db.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: user.id,
            workspaceId: board.workspaceId,
          },
        },
      });

      if (member && member.role !== "VIEWER") {
        canEdit = true;
      } else if (board.shares && board.shares.length > 0 && board.shares[0].role === "EDITOR") {
        canEdit = true;
      }
    }
  }

  if (!canEdit && board.isPublic && board.publicAccess === "EDITOR") {
    canEdit = true;
  }

  if (!canEdit) {
    return NextResponse.json({ error: "Forbidden: read-only access" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const updateData: any = {};

    if (body.title !== undefined) {
      updateData.title = String(body.title).trim();
    }
    if (body.folderId !== undefined) {
      updateData.folderId = body.folderId || null;
    }
    if (body.elements !== undefined) {
      updateData.elements = body.elements;
    }
    if (body.appState !== undefined) {
      updateData.appState = cleanAppState(body.appState);
    }
    if (body.files !== undefined) {
      updateData.files = body.files;
    }

    const updated = await db.board.update({
      where: { id: params.boardId },
      data: updateData,
      include: {
        folder: true,
      },
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      folderId: updated.folderId,
      updatedAt: updated.updatedAt,
      success: true,
    });
  } catch (error: any) {
    console.error("Failed to update board:", error);
    return NextResponse.json({ error: error?.message || "Failed to update board" }, { status: 500 });
  }
}

// Alias POST to PATCH to safely support navigator.sendBeacon
export const POST = PATCH;

export async function DELETE(
  req: Request,
  { params }: { params: { boardId: string } }
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const board = await db.board.findUnique({
    where: { id: params.boardId },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const member = await db.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId: board.workspaceId,
      },
    },
  });

  if (!member || (member.role !== "OWNER" && member.role !== "ADMIN" && board.creatorId !== user.id)) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
  }

  try {
    await db.board.delete({
      where: { id: params.boardId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to delete board" }, { status: 500 });
  }
}
