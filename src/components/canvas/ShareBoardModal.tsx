"use client";

import React, { useState, useEffect } from "react";
import {
  Globe,
  Lock,
  Copy,
  Check,
  UserPlus,
  Trash2,
  Shield,
  Mail,
  Loader2,
  X,
  Share2,
} from "lucide-react";

interface ShareBoardModalProps {
  boardId: string;
  boardTitle: string;
  isOpen: boolean;
  onClose: () => void;
  canManage: boolean;
}

export function ShareBoardModal({
  boardId,
  boardTitle,
  isOpen,
  onClose,
  canManage,
}: ShareBoardModalProps) {
  const [loading, setLoading] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [publicAccess, setPublicAccess] = useState("VIEWER");
  const [shares, setShares] = useState<any[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [roleInput, setRoleInput] = useState("VIEWER");
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdatingPublic, setIsUpdatingPublic] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/board/${boardId}` : "";

  // Fetch current share status
  const loadShareData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/boards/${boardId}/share`);
      if (res.ok) {
        const data = await res.json();
        setIsPublic(data.isPublic || false);
        setPublicAccess(data.publicAccess || "VIEWER");
        setShares(data.shares || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadShareData();
    }
  }, [isOpen, boardId]);

  const handleTogglePublic = async (newPublic: boolean, newAccess?: string) => {
    setIsUpdatingPublic(true);
    setError(null);
    try {
      const res = await fetch(`/api/boards/${boardId}/share`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPublic: newPublic,
          publicAccess: newAccess || publicAccess,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsPublic(data.isPublic);
        setPublicAccess(data.publicAccess);
      } else {
        setError("Failed to update public sharing settings");
      }
    } catch (err) {
      setError("Error updating sharing settings");
    } finally {
      setIsUpdatingPublic(false);
    }
  };

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    setIsAdding(true);
    setError(null);
    try {
      const res = await fetch(`/api/boards/${boardId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailInput.trim(),
          role: roleInput,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setEmailInput("");
        setShares((prev) => [data, ...prev.filter((s) => s.email !== data.email)]);
      } else {
        setError(data.error || "Failed to share board");
      }
    } catch (err) {
      setError("Error inviting collaborator");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveCollaborator = async (shareId: string) => {
    try {
      const res = await fetch(`/api/boards/${boardId}/share/${shareId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setShares((prev) => prev.filter((s) => s.id !== shareId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Share &ldquo;{boardTitle}&rdquo;
              </h2>
              <p className="text-xs text-slate-400">
                Manage public link access and invite collaborators by email
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="my-3 p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-400 text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <span className="text-xs">Loading sharing settings...</span>
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            {/* 1. Public Link Sharing */}
            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPublic ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-700 text-slate-400"}`}>
                    {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-white">Public Link Access</h3>
                    <p className="text-[11px] text-slate-400">
                      {isPublic
                        ? "Anyone with the link can access this canvas"
                        : "Only invited workspace members and collaborators can view"}
                    </p>
                  </div>
                </div>

                {canManage && (
                  <button
                    type="button"
                    disabled={isUpdatingPublic}
                    onClick={() => handleTogglePublic(!isPublic)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${isPublic ? "bg-indigo-600" : "bg-slate-700"}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPublic ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                )}
              </div>

              {/* Public access role toggle & Copy Link */}
              {isPublic && (
                <div className="pt-2 border-t border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Public permission:</span>
                    <select
                      value={publicAccess}
                      disabled={!canManage || isUpdatingPublic}
                      onChange={(e) => handleTogglePublic(true, e.target.value)}
                      className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                    >
                      <option value="VIEWER">Can View (Read-Only)</option>
                      <option value="EDITOR">Can Edit (Collaborate)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Link Copied!" : "Copy Public Link"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* 2. Invite Collaborator by Email (triggers email notification!) */}
            {canManage && (
              <form onSubmit={handleAddCollaborator} className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Invite Collaborator by Email
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      placeholder="colleague@company.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <select
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value)}
                    className="px-2.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="EDITOR">Editor</option>
                  </select>
                  <button
                    type="submit"
                    disabled={isAdding}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                    <span>Send Invite</span>
                  </button>
                </div>
              </form>
            )}

            {/* 3. Direct Collaborators List */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Active Board Collaborators ({shares.length})
              </h3>
              {shares.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">
                  No individual collaborators invited yet.
                </p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {shares.map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between p-2.5 bg-slate-800/40 border border-slate-800 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                          {share.email[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-slate-200 font-medium truncate">
                            {share.user?.name || share.email}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">{share.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                          {share.role}
                        </span>
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCollaborator(share.id)}
                            className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                            title="Remove collaborator"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
