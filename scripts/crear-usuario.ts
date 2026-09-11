/**
 * Crea un profesor desde la terminal. Sirve para dar de alta el primer usuario,
 * que después se convierte en admin desde la BD:
 *
 *   npm run crear-usuario -- <username> "<Nombre>"
 *   UPDATE usuarios SET es_admin = true WHERE username = '<username>';
 *
 * El resto de los profesores los crea el admin desde /usuarios.
 */
import { config } from 'dotenv'
import readline from 'node:readline'
import { getDb, schema } from '../lib/db'
import { hashPassword, nombreSchema, passwordSchema, usernameSchema } from '../lib/usuarios'

config({ path: ['.env.local', '.env'], quiet: true })

function preguntarOculto(pregunta: string): Promise<string> {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    process.stdout.write(pregunta)
    // Silencia el eco de lo que se tipea.
    ;(rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = () => {}
    rl.question('', answer => {
      rl.close()
      process.stdout.write('\n')
      resolve(answer)
    })
  })
}

function validar<T>(resultado: { success: true; data: T } | { success: false; error: { issues: { message: string }[] } }): T {
  if (!resultado.success) {
    console.error(resultado.error.issues[0]?.message)
    process.exit(1)
  }
  return resultado.data
}

async function main() {
  const [usernameArg, nombreArg] = process.argv.slice(2)
  if (!usernameArg || !nombreArg) {
    console.error('Uso: npm run crear-usuario -- <username> "<Nombre>"')
    process.exit(1)
  }

  const username = validar(usernameSchema.safeParse(usernameArg))
  const nombre = validar(nombreSchema.safeParse(nombreArg))

  const password = validar(passwordSchema.safeParse(await preguntarOculto('Contraseña: ')))
  const repetida = await preguntarOculto('Repetí la contraseña: ')
  if (password !== repetida) {
    console.error('Las contraseñas no coinciden.')
    process.exit(1)
  }

  const [usuario] = await getDb()
    .insert(schema.usuarios)
    .values({ username, nombre, passwordHash: await hashPassword(password) })
    .onConflictDoNothing({ target: schema.usuarios.username })
    .returning({ id: schema.usuarios.id })

  if (!usuario) {
    console.error(`Ya existe un usuario "${username}".`)
    process.exit(1)
  }

  console.log(`Usuario "${username}" creado.`)
  console.log(`Para hacerlo admin: UPDATE usuarios SET es_admin = true WHERE username = '${username}';`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
