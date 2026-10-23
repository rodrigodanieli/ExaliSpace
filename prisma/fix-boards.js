const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function fixBoards() {
  console.log("Checking boards in database...");
  const boards = await prisma.board.findMany();
  console.log(`Found ${boards.length} board(s).`);

  for (const board of boards) {
    let appState = board.appState;
    if (typeof appState === "string") {
      try {
        appState = JSON.parse(appState);
      } catch {
        appState = {};
      }
    }

    if (appState && typeof appState === "object") {
      let changed = false;
      if ("collaborators" in appState) {
        delete appState.collaborators;
        changed = true;
      }
      if ("selectedElementIds" in appState) {
        delete appState.selectedElementIds;
        changed = true;
      }

      // Keep only clean persistable properties
      const cleanState = {
        viewBackgroundColor: appState.viewBackgroundColor || "#121212",
        gridSize: appState.gridSize || null,
        theme: appState.theme || "dark",
        zoom: appState.zoom || { value: 1 },
        scrollX: appState.scrollX || 0,
        scrollY: appState.scrollY || 0,
      };

      await prisma.board.update({
        where: { id: board.id },
        data: {
          appState: cleanState,
        },
      });

      console.log(`✅ Fixed board: ${board.id} ("${board.title}")`);
    }
  }

  console.log("Done fixing boards!");
}

fixBoards()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
