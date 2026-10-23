"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Edit2,
  FolderPlus,
} from "lucide-react";

export interface FolderNode {
  id: string;
  name: string;
  workspaceId: string;
  parentId?: string | null;
  children?: FolderNode[];
  _count?: {
    boards?: number;
    children?: number;
  };
}

interface FolderTreeProps {
  workspaceSlug: string;
  folders: FolderNode[];
  canEdit?: boolean;
  onRefresh?: () => void;
}

export function FolderTree({
  workspaceSlug,
  folders,
  canEdit = true,
  onRefresh,
}: FolderTreeProps) {
  const params = useParams();
  const currentFolderId = params?.folderId as string | undefined;

  return (
    <div className="space-y-0.5">
      {folders.length === 0 ? (
        <div className="text-xs text-slate-400 dark:text-slate-500 py-2 px-3 italic">
          No folders created yet
        </div>
      ) : (
        folders.map((folder) => (
          <FolderItem
            key={folder.id}
            folder={folder}
            workspaceSlug={workspaceSlug}
            currentFolderId={currentFolderId}
            canEdit={canEdit}
            onRefresh={onRefresh}
            level={0}
          />
        ))
      )}
    </div>
  );
}

function FolderItem({
  folder,
  workspaceSlug,
  currentFolderId,
  canEdit,
  onRefresh,
  level = 0,
}: {
  folder: FolderNode;
  workspaceSlug: string;
  currentFolderId?: string;
  canEdit: boolean;
  onRefresh?: () => void;
  level: number;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [folderName, setFolderName] = useState(folder.name);
  const [showSubfolderInput, setShowSubfolderInput] = useState(false);
  const [subfolderName, setSubfolderName] = useState("");

  const isActive = currentFolderId === folder.id;
  const hasChildren = folder.children && folder.children.length > 0;

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    try {
      const res = await fetch(`/api/folders/${folder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: folderName.trim() }),
      });
      if (res.ok) {
        setIsEditing(false);
        onRefresh?.();
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      !confirm(
        `Delete folder "${folder.name}" and any subfolders? Boards inside will move to the root workspace.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/folders/${folder.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (isActive) {
          router.push(`/${workspaceSlug}`);
        }
        onRefresh?.();
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSubfolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subfolderName.trim()) return;

    try {
      const res = await fetch(`/api/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: subfolderName.trim(),
          workspaceId: folder.workspaceId,
          parentId: folder.id,
        }),
      });
      if (res.ok) {
        setSubfolderName("");
        setShowSubfolderInput(false);
        setIsOpen(true);
        onRefresh?.();
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div
        className={`group relative flex items-center justify-between py-1.5 px-2 rounded-xl text-xs font-medium transition-all ${
          isActive
            ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold shadow-sm"
            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
        }`}
        style={{ paddingLeft: `${Math.max(8, level * 16 + 8)}px` }}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
              className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              {isOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <span className="w-3.5" />
          )}

          {isEditing ? (
            <form onSubmit={handleRename} className="flex-1">
              <input
                type="text"
                value={folderName}
                autoFocus
                onChange={(e) => setFolderName(e.target.value)}
                onBlur={handleRename}
                className="w-full px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-indigo-400 rounded text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </form>
          ) : (
            <Link
              href={`/${workspaceSlug}/folder/${folder.id}`}
              className="flex items-center gap-2 flex-1 truncate"
            >
              {isOpen ? (
                <FolderOpen className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              )}
              <span className="truncate">{folder.name}</span>
            </Link>
          )}
        </div>

        {/* Action icons on hover */}
        {canEdit && !isEditing && (
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
            <button
              type="button"
              title="Add Subfolder"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowSubfolderInput(true);
              }}
              className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400 rounded cursor-pointer"
            >
              <FolderPlus className="w-3 h-3" />
            </button>
            <button
              type="button"
              title="Rename Folder"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400 rounded cursor-pointer"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              type="button"
              title="Delete Folder"
              onClick={handleDelete}
              className="p-1 hover:text-red-600 dark:hover:text-red-400 rounded cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Subfolder Creation Inline Form */}
      {showSubfolderInput && (
        <form
          onSubmit={handleCreateSubfolder}
          className="my-1 flex items-center gap-1"
          style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}
        >
          <input
            type="text"
            placeholder="Subfolder name..."
            autoFocus
            value={subfolderName}
            onChange={(e) => setSubfolderName(e.target.value)}
            className="flex-1 px-2 py-1 bg-white dark:bg-slate-800 border border-indigo-400 rounded text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
          />
          <button
            type="submit"
            className="px-2 py-1 bg-indigo-600 text-white rounded text-xs font-medium cursor-pointer"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setShowSubfolderInput(false)}
            className="px-1.5 py-1 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
          >
            ✕
          </button>
        </form>
      )}

      {/* Recursive Children rendering */}
      {isOpen && hasChildren && (
        <div className="space-y-0.5">
          {folder.children!.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              workspaceSlug={workspaceSlug}
              currentFolderId={currentFolderId}
              canEdit={canEdit}
              onRefresh={onRefresh}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
