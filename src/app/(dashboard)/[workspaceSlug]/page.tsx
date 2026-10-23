import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { BoardCard } from "@/components/dashboard/BoardCard";
import { CreateBoardModal } from "@/components/dashboard/CreateBoardModal";
import { WorkspaceHeaderActions } from "@/components/dashboard/WorkspaceHeaderActions";
import {
  Folder as FolderIcon,
  Layout,
  Plus,
  Clock,
  Sparkles,
  Layers,
} from "lucide-react";

interface PageProps {
  params: {
    workspaceSlug: string;
  };
}

export default async function WorkspaceDashboardPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user?.id) redirect("/login");

  const workspace = await db.workspace.findUnique({
    where: { slug: params.workspaceSlug },
    include: {
      members: { where: { userId: user.id } },
    },
  });

  if (!workspace || workspace.members.length === 0) {
    notFound();
  }

  const userRole = workspace.members[0].role;
  const canEdit = userRole !== "VIEWER";

  // Fetch all boards in this workspace
  const boards = await db.board.findMany({
    where: { workspaceId: workspace.id },
    include: {
      folder: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Fetch root folders
  const folders = await db.folder.findMany({
    where: { workspaceId: workspace.id, parentId: null },
    include: {
      _count: {
        select: { boards: true, children: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const allFoldersForSelect = await db.folder.findMany({
    where: { workspaceId: workspace.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {workspace.name}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
              {userRole}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Browse and organize all your infinite visual canvases
          </p>
        </div>

        <WorkspaceHeaderActions
          workspaceId={workspace.id}
          workspaceName={workspace.name}
          userRole={userRole}
          folders={allFoldersForSelect}
        />
      </div>

      {/* Folders Overview (if any exist) */}
      {folders.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <FolderIcon className="w-4 h-4 text-indigo-400" />
              Folders ({folders.length})
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {folders.map((folder) => (
              <Link
                key={folder.id}
                href={`/${workspace.slug}/folder/${folder.id}`}
                className="group p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/60 transition-all flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors flex-shrink-0">
                  <FolderIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                    {folder.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {folder._count.boards} board{folder._count.boards !== 1 ? "s" : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Boards Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            All Boards ({boards.length})
          </h2>
        </div>

        {boards.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/40">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Layout className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">
              No boards created yet
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
              Create your first Excalidraw board in this workspace to start diagramming,
              sketching and collaborating.
            </p>
            {canEdit && (
              <CreateBoardModal
                workspaceId={workspace.id}
                folders={allFoldersForSelect}
                buttonLabel="Create Your First Board"
              />
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {boards.map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                folders={allFoldersForSelect}
                canEdit={canEdit}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
