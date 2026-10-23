import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  req: Request,
  { params }: { params: { workspaceId: string } }
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { isPlatformAdmin: true },
  });

  if (!dbUser?.isPlatformAdmin) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    await db.workspace.delete({
      where: { id: params.workspaceId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete workspace error:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete workspace" }, { status: 500 });
  }
}
