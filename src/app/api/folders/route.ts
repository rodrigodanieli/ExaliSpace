import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/folders?workspaceId=...&parentId=...
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  const parentId = searchParams.get("parentId");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  // Verify membership
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

  const folders = await db.folder.findMany({
    where: {
      workspaceId,
      parentId: parentId === "root" || !parentId ? null : parentId,
    },
    include: {
      _count: {
        select: {
          boards: true,
          children: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return NextResponse.json(folders);
}

// POST /api/folders
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, workspaceId, parentId } = await req.json();

    if (!name || !workspaceId) {
      return NextResponse.json({ error: "name and workspaceId are required" }, { status: 400 });
    }

    // Verify membership and permission (OWNER, ADMIN, EDITOR can create folders)
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

    const folder = await db.folder.create({
      data: {
        name: name.trim(),
        workspaceId,
        parentId: parentId || null,
      },
    });

    return NextResponse.json(folder, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create folder:", error);
    return NextResponse.json({ error: error?.message || "Failed to create folder" }, { status: 500 });
  }
}
