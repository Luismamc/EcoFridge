import { PrismaClient } from '@prisma/client'
import { createClient, type Client } from '@libsql/client'

// ── Ensure DATABASE_URL is always set to something valid ──
// On Vercel, the original DATABASE_URL may point to a non-existent local path
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:/tmp/ecofridge.db'
}

// ── Turso credentials ──
const TURSO_URL = process.env.TURSO_DATABASE_URL
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN

// ── State ──
let _libsql: Client | null = null
let _db: PrismaClient | null = null
let tablesEnsured = false

// ── libsql client (for raw SQL: CREATE TABLE, etc.) ──
function getLibSqlClient(): Client {
  if (_libsql) return _libsql

  if (TURSO_URL && TURSO_TOKEN) {
    console.log('[DB] Creating LibSQL client → Turso')
    _libsql = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })
  } else {
    console.log('[DB] Creating LibSQL client → local /tmp/ecofridge.db')
    _libsql = createClient({ url: 'file:/tmp/ecofridge.db' })
  }
  return _libsql
}

// ── Prisma client (for ORM queries) ──
async function getPrismaClient(): Promise<PrismaClient> {
  if (_db) return _db

  // Check for cached instance in development
  const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }
  if (globalForPrisma.prisma) {
    _db = globalForPrisma.prisma
    return _db
  }

  const useTurso = !!(TURSO_URL && TURSO_TOKEN)
  console.log(`[DB] useTurso=${useTurso}, TURSO_URL=${TURSO_URL ? TURSO_URL.substring(0, 40) + '...' : 'NOT SET'}, TURSO_TOKEN=${TURSO_TOKEN ? 'SET' : 'NOT SET'}`)

  if (useTurso) {
    try {
      // Dynamic import to avoid bundling issues on Vercel
      const { PrismaLibSQL } = await import('@prisma/adapter-libsql')
      const libsql = getLibSqlClient()
      const adapter = new PrismaLibSQL(libsql)
      _db = new PrismaClient({ adapter })
      console.log('[DB] ✅ PrismaClient created with Turso adapter')
    } catch (adapterErr: any) {
      console.error('[DB] ❌ Failed to create Turso adapter:', adapterErr?.message || adapterErr)
      console.log('[DB] Falling back to local SQLite at /tmp/ecofridge.db')
      process.env.DATABASE_URL = 'file:/tmp/ecofridge.db'
      _db = new PrismaClient()
    }
  } else {
    console.log('[DB] ⚠️ No Turso credentials found. Using local SQLite at /tmp/ecofridge.db')
    process.env.DATABASE_URL = 'file:/tmp/ecofridge.db'
    _db = new PrismaClient()
  }

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = _db
  }
  return _db
}

// ── Create tables using libsql directly ──
const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS "Product" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "barcode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "brand" TEXT,
  "category" TEXT,
  "imageUrl" TEXT,
  "quantity" TEXT,
  "nutritionGrade" TEXT,
  "ingredients" TEXT,
  "allergens" TEXT,
  "allergensTags" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "Product_barcode_key" ON "Product"("barcode");
CREATE TABLE IF NOT EXISTS "InventoryItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "location" TEXT NOT NULL DEFAULT 'fridge',
  "expirationDate" DATETIME,
  "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "consumed" BOOLEAN NOT NULL DEFAULT 0,
  "consumedAt" DATETIME,
  "consumedAs" TEXT NOT NULL DEFAULT 'individual',
  "recipeName" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "InventoryItem_productId_idx" ON "InventoryItem"("productId");
CREATE TABLE IF NOT EXISTS "ConsumptionLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "consumedAs" TEXT NOT NULL DEFAULT 'individual',
  "recipeName" TEXT,
  "notes" TEXT,
  "consumedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ConsumptionLog_productId_idx" ON "ConsumptionLog"("productId");
CREATE TABLE IF NOT EXISTS "WasteLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "reason" TEXT,
  "notes" TEXT,
  "discardedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "WasteLog_productId_idx" ON "WasteLog"("productId");
CREATE TABLE IF NOT EXISTS "RecipeCache" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ingredients" TEXT NOT NULL,
  "recipeName" TEXT NOT NULL,
  "recipeData" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`

export async function ensureTables(): Promise<{ db: PrismaClient; error: string | null }> {
  if (tablesEnsured) return { db: await getPrismaClient(), error: null }

  try {
    const libsql = getLibSqlClient()

    const statements = CREATE_TABLES_SQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    for (const sql of statements) {
      try {
        await libsql.execute(sql)
      } catch (stmtErr: any) {
        console.warn('[DB] Table statement warning:', stmtErr?.message || stmtErr)
      }
    }

    tablesEnsured = true
    console.log('[DB] ✅ Database tables ensured successfully')
    return { db: await getPrismaClient(), error: null }
  } catch (error: any) {
    const msg = error?.message || String(error)
    console.error('[DB] ❌ Error ensuring database tables:', msg)
    return { db: await getPrismaClient(), error: msg }
  }
}
