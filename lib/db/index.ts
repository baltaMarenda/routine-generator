import { neon } from '@neondatabase/serverless'
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http'
import * as schema from './schema'

export type Db = NeonHttpDatabase<typeof schema>

let db: Db | undefined

/**
 * Cliente de Neon sobre HTTP. Se crea al primer uso y no al importar el módulo:
 * `next build` importa las rutas para analizarlas y ahí DATABASE_URL puede no estar.
 * Para escrituras que tienen que ser atómicas, usar `getDb().batch([...])`.
 */
export function getDb(): Db {
  if (!db) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('Falta la variable de entorno DATABASE_URL')
    db = drizzle({ client: neon(url), schema })
  }
  return db
}

export { schema }
