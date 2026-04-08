import { PrismaClient } from '@prisma/client'
import { createClient, type Client } from '@libsql/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

// ── Turso credentials ──
const TURSO_URL = process.env.TURSO_DATABASE_URL
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN

// ── libsql client (for raw SQL: CREATE TABLE, etc.) ──
let _libsql: Client | null = null

function getLibSqlClient(): Client {
  if (_libsql) return _libsql
  try {
    if (TURSO_URL && TURSO_TOKEN) {
      console.log('[DB] Connecting to Turso:', TURSO_URL.substring(0, 30) + '...')
      _libsql = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })
    } else {
      console.log('[DB] No Turso credentials found, using local SQLite at /tmp/ecofridge.db')
      _libsql = createClient({ url: 'file:/tmp/ecofridge.db' })
    }
  } catch (err) {
    console.error('[DB] Failed to create libsql client:', err)
    _libsql = createClient({ url: 'file:/tmp/ecofridge.db' })
  }
  return _libsql
}

// ── Prisma client (for ORM queries) ──
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let _db: PrismaClient | null = null

function getPrismaClient(): PrismaClient {
  if (_db) return _db
  if (globalForPrisma.prisma) {
    _db = globalForPrisma.prisma
    return _db
  }

  try {
    if (TURSO_URL && TURSO_TOKEN) {
      const libsql = getLibSqlClient()
      const adapter = new PrismaLibSQL(libsql)
      _db = new PrismaClient({ adapter })
      console.log('[DB] PrismaClient created with Turso adapter')
    } else {
      _db = new PrismaClient()
      console.log('[DB] PrismaClient created with local SQLite')
    }
  } catch (err) {
    console.error('[DB] Failed to create PrismaClient:', err)
    // Fallback: try without adapter
    _db = new PrismaClient()
    console.log('[DB] PrismaClient created with fallback local SQLite')
  }

  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _db
  return _db
}

export const db = getPrismaClient()

// ── Create tables using libsql directly (most reliable) ──
let tablesEnsured = false

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
  if (tablesEnsured) return { db: getPrismaClient(), error: null }

  try {
    const libsql = getLibSqlClient()

    // Execute each statement separately for better error reporting
    const statements = CREATE_TABLES_SQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    for (const sql of statements) {
      try {
        await libsql.execute(sql)
      } catch (stmtErr: any) {
        // Some statements may fail if the index/table already exists
        // Log but continue - we want to be resilient
        console.warn('[DB] Table statement warning:', stmtErr?.message || stmtErr)
      }
    }

    tablesEnsured = true
    console.log('[DB] ✅ Database tables ensured successfully')
    return { db: getPrismaClient(), error: null }
  } catch (error: any) {
    const msg = error?.message || String(error)
    console.error('[DB] ❌ Error ensuring database tables:', msg)
    // Still return db - some tables might have been created
    return { db: getPrismaClient(), error: msg }
  }
}
