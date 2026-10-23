import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendWorkspaceInviteEmail } from "@/lib/email";
import { Role } from "@prisma/client";

// GET /api/workspaces/[workspaceId]/members
export async function GET(
  req: Request,
  { params }: { params: { workspaceId: string } }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if current user is member of this workspace
  const currentMember = await db.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: currentUser.id,
        workspaceId: params.workspaceId,
      },
    },
  });

  if (!currentMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await db.workspaceMember.findMany({
    where: { workspaceId: params.workspaceId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          isPlatformAdmin: true,
        },
      },
    },
    orderBy: { role: "asc" },
  });

  return NextResponse.json(members);
}

// POST /api/workspaces/[workspaceId]/members - Invite / Add member to workspace
export async function POST(
  req: Request,
  { params }: { params: { workspaceId: string } }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if inviter is OWNER or ADMIN
  const currentMember = await db.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: currentUser.id,
        workspaceId: params.workspaceId,
      },
    },
    include: { workspace: true },
  });

  if (!currentMember || (currentMember.role !== "OWNER" && currentMember.role !== "ADMIN")) {
    return NextResponse.json(
      { error: "Insufficient permissions to invite team members" },
      { status: 403 }
    );
  }

  try {
    const { email, role = "EDITOR" } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if target user exists in database
    let targetUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User with this email not found. Please create the user first in User Management." },
        { status: 404 }
      );
    }

    // Check if already a member
    const existingMembership = await db.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: targetUser.id,
          workspaceId: params.workspaceId,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: "User is already a member of this workspace" },
        { status: 409 }
      );
    }

    const memberRole = (["OWNER", "ADMIN", "EDITOR", "VIEWER"].includes(role) ? role : "EDITOR") as Role;

    const newMember = await db.workspaceMember.create({
      data: {
        userId: targetUser.id,
        workspaceId: params.workspaceId,
        role: memberRole,
      },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
        workspace: true,
      },
    });

    // Trigger Workspace Invitation Email
    sendWorkspaceInviteEmail({
      to: targetUser.email,
      inviterName: currentUser.name || currentUser.email || "Team Admin",
      workspaceName: currentMember.workspace.name,
      role: memberRole,
      workspaceSlug: currentMember.workspace.slug,
    }).catch((err) => console.error("Workspace invite email error:", err));

    return NextResponse.json(newMember, { status: 201 });
  } catch (error: any) {
    console.error("Add workspace member error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to add member" },
      { status: 500 }
    );
  }
}
