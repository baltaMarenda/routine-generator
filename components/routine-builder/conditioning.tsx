'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'

interface ConditioningProps {
  items: string[]
  onChange: (items: string[]) => void
}

export function Conditioning({ items, onChange }: ConditioningProps) {
  const updateItem = (index: number, value: string) => {
    const newItems = [...items]
    newItems[index] = value
    onChange(newItems)
  }

  const addItem = () => {
    onChange([...items, ''])
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <table className="w-full border-collapse bg-card">
      <tbody>
        <tr>
          <td className="border border-border p-0" colSpan={2}>
            <div className="flex items-center">
              <span className="px-3 py-2 text-xs font-medium text-primary bg-primary/10 border-r border-border whitespace-nowrap">
                Acondicionamiento:
              </span>
              <div className="flex-1 flex flex-wrap items-center gap-2 px-2 py-1">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center gap-1 group">
                    <span className="text-xs text-muted-foreground">
                      {String.fromCharCode(97 + index)})
                    </span>
                    <Input 
                      value={item}
                      onChange={(e) => updateItem(index, e.target.value)}
                      className="border-0 bg-transparent h-8 w-auto min-w-[200px] px-1 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                      placeholder={`Ejercicio ${index + 1}`}
                    />
                    {items.length > 1 && (
                      <button 
                        onClick={() => removeItem(index)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={addItem}
                  className="h-7 text-xs text-muted-foreground hover:text-primary"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar
                </Button>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  )
}
