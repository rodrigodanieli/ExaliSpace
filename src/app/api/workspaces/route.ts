import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: List all workspaces for current user
export async function GET() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await db.workspaceMember.findMany({
    where: { userId: user.id },
    include: {
      workspace: {
        include: {
          _count: {
            select: {
              boards: true,
              folders: true,
              members: true,
            },
          },
        },
      },
    },
    orderBy: {
      workspace: {
        name: "asc",
      },
    },
  });

  const workspaces = memberships.map((m) => ({
    ...m.workspace,
    role: m.role,
  }));

  return NextResponse.json(workspaces);
}

// POST: Create a new workspace
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name } = await req.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
    }

    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 20);

    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const slug = `${baseSlug || "workspace"}-${randomSuffix}`;

    const workspace = await db.workspace.create({
      data: {
        name: name.trim(),
        slug,
        members: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
      },
    });

    return NextResponse.json(workspace, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create workspace:", error);
    return NextResponse.json({ error: error?.message || "Failed to create workspace" }, { status: 500 });
  }
}
