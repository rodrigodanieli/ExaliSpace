import fs from "fs/promises";
import path from "path";

export interface StorageAdapter {
  saveFile(buffer: Buffer, filename: string, mimeType: string): Promise<string>;
  deleteFile(filename: string): Promise<void>;
}

class LocalStorageAdapter implements StorageAdapter {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), "public", "uploads");
  }

  private async ensureDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(buffer: Buffer, filename: string): Promise<string> {
    await this.ensureDir();
    const safeName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = path.join(this.uploadDir, safeName);
    await fs.writeFile(filePath, buffer);
    return `/uploads/${safeName}`;
  }

  async deleteFile(filename: string): Promise<void> {
    const filePath = path.join(this.uploadDir, filename);
    try {
      await fs.unlink(filePath);
    } catch {
      // Ignore if file doesn't exist
    }
  }
}

// Singleton storage instance
export const storage: StorageAdapter = new LocalStorageAdapter();
