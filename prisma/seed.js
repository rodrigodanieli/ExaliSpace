const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const adminEmail = "admin@excalispace.local";
  const passwordHash = await bcrypt.hash("password123", 10);

  // Upsert admin user
  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { isPlatformAdmin: true },
    create: {
      email: adminEmail,
      name: "Admin User",
      passwordHash,
      isPlatformAdmin: true,
    },
  });

  console.log(`👤 User ready: ${user.email} (Password: password123)`);

  // Upsert Workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: "product-engineering" },
    update: {},
    create: {
      name: "Product & Engineering",
      slug: "product-engineering",
      members: {
        create: {
          userId: user.id,
          role: "OWNER",
        },
      },
    },
  });

  console.log(`🏢 Workspace ready: ${workspace.name}`);

  // Upsert Folders
  let archFolder = await prisma.folder.findFirst({
    where: { workspaceId: workspace.id, name: "Architecture Diagrams" },
  });
  if (!archFolder) {
    archFolder = await prisma.folder.create({
      data: {
        name: "Architecture Diagrams",
        workspaceId: workspace.id,
      },
    });
  }

  let designFolder = await prisma.folder.findFirst({
    where: { workspaceId: workspace.id, name: "Design System" },
  });
  if (!designFolder) {
    designFolder = await prisma.folder.create({
      data: {
        name: "Design System",
        workspaceId: workspace.id,
      },
    });
  }

  let componentsFolder = await prisma.folder.findFirst({
    where: { workspaceId: workspace.id, name: "UI Components" },
  });
  if (!componentsFolder) {
    componentsFolder = await prisma.folder.create({
      data: {
        name: "UI Components",
        workspaceId: workspace.id,
        parentId: designFolder.id,
      },
    });
  }

  // Sample initial Excalidraw elements (Welcome diagram)
  const sampleElements = [
    {
      id: "welcome-rect-1",
      type: "rectangle",
      x: 300,
      y: 200,
      width: 320,
      height: 100,
      angle: 0,
      strokeColor: "#4f46e5",
      backgroundColor: "#e0e7ff",
      fillStyle: "solid",
      strokeWidth: 2,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      groupIds: [],
      roundness: { type: 3 },
      seed: 12345,
      version: 1,
      versionNonce: 1,
      isDeleted: false,
    },
    {
      id: "welcome-text-1",
      type: "text",
      x: 330,
      y: 235,
      width: 260,
      height: 30,
      angle: 0,
      strokeColor: "#1e1b4b",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      groupIds: [],
      roundness: null,
      seed: 12346,
      version: 1,
      versionNonce: 1,
      isDeleted: false,
      text: "Welcome to ExcaliSpace!",
      fontSize: 20,
      fontFamily: 1,
      textAlign: "center",
      verticalAlign: "middle",
    },
  ];

  // Upsert sample board
  let sampleBoard = await prisma.board.findFirst({
    where: { workspaceId: workspace.id, title: "System Architecture & Roadmap" },
  });

  if (!sampleBoard) {
    sampleBoard = await prisma.board.create({
      data: {
        title: "System Architecture & Roadmap",
        workspaceId: workspace.id,
        folderId: archFolder.id,
        creatorId: user.id,
        elements: sampleElements,
        appState: { theme: "dark" },
        files: {},
      },
    });
  }

  console.log(`🎨 Sample Board ready: ${sampleBoard.title}`);
  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
