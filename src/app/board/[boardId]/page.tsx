import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import ExcalidrawWrapper from "@/components/canvas/ExcalidrawWrapper";

interface BoardPageProps {
  params: {
    boardId: string;
  };
}

export default async function BoardPage({ params }: BoardPageProps) {
  const user = await getCurrentUser();

  const board = await db.board.findUnique({
    where: { id: params.boardId },
    include: {
      workspace: true,
      folder: true,
      creator: {
        select: { id: true, name: true, email: true },
      },
      shares: {
        where: user?.email ? { email: user.email.toLowerCase() } : undefined,
      },
    },
  });

  if (!board) {
    notFound();
  }

  // Check 1: Public Board Access (No authentication required if isPublic is true)
  if (!user?.id) {
    if (board.isPublic) {
      return (
        <ExcalidrawWrapper
          board={board}
          currentUserRole={board.publicAccess}
          canEdit={board.publicAccess !== "VIEWER"}
          isPublicAccess={true}
        />
      );
    }
    // If not public, redirect to login
    redirect(`/login?callbackUrl=/board/${params.boardId}`);
  }

  // Check 2: Workspace Membership
  const membership = await db.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId: board.workspaceId,
      },
    },
  });

  // Check 3: Direct Board Share
  const directShare = board.shares && board.shares.length > 0 ? board.shares[0] : null;

  // Determine Effective Role & Editing Permissions
  let effectiveRole = "VIEWER";
  let hasAccess = false;

  if (user.isPlatformAdmin || board.creatorId === user.id) {
    effectiveRole = "OWNER";
    hasAccess = true;
  } else if (membership) {
    effectiveRole = membership.role;
    hasAccess = true;
  } else if (directShare) {
    effectiveRole = directShare.role;
    hasAccess = true;
  } else if (board.isPublic) {
    effectiveRole = board.publicAccess;
    hasAccess = true;
  }

  if (!hasAccess) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-slate-300 p-4">
        <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-sm text-slate-400 mb-6">
          This board is private and has not been shared with your account.
        </p>
        <a
          href="/"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors"
        >
          Return to Workspaces
        </a>
      </div>
    );
  }

  const canEdit = effectiveRole !== "VIEWER";

  return (
    <ExcalidrawWrapper
      board={board}
      currentUserRole={effectiveRole}
      canEdit={canEdit}
      isPublicAccess={!membership && !directShare && board.isPublic}
    />
  );
}
