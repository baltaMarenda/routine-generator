'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import type { Block, Exercise } from '@/lib/types'
import { createEmptyExercise } from '@/lib/types'
import { ExerciseAutocomplete } from './exercise-autocomplete'

interface ExerciseBlockProps {
  block: Block
  onUpdate: (block: Block) => void
  onDelete: () => void
  canDelete: boolean
  exercises: string[]
}

export function ExerciseBlock({ block, onUpdate, onDelete, canDelete, exercises }: ExerciseBlockProps) {
  const updateExercise = (exerciseId: string, updates: Partial<Exercise>) => {
    onUpdate({
      ...block,
      exercises: block.exercises.map(ex => 
        ex.id === exerciseId ? { ...ex, ...updates } : ex
      )
    })
  }

  const updateWeek = (exerciseId: string, weekIndex: number, field: 'setsReps' | 'kilos', value: string) => {
    onUpdate({
      ...block,
      exercises: block.exercises.map(ex => {
        if (ex.id !== exerciseId) return ex
        const newWeeks = [...ex.weeks]
        newWeeks[weekIndex] = { ...newWeeks[weekIndex], [field]: value }
        return { ...ex, weeks: newWeeks }
      })
    })
  }

  const addExercise = () => {
    onUpdate({
      ...block,
      exercises: [...block.exercises, createEmptyExercise(block.exercises.length)]
    })
  }

  const removeExercise = (exerciseId: string) => {
    if (block.exercises.length <= 1) return
    onUpdate({
      ...block,
      exercises: block.exercises.filter(ex => ex.id !== exerciseId)
    })
  }

  const blockLetter = block.name.slice(-1).toLowerCase()

  return (
    <table className="w-full border-collapse bg-card text-sm">
      <thead>
        {/* Block header row */}
        <tr>
          <th className="border border-border bg-primary text-primary-foreground text-left px-3 py-2 font-semibold" colSpan={2}>
            <div className="flex items-center justify-between">
              <span>{block.name}</span>
              {canDelete && (
                <button onClick={onDelete} className="text-primary-foreground/70 hover:text-primary-foreground">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </th>
          {[1, 2, 3, 4, 5].map(week => (
            <th key={week} className="border border-border bg-primary text-primary-foreground text-center px-2 py-2 font-semibold" colSpan={2}>
              SEM {week}
            </th>
          ))}
          <th className="border border-border bg-primary text-primary-foreground text-center px-2 py-2 font-semibold" rowSpan={2}>
            Observaciones
          </th>
        </tr>
        {/* Sub-header row */}
        <tr>
          <th className="border border-border bg-primary/80 text-primary-foreground text-left px-3 py-1 text-xs font-medium" colSpan={2}>
            Ejercicios
          </th>
          {[1, 2, 3, 4, 5].map(week => (
            <th key={`${week}-headers`} className="border border-border bg-primary/80 text-primary-foreground p-0" colSpan={2}>
              <div className="flex">
                <span className="flex-1 text-center py-1 text-xs border-r border-primary-foreground/20">S/R</span>
                <span className="flex-1 text-center py-1 text-xs">KILOS</span>
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {block.exercises.map((exercise, exIndex) => (
          <tr key={exercise.id} className="group hover:bg-secondary/30">
            {/* Exercise name */}
            <td className="border border-border p-0 w-8">
              <span className="text-xs text-muted-foreground px-2">
                {blockLetter}{exIndex + 1}_
              </span>
            </td>
            <td className="border border-border p-0 min-w-[200px]">
              <div className="flex items-center">
                <ExerciseAutocomplete 
                  value={exercise.name}
                  onChange={(value) => updateExercise(exercise.id, { name: value })}
                  exercises={exercises}
                  className="border-0 bg-transparent h-9 px-2 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm flex-1 outline-none w-full"
                  placeholder="Nombre del ejercicio"
                />
                {block.exercises.length > 1 && (
                  <button 
                    onClick={() => removeExercise(exercise.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive px-1 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </td>
            
            {/* Week inputs */}
            {exercise.weeks.map((week, weekIndex) => (
              <td key={weekIndex} className="border border-border p-0" colSpan={2}>
                <div className="flex">
                  <Input 
                    value={week.setsReps}
                    onChange={(e) => updateWeek(exercise.id, weekIndex, 'setsReps', e.target.value)}
                    className="border-0 bg-transparent h-9 text-center text-sm rounded-none border-r border-border focus-visible:ring-0 focus-visible:ring-offset-0 w-1/2"
                    placeholder="3x12"
                  />
                  <Input 
                    value={week.kilos}
                    onChange={(e) => updateWeek(exercise.id, weekIndex, 'kilos', e.target.value)}
                    className="border-0 bg-transparent h-9 text-center text-sm rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 w-1/2"
                    placeholder=""
                  />
                </div>
              </td>
            ))}
            
            {/* Observations */}
            <td className="border border-border p-0">
              <Input 
                value={exercise.observations}
                onChange={(e) => updateExercise(exercise.id, { observations: e.target.value })}
                className="border-0 bg-transparent h-9 text-sm rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 px-2"
                placeholder=""
              />
            </td>
          </tr>
        ))}
        {/* Add exercise row */}
        <tr>
          <td colSpan={13} className="border border-border p-1 bg-secondary/20">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={addExercise}
              className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3 w-3 mr-1" />
              Agregar ejercicio
            </Button>
          </td>
        </tr>
      </tbody>
    </table>
  )
}
