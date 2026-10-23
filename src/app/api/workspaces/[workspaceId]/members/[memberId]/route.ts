import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";

export async function PATCH(
  req: Request,
  { params }: { params: { workspaceId: string; memberId: string } }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentMember = await db.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: currentUser.id,
        workspaceId: params.workspaceId,
      },
    },
  });

  if (!currentMember || (currentMember.role !== "OWNER" && currentMember.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { role } = await req.json();
    if (!role || !["OWNER", "ADMIN", "EDITOR", "VIEWER"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const updated = await db.workspaceMember.update({
      where: { id: params.memberId },
      data: { role: role as Role },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update role" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { workspaceId: string; memberId: string } }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentMember = await db.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: currentUser.id,
        workspaceId: params.workspaceId,
      },
    },
  });

  if (!currentMember || (currentMember.role !== "OWNER" && currentMember.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const memberToRemove = await db.workspaceMember.findUnique({
      where: { id: params.memberId },
    });

    if (!memberToRemove) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Protect last OWNER from being removed
    if (memberToRemove.role === "OWNER") {
      const ownerCount = await db.workspaceMember.count({
        where: { workspaceId: params.workspaceId, role: "OWNER" },
      });
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the only workspace owner" },
          { status: 400 }
        );
      }
    }

    await db.workspaceMember.delete({
      where: { id: params.memberId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to remove member" }, { status: 500 });
  }
}
