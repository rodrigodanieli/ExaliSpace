"use client";

import React, { useState } from "react";
import { Users, Plus } from "lucide-react";
import { CreateBoardModal } from "./CreateBoardModal";
import { ManageTeamModal } from "./ManageTeamModal";

interface WorkspaceHeaderActionsProps {
  workspaceId: string;
  workspaceName: string;
  userRole: string;
  folders: Array<{ id: string; name: string }>;
}

export function WorkspaceHeaderActions({
  workspaceId,
  workspaceName,
  userRole,
  folders,
}: WorkspaceHeaderActionsProps) {
  const [showTeamModal, setShowTeamModal] = useState(false);
  const canEdit = userRole !== "VIEWER";

  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={() => setShowTeamModal(true)}
        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700/80 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
      >
        <Users className="w-3.5 h-3.5 text-emerald-400" />
        <span>Team & Members</span>
      </button>

      {canEdit && (
        <CreateBoardModal
          workspaceId={workspaceId}
          folders={folders}
          buttonLabel="New Board"
        />
      )}

      <ManageTeamModal
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        currentUserRole={userRole}
      />
    </div>
  );
}
