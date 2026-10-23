import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import fs from "fs/promises";
import path from "path";

export async function GET() {
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

  // 1. Database Counts & Board sizes
  const [userCount, workspaceCount, folderCount, boardCount, boards] = await Promise.all([
    db.user.count(),
    db.workspace.count(),
    db.folder.count(),
    db.board.count(),
    db.board.findMany({
      select: {
        id: true,
        elements: true,
        files: true,
        appState: true,
      },
    }),
  ]);

  let totalBoardJsonBytes = 0;
  let totalElementsCount = 0;

  for (const b of boards) {
    const elStr = JSON.stringify(b.elements || []);
    const filesStr = JSON.stringify(b.files || {});
    const appStr = JSON.stringify(b.appState || {});
    totalBoardJsonBytes += (elStr.length + filesStr.length + appStr.length);

    if (Array.isArray(b.elements)) {
      totalElementsCount += b.elements.length;
    }
  }

  // 2. Disk Storage (Uploads folder)
  let uploadFilesCount = 0;
  let uploadSizeBytes = 0;

  try {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    const files = await fs.readdir(uploadsDir);
    for (const file of files) {
      if (file !== ".gitkeep") {
        const stat = await fs.stat(path.join(uploadsDir, file));
        if (stat.isFile()) {
          uploadFilesCount++;
          uploadSizeBytes += stat.size;
        }
      }
    }
  } catch (err) {
    // Directory might be empty or unreadable
  }

  return NextResponse.json({
    database: {
      userCount,
      workspaceCount,
      folderCount,
      boardCount,
      totalElementsCount,
      estimatedJsonBytes: totalBoardJsonBytes,
      estimatedJsonMB: (totalBoardJsonBytes / (1024 * 1024)).toFixed(2),
      avgBoardKB: boardCount > 0 ? (totalBoardJsonBytes / boardCount / 1024).toFixed(1) : 0,
    },
    disk: {
      uploadFilesCount,
      uploadSizeBytes,
      uploadSizeMB: (uploadSizeBytes / (1024 * 1024)).toFixed(2),
    },
    totalUsageMB: ((totalBoardJsonBytes + uploadSizeBytes) / (1024 * 1024)).toFixed(2),
  });
}
