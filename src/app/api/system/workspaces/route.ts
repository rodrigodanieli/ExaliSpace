import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { isPlatformAdmin: true },
  });

  if (!dbUser?.isPlatformAdmin) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [workspaces, totalBoards, totalMembers] = await Promise.all([
    db.workspace.findMany({
      include: {
        members: {
          where: { role: "OWNER" },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        _count: {
          select: {
            boards: true,
            folders: true,
            members: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.board.count(),
    db.workspaceMember.count(),
  ]);

  const totalWorkspaces = workspaces.length;
  const inactiveWorkspacesCount = workspaces.filter(
    (w) => new Date(w.updatedAt) < thirtyDaysAgo
  ).length;

  const formattedWorkspaces = workspaces.map((w) => {
    const owner = w.members[0]?.user || null;
    const isInactive = new Date(w.updatedAt) < thirtyDaysAgo;

    return {
      id: w.id,
      name: w.name,
      slug: w.slug,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
      isInactive,
      owner,
      counts: w._count,
    };
  });

  return NextResponse.json({
    kpis: {
      totalWorkspaces,
      inactiveWorkspacesCount,
      totalBoards,
      totalMembers,
    },
    workspaces: formattedWorkspaces,
  });
}
