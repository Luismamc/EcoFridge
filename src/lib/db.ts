import { PrismaClient } from '@prisma/client'

// ── Detect if Turso credentials are available ──
const TURSO_URL = process.env.TURSO_DATABASE_URL
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// ── Lazy initialization: create client on first use ──
let _db: PrismaClient | null = null

async function getClient(): Promise<PrismaClient> {
  if (_db) return _db
  if (globalForPrisma.prisma) {
    _db = globalForPrisma.prisma
    return _db
  }

  if (TURSO_URL) {
    // Connect to Turso (cloud database)
    const { PrismaLibSQL } = await import('@prisma/adapter-libsql')
    const { createClient } = await import('@libsql/client')

    const libsql = createClient({
      url: TURSO_URL,
      authToken: TURSO_TOKEN,
    })

    const adapter = new PrismaLibSQL(libsql)
    _db = new PrismaClient({
      adapter,
      log: ['error'],
    })
  } else {
    // Local SQLite (development)
    _db = new PrismaClient({
      log: ['error'],
    })
  }

  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _db
  return _db
}

// ── Synchronous db reference (for backward compatibility) ──
// Falls back to local SQLite if Turso is not configured
export const db = globalForPrisma.prisma ?? new PrismaClient({ log: ['error'] })
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// ── Auto-create tables on first connection ──
let tablesEnsured = false

export async function ensureTables(): Promise<PrismaClient> {
  const client = await getClient()
  if (tablesEnsured) return client
  try {
    await client.$executeRawUnsafe(`
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
      )
    `)
    await client.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Product_barcode_key" ON "Product"("barcode")
    `)
    await client.$executeRawUnsafe(`
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
      )
    `)
    await client.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "InventoryItem_productId_idx" ON "InventoryItem"("productId")
    `)
    await client.$executeRawUnsafe(`
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
      )
    `)
    await client.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ConsumptionLog_productId_idx" ON "ConsumptionLog"("productId")
    `)
    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "WasteLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "productId" TEXT NOT NULL,
        "quantity" INTEGER NOT NULL DEFAULT 1,
        "reason" TEXT,
        "notes" TEXT,
        "discardedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `)
    await client.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "WasteLog_productId_idx" ON "WasteLog"("productId")
    `)
    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "RecipeCache" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "ingredients" TEXT NOT NULL,
        "recipeName" TEXT NOT NULL,
        "recipeData" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    tablesEnsured = true
    console.log('✅ Database tables ensured successfully')
  } catch (error) {
    console.error('Error ensuring database tables:', error)
  }
  return client
}
