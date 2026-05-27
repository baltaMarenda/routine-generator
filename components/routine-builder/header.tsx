'use client'

import { Input } from '@/components/ui/input'

interface HeaderData {
  clientName: string
  planType: string
  phase: string
  observations: string
}

interface HeaderProps {
  data: HeaderData
  onChange: (data: Partial<HeaderData>) => void
}

export function Header({ data, onChange }: HeaderProps) {
  return (
    <table className="w-full border-collapse bg-card">
      <tbody>
        <tr>
          {/* Logo cell */}
          <td rowSpan={2} className="border border-border p-4 w-48 align-middle">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-primary tracking-tight">GOBLET</h1>
              <p className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase">Fuerza & Movimiento</p>
            </div>
          </td>
          {/* Name field */}
          <td className="border border-border p-0">
            <div className="flex items-center">
              <span className="px-3 py-2 text-xs font-medium text-muted-foreground bg-secondary/50 border-r border-border whitespace-nowrap">
                NOMBRE Y APELLIDO
              </span>
              <Input 
                value={data.clientName}
                onChange={(e) => onChange({ clientName: e.target.value })}
                className="border-0 bg-transparent h-10 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
                placeholder="Ingresa nombre completo"
              />
            </div>
          </td>
          {/* Phase field */}
          <td className="border border-border p-0 w-56">
            <div className="flex items-center">
              <span className="px-3 py-2 text-xs font-medium text-muted-foreground bg-secondary/50 border-r border-border whitespace-nowrap">
                FASES:
              </span>
              <Input 
                value={data.phase}
                onChange={(e) => onChange({ phase: e.target.value })}
                className="border-0 bg-transparent h-10 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
                placeholder="Fase"
              />
            </div>
          </td>
        </tr>
        <tr>
          {/* Plan type field */}
          <td className="border border-border p-0">
            <div className="flex items-center">
              <span className="px-3 py-2 text-xs font-medium text-muted-foreground bg-secondary/50 border-r border-border whitespace-nowrap">
                TIPO DE PLAN
              </span>
              <Input 
                value={data.planType}
                onChange={(e) => onChange({ planType: e.target.value })}
                className="border-0 bg-transparent h-10 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
                placeholder="Ej: Hipertrofia, Fuerza..."
              />
            </div>
          </td>
          {/* Observations field */}
          <td className="border border-border p-0">
            <div className="flex items-center">
              <span className="px-3 py-2 text-xs font-medium text-muted-foreground bg-secondary/50 border-r border-border whitespace-nowrap">
                OBSERVACIONES
              </span>
              <Input 
                value={data.observations}
                onChange={(e) => onChange({ observations: e.target.value })}
                className="border-0 bg-transparent h-10 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
                placeholder="Notas generales"
              />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  )
}
