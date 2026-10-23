import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { BoardCard } from "@/components/dashboard/BoardCard";
import { CreateBoardModal } from "@/components/dashboard/CreateBoardModal";
import {
  Folder as FolderIcon,
  ChevronRight,
  Layout,
  Layers,
  Sparkles,
} from "lucide-react";

interface FolderPageProps {
  params: {
    workspaceSlug: string;
    folderId: string;
  };
}

export default async function FolderPage({ params }: FolderPageProps) {
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

  const folder = await db.folder.findUnique({
    where: { id: params.folderId },
    include: {
      parent: true,
      children: {
        include: {
          _count: {
            select: { boards: true, children: true },
          },
        },
        orderBy: { name: "asc" },
      },
      boards: {
        include: {
          folder: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true, email: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!folder || folder.workspaceId !== workspace.id) {
    notFound();
  }

  // Get all folders in workspace for moving boards
  const allFoldersForSelect = await db.folder.findMany({
    where: { workspaceId: workspace.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link
          href={`/${workspace.slug}`}
          className="hover:text-white transition-colors"
        >
          {workspace.name}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        {folder.parent && (
          <>
            <Link
              href={`/${workspace.slug}/folder/${folder.parent.id}`}
              className="hover:text-white transition-colors"
            >
              {folder.parent.name}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          </>
        )}
        <span className="text-white font-medium">{folder.name}</span>
      </div>

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <FolderIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {folder.name}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Folder in {workspace.name} • {folder.boards.length} board
              {folder.boards.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-3">
            <CreateBoardModal
              workspaceId={workspace.id}
              defaultFolderId={folder.id}
              folders={allFoldersForSelect}
              buttonLabel="New Board in Folder"
            />
          </div>
        )}
      </div>

      {/* Sub-folders (if any) */}
      {folder.children.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <FolderIcon className="w-4 h-4 text-indigo-400" />
            Sub-folders ({folder.children.length})
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {folder.children.map((sub) => (
              <Link
                key={sub.id}
                href={`/${workspace.slug}/folder/${sub.id}`}
                className="group p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/60 transition-all flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors flex-shrink-0">
                  <FolderIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                    {sub.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {sub._count.boards} board{sub._count.boards !== 1 ? "s" : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Boards inside folder */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Boards ({folder.boards.length})
          </h2>
        </div>

        {folder.boards.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/40">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Layout className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">
              This folder is empty
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
              Create a board inside this folder to start collaborating.
            </p>
            {canEdit && (
              <CreateBoardModal
                workspaceId={workspace.id}
                defaultFolderId={folder.id}
                folders={allFoldersForSelect}
                buttonLabel="Create Board in this Folder"
              />
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {folder.boards.map((b) => (
              <BoardCard
                key={b.id}
                board={b}
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
