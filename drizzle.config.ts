import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// drizzle-kit no carga los .env como Next: los leemos a mano.
config({ path: ['.env.local', '.env'], quiet: true })

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
