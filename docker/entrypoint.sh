#!/bin/sh
set -e

echo "🚀 Starting ExcaliSpace container..."

# 1. Wait for PostgreSQL to accept connections
node prisma/wait-for-db.js

# 2. Push schema to ensure all tables exist
echo "📦 Synchronizing Prisma database schema..."
npx prisma db push --skip-generate --accept-data-loss

# 3. Seed default data if database is new
echo "🌱 Running database seed..."
node prisma/seed.js || true

echo "✨ ExcaliSpace is ready! Starting web server on port 3000..."
exec "$@"
