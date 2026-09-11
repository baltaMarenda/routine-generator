/** Formas de las respuestas de app/api/*, compartidas por las rutas y las páginas. */
import type { EvaluationData } from './evaluation-types'
import type { RoutineData } from './types'

export interface AlumnoResumen {
  id: string
  nombre: string
  createdAt: string
  /** Nombre del profesor que creó al alumno. */
  creador: string
  esPropio: boolean
}

export interface PersonaAcceso {
  username: string
  nombre: string
}

export interface AccesosRutina {
  creador: PersonaAcceso
  compartidos: (PersonaAcceso & { otorgadoPor: string; createdAt: string })[]
}

export interface AlumnoDetalle {
  alumno: {
    id: string
    nombre: string
    dia: string | null
    horario: string | null
    createdAt: string
  }
  evaluacion: EvaluationData | null
  rutina: {
    id: string
    nombre: string
    datos: RoutineData
    updatedAt: string
  }
  accesos: AccesosRutina
  /** Link a la copia de la rutina en el Drive del usuario logueado, si la exportó. */
  miDriveLink: string | null
  puedeEliminar: boolean
}

export interface FotoDto {
  id: string
  dataUrl: string
}

export interface RutinaCopiable {
  id: string
  nombre: string
  alumnoId: string
  alumnoNombre: string
}

export interface UsuarioDto {
  id: string
  username: string
  nombre: string
  esAdmin: boolean
  activo: boolean
  debeCambiarPassword: boolean
  googleEmail: string | null
  createdAt: string
}

export interface DriveTokenDto {
  accessToken: string
  /** Epoch en ms. */
  expiresAt: number
  email: string | null
}
