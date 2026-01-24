#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

echo "→ Pushing schema to database..."
npx prisma db push

echo "→ Seeding bird data..."
npm run db:seed

echo "→ Starting dev server..."
npm run dev
