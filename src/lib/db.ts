import { PrismaClient } from '@prisma/client'
import { createClient, type Client } from '@libsql/client'

// ── Ensure DATABASE_URL is always set (required by Prisma internals) ──
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:/tmp/ecofridge.db'
}

// ── Turso credentials ──
const TURSO_URL = process.env.TURSO_DATABASE_URL
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN

// ── Connection info (logged once) ──
let logged = false

function logOnce(msg: string) {
  if (!logged) {
    console.log(msg)
    logged = true
  }
}

// ── State ──
let _libsql: Client | null = null
let _db: PrismaClient | null = null
let tablesEnsured = false

// ── libsql client (for raw SQL: CREATE TABLE, etc.) ──
function getLibSqlClient(): Client {
  if (_libsql) return _libsql

  if (TURSO_URL && TURSO_TOKEN) {
    logOnce(`[DB] LibSQL → Turso (${TURSO_URL.substring(0, 45)}...)`)
    _libsql = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })
  } else {
    logOnce('[DB] LibSQL → local /tmp/ecofridge.db (no Turso credentials)')
    _libsql = createClient({ url: 'file:/tmp/ecofridge.db' })
  }
  return _libsql
}

// ── Prisma client (for ORM queries) ──
async function getPrismaClient(): Promise<PrismaClient> {
  if (_db) return _db

  // Reuse cached instance in development (hot reload)
  const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }
  if (globalForPrisma.prisma) {
    _db = globalForPrisma.prisma
    return _db
  }

  if (TURSO_URL && TURSO_TOKEN) {
    // ── Turso: NO fallback to local SQLite ──
    // Import adapter statically at top level for reliability
    const { PrismaLibSQL } = await import('@prisma/adapter-libsql')
    const libsql = getLibSqlClient()
    const adapter = new PrismaLibSQL(libsql)
    _db = new PrismaClient({ adapter })
    logOnce('[DB] ✅ PrismaClient with Turso adapter')
  } else {
    // ── Local development: SQLite at /tmp ──
    _db = new PrismaClient()
    logOnce('[DB] ⚠️ PrismaClient with local SQLite (ephemeral on Vercel)')
  }

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = _db
  }
  return _db
}

// ── Export connection info (read-only) ──
export function getDbInfo() {
  return {
    tursoUrl: TURSO_URL ? 'SET' : 'NOT SET',
    tursoToken: TURSO_TOKEN ? 'SET' : 'NOT SET',
    databaseUrl: process.env.DATABASE_URL,
    usingTurso: !!(TURSO_URL && TURSO_TOKEN),
  }
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
        // Log but continue — tables might already exist
        console.warn('[DB] Table creation note:', stmtErr?.message || stmtErr)
      }
    }

    tablesEnsured = true
    console.log('[DB] ✅ Tables ensured')
    return { db: await getPrismaClient(), error: null }
  } catch (error: any) {
    const msg = error?.message || String(error)
    console.error('[DB] ❌ ensureTables error:', msg)
    return { db: await getPrismaClient(), error: msg }
  }
}
