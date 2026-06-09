'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { EvaluationData, GoniometryRow } from '@/lib/evaluation-types'

interface EvaluationBuilderProps {
  data: EvaluationData
  onChange: (data: EvaluationData) => void
}

interface GoniometryTableProps {
  title: string
  section: keyof EvaluationData['goniometry']
  rows: GoniometryRow[]
  onUpdate: (section: keyof EvaluationData['goniometry'], index: number, field: keyof GoniometryRow, value: string) => void
}

function GoniometryTable({ title, section, rows, onUpdate }: GoniometryTableProps) {
  return (
    <div className="mb-4">
      <div className="bg-primary/10 border border-border px-3 py-1.5">
        <span className="text-sm font-semibold text-primary">{title}</span>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-muted/50">
            <th className="border border-border px-2 py-1 text-left text-xs font-medium">Movimiento</th>
            <th className="border border-border px-2 py-1 text-center text-xs font-medium w-20">Activo</th>
            <th className="border border-border px-2 py-1 text-center text-xs font-medium w-20">Pasivo</th>
            <th className="border border-border px-2 py-1 text-center text-xs font-medium w-24">Valor Normal</th>
            <th className="border border-border px-2 py-1 text-center text-xs font-medium w-20">Dolor</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.movement}>
              <td className="border border-border px-2 py-0.5 text-sm">{row.movement}</td>
              <td className="border border-border p-0">
                <Input
                  value={row.active}
                  onChange={(e) => onUpdate(section, index, 'active', e.target.value)}
                  className="border-0 h-7 text-center text-sm rounded-none"
                />
              </td>
              <td className="border border-border p-0">
                <Input
                  value={row.passive}
                  onChange={(e) => onUpdate(section, index, 'passive', e.target.value)}
                  className="border-0 h-7 text-center text-sm rounded-none"
                />
              </td>
              <td className="border border-border px-2 py-0.5 text-center text-xs text-muted-foreground">
                {row.normalValue}
              </td>
              <td className="border border-border p-0">
                <Input
                  value={row.pain}
                  onChange={(e) => onUpdate(section, index, 'pain', e.target.value)}
                  className="border-0 h-7 text-center text-sm rounded-none"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function EvaluationBuilder({ data, onChange }: EvaluationBuilderProps) {
  const updatePatientData = (field: keyof typeof data.patientData, value: string) => {
    onChange({
      ...data,
      patientData: { ...data.patientData, [field]: value }
    })
  }

  const updateGoniometry = (
    section: keyof typeof data.goniometry,
    index: number,
    field: keyof GoniometryRow,
    value: string
  ) => {
    const updated = [...data.goniometry[section]]
    updated[index] = { ...updated[index], [field]: value }
    onChange({
      ...data,
      goniometry: { ...data.goniometry, [section]: updated }
    })
  }

  const updateAntecedentes = (field: keyof typeof data.antecedentes, value: string) => {
    onChange({
      ...data,
      antecedentes: { ...data.antecedentes, [field]: value }
    })
  }

  const updateEva = (field: keyof typeof data.evaluacionClinica.eva, value: string) => {
    onChange({
      ...data,
      evaluacionClinica: {
        ...data.evaluacionClinica,
        eva: { ...data.evaluacionClinica.eva, [field]: value }
      }
    })
  }

  const updateFuerzaMuscular = (index: number, field: string, value: string) => {
    const updated = [...data.evaluacionClinica.fuerzaMuscular]
    updated[index] = { ...updated[index], [field]: value }
    onChange({
      ...data,
      evaluacionClinica: { ...data.evaluacionClinica, fuerzaMuscular: updated }
    })
  }

  const addFuerzaMuscular = () => {
    onChange({
      ...data,
      evaluacionClinica: {
        ...data.evaluacionClinica,
        fuerzaMuscular: [...data.evaluacionClinica.fuerzaMuscular, { grupo: '', derecho: '', izquierdo: '' }]
      }
    })
  }

  const removeFuerzaMuscular = (index: number) => {
    const updated = data.evaluacionClinica.fuerzaMuscular.filter((_, i) => i !== index)
    onChange({
      ...data,
      evaluacionClinica: { ...data.evaluacionClinica, fuerzaMuscular: updated }
    })
  }

  const updateInspeccionPostural = (field: string, value: boolean | string) => {
    onChange({
      ...data,
      inspeccionPostural: { ...data.inspeccionPostural, [field]: value }
    })
  }

  const updatePalpacion = (field: string, value: boolean | string) => {
    onChange({
      ...data,
      palpacion: { ...data.palpacion, [field]: value }
    })
  }

  const updateObjetivos = (field: keyof typeof data.objetivos, value: string) => {
    onChange({
      ...data,
      objetivos: { ...data.objetivos, [field]: value }
    })
  }

  const updatePlanTratamiento = (field: string, value: boolean | string) => {
    onChange({
      ...data,
      planTratamiento: { ...data.planTratamiento, [field]: value }
    })
  }

  const updateEvolucion = (index: number, field: string, value: string) => {
    const updated = [...data.evolucion]
    updated[index] = { ...updated[index], [field]: value }
    onChange({ ...data, evolucion: updated })
  }

  const addEvolucion = () => {
    onChange({
      ...data,
      evolucion: [...data.evolucion, { fecha: '', eva: '', cambiosRom: '', observaciones: '' }]
    })
  }

  const removeEvolucion = (index: number) => {
    const updated = data.evolucion.filter((_, i) => i !== index)
    onChange({ ...data, evolucion: updated })
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="bg-primary/10 px-4 py-2 border-b border-border">
          <h2 className="font-semibold text-primary">HISTORIA CLÍNICA KINESIOLÓGICA / OSTEOPÁTICA</h2>
          <p className="text-xs text-muted-foreground italic">(Documento confidencial – Uso profesional)</p>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Fecha del día:</span>
            <Input
              type="date"
              value={data.date}
              onChange={(e) => onChange({ ...data, date: e.target.value })}
              className="w-40 h-8"
            />
          </div>
        </div>
      </div>

      {/* Two column layout for patient data and goniometry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Patient Data */}
        <div className="space-y-6">
          {/* Patient Data Section */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="bg-muted px-4 py-2 border-b border-border">
              <h3 className="font-semibold text-sm">DATOS DEL PACIENTE</h3>
            </div>
            <div className="p-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border border-border px-3 py-1.5 text-left text-xs font-medium w-40">Datos</th>
                    <th className="border border-border px-3 py-1.5 text-left text-xs font-medium">Información</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'nombreApellido', label: 'Nombre y Apellido' },
                    { key: 'dni', label: 'DNI' },
                    { key: 'fechaNacimiento', label: 'Fecha de Nacimiento' },
                    { key: 'edad', label: 'Edad' },
                    { key: 'telefono', label: 'Teléfono' },
                    { key: 'email', label: 'Email' },
                    { key: 'direccion', label: 'Dirección' },
                    { key: 'ocupacion', label: 'Ocupación' },
                    { key: 'actividadFisica', label: 'Actividad física / deporte' },
                    { key: 'alimentacion', label: 'Alimentación' },
                    { key: 'sueno', label: 'Sueño' },
                    { key: 'medicoDerivante', label: 'Médico derivante' },
                    { key: 'diagnosticoMedico', label: 'Diagnóstico médico' },
                  ].map(({ key, label }) => (
                    <tr key={key}>
                      <td className="border border-border px-3 py-0.5 text-sm">{label}</td>
                      <td className="border border-border p-0">
                        <Input
                          value={data.patientData[key as keyof typeof data.patientData]}
                          onChange={(e) => updatePatientData(key as keyof typeof data.patientData, e.target.value)}
                          className="border-0 h-8 rounded-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Consultation Reason */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="bg-muted px-4 py-2 border-b border-border">
              <h3 className="font-semibold text-sm">MOTIVO DE CONSULTA:</h3>
            </div>
            <div className="p-0">
              <Textarea
                value={data.motivoConsulta}
                onChange={(e) => onChange({ ...data, motivoConsulta: e.target.value })}
                className="border-0 min-h-24 rounded-none resize-none"
                placeholder="Describa el motivo de consulta..."
              />
            </div>
          </div>

          {/* Relevant Background */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="bg-muted px-4 py-2 border-b border-border">
              <h3 className="font-semibold text-sm">ANTECEDENTES RELEVANTES</h3>
            </div>
            <div className="p-4">
              <table className="w-full border-collapse">
                <tbody>
                  {[
                    { key: 'personales', label: 'Personales' },
                    { key: 'quirurgicosTraumaticos', label: 'Quirúrgicos / Traumáticos' },
                    { key: 'medicacionActual', label: 'Medicación Actual' },
                    { key: 'lesionesMusculoesqueleticas', label: 'Lesiones musculoesqueléticas previas' },
                  ].map(({ key, label }) => (
                    <tr key={key}>
                      <td className="border border-border px-3 py-0.5 text-sm font-medium w-56">{label}</td>
                      <td className="border border-border p-0">
                        <Input
                          value={data.antecedentes[key as keyof typeof data.antecedentes]}
                          onChange={(e) => updateAntecedentes(key as keyof typeof data.antecedentes, e.target.value)}
                          className="border-0 h-8 rounded-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Clinical Evaluation */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="bg-muted px-4 py-2 border-b border-border">
              <h3 className="font-semibold text-sm">EVALUACIÓN CLÍNICA</h3>
            </div>
            <div className="p-4 space-y-4">
              {/* EVA Scale */}
              <div>
                <p className="text-sm font-medium mb-2 text-center">Escala Visual Analógica del Dolor (EVA) : 0 a 10</p>
                <table className="w-full border-collapse max-w-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="border border-border px-3 py-1 text-left text-xs font-medium">Situación</th>
                      <th className="border border-border px-3 py-1 text-left text-xs font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'reposo', label: 'Reposo' },
                      { key: 'movimiento', label: 'Movimiento' },
                      { key: 'nocturno', label: 'Nocturno' },
                    ].map(({ key, label }) => (
                      <tr key={key}>
                        <td className="border border-border px-3 py-0.5 text-sm">{label}</td>
                        <td className="border border-border p-0">
                          <Input
                            value={data.evaluacionClinica.eva[key as keyof typeof data.evaluacionClinica.eva]}
                            onChange={(e) => updateEva(key as keyof typeof data.evaluacionClinica.eva, e.target.value)}
                            className="border-0 h-7 rounded-none"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Muscular Strength */}
              <div>
                <p className="text-sm font-medium mb-2 text-center">FUERZA MUSCULAR (Escala Daniels 0–5)</p>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="border border-border px-3 py-1 text-left text-xs font-medium">Grupo muscular</th>
                      <th className="border border-border px-3 py-1 text-left text-xs font-medium">Derecho</th>
                      <th className="border border-border px-3 py-1 text-left text-xs font-medium">Izquierdo</th>
                      <th className="border border-border px-3 py-1 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.evaluacionClinica.fuerzaMuscular.map((row, index) => (
                      <tr key={index} className="group">
                        <td className="border border-border p-0">
                          <Input
                            value={row.grupo}
                            onChange={(e) => updateFuerzaMuscular(index, 'grupo', e.target.value)}
                            className="border-0 h-7 rounded-none"
                            placeholder="Grupo muscular"
                          />
                        </td>
                        <td className="border border-border p-0">
                          <Input
                            value={row.derecho}
                            onChange={(e) => updateFuerzaMuscular(index, 'derecho', e.target.value)}
                            className="border-0 h-7 rounded-none"
                          />
                        </td>
                        <td className="border border-border p-0">
                          <Input
                            value={row.izquierdo}
                            onChange={(e) => updateFuerzaMuscular(index, 'izquierdo', e.target.value)}
                            className="border-0 h-7 rounded-none"
                          />
                        </td>
                        <td className="border border-border p-0 text-center">
                          {data.evaluacionClinica.fuerzaMuscular.length > 1 && (
                            <button
                              onClick={() => removeFuerzaMuscular(index)}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addFuerzaMuscular}
                  className="mt-2"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar grupo
                </Button>
              </div>
            </div>
          </div>

          {/* Postural Inspection */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="bg-muted px-4 py-2 border-b border-border">
              <h3 className="font-semibold text-sm">INSPECCIÓN POSTURAL</h3>
            </div>
            <div className="p-4">
              <table className="w-full border-collapse">
                <tbody>
                  {[
                    { check: 'vistaAnterior', obs: 'vistaAnteriorObs', label: 'Vista anterior' },
                    { check: 'vistaLateral', obs: 'vistaLateralObs', label: 'Vista lateral' },
                    { check: 'vistaPosterior', obs: 'vistaPosteriorObs', label: 'Vista posterior' },
                  ].map(({ check, obs, label }) => (
                    <tr key={check}>
                      <td className="border border-border px-3 py-1.5 w-40">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={data.inspeccionPostural[check as keyof typeof data.inspeccionPostural] as boolean}
                            onCheckedChange={(checked) => updateInspeccionPostural(check, checked as boolean)}
                          />
                          <span className="text-sm">{label}</span>
                        </div>
                      </td>
                      <td className="border border-border p-0">
                        <Input
                          value={data.inspeccionPostural[obs as keyof typeof data.inspeccionPostural] as string}
                          onChange={(e) => updateInspeccionPostural(obs, e.target.value)}
                          className="border-0 h-8 rounded-none"
                          placeholder="Observaciones"
                        />
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="border border-border px-3 py-0.5 text-sm">Observaciones:</td>
                    <td className="border border-border p-0">
                      <Input
                        value={data.inspeccionPostural.observaciones}
                        onChange={(e) => updateInspeccionPostural('observaciones', e.target.value)}
                        className="border-0 h-8 rounded-none"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column - Goniometry */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="bg-muted px-4 py-2 border-b border-border">
              <h3 className="font-semibold text-sm">RANGOS DE MOVIMIENTO (GONIOMETRÍA)</h3>
            </div>
            <div className="p-4">
              <GoniometryTable title="HOMBRO" section="hombro" rows={data.goniometry.hombro} onUpdate={updateGoniometry} />
              <GoniometryTable title="CODO" section="codo" rows={data.goniometry.codo} onUpdate={updateGoniometry} />
              <GoniometryTable title="MUÑECA" section="muneca" rows={data.goniometry.muneca} onUpdate={updateGoniometry} />
              <GoniometryTable title="RODILLA" section="rodilla" rows={data.goniometry.rodilla} onUpdate={updateGoniometry} />
              <GoniometryTable title="TOBILLO" section="tobillo" rows={data.goniometry.tobillo} onUpdate={updateGoniometry} />
              <GoniometryTable title="COLUMNA CERVICAL" section="columnaCervical" rows={data.goniometry.columnaCervical} onUpdate={updateGoniometry} />
              <GoniometryTable title="COLUMNA LUMBAR" section="columnaLumbar" rows={data.goniometry.columnaLumbar} onUpdate={updateGoniometry} />
            </div>
          </div>
        </div>
      </div>

      {/* Palpation Section */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="bg-muted px-4 py-2 border-b border-border">
          <h3 className="font-semibold text-sm">PALPACIÓN</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-4">
            {[
              { key: 'hipertonia', label: 'Hipertonía' },
              { key: 'triggerPoints', label: 'Trigger points' },
              { key: 'restriccionFascial', label: 'Restricción fascial' },
              { key: 'dolorPalpacion', label: 'Dolor a la palpación' },
              { key: 'edema', label: 'Edema' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <Checkbox
                  checked={data.palpacion[key as keyof typeof data.palpacion] as boolean}
                  onCheckedChange={(checked) => updatePalpacion(key, checked as boolean)}
                />
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Observaciones:</span>
            <Input
              value={data.palpacion.observaciones}
              onChange={(e) => updatePalpacion('observaciones', e.target.value)}
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Special Tests */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="bg-muted px-4 py-2 border-b border-border">
          <h3 className="font-semibold text-sm">PRUEBAS ESPECIALES</h3>
        </div>
        <div className="p-0">
          <Textarea
            value={data.pruebasEspeciales}
            onChange={(e) => onChange({ ...data, pruebasEspeciales: e.target.value })}
            className="border-0 min-h-24 rounded-none resize-none"
            placeholder="Describa las pruebas especiales realizadas..."
          />
        </div>
      </div>

      {/* Diagnosis */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="bg-muted px-4 py-2 border-b border-border">
          <h3 className="font-semibold text-sm">DIAGNÓSTICO KINESIOLÓGICO / OSTEOPÁTICO</h3>
        </div>
        <div className="p-0">
          <Textarea
            value={data.diagnosticoKinesiologico}
            onChange={(e) => onChange({ ...data, diagnosticoKinesiologico: e.target.value })}
            className="border-0 min-h-24 rounded-none resize-none"
            placeholder="Ingrese el diagnóstico..."
          />
        </div>
      </div>

      {/* Therapeutic Objectives */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="bg-muted px-4 py-2 border-b border-border">
          <h3 className="font-semibold text-sm">OBJETIVOS TERAPÉUTICOS</h3>
        </div>
        <div className="p-4">
          <table className="w-full border-collapse">
            <tbody>
              {[
                { key: 'cortoPlazo', label: 'Corto plazo' },
                { key: 'medianoPlazo', label: 'Mediano plazo' },
                { key: 'largoPlazo', label: 'Largo plazo' },
              ].map(({ key, label }) => (
                <tr key={key}>
                  <td className="border border-border px-3 py-0.5 text-sm font-medium w-32">{label}</td>
                  <td className="border border-border p-0">
                    <Input
                      value={data.objetivos[key as keyof typeof data.objetivos]}
                      onChange={(e) => updateObjetivos(key as keyof typeof data.objetivos, e.target.value)}
                      className="border-0 h-8 rounded-none"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Treatment Plan */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="bg-muted px-4 py-2 border-b border-border">
          <h3 className="font-semibold text-sm">PLAN DE TRATAMIENTO</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
            {[
              { key: 'terapiaManual', label: 'Terapia manual' },
              { key: 'ejercicioTerapeutico', label: 'Ejercicio terapéutico' },
              { key: 'liberacionMiofascial', label: 'Liberación miofascial' },
              { key: 'electroterapia', label: 'Electroterapia' },
              { key: 'ultrasonido', label: 'Ultrasonido' },
              { key: 'puncionSeca', label: 'Punción seca' },
              { key: 'vendajeFuncional', label: 'Vendaje funcional / kinesiotape' },
              { key: 'reeducacionPostural', label: 'Reeducación postural' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <Checkbox
                  checked={data.planTratamiento[key as keyof typeof data.planTratamiento] as boolean}
                  onCheckedChange={(checked) => updatePlanTratamiento(key, checked as boolean)}
                />
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm whitespace-nowrap">Frecuencia semanal:</span>
              <Input
                value={data.planTratamiento.frecuenciaSemanal}
                onChange={(e) => updatePlanTratamiento('frecuenciaSemanal', e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm whitespace-nowrap">Duración estimada:</span>
              <Input
                value={data.planTratamiento.duracionEstimada}
                onChange={(e) => updatePlanTratamiento('duracionEstimada', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Evolution */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="bg-muted px-4 py-2 border-b border-border">
          <h3 className="font-semibold text-sm">EVOLUCIÓN</h3>
        </div>
        <div className="p-4">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="border border-border px-3 py-1 text-left text-xs font-medium w-28">Fecha</th>
                <th className="border border-border px-3 py-1 text-left text-xs font-medium w-16">EVA</th>
                <th className="border border-border px-3 py-1 text-left text-xs font-medium w-28">Cambios en ROM</th>
                <th className="border border-border px-3 py-1 text-left text-xs font-medium">Observaciones</th>
                <th className="border border-border px-3 py-1 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {data.evolucion.map((row, index) => (
                <tr key={index} className="group">
                  <td className="border border-border p-0">
                    <Input
                      type="date"
                      value={row.fecha}
                      onChange={(e) => updateEvolucion(index, 'fecha', e.target.value)}
                      className="border-0 h-7 rounded-none"
                    />
                  </td>
                  <td className="border border-border p-0">
                    <Input
                      value={row.eva}
                      onChange={(e) => updateEvolucion(index, 'eva', e.target.value)}
                      className="border-0 h-7 rounded-none"
                    />
                  </td>
                  <td className="border border-border p-0">
                    <Input
                      value={row.cambiosRom}
                      onChange={(e) => updateEvolucion(index, 'cambiosRom', e.target.value)}
                      className="border-0 h-7 rounded-none"
                    />
                  </td>
                  <td className="border border-border p-0">
                    <Input
                      value={row.observaciones}
                      onChange={(e) => updateEvolucion(index, 'observaciones', e.target.value)}
                      className="border-0 h-7 rounded-none"
                    />
                  </td>
                  <td className="border border-border p-0 text-center">
                    {data.evolucion.length > 1 && (
                      <button
                        onClick={() => removeEvolucion(index)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button
            variant="ghost"
            size="sm"
            onClick={addEvolucion}
            className="mt-2"
          >
            <Plus className="h-3 w-3 mr-1" />
            Agregar evolución
          </Button>
        </div>
      </div>

      {/* Informed Consent */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="bg-muted px-4 py-2 border-b border-border">
          <h3 className="font-semibold text-sm">CONSENTIMIENTO INFORMADO</h3>
        </div>
        <div className="p-4">
          <p className="text-sm text-muted-foreground mb-4">
            Declaro que autorizo la evaluación y tratamiento kinesiológico.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-sm mb-1">Firma del paciente:</p>
              <Input
                value={data.consentimiento.firmaPaciente}
                onChange={(e) => onChange({
                  ...data,
                  consentimiento: { ...data.consentimiento, firmaPaciente: e.target.value }
                })}
              />
            </div>
            <div>
              <p className="text-sm mb-1">Firma y sello del profesional:</p>
              <Input
                value={data.consentimiento.firmaProfesional}
                onChange={(e) => onChange({
                  ...data,
                  consentimiento: { ...data.consentimiento, firmaProfesional: e.target.value }
                })}
              />
            </div>
            <div>
              <p className="text-sm mb-1">Fecha:</p>
              <Input
                type="date"
                value={data.consentimiento.fecha}
                onChange={(e) => onChange({
                  ...data,
                  consentimiento: { ...data.consentimiento, fecha: e.target.value }
                })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
