import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { SettingsClientView } from "./SettingsClientView";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user?.id) {
    redirect("/login?callbackUrl=/settings");
  }

  // Fetch full user details from DB
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      isPlatformAdmin: true,
      lastLoginAt: true,
      accentColor: true,
      preferredTheme: true,
      createdAt: true,
    },
  });

  if (!dbUser) {
    redirect("/login");
  }

  // Find user's first workspace slug for return link
  const firstMembership = await db.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: true },
    orderBy: { workspace: { createdAt: "asc" } },
  });

  const returnSlug = firstMembership?.workspace.slug || "";

  return (
    <SettingsClientView
      initialUser={dbUser}
      returnSlug={returnSlug}
    />
  );
}
