'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, X, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from './header'
import { Conditioning } from './conditioning'
import { ExerciseBlock } from './exercise-block'
import type { RoutineData, DayRoutine, Block } from '@/lib/types'
import { createEmptyBlock, blockNames, createEmptyDay, renumberBlocks, renumberDays } from '@/lib/types'

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
    if (data.days && data.days.length > 0) {
      const dayExists = data.days.some(d => d.id === activeDay)
      if (!activeDay || !dayExists) {
        setActiveDay(data.days[0].id)
      }
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
          ? { ...d, blocks: renumberBlocks(d.blocks.filter(b => b.id !== blockId)) }
          : d
      )
    })
  }

  const addBlock = (dayId: string) => {
    const day = data.days.find(d => d.id === dayId)
    if (!day) return

    onChange({
      ...data,
      days: data.days.map(d =>
        d.id === dayId
          ? { ...d, blocks: renumberBlocks([...d.blocks, createEmptyBlock('')]) }
          : d
      )
    })
  }

  const addDay = () => {
    const newDay = createEmptyDay(data.days.length + 1)
    onChange({
      ...data,
      days: renumberDays([...data.days, newDay])
    })
    setActiveDay(newDay.id)
  }

  const removeDay = (dayId: string) => {
    if (data.days.length <= 1) return

    const newDays = renumberDays(data.days.filter(d => d.id !== dayId))
    onChange({
      ...data,
      days: newDays
    })
    
    if (activeDay === dayId) {
      setActiveDay(newDays[0]?.id || '')
    }
  }

  // Arrastrar y soltar (HTML5 nativo). Al soltar se renumera, así los nombres siguen la posición
  const [dragging, setDragging] = useState<{ kind: 'day' | 'block'; id: string; dayId?: string } | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  // Un bloque solo es arrastrable mientras se agarra su manija, para no romper la edición de los inputs
  const [grabbedBlockId, setGrabbedBlockId] = useState<string | null>(null)

  const endDrag = () => {
    setDragging(null)
    setDragOverId(null)
    setGrabbedBlockId(null)
  }

  const moveItem = <T extends { id: string }>(items: T[], fromId: string, toId: string): T[] => {
    const from = items.findIndex(i => i.id === fromId)
    const to = items.findIndex(i => i.id === toId)
    if (from === -1 || to === -1 || from === to) return items
    const result = [...items]
    const [moved] = result.splice(from, 1)
    result.splice(to, 0, moved)
    return result
  }

  const reorderDays = (fromId: string, toId: string) => {
    if (fromId === toId) return
    onChange({ ...data, days: renumberDays(moveItem(data.days, fromId, toId)) })
  }

  const reorderBlocks = (dayId: string, fromId: string, toId: string) => {
    if (fromId === toId) return
    onChange({
      ...data,
      days: data.days.map(d =>
        d.id === dayId ? { ...d, blocks: renumberBlocks(moveItem(d.blocks, fromId, toId)) } : d
      )
    })
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
              <div key={day.id} className="relative group flex flex-1">
                <TabsTrigger
                  value={day.id}
                  draggable={data.days.length > 1}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('text/plain', day.id)
                    setDragging({ kind: 'day', id: day.id })
                  }}
                  onDragOver={(e) => {
                    if (dragging?.kind !== 'day') return
                    e.preventDefault()
                    setDragOverId(day.id)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (dragging?.kind === 'day') reorderDays(dragging.id, day.id)
                    endDrag()
                  }}
                  onDragEnd={endDrag}
                  className={cn(
                    'pr-8',
                    data.days.length > 1 && 'cursor-grab active:cursor-grabbing',
                    dragging?.id === day.id && 'opacity-50',
                    dragging?.kind === 'day' && dragOverId === day.id && dragging.id !== day.id && 'ring-2 ring-primary'
                  )}
                >
                  {day.name}
                </TabsTrigger>
                {data.days.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Eliminar ${day.name}`}
                    onClick={() => removeDay(day.id)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-destructive transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
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
              <div
                key={block.id}
                draggable={grabbedBlockId === block.id}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', block.id)
                  setDragging({ kind: 'block', id: block.id, dayId: day.id })
                }}
                onDragOver={(e) => {
                  if (dragging?.kind !== 'block' || dragging.dayId !== day.id) return
                  e.preventDefault()
                  setDragOverId(block.id)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dragging?.kind === 'block' && dragging.dayId === day.id) {
                    reorderBlocks(day.id, dragging.id, block.id)
                  }
                  endDrag()
                }}
                onDragEnd={endDrag}
                className={cn(
                  'rounded',
                  dragging?.id === block.id && 'opacity-50',
                  dragging?.kind === 'block' && dragOverId === block.id && dragging.id !== block.id && 'ring-2 ring-primary'
                )}
              >
                <ExerciseBlock
                  block={block}
                  onUpdate={(updated) => updateBlock(day.id, block.id, updated)}
                  onDelete={() => deleteBlock(day.id, block.id)}
                  canDelete={day.blocks.length > 1}
                  exercises={exercises}
                  dragHandle={day.blocks.length > 1 && (
                    <span
                      onMouseDown={() => setGrabbedBlockId(block.id)}
                      onMouseUp={() => setGrabbedBlockId(null)}
                      className="cursor-grab active:cursor-grabbing text-primary-foreground/70 hover:text-primary-foreground"
                      title="Arrastrar para reordenar"
                    >
                      <GripVertical className="h-4 w-4" />
                    </span>
                  )}
                />
              </div>
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
