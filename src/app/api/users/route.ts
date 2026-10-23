import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";

// GET /api/users - List users in the platform
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all users with their workspace memberships count and board count
  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      isPlatformAdmin: true,
      createdAt: true,
      _count: {
        select: {
          workspaces: true,
          createdBoards: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

// POST /api/users - Admin creates new user
export async function POST(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, email, password, isPlatformAdmin } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const newUser = await db.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name: name ? name.trim() : normalizedEmail.split("@")[0],
          email: normalizedEmail,
          passwordHash,
          isPlatformAdmin: !!isPlatformAdmin,
        },
      });

      // Create personal workspace for the user
      const baseSlug = (name || "personal")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 16);
      const uniqueSlug = `${baseSlug}-${u.id.slice(0, 6)}`;

      await tx.workspace.create({
        data: {
          name: `${u.name || "My"}'s Workspace`,
          slug: uniqueSlug,
          members: {
            create: {
              userId: u.id,
              role: "OWNER",
            },
          },
        },
      });

      return u;
    });

    // Send Welcome Email with credentials / temp password
    sendWelcomeEmail({
      to: newUser.email,
      name: newUser.name,
      workspaceName: `${newUser.name || "Personal"}'s Workspace`,
      tempPassword: password,
    }).catch((err) => console.error("Error sending user welcome email:", err));

    return NextResponse.json(
      {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        isPlatformAdmin: newUser.isPlatformAdmin,
        createdAt: newUser.createdAt,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create user" },
      { status: 500 }
    );
  }
}
