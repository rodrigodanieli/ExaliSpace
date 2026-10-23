const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function waitForDb() {
  console.log("⏳ Checking database connection...");
  const maxRetries = 30;
  for (let i = 1; i <= maxRetries; i++) {
    try {
      await prisma.$connect();
      console.log("✅ Successfully connected to database!");
      await prisma.$disconnect();
      process.exit(0);
    } catch (err) {
      console.log(`[Attempt ${i}/${maxRetries}] Waiting for database... (${err.message})`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  console.error("❌ Database connection timed out after 60 seconds.");
  process.exit(1);
}

waitForDb();
