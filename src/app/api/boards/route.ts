import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/boards?workspaceId=...&folderId=...
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  const folderId = searchParams.get("folderId");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  // Verify access
  const member = await db.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId,
      },
    },
  });

  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const boards = await db.board.findMany({
    where: {
      workspaceId,
      folderId: folderId === "root" ? null : folderId ? folderId : undefined,
    },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
      folder: {
        select: { id: true, name: true },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return NextResponse.json(boards);
}

// POST /api/boards
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, workspaceId, folderId, elements, appState, files } = await req.json();

    if (!title || !workspaceId) {
      return NextResponse.json({ error: "title and workspaceId are required" }, { status: 400 });
    }

    const member = await db.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId,
        },
      },
    });

    if (!member || member.role === "VIEWER") {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const initialAppState = appState
      ? typeof appState === "string"
        ? JSON.parse(appState)
        : appState
      : {};

    const cleanInitialAppState = {
      viewBackgroundColor: initialAppState.viewBackgroundColor || "#121212",
      gridSize: initialAppState.gridSize ?? null,
      theme: initialAppState.theme || "dark",
      zoom: initialAppState.zoom || { value: 1 },
      scrollX: initialAppState.scrollX ?? 0,
      scrollY: initialAppState.scrollY ?? 0,
    };

    const board = await db.board.create({
      data: {
        title: title.trim(),
        workspaceId,
        folderId: folderId || null,
        creatorId: user.id,
        elements: elements ? (typeof elements === "string" ? JSON.parse(elements) : elements) : [],
        appState: cleanInitialAppState,
        files: files ? (typeof files === "string" ? JSON.parse(files) : files) : {},
      },
      include: {
        workspace: true,
      },
    });

    return NextResponse.json(board, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create board:", error);
    return NextResponse.json({ error: error?.message || "Failed to create board" }, { status: 500 });
  }
}
