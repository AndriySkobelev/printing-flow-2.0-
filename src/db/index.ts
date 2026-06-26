import { resolve } from 'node:path'
import { config } from 'dotenv'

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from './schemas/schema.ts'

// Load .env file from project root
config({ path: resolve(process.cwd(), '.env') })

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is not set. Please check your .env file.'
  )
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('supabase') 
    ? { rejectUnauthorized: false }
    : undefined,
})

export const db = drizzle(pool, { schema })
