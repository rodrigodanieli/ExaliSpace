"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  User,
  Settings,
  Shield,
  Users,
  Layers,
  Database,
  Mail,
  ArrowLeft,
  Check,
  AlertCircle,
  Loader2,
  Trash2,
  KeyRound,
  UserPlus,
  RefreshCw,
  Clock,
  HardDrive,
  Eye,
  EyeOff,
  Palette,
  Send,
  BookOpen,
  Sparkles,
  Grid,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface SettingsClientViewProps {
  initialUser: {
    id: string;
    name: string | null;
    email: string;
    isPlatformAdmin: boolean;
    lastLoginAt: Date | string | null;
    accentColor: string | null;
    preferredTheme: string | null;
    createdAt: Date | string;
  };
  returnSlug: string;
}

type TabType = "profile" | "users" | "workspaces" | "boards" | "storage" | "email";

export function SettingsClientView({ initialUser, returnSlug }: SettingsClientViewProps) {
  const router = useRouter();
  const { update } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>("profile");

  // Profile Form State
  const [profileName, setProfileName] = useState(initialUser.name || "");
  const [accentColor, setAccentColor] = useState(initialUser.accentColor || "#4f46e5");
  const [preferredTheme, setPreferredTheme] = useState(initialUser.preferredTheme || "dark");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // System Users State
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteIsAdmin, setInviteIsAdmin] = useState(false);
  const [invitingUser, setInvitingUser] = useState(false);
  const [resetModalUserId, setResetModalUserId] = useState<string | null>(null);
  const [adminNewPassword, setAdminNewPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  // System Workspaces State
  const [workspaceData, setWorkspaceData] = useState<{ kpis: any; workspaces: any[] } | null>(null);
  const [workspacesLoading, setWorkspacesLoading] = useState(false);

  // System Storage State
  const [storageData, setStorageData] = useState<any>(null);
  const [storageLoading, setStorageLoading] = useState(false);

  // System Email / SMTP State
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpFrom, setSmtpFrom] = useState("");
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpMsg, setSmtpMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [testEmailRecipient, setTestEmailRecipient] = useState(initialUser.email);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // System Global Boards & Libraries State
  const [defaultGridMode, setDefaultGridMode] = useState(false);
  const [defaultCanvasTheme, setDefaultCanvasTheme] = useState("dark");
  const [globalLibraries, setGlobalLibraries] = useState<any[]>([]);
  const [newLibName, setNewLibName] = useState("");
  const [boardsSettingsSaving, setBoardsSettingsSaving] = useState(false);

  const isPlatformAdmin = initialUser.isPlatformAdmin;

  // Load section data when tabs change
  useEffect(() => {
    if (activeTab === "users" && isPlatformAdmin) {
      loadUsers();
    } else if (activeTab === "workspaces" && isPlatformAdmin) {
      loadWorkspaces();
    } else if (activeTab === "storage" && isPlatformAdmin) {
      loadStorage();
    } else if (activeTab === "email" && isPlatformAdmin) {
      loadSettings();
    } else if (activeTab === "boards" && isPlatformAdmin) {
      loadSettings();
    }
  }, [activeTab, isPlatformAdmin]);

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const res = await fetch("/api/users");
      if (res.ok) setUsersList(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadWorkspaces = async () => {
    try {
      setWorkspacesLoading(true);
      const res = await fetch("/api/system/workspaces");
      if (res.ok) setWorkspaceData(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setWorkspacesLoading(false);
    }
  };

  const loadStorage = async () => {
    try {
      setStorageLoading(true);
      const res = await fetch("/api/system/storage");
      if (res.ok) setStorageData(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setStorageLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/system/settings");
      if (res.ok) {
        const data = await res.json();
        setSmtpHost(data.smtpHost || "");
        setSmtpPort(data.smtpPort || 587);
        setSmtpUser(data.smtpUser || "");
        setSmtpSecure(!!data.smtpSecure);
        setSmtpFrom(data.smtpFrom || "");
        setDefaultGridMode(!!data.defaultGridMode);
        setDefaultCanvasTheme(data.defaultTheme || "dark");
        setGlobalLibraries(Array.isArray(data.globalLibraries) ? data.globalLibraries : []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 1. Profile update handler
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);

    if (newPassword && newPassword !== confirmPassword) {
      setProfileMsg({ type: "error", text: "New passwords do not match" });
      setProfileSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName,
          accentColor,
          preferredTheme,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setProfileMsg({ type: "success", text: "Profile preferences saved successfully!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        // Refresh session
        await update({ name: data.name, accentColor: data.accentColor, preferredTheme: data.preferredTheme });
      } else {
        setProfileMsg({ type: "error", text: data.error || "Failed to update profile" });
      }
    } catch (err: any) {
      setProfileMsg({ type: "error", text: err?.message || "An unexpected error occurred" });
    } finally {
      setProfileSaving(false);
    }
  };

  // 2. SMTP update handler
  const handleSmtpSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmtpSaving(true);
    setSmtpMsg(null);

    try {
      const res = await fetch("/api/system/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPassword: smtpPassword || undefined,
          smtpSecure,
          smtpFrom,
        }),
      });

      if (res.ok) {
        setSmtpMsg({ type: "success", text: "SMTP configuration saved and activated!" });
        setSmtpPassword("");
      } else {
        const data = await res.json();
        setSmtpMsg({ type: "error", text: data.error || "Failed to save SMTP settings" });
      }
    } catch (err: any) {
      setSmtpMsg({ type: "error", text: err?.message || "Error saving SMTP settings" });
    } finally {
      setSmtpSaving(false);
    }
  };

  // 3. Test Email Sender
  const handleSendTestEmail = async () => {
    if (!testEmailRecipient) return;
    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/system/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testEmailRecipient,
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPassword,
          smtpSecure,
          smtpFrom,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTestResult({ success: true, message: data.message || "Test email sent successfully!" });
      } else {
        setTestResult({ success: false, message: data.error || "Failed to send test email" });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || "Error executing test" });
    } finally {
      setSendingTest(false);
    }
  };

  // 4. Save Boards Global Settings
  const handleSaveBoardSettings = async () => {
    setBoardsSettingsSaving(true);
    try {
      const res = await fetch("/api/system/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultGridMode,
          defaultTheme: defaultCanvasTheme,
          globalLibraries,
        }),
      });
      if (res.ok) {
        alert("Global canvas and library presets saved!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBoardsSettingsSaving(false);
    }
  };

  // 5. Add Global Library item
  const handleAddLibrary = () => {
    if (!newLibName.trim()) return;
    setGlobalLibraries((prev) => [
      ...prev,
      {
        id: `lib-${Date.now()}`,
        name: newLibName.trim(),
        createdAt: new Date().toISOString(),
        itemsCount: 12,
      },
    ]);
    setNewLibName("");
  };

  const handleRemoveLibrary = (id: string) => {
    setGlobalLibraries((prev) => prev.filter((l) => l.id !== id));
  };

  // 6. User Invite / Creation
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvitingUser(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inviteName,
          email: inviteEmail,
          password: invitePassword,
          isPlatformAdmin: inviteIsAdmin,
        }),
      });

      if (res.ok) {
        setShowInviteModal(false);
        setInviteName("");
        setInviteEmail("");
        setInvitePassword("");
        setInviteIsAdmin(false);
        loadUsers();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to create user");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setInvitingUser(false);
    }
  };

  // 7. Toggle User Admin Role
  const handleToggleUserAdmin = async (userId: string, currentAdmin: boolean) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPlatformAdmin: !currentAdmin }),
      });
      if (res.ok) {
        setUsersList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isPlatformAdmin: !currentAdmin } : u))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 8. Admin Reset User Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUserId || !adminNewPassword) return;
    setResettingPassword(true);

    try {
      const res = await fetch(`/api/users/${resetModalUserId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: adminNewPassword }),
      });

      if (res.ok) {
        alert("Password updated successfully!");
        setResetModalUserId(null);
        setAdminNewPassword("");
      } else {
        const d = await res.json();
        alert(d.error || "Failed to reset password");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setResettingPassword(false);
    }
  };

  // 9. Admin Delete User
  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Permanently delete user ${email}?`)) return;
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        setUsersList((prev) => prev.filter((u) => u.id !== userId));
      } else {
        const d = await res.json();
        alert(d.error || "Failed to delete user");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 10. Admin Delete Workspace
  const handleDeleteWorkspace = async (workspaceId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete workspace "${name}" and all its boards?`)) return;
    try {
      const res = await fetch(`/api/system/workspaces/${workspaceId}`, { method: "DELETE" });
      if (res.ok) {
        loadWorkspaces();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to delete workspace");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const colorPalettes = [
    { label: "Indigo", value: "#4f46e5" },
    { label: "Violet", value: "#7c3aed" },
    { label: "Emerald", value: "#059669" },
    { label: "Sky", value: "#0284c7" },
    { label: "Rose", value: "#e11d48" },
    { label: "Amber", value: "#d97706" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Settings Navigation Sidebar */}
      <aside className="w-full md:w-72 bg-slate-900 border-r border-slate-800 p-5 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Header & Return Link */}
          <div>
            <Link
              href={returnSlug ? `/${returnSlug}` : "/"}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Workspace</span>
            </Link>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-400" />
              Settings
            </h1>
            <p className="text-xs text-slate-400 mt-1">Platform and profile controls</p>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Personal
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                activeTab === "profile"
                  ? "bg-indigo-600 text-white shadow-sm font-semibold"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile & Preferences</span>
            </button>

            {/* System Section (Admin Only) */}
            <div className="pt-4 px-3 py-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span>System & Admin</span>
              {isPlatformAdmin ? (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Admin
                </span>
              ) : (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-500">
                  Locked
                </span>
              )}
            </div>

            {isPlatformAdmin ? (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab("users")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                    activeTab === "users"
                      ? "bg-indigo-600 text-white shadow-sm font-semibold"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>Users & Access</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("workspaces")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                    activeTab === "workspaces"
                      ? "bg-indigo-600 text-white shadow-sm font-semibold"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Workspaces & Teams</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("boards")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                    activeTab === "boards"
                      ? "bg-indigo-600 text-white shadow-sm font-semibold"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span>Boards & Libraries</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("storage")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                    activeTab === "storage"
                      ? "bg-indigo-600 text-white shadow-sm font-semibold"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <HardDrive className="w-4 h-4 text-rose-400" />
                  <span>Storage & Database</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("email")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                    activeTab === "email"
                      ? "bg-indigo-600 text-white shadow-sm font-semibold"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Mail className="w-4 h-4 text-violet-400" />
                  <span>Email Server (SMTP)</span>
                </button>
              </>
            ) : (
              <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl text-[11px] text-slate-500 italic">
                System administration options are only accessible by platform administrators.
              </div>
            )}
          </nav>
        </div>

        {/* User Card */}
        <div className="p-3 bg-slate-800/60 border border-slate-800 rounded-xl flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white"
            style={{ backgroundColor: accentColor || "#4f46e5" }}
          >
            {(profileName || initialUser.email)[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{profileName || initialUser.email}</p>
            <p className="text-[10px] text-slate-400 truncate">{initialUser.email}</p>
          </div>
        </div>
      </aside>

      {/* Main Settings Content Area */}
      <main className="flex-1 p-6 md:p-10 max-w-5xl overflow-y-auto">
        {/* TAB 1: Profile & Preferences */}
        {activeTab === "profile" && (
          <div className="space-y-8 animate-in fade-in">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white tracking-tight">Profile & Preferences</h2>
              <p className="text-xs text-slate-400 mt-1">
                Customize your display identity, theme preferences, and credentials
              </p>
            </div>

            {profileMsg && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                  profileMsg.type === "success"
                    ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                    : "bg-red-950/40 border-red-800/60 text-red-300"
                }`}
              >
                {profileMsg.type === "success" ? (
                  <Check className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleProfileUpdate} className="space-y-6 max-w-xl">
              {/* Profile Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={initialUser.email}
                    className="w-full px-3.5 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-sm text-slate-400 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Managed by administrator</p>
                </div>

                {/* Accent Color Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Accent Theme Color</span>
                  </label>
                  <div className="flex items-center gap-3">
                    {colorPalettes.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setAccentColor(c.value)}
                        className={`w-8 h-8 rounded-full transition-transform flex items-center justify-center cursor-pointer ${
                          accentColor === c.value ? "ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-110" : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      >
                        {accentColor === c.value && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preferred Canvas Theme */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Default Canvas Appearance
                  </label>
                  <select
                    value={preferredTheme}
                    onChange={(e) => setPreferredTheme(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                  >
                    <option value="dark">Dark Theme (Standard)</option>
                    <option value="light">Light Theme</option>
                  </select>
                </div>
              </div>

              {/* Password Change Box */}
              <div className="pt-6 border-t border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-400" />
                  <span>Change Password</span>
                </h3>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: Users & Access (Admin Only) */}
        {activeTab === "users" && isPlatformAdmin && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Platform Users</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Manage accounts, toggle administrative privileges, and reset passwords
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadUsers}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors cursor-pointer"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create User</span>
                </button>
              </div>
            </div>

            {usersLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                <span className="text-xs">Loading users...</span>
              </div>
            ) : (
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/40">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Last Login</th>
                      <th className="py-3 px-4">Stats</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{u.name || "Unnamed"}</div>
                          <div className="text-[11px] text-slate-400">{u.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleUserAdmin(u.id, u.isPlatformAdmin)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer border ${
                              u.isPlatformAdmin
                                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                                : "bg-slate-800 text-slate-400 border-slate-700"
                            }`}
                            title="Click to toggle Admin / User role"
                          >
                            {u.isPlatformAdmin ? "Admin" : "User"}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-400">
                          {u.lastLoginAt ? (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {formatRelativeTime(u.lastLoginAt)}
                            </span>
                          ) : (
                            <span className="text-slate-600 italic">Never</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-400">
                          {u._count?.workspaces || 0} workspaces • {u._count?.createdBoards || 0} boards
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <button
                            type="button"
                            onClick={() => setResetModalUserId(u.id)}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Reset Password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Workspaces & KPIs (Admin Only) */}
        {activeTab === "workspaces" && isPlatformAdmin && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Workspaces & Teams</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Cross-team workspace overview, inactive project detection and governance
                </p>
              </div>
              <button
                type="button"
                onClick={loadWorkspaces}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors cursor-pointer self-start"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* KPIs Cards */}
            {workspaceData?.kpis && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                  <div className="text-xs text-slate-400 font-medium">Total Workspaces</div>
                  <div className="text-2xl font-bold text-white mt-1">{workspaceData.kpis.totalWorkspaces}</div>
                </div>
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                  <div className="text-xs text-amber-400 font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Inactive (&gt;30d)</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-400 mt-1">
                    {workspaceData.kpis.inactiveWorkspacesCount}
                  </div>
                </div>
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                  <div className="text-xs text-slate-400 font-medium">Total Canvas Boards</div>
                  <div className="text-2xl font-bold text-white mt-1">{workspaceData.kpis.totalBoards}</div>
                </div>
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                  <div className="text-xs text-slate-400 font-medium">Team Memberships</div>
                  <div className="text-2xl font-bold text-white mt-1">{workspaceData.kpis.totalMembers}</div>
                </div>
              </div>
            )}

            {/* Workspaces List Table */}
            {workspacesLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                <span className="text-xs">Loading workspaces...</span>
              </div>
            ) : (
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/40">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Workspace</th>
                      <th className="py-3 px-4">Owner</th>
                      <th className="py-3 px-4">Stats</th>
                      <th className="py-3 px-4">Last Activity</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {workspaceData?.workspaces.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <Link
                            href={`/${w.slug}`}
                            className="font-semibold text-white hover:text-indigo-400 transition-colors"
                          >
                            {w.name}
                          </Link>
                          <div className="text-[11px] text-slate-500">/{w.slug}</div>
                        </td>
                        <td className="py-3 px-4">
                          {w.owner ? (
                            <div>
                              <div className="text-white font-medium">{w.owner.name || "Owner"}</div>
                              <div className="text-[11px] text-slate-400">{w.owner.email}</div>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">No Owner</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-400">
                          {w.counts.boards} boards • {w.counts.folders} folders • {w.counts.members} members
                        </td>
                        <td className="py-3 px-4 text-[11px]">
                          {w.isInactive ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
                              Inactive ({formatRelativeTime(w.updatedAt)})
                            </span>
                          ) : (
                            <span className="text-slate-400">{formatRelativeTime(w.updatedAt)}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteWorkspace(w.id, w.name)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Delete Workspace"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Boards & Global Libraries (Admin Only) */}
        {activeTab === "boards" && isPlatformAdmin && (
          <div className="space-y-6 animate-in fade-in max-w-2xl">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white tracking-tight">Boards & Global Presets</h2>
              <p className="text-xs text-slate-400 mt-1">
                Configure global defaults and preloaded Excalidraw libraries for all boards
              </p>
            </div>

            {/* Presets */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Canvas Presets</h3>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Default Grid Mode</div>
                  <div className="text-[11px] text-slate-400">Display canvas grid background automatically on new boards</div>
                </div>
                <input
                  type="checkbox"
                  checked={defaultGridMode}
                  onChange={(e) => setDefaultGridMode(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 cursor-pointer h-4 w-4"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-white">Default Theme</div>
                  <div className="text-[11px] text-slate-400">Standard theme applied to newly created canvases</div>
                </div>
                <select
                  value={defaultCanvasTheme}
                  onChange={(e) => setDefaultCanvasTheme(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                >
                  <option value="dark">Dark Theme</option>
                  <option value="light">Light Theme</option>
                </select>
              </div>
            </div>

            {/* Global Libraries & Kits */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
                <span>Preloaded Libraries ({globalLibraries.length})</span>
                <span className="text-[10px] text-indigo-400 font-normal">Reflected in all boards</span>
              </h3>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Library kit name (e.g. AWS Architecture, Flowchart Icons)..."
                  value={newLibName}
                  onChange={(e) => setNewLibName(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddLibrary}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Add Kit
                </button>
              </div>

              <div className="space-y-2">
                {globalLibraries.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">No global library kits added yet.</p>
                ) : (
                  globalLibraries.map((lib) => (
                    <div
                      key={lib.id}
                      className="flex items-center justify-between p-3 bg-slate-800/60 border border-slate-800 rounded-xl text-xs"
                    >
                      <div>
                        <div className="font-semibold text-white">{lib.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {lib.itemsCount || 10} reusable components • Global preset
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLibrary(lib.id)}
                        className="p-1 text-slate-500 hover:text-red-400 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveBoardSettings}
                disabled={boardsSettingsSaving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                {boardsSettingsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Save Board Presets</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: Storage & Database (Admin Only) */}
        {activeTab === "storage" && isPlatformAdmin && (
          <div className="space-y-6 animate-in fade-in max-w-3xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Storage & Database Metrics</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Inspect database utilization, board vector weights, and disk uploads volume
                </p>
              </div>
              <button
                type="button"
                onClick={loadStorage}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors cursor-pointer self-start"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {storageLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                <span className="text-xs">Calculating metrics...</span>
              </div>
            ) : storageData ? (
              <div className="space-y-4">
                {/* Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                    <div className="text-xs text-slate-400 font-medium">Total Storage Used</div>
                    <div className="text-2xl font-bold text-indigo-400 mt-1">
                      {storageData.totalUsageMB} <span className="text-sm font-normal text-slate-400">MB</span>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                    <div className="text-xs text-slate-400 font-medium">Database Canvas JSON</div>
                    <div className="text-2xl font-bold text-emerald-400 mt-1">
                      {storageData.database.estimatedJsonMB}{" "}
                      <span className="text-sm font-normal text-slate-400">MB</span>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                    <div className="text-xs text-slate-400 font-medium">Uploaded Assets (Disk)</div>
                    <div className="text-2xl font-bold text-sky-400 mt-1">
                      {storageData.disk.uploadSizeMB}{" "}
                      <span className="text-sm font-normal text-slate-400">MB</span>
                    </div>
                  </div>
                </div>

                {/* Details Breakdown */}
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Breakdown Details</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block">Total Elements:</span>
                      <strong className="text-white text-sm">{storageData.database.totalElementsCount}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Total Boards:</span>
                      <strong className="text-white text-sm">{storageData.database.boardCount}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Avg Board Weight:</span>
                      <strong className="text-white text-sm">{storageData.database.avgBoardKB} KB</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Files in Disk:</span>
                      <strong className="text-white text-sm">{storageData.disk.uploadFilesCount}</strong>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* TAB 6: Email Server (SMTP) (Admin Only) */}
        {activeTab === "email" && isPlatformAdmin && (
          <div className="space-y-6 animate-in fade-in max-w-2xl">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white tracking-tight">Email Server (SMTP)</h2>
              <p className="text-xs text-slate-400 mt-1">
                Configure your outgoing transactional email server with application credentials
              </p>
            </div>

            {smtpMsg && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                  smtpMsg.type === "success"
                    ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                    : "bg-red-950/40 border-red-800/60 text-red-300"
                }`}
              >
                {smtpMsg.type === "success" ? (
                  <Check className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{smtpMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSmtpSave} className="space-y-4 p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">SMTP Credentials</h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1">SMTP Host</label>
                  <input
                    type="text"
                    required
                    placeholder="smtp.gmail.com"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Port</label>
                  <input
                    type="number"
                    required
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">SMTP Username / Email</label>
                  <input
                    type="text"
                    placeholder="user@domain.com"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    App Password
                  </label>
                  <div className="relative">
                    <input
                      type={showSmtpPassword ? "text" : "password"}
                      placeholder="••••••••••••••••"
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                    >
                      {showSmtpPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Sender &ldquo;From&rdquo; Display</label>
                <input
                  type="text"
                  placeholder='ExcaliSpace &lt;noreply@excalispace.local&gt;'
                  value={smtpFrom}
                  onChange={(e) => setSmtpFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="smtpSecureToggle"
                  checked={smtpSecure}
                  onChange={(e) => setSmtpSecure(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="smtpSecureToggle" className="text-xs text-slate-300 font-medium cursor-pointer">
                  Use SSL/TLS (Direct port 465 or required encryption)
                </label>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={smtpSaving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-2 shadow-sm"
                >
                  {smtpSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save SMTP Configuration</span>
                </button>
              </div>
            </form>

            {/* Test Email Section */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Send className="w-3.5 h-3.5 text-indigo-400" />
                <span>Test Outgoing Connection</span>
              </h3>
              <p className="text-xs text-slate-400">
                Send a real test message to verify your SMTP server responds with authentication success.
              </p>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="email"
                  placeholder="recipient@example.com"
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
                <button
                  type="button"
                  disabled={sendingTest}
                  onClick={handleSendTestEmail}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-xs font-medium cursor-pointer flex items-center gap-1.5"
                >
                  {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Send Test Email</span>
                </button>
              </div>

              {testResult && (
                <div
                  className={`mt-2 p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    testResult.success
                      ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                      : "bg-red-950/40 border-red-800/60 text-red-300"
                  }`}
                >
                  {testResult.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Invite / Create User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-3">Create New Platform User</h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Name</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="john@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="adminCheck"
                  checked={inviteIsAdmin}
                  onChange={(e) => setInviteIsAdmin(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="adminCheck" className="text-xs text-slate-300 cursor-pointer">
                  Platform Administrator
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={invitingUser}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
                >
                  {invitingUser ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Reset User Password</h3>
            <p className="text-xs text-slate-400 mb-4">Assign a new password for this user account.</p>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={adminNewPassword}
                  onChange={(e) => setAdminNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setResetModalUserId(null)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
                >
                  {resettingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
