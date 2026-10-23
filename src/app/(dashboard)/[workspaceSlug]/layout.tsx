import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { WorkspaceSidebar } from "@/components/layout/WorkspaceSidebar";
import { FolderNode } from "@/components/dashboard/FolderTree";

interface LayoutProps {
  children: React.ReactNode;
  params: {
    workspaceSlug: string;
  };
}

export default async function DashboardLayout({
  children,
  params,
}: LayoutProps) {
  const user = await getCurrentUser();
  if (!user || !user.email) {
    redirect("/login");
  }

  // Find workspace by slug
  const workspace = await db.workspace.findUnique({
    where: { slug: params.workspaceSlug },
    include: {
      members: {
        where: { userId: user.id },
      },
    },
  });

  if (!workspace || workspace.members.length === 0) {
    // If not found or not a member, check if user has other workspaces
    const firstMembership = await db.workspaceMember.findFirst({
      where: { userId: user.id },
      include: { workspace: true },
    });

    if (firstMembership?.workspace) {
      redirect(`/${firstMembership.workspace.slug}`);
    } else {
      redirect("/");
    }
  }

  const userRole = workspace.members[0].role;

  // Get all user's workspaces for the switcher
  const allMemberships = await db.workspaceMember.findMany({
    where: { userId: user.id },
    include: { workspace: true },
    orderBy: { workspace: { name: "asc" } },
  });

  const workspaces = allMemberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    slug: m.workspace.slug,
    role: m.role,
  }));

  // Get all folders in workspace and organize hierarchically
  const allFolders = await db.folder.findMany({
    where: { workspaceId: workspace.id },
    include: {
      _count: {
        select: { boards: true, children: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // Build tree
  const folderMap = new Map<string, FolderNode>();
  allFolders.forEach((f) => {
    folderMap.set(f.id, { ...f, children: [] });
  });

  const rootFolders: FolderNode[] = [];
  allFolders.forEach((f) => {
    const node = folderMap.get(f.id)!;
    if (f.parentId && folderMap.has(f.parentId)) {
      folderMap.get(f.parentId)!.children!.push(node);
    } else {
      rootFolders.push(node);
    }
  });

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden text-slate-100">
      <WorkspaceSidebar
        currentWorkspace={{
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
        }}
        workspaces={workspaces}
        folders={rootFolders}
        userRole={userRole}
      />
      <main className="flex-1 flex flex-col min-w-0 bg-slate-900/60 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
