import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user || !user.email) {
    redirect("/login");
  }

  // Find user's first workspace or one they are a member of
  const membership = await db.workspaceMember.findFirst({
    where: { userId: user.id },
    include: {
      workspace: true,
    },
    orderBy: {
      workspace: {
        createdAt: "asc",
      },
    },
  });

  if (membership?.workspace) {
    redirect(`/${membership.workspace.slug}`);
  }

  // If user doesn't have a workspace yet, create a default "Personal Workspace"
  const defaultSlug = `personal-${user.id.slice(0, 6)}`;
  const newWorkspace = await db.workspace.create({
    data: {
      name: "Personal Workspace",
      slug: defaultSlug,
      members: {
        create: {
          userId: user.id,
          role: "OWNER",
        },
      },
    },
  });

  redirect(`/${newWorkspace.slug}`);
}
