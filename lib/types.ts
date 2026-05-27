export interface Exercise {
  id: string
  name: string
  weeks: WeekData[]
  observations: string
}

export interface WeekData {
  setsReps: string
  kilos: string
}

export interface Block {
  id: string
  name: string
  exercises: Exercise[]
}

export interface DayRoutine {
  id: string
  name: string
  planType: string
  phase: string
  observations: string
  conditioning: string[]
  blocks: Block[]
}

export interface RoutineData {
  clientName: string
  days: DayRoutine[]
}

export const createEmptyWeeks = (): WeekData[] => 
  Array.from({ length: 5 }, () => ({ setsReps: '', kilos: '' }))

export const createEmptyExercise = (index: number): Exercise => ({
  id: crypto.randomUUID(),
  name: `Ejercicio ${index + 1}`,
  weeks: createEmptyWeeks(),
  observations: ''
})

export const createEmptyBlock = (name: string): Block => ({
  id: crypto.randomUUID(),
  name,
  exercises: [createEmptyExercise(0)]
})

export const blockNames = ['Bloque A', 'Bloque B', 'Bloque C', 'Bloque D', 'Bloque E', 'Bloque F']

export const createEmptyDay = (dayNumber: number): DayRoutine => ({
  id: crypto.randomUUID(),
  name: `Día ${dayNumber}`,
  planType: '',
  phase: '',
  observations: '',
  conditioning: [''],
  blocks: [createEmptyBlock('Bloque A')]
})

export const createInitialRoutineData = (): RoutineData => ({
  clientName: '',
  days: [createEmptyDay(1)]
})
