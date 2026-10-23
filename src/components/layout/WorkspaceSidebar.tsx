"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Layout,
  FolderPlus,
  Plus,
  LogOut,
  ChevronDown,
  Layers,
  Sparkles,
  Shield,
  Check,
  Users,
  UserCheck,
  Settings,
} from "lucide-react";
import { FolderTree, FolderNode } from "../dashboard/FolderTree";
import { CreateBoardModal } from "../dashboard/CreateBoardModal";
import { ManageTeamModal } from "../dashboard/ManageTeamModal";
import { UserManagementModal } from "../dashboard/UserManagementModal";

interface WorkspaceSidebarProps {
  currentWorkspace: {
    id: string;
    name: string;
    slug: string;
  };
  workspaces: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
  }>;
  folders: FolderNode[];
  userRole?: string;
}

export function WorkspaceSidebar({
  currentWorkspace,
  workspaces,
  folders,
  userRole = "EDITOR",
}: WorkspaceSidebarProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  const canEdit = userRole !== "VIEWER";

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setCreatingFolder(true);
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName.trim(),
          workspaceId: currentWorkspace.id,
        }),
      });

      if (res.ok) {
        setNewFolderName("");
        setShowCreateFolder(false);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    setCreatingWorkspace(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWorkspaceName.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.slug) {
        setNewWorkspaceName("");
        setShowCreateWorkspace(false);
        router.push(`/${data.slug}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingWorkspace(false);
    }
  };

  return (
    <aside className="w-64 h-screen bg-slate-900 border-r border-slate-800 flex flex-col justify-between select-none">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Workspace Switcher Header */}
        <div className="p-4 border-b border-slate-800 relative">
          <button
            type="button"
            onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
            className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                {currentWorkspace.name[0]?.toUpperCase() || "W"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">
                  {currentWorkspace.name}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Shield className="w-2.5 h-2.5 text-indigo-400" />
                  <span className="uppercase tracking-wider font-semibold">
                    {userRole}
                  </span>
                </div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 ml-1" />
          </button>

          {/* Workspace dropdown menu */}
          {workspaceDropdownOpen && (
            <div className="absolute top-16 left-4 right-4 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-40 text-xs">
              <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Workspaces
              </div>
              <div className="max-h-48 overflow-y-auto">
                {workspaces.map((w) => (
                  <Link
                    key={w.id}
                    href={`/${w.slug}`}
                    onClick={() => setWorkspaceDropdownOpen(false)}
                    className="flex items-center justify-between px-3 py-2 text-slate-200 hover:bg-slate-700/60 transition-colors"
                  >
                    <span className="truncate">{w.name}</span>
                    {w.id === currentWorkspace.id && (
                      <Check className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                  </Link>
                ))}
              </div>

              <div className="border-t border-slate-700 mt-1 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceDropdownOpen(false);
                    setShowCreateWorkspace(true);
                  }}
                  className="w-full px-3 py-2 text-indigo-400 hover:bg-slate-700/60 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create New Workspace
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Button: Create Board */}
        <div className="p-4 pb-2">
          {canEdit && (
            <CreateBoardModal
              workspaceId={currentWorkspace.id}
              folders={folders}
              triggerClassName="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              buttonLabel="New Board"
            />
          )}
        </div>

        {/* Navigation list */}
        <div className="px-3 py-2 space-y-0.5">
          <Link
            href={`/${currentWorkspace.slug}`}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>All Workspace Boards</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowTeamModal(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer text-left"
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Team & Members</span>
          </button>

          <button
            type="button"
            onClick={() => setShowUserModal(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer text-left"
          >
            <UserCheck className="w-4 h-4 text-sky-400" />
            <span>Manage Users</span>
          </button>
        </div>

        {/* Folders Section (Miro Hierarchy) */}
        <div className="flex-1 min-h-0 px-3 py-2 flex flex-col">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Folders
            </span>
            {canEdit && (
              <button
                type="button"
                onClick={() => setShowCreateFolder(true)}
                title="Create Folder"
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* New Folder Modal / Input */}
          {showCreateFolder && (
            <form onSubmit={handleCreateFolder} className="mb-2 px-1">
              <div className="flex items-center gap-1.5 bg-slate-800 p-1.5 rounded-xl border border-indigo-500/50">
                <input
                  type="text"
                  autoFocus
                  placeholder="Folder name..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full bg-transparent px-2 py-1 text-xs text-white focus:outline-none placeholder-slate-500"
                />
                <button
                  type="submit"
                  disabled={creatingFolder}
                  className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-medium cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateFolder(false)}
                  className="px-2 py-1 text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </form>
          )}

          {/* Scrollable Folder Tree */}
          <div className="flex-1 overflow-y-auto pr-1">
            <FolderTree
              workspaceSlug={currentWorkspace.slug}
              folders={folders}
              canEdit={canEdit}
            />
          </div>
        </div>
      </div>

      {/* User Session Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0"
            style={{ backgroundColor: (session?.user as any)?.accentColor || "#4f46e5" }}
          >
            {session?.user?.name?.[0]?.toUpperCase() ||
              session?.user?.email?.[0]?.toUpperCase() ||
              "U"}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {session?.user?.name || "User"}
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              {session?.user?.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Link
            href="/settings"
            title="Settings & Platform Management"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </Link>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Create Workspace Modal */}
      {showCreateWorkspace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-3">
              Create New Workspace
            </h3>
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Design Team, Startup Inc."
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateWorkspace(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingWorkspace}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Manage Team Modal */}
      <ManageTeamModal
        workspaceId={currentWorkspace.id}
        workspaceName={currentWorkspace.name}
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        currentUserRole={userRole}
      />

      {/* Platform User Management Modal */}
      <UserManagementModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
      />
    </aside>
  );
}
