"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Check,
  Loader2,
  AlertCircle,
  Download,
  Share2,
  Folder,
  Shield,
  Edit2,
  Globe,
  Database,
} from "lucide-react";
import { ShareBoardModal } from "./ShareBoardModal";

export type SaveStatus = "saved" | "saving" | "unsaved" | "error";

interface CanvasHeaderProps {
  board: {
    id: string;
    title: string;
    workspace: {
      id: string;
      name: string;
      slug: string;
    };
    folder?: {
      id: string;
      name: string;
    } | null;
  };
  saveStatus: SaveStatus;
  canEdit: boolean;
  userRole?: string;
  onExport?: (format: "png" | "svg" | "json") => void;
  onTitleChange?: (newTitle: string) => void;
  onOpenERDModal?: () => void;
}

export function CanvasHeader({
  board,
  saveStatus,
  canEdit,
  userRole = "EDITOR",
  onExport,
  onTitleChange,
  onOpenERDModal,
}: CanvasHeaderProps) {
  const router = useRouter();
  const [title, setTitle] = useState(board.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleTitleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || title === board.title) {
      setTitle(board.title);
      setIsEditingTitle(false);
      return;
    }

    try {
      const res = await fetch(`/api/boards/${board.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      if (res.ok) {
        setIsEditingTitle(false);
        onTitleChange?.(title.trim());
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setTitle(board.title);
      setIsEditingTitle(false);
    }
  };

  const backUrl = board.folder
    ? `/${board.workspace.slug}/folder/${board.folder.id}`
    : `/${board.workspace.slug}`;

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between select-none z-30 relative text-white">
      {/* Left: Navigation and Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          href={backUrl}
          className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-xs"
          title="Back to Dashboard"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline font-medium">Dashboard</span>
        </Link>

        <div className="h-4 w-px bg-slate-800 hidden sm:block" />

        {/* Title & Folder Badge */}
        <div className="flex items-center gap-2">
          {board.folder && (
            <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-300 text-xs">
              <Folder className="w-3 h-3 text-indigo-400" />
              <span className="truncate max-w-[100px]">{board.folder.name}</span>
            </div>
          )}

          {isEditingTitle && canEdit ? (
            <form onSubmit={handleTitleSubmit} className="flex items-center">
              <input
                type="text"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => handleTitleSubmit()}
                className="px-2 py-1 bg-slate-800 border border-indigo-500 rounded-lg text-sm font-semibold text-white focus:outline-none"
              />
            </form>
          ) : (
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => canEdit && setIsEditingTitle(true)}
              className="flex items-center gap-1.5 group px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors text-left cursor-pointer"
            >
              <h1 className="text-sm font-bold text-white tracking-tight truncate max-w-[200px] sm:max-w-xs">
                {title}
              </h1>
              {canEdit && (
                <Edit2 className="w-3 h-3 text-slate-500 group-hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Center: Save Status Indicator */}
      <div className="flex items-center gap-2">
        {saveStatus === "saved" && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-full">
            <Check className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Saved</span>
          </span>
        )}
        {saveStatus === "saving" && (
          <span className="flex items-center gap-1.5 text-xs text-indigo-400 bg-indigo-950/40 border border-indigo-800/40 px-2.5 py-1 rounded-full">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="hidden sm:inline">Saving...</span>
          </span>
        )}
        {saveStatus === "unsaved" && (
          <span className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="hidden sm:inline">Unsaved</span>
          </span>
        )}
        {saveStatus === "error" && (
          <span className="flex items-center gap-1.5 text-xs text-red-400 bg-red-950/40 border border-red-800/40 px-2.5 py-1 rounded-full">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Failed to save</span>
          </span>
        )}
      </div>

      {/* Right: Actions (Role badge, Share, Export) */}
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700/60 text-slate-300 text-xs">
          <Shield className="w-3 h-3 text-indigo-400" />
          <span className="font-semibold text-[10px] tracking-wider uppercase">
            {userRole}
          </span>
        </div>

        {/* Database ERD Tool */}
        {canEdit && (
          <button
            type="button"
            onClick={onOpenERDModal}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700/60 transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-sm cursor-pointer"
            title="Database ERD Visualization"
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">ERD (Database)</span>
          </button>
        )}

        {/* Share Button */}
        <button
          type="button"
          onClick={() => setShowShareModal(true)}
          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-sm cursor-pointer"
          title="Share Board"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Share</span>
        </button>

        {/* Export dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors flex items-center gap-1.5 text-xs cursor-pointer font-medium"
            title="Export Canvas"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {showExportMenu && (
            <div
              className="absolute right-0 mt-1.5 w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 text-xs"
              onClick={() => setShowExportMenu(false)}
            >
              <button
                type="button"
                onClick={() => onExport?.("png")}
                className="w-full px-3 py-2 text-left text-slate-200 hover:bg-slate-700/80 flex items-center justify-between cursor-pointer"
              >
                <span>Export as PNG</span>
                <span className="text-[10px] text-slate-400">.png</span>
              </button>
              <button
                type="button"
                onClick={() => onExport?.("svg")}
                className="w-full px-3 py-2 text-left text-slate-200 hover:bg-slate-700/80 flex items-center justify-between cursor-pointer"
              >
                <span>Export as SVG</span>
                <span className="text-[10px] text-slate-400">.svg</span>
              </button>
              <button
                type="button"
                onClick={() => onExport?.("json")}
                className="w-full px-3 py-2 text-left text-slate-200 hover:bg-slate-700/80 flex items-center justify-between cursor-pointer"
              >
                <span>Export Excalidraw JSON</span>
                <span className="text-[10px] text-slate-400">.excalidraw</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <ShareBoardModal
        boardId={board.id}
        boardTitle={board.title}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        canManage={canEdit}
      />
    </header>
  );
}
