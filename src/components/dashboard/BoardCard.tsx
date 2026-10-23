"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  MoreVertical,
  Trash2,
  FolderInput,
  Folder as FolderIcon,
  Clock,
  Sparkles,
  Globe,
  Share2,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { ShareBoardModal } from "../canvas/ShareBoardModal";

interface BoardCardProps {
  board: {
    id: string;
    title: string;
    updatedAt: string | Date;
    folder?: { id: string; name: string } | null;
    creator?: { name?: string | null; email: string } | null;
    elements?: any;
    isPublic?: boolean;
  };
  folders?: Array<{ id: string; name: string }>;
  canEdit?: boolean;
  onRefresh?: () => void;
}

export function BoardCard({
  board,
  folders = [],
  canEdit = true,
  onRefresh,
}: BoardCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    board.folder?.id || ""
  );

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete board "${board.title}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/boards/${board.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onRefresh?.();
        router.refresh();
      } else {
        alert("Failed to delete board");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting board");
    } finally {
      setIsDeleting(false);
      setMenuOpen(false);
    }
  };

  const handleMove = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const res = await fetch(`/api/boards/${board.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: selectedFolderId || null }),
      });
      if (res.ok) {
        setShowMoveModal(false);
        onRefresh?.();
        router.refresh();
      } else {
        alert("Failed to move board");
      }
    } catch (err) {
      console.error(err);
      alert("Error moving board");
    }
  };

  // Generate pleasant gradient/thumbnail based on board id
  const hasElements =
    Array.isArray(board.elements) && board.elements.length > 0;
  const elementCount = Array.isArray(board.elements) ? board.elements.length : 0;

  return (
    <>
      <div className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all duration-300 flex flex-col">
        {/* Thumbnail Preview Area */}
        <Link
          href={`/board/${board.id}`}
          className="relative h-44 w-full bg-slate-50 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-center p-4 overflow-hidden group-hover:scale-[1.01] transition-transform"
        >
          {/* Subtle canvas grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle, #6366f1 1px, transparent 1px)`,
              backgroundSize: "16px 16px",
            }}
          />

          <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              {hasElements ? (
                <>
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  {elementCount} element{elementCount !== 1 ? "s" : ""}
                </>
              ) : (
                "Empty Canvas"
              )}
            </span>
          </div>

          {/* Folder pill badge */}
          {board.folder && (
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200/80 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1 shadow-sm">
              <FolderIcon className="w-3 h-3 text-indigo-500" />
              <span className="truncate max-w-[120px]">{board.folder.name}</span>
            </div>
          )}

          {/* Public access badge */}
          {board.isPublic && (
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 flex items-center gap-1 shadow-sm">
              <Globe className="w-3 h-3" />
              <span>Public</span>
            </div>
          )}
        </Link>

        {/* Content area */}
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/board/${board.id}`}
              className="text-base font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-1 transition-colors"
            >
              {board.title}
            </Link>

            {canEdit && (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(!menuOpen);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {menuOpen && (
                  <div
                    className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 z-20 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setShowShareModal(true);
                      }}
                      className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                      Share & Public Link
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setShowMoveModal(true);
                      }}
                      className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                    >
                      <FolderInput className="w-3.5 h-3.5 text-indigo-500" />
                      Move to Folder
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Board
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer info: updated time and creator */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {formatRelativeTime(board.updatedAt)}
            </span>

            {board.creator && (
              <div
                className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px]"
                title={board.creator.name || board.creator.email}
              >
                {(board.creator.name || board.creator.email)[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Move to folder modal */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-3">
              Move &ldquo;{board.title}&rdquo; to folder
            </h3>
            <form onSubmit={handleMove} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Destination Folder
                </label>
                <select
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                >
                  <option value="">(Workspace Root - No Folder)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMoveModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow-sm cursor-pointer"
                >
                  Move Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Board Modal */}
      <ShareBoardModal
        boardId={board.id}
        boardTitle={board.title}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        canManage={canEdit}
      />
    </>
  );
}
