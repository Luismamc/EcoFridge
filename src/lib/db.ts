import { PrismaClient } from '@prisma/client'
import path from 'path'
import os from 'os'

// On Vercel (serverless), SQLite must be in /tmp (the only writable directory)
// On local dev, use the default path
const getDatabaseUrl = () => {
  // Vercel sets this environment variable
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const dbPath = path.join('/tmp', 'ecofridge.db')
    return `file:${dbPath}`
  }
  // Local development or standalone server
  return process.env.DATABASE_URL || 'file:./db/custom.db'
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Override DATABASE_URL for Prisma on serverless environments
if (!process.env.DATABASE_URL || process.env.VERCEL) {
  process.env.DATABASE_URL = getDatabaseUrl()
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
