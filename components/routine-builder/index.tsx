'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from './header'
import { Conditioning } from './conditioning'
import { ExerciseBlock } from './exercise-block'
import type { RoutineData, DayRoutine, Block } from '@/lib/types'
import { createEmptyBlock, blockNames, createEmptyDay } from '@/lib/types'

interface RoutineBuilderProps {
  data: RoutineData
  onChange: (data: RoutineData) => void
}

async function loadExercises(): Promise<string[]> {
  try {
    const res = await fetch('/ejercicios.csv')
    const text = await res.text()
    const lines = text.split('\n').slice(1)
    return lines
      .map(line => line.split(',')[0]?.trim())
      .filter(name => name && name.length > 0)
  } catch {
    return []
  }
}

export function RoutineBuilder({ data, onChange }: RoutineBuilderProps) {
  const [exercises, setExercises] = useState<string[]>([])
  const [activeDay, setActiveDay] = useState('')

  useEffect(() => {
    loadExercises().then(setExercises)
  }, [])

  useEffect(() => {
    if (data.days && data.days.length > 0 && !activeDay) {
      setActiveDay(data.days[0].id)
    }
  }, [data.days, activeDay])

  const updateDay = (dayId: string, updates: Partial<DayRoutine>) => {
    onChange({
      ...data,
      days: data.days.map(d => d.id === dayId ? { ...d, ...updates } : d)
    })
  }

  const updateBlock = (dayId: string, blockId: string, updates: Block) => {
    onChange({
      ...data,
      days: data.days.map(d => 
        d.id === dayId 
          ? { ...d, blocks: d.blocks.map(b => b.id === blockId ? updates : b) }
          : d
      )
    })
  }

  const deleteBlock = (dayId: string, blockId: string) => {
    const day = data.days.find(d => d.id === dayId)
    if (!day || day.blocks.length <= 1) return
    
    onChange({
      ...data,
      days: data.days.map(d => 
        d.id === dayId 
          ? { ...d, blocks: d.blocks.filter(b => b.id !== blockId) }
          : d
      )
    })
  }

  const addBlock = (dayId: string) => {
    const day = data.days.find(d => d.id === dayId)
    if (!day) return
    
    const usedNames = new Set(day.blocks.map(b => b.name))
    const nextName = blockNames.find(name => !usedNames.has(name)) || `Bloque ${day.blocks.length + 1}`
    
    onChange({
      ...data,
      days: data.days.map(d => 
        d.id === dayId 
          ? { ...d, blocks: [...d.blocks, createEmptyBlock(nextName)] }
          : d
      )
    })
  }

  const addDay = () => {
    const newDay = createEmptyDay(data.days.length + 1)
    onChange({
      ...data,
      days: [...data.days, newDay]
    })
    setActiveDay(newDay.id)
  }

  const removeDay = (dayId: string) => {
    if (data.days.length <= 1) return
    
    const newDays = data.days.filter(d => d.id !== dayId)
    onChange({
      ...data,
      days: newDays
    })
    
    if (activeDay === dayId) {
      setActiveDay(newDays[0]?.id || '')
    }
  }

  const currentDay = data.days?.find(d => d.id === activeDay)

  // Guard for empty days
  if (!data.days || data.days.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Cargando rutina...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeDay} onValueChange={setActiveDay}>
        <div className="flex items-center gap-2 mb-4">
          <TabsList className="flex-1 justify-start h-auto flex-wrap">
            {data.days.map((day) => (
              <TabsTrigger 
                key={day.id} 
                value={day.id}
                className="relative group pr-8"
              >
                {day.name}
                {data.days.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeDay(day.id)
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button variant="outline" size="sm" onClick={addDay}>
            <Plus className="h-4 w-4 mr-1" />
            Agregar Día
          </Button>
        </div>

        {data.days.map((day) => (
          <TabsContent key={day.id} value={day.id} className="space-y-4 mt-0">
            {/* Header section */}
            <Header 
              data={{
                clientName: data.clientName,
                planType: day.planType,
                phase: day.phase,
                observations: day.observations
              }}
              onChange={(updates) => {
                if ('clientName' in updates && updates.clientName !== undefined) {
                  onChange({ ...data, clientName: updates.clientName })
                }
                if ('planType' in updates) updateDay(day.id, { planType: updates.planType })
                if ('phase' in updates) updateDay(day.id, { phase: updates.phase })
                if ('observations' in updates) updateDay(day.id, { observations: updates.observations })
              }}
            />

            {/* Conditioning section */}
            <Conditioning 
              items={day.conditioning} 
              onChange={(items) => updateDay(day.id, { conditioning: items })} 
            />

            {/* Exercise blocks */}
            {day.blocks.map((block) => (
              <ExerciseBlock 
                key={block.id}
                block={block}
                onUpdate={(updated) => updateBlock(day.id, block.id, updated)}
                onDelete={() => deleteBlock(day.id, block.id)}
                canDelete={day.blocks.length > 1}
                exercises={exercises}
              />
            ))}

            {/* Add new block button */}
            {day.blocks.length < blockNames.length && (
              <button 
                onClick={() => addBlock(day.id)}
                className="w-full border-2 border-dashed border-border rounded py-3 text-sm text-muted-foreground hover:text-foreground hover:border-primary transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Agregar nuevo bloque
              </button>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
