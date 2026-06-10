import ExcelJS from 'exceljs'
import type { EvaluationData } from './evaluation-types'

const ORANGE = 'FFE67E22'
const LIGHT_GRAY = 'FFF5F5F5'
const BORDER_COLOR = 'FF000000'

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: BORDER_COLOR } },
  left: { style: 'thin', color: { argb: BORDER_COLOR } },
  bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
  right: { style: 'thin', color: { argb: BORDER_COLOR } }
}

/** Inserts a manual page break so that `rowNumber` always starts on a new page. */
function addPageBreakBefore(ws: ExcelJS.Worksheet, rowNumber: number) {
  if (rowNumber <= 1) return
  const breaks = (ws as unknown as { rowBreaks: Array<{ id: number; max: number; man: boolean }> }).rowBreaks
  if (Array.isArray(breaks)) {
    breaks.push({ id: rowNumber - 1, max: 16383, man: true })
  }
}

export async function exportEvaluationToExcel(data: EvaluationData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const ws = workbook.addWorksheet('Evaluación')

  ws.pageSetup.orientation = 'landscape'
  ws.pageSetup.fitToPage = true
  ws.pageSetup.fitToWidth = 1
  ws.pageSetup.fitToHeight = 0
  ws.pageSetup.paperSize = 9 // A4

  // Set column widths
  ws.columns = [
    { width: 25 }, { width: 30 }, { width: 15 }, { width: 15 },
    { width: 5 }, { width: 18 }, { width: 12 }, { width: 12 },
    { width: 12 }, { width: 10 }
  ]

  let row = 1

  // Header
  ws.mergeCells(`A${row}:D${row}`)
  const headerCell = ws.getCell(`A${row}`)
  headerCell.value = 'HISTORIA CLÍNICA KINESIOLÓGICA / OSTEOPÁTICA'
  headerCell.font = { bold: true, size: 12 }
  headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY } }
  row++

  ws.mergeCells(`A${row}:D${row}`)
  ws.getCell(`A${row}`).value = '(Documento confidencial – Uso profesional)'
  ws.getCell(`A${row}`).font = { italic: true, size: 9 }
  row += 2

  ws.getCell(`A${row}`).value = `Fecha del día: ${data.date}`
  row += 2

  // Patient Data Section
  ws.mergeCells(`A${row}:D${row}`)
  const patientHeader = ws.getCell(`A${row}`)
  patientHeader.value = 'DATOS DEL PACIENTE'
  patientHeader.font = { bold: true }
  patientHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY } }
  patientHeader.border = thinBorder
  row++

  ws.getCell(`A${row}`).value = 'Datos'
  ws.getCell(`A${row}`).font = { bold: true }
  ws.getCell(`A${row}`).border = thinBorder
  ws.mergeCells(`B${row}:D${row}`)
  ws.getCell(`B${row}`).value = 'Información'
  ws.getCell(`B${row}`).font = { bold: true }
  ws.getCell(`B${row}`).border = thinBorder
  row++

  const patientFields = [
    ['Nombre y Apellido', data.patientData.nombreApellido],
    ['DNI', data.patientData.dni],
    ['Fecha de Nacimiento', data.patientData.fechaNacimiento],
    ['Edad', data.patientData.edad],
    ['Teléfono', data.patientData.telefono],
    ['Email', data.patientData.email],
    ['Dirección', data.patientData.direccion],
    ['Ocupación', data.patientData.ocupacion],
    ['Actividad física / deporte', data.patientData.actividadFisica],
    ['Alimentación', data.patientData.alimentacion],
    ['Sueño', data.patientData.sueno],
    ['Médico derivante', data.patientData.medicoDerivante],
    ['Diagnóstico médico', data.patientData.diagnosticoMedico],
  ]

  for (const [label, value] of patientFields) {
    ws.getCell(`A${row}`).value = label
    ws.getCell(`A${row}`).border = thinBorder
    ws.mergeCells(`B${row}:D${row}`)
    ws.getCell(`B${row}`).value = value
    ws.getCell(`B${row}`).border = thinBorder
    row++
  }

  row++

  // Consultation Reason
  ws.mergeCells(`A${row}:D${row}`)
  const motivoHeader = ws.getCell(`A${row}`)
  motivoHeader.value = 'MOTIVO DE CONSULTA:'
  motivoHeader.font = { bold: true }
  motivoHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY } }
  motivoHeader.border = thinBorder
  row++
  
  ws.mergeCells(`A${row}:D${row + 2}`)
  ws.getCell(`A${row}`).value = data.motivoConsulta
  ws.getCell(`A${row}`).border = thinBorder
  ws.getCell(`A${row}`).alignment = { wrapText: true, vertical: 'top' }
  row += 4

  // Goniometry Section - Start on column F
  let goniRow = 5
  
  ws.mergeCells(`F${goniRow}:J${goniRow}`)
  const goniHeader = ws.getCell(`F${goniRow}`)
  goniHeader.value = 'RANGOS DE MOVIMIENTO (GONIOMETRÍA)'
  goniHeader.font = { bold: true }
  goniHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY } }
  goniHeader.border = thinBorder
  goniRow++

  const writeGoniometryTable = (title: string, movements: typeof data.goniometry.hombro, startRow: number) => {
    let r = startRow
    
    // Section title
    ws.mergeCells(`F${r}:J${r}`)
    const titleCell = ws.getCell(`F${r}`)
    titleCell.value = title
    titleCell.font = { bold: true, color: { argb: ORANGE.replace('FF', '') } }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF5E6' } }
    titleCell.border = thinBorder
    r++

    // Header row
    const headers = ['Movimiento', 'Activo', 'Pasivo', 'Valor Normal', 'Dolor']
    const cols = ['F', 'G', 'H', 'I', 'J']
    for (let i = 0; i < headers.length; i++) {
      const cell = ws.getCell(`${cols[i]}${r}`)
      cell.value = headers[i]
      cell.font = { bold: true, size: 9 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY } }
      cell.border = thinBorder
      cell.alignment = { horizontal: 'center' }
    }
    r++

    // Data rows
    for (const mov of movements) {
      ws.getCell(`F${r}`).value = mov.movement
      ws.getCell(`F${r}`).border = thinBorder
      ws.getCell(`G${r}`).value = mov.active
      ws.getCell(`G${r}`).border = thinBorder
      ws.getCell(`G${r}`).alignment = { horizontal: 'center' }
      ws.getCell(`H${r}`).value = mov.passive
      ws.getCell(`H${r}`).border = thinBorder
      ws.getCell(`H${r}`).alignment = { horizontal: 'center' }
      ws.getCell(`I${r}`).value = mov.normalValue
      ws.getCell(`I${r}`).border = thinBorder
      ws.getCell(`I${r}`).alignment = { horizontal: 'center' }
      ws.getCell(`I${r}`).font = { size: 9, color: { argb: '666666' } }
      ws.getCell(`J${r}`).value = mov.pain
      ws.getCell(`J${r}`).border = thinBorder
      ws.getCell(`J${r}`).alignment = { horizontal: 'center' }
      r++
    }

    return r + 1
  }

  goniRow = writeGoniometryTable('HOMBRO', data.goniometry.hombro, goniRow)
  goniRow = writeGoniometryTable('CODO', data.goniometry.codo, goniRow)
  goniRow = writeGoniometryTable('MUÑECA', data.goniometry.muneca, goniRow)
  goniRow = writeGoniometryTable('RODILLA', data.goniometry.rodilla, goniRow)
  addPageBreakBefore(ws, goniRow)
  goniRow = writeGoniometryTable('TOBILLO', data.goniometry.tobillo, goniRow)
  goniRow = writeGoniometryTable('COLUMNA CERVICAL', data.goniometry.columnaCervical, goniRow)
  writeGoniometryTable('COLUMNA LUMBAR', data.goniometry.columnaLumbar, goniRow)

  // Continue with left column sections
  // Antecedentes
  ws.mergeCells(`A${row}:D${row}`)
  const antHeader = ws.getCell(`A${row}`)
  antHeader.value = 'ANTECEDENTES RELEVANTES'
  antHeader.font = { bold: true }
  antHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY } }
  antHeader.border = thinBorder
  row++

  const antFields = [
    ['Personales', data.antecedentes.personales],
    ['Quirúrgicos / Traumáticos', data.antecedentes.quirurgicosTraumaticos],
    ['Medicación Actual', data.antecedentes.medicacionActual],
    ['Lesiones musculoesqueléticas previas', data.antecedentes.lesionesMusculoesqueleticas],
  ]

  for (const [label, value] of antFields) {
    ws.getCell(`A${row}`).value = label
    ws.getCell(`A${row}`).border = thinBorder
    ws.getCell(`A${row}`).font = { bold: true }
    ws.mergeCells(`B${row}:D${row}`)
    ws.getCell(`B${row}`).value = value
    ws.getCell(`B${row}`).border = thinBorder
    row++
  }
  row++

  // Clinical Evaluation - EVA
  addPageBreakBefore(ws, row)
  ws.mergeCells(`A${row}:D${row}`)
  const clinHeader = ws.getCell(`A${row}`)
  clinHeader.value = 'EVALUACIÓN CLÍNICA'
  clinHeader.font = { bold: true }
  clinHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY } }
  clinHeader.border = thinBorder
  row += 2

  ws.mergeCells(`A${row}:B${row}`)
  ws.getCell(`A${row}`).value = 'Escala Visual Analógica del Dolor (EVA) : 0 a 10'
  ws.getCell(`A${row}`).alignment = { horizontal: 'center' }
  row++

  ws.getCell(`A${row}`).value = 'Situación'
  ws.getCell(`A${row}`).font = { bold: true }
  ws.getCell(`A${row}`).border = thinBorder
  ws.getCell(`B${row}`).value = 'Valor'
  ws.getCell(`B${row}`).font = { bold: true }
  ws.getCell(`B${row}`).border = thinBorder
  row++

  for (const [label, key] of [['Reposo', 'reposo'], ['Movimiento', 'movimiento'], ['Nocturno', 'nocturno']] as const) {
    ws.getCell(`A${row}`).value = label
    ws.getCell(`A${row}`).border = thinBorder
    ws.getCell(`B${row}`).value = data.evaluacionClinica.eva[key]
    ws.getCell(`B${row}`).border = thinBorder
    row++
  }
  row++

  // Fuerza Muscular
  ws.mergeCells(`A${row}:C${row}`)
  ws.getCell(`A${row}`).value = 'FUERZA MUSCULAR (Escala Daniels 0–5)'
  ws.getCell(`A${row}`).alignment = { horizontal: 'center' }
  row++

  ws.getCell(`A${row}`).value = 'Grupo muscular'
  ws.getCell(`A${row}`).font = { bold: true }
  ws.getCell(`A${row}`).border = thinBorder
  ws.getCell(`B${row}`).value = 'Derecho'
  ws.getCell(`B${row}`).font = { bold: true }
  ws.getCell(`B${row}`).border = thinBorder
  ws.getCell(`C${row}`).value = 'Izquierdo'
  ws.getCell(`C${row}`).font = { bold: true }
  ws.getCell(`C${row}`).border = thinBorder
  row++

  for (const fm of data.evaluacionClinica.fuerzaMuscular) {
    ws.getCell(`A${row}`).value = fm.grupo
    ws.getCell(`A${row}`).border = thinBorder
    ws.getCell(`B${row}`).value = fm.derecho
    ws.getCell(`B${row}`).border = thinBorder
    ws.getCell(`C${row}`).value = fm.izquierdo
    ws.getCell(`C${row}`).border = thinBorder
    row++
  }
  row++

  // Inspección Postural
  ws.mergeCells(`A${row}:D${row}`)
  const postHeader = ws.getCell(`A${row}`)
  postHeader.value = 'INSPECCIÓN POSTURAL'
  postHeader.font = { bold: true }
  postHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY } }
  postHeader.border = thinBorder
  row++

  for (const [check, label, obs] of [
    ['vistaAnterior', 'Vista anterior', 'vistaAnteriorObs'],
    ['vistaLateral', 'Vista lateral', 'vistaLateralObs'],
    ['vistaPosterior', 'Vista posterior', 'vistaPosteriorObs'],
  ] as const) {
    ws.getCell(`A${row}`).value = `${data.inspeccionPostural[check] ? '☑' : '☐'} ${label}`
    ws.getCell(`A${row}`).border = thinBorder
    ws.mergeCells(`B${row}:D${row}`)
    ws.getCell(`B${row}`).value = data.inspeccionPostural[obs]
    ws.getCell(`B${row}`).border = thinBorder
    row++
  }
  ws.getCell(`A${row}`).value = 'Observaciones:'
  ws.getCell(`A${row}`).border = thinBorder
  ws.mergeCells(`B${row}:D${row}`)
  ws.getCell(`B${row}`).value = data.inspeccionPostural.observaciones
  ws.getCell(`B${row}`).border = thinBorder
  row += 2

  // Palpación
  ws.mergeCells(`A${row}:D${row}`)
  const palpHeader = ws.getCell(`A${row}`)
  palpHeader.value = 'PALPACIÓN'
  palpHeader.font = { bold: true }
  palpHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY } }
  palpHeader.border = thinBorder
  row++

  const palpChecks = [
    ['hipertonia', 'Hipertonía', 'hipertoniaObs'],
    ['triggerPoints', 'Trigger points', 'triggerPointsObs'],
    ['restriccionFascial', 'Restricción fascial', 'restriccionFascialObs'],
    ['dolorPalpacion', 'Dolor a la palpación', 'dolorPalpacionObs'],
    ['edema', 'Edema', 'edemaObs'],
  ] as const

  for (const [key, label, obsKey] of palpChecks) {
    ws.getCell(`A${row}`).value = `${data.palpacion[key] ? '☑' : '☐'} ${label}`
    ws.getCell(`A${row}`).border = thinBorder
    ws.mergeCells(`B${row}:D${row}`)
    ws.getCell(`B${row}`).value = (data.palpacion as Record<string, unknown>)[obsKey] as string ?? ''
    ws.getCell(`B${row}`).border = thinBorder
    row++
  }
  ws.getCell(`A${row}`).value = 'Observaciones generales:'
  ws.getCell(`A${row}`).border = thinBorder
  ws.mergeCells(`B${row}:D${row}`)
  ws.getCell(`B${row}`).value = data.palpacion.observaciones
  ws.getCell(`B${row}`).border = thinBorder
  row += 2

  // Pruebas Especiales
  ws.mergeCells(`A${row}:D${row}`)
  const pruebasHeader = ws.getCell(`A${row}`)
  pruebasHeader.value = 'PRUEBAS ESPECIALES'
  pruebasHeader.font = { bold: true }
  pruebasHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY } }
  pruebasHeader.border = thinBorder
  row++
  ws.mergeCells(`A${row}:D${row + 1}`)
  ws.getCell(`A${row}`).value = data.pruebasEspeciales
  ws.getCell(`A${row}`).border = thinBorder
  ws.getCell(`A${row}`).alignment = { wrapText: true, vertical: 'top' }
  row += 3

  // Diagnóstico
  ws.mergeCells(`A${row}:D${row}`)
  const diagHeader = ws.getCell(`A${row}`)
  diagHeader.value = 'DIAGNÓSTICO KINESIOLÓGICO / OSTEOPÁTICO'
  diagHeader.font = { bold: true }
  diagHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY } }
  diagHeader.border = thinBorder
  row++
  ws.mergeCells(`A${row}:D${row + 1}`)
  ws.getCell(`A${row}`).value = data.diagnosticoKinesiologico
  ws.getCell(`A${row}`).border = thinBorder
  ws.getCell(`A${row}`).alignment = { wrapText: true, vertical: 'top' }
  row += 3

  // Objetivos
  addPageBreakBefore(ws, row)
  ws.mergeCells(`A${row}:D${row}`)
  const objHeader = ws.getCell(`A${row}`)
  objHeader.value = 'OBJETIVOS TERAPÉUTICOS'
  objHeader.font = { bold: true }
  objHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY } }
  objHeader.border = thinBorder
  row++

  for (const [label, key] of [['Corto plazo', 'cortoPlazo'], ['Mediano plazo', 'medianoPlazo'], ['Largo plazo', 'largoPlazo']] as const) {
    ws.getCell(`A${row}`).value = label
    ws.getCell(`A${row}`).font = { bold: true }
    ws.getCell(`A${row}`).border = thinBorder
    ws.mergeCells(`B${row}:D${row}`)
    ws.getCell(`B${row}`).value = data.objetivos[key]
    ws.getCell(`B${row}`).border = thinBorder
    row++
  }
  row++

  // Plan de Tratamiento
  ws.mergeCells(`A${row}:D${row}`)
  const planHeader = ws.getCell(`A${row}`)
  planHeader.value = 'PLAN DE TRATAMIENTO'
  planHeader.font = { bold: true }
  planHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY } }
  planHeader.border = thinBorder
  row++

  const planChecks = [
    ['terapiaManual', 'Terapia manual'],
    ['ejercicioTerapeutico', 'Ejercicio terapéutico'],
    ['liberacionMiofascial', 'Liberación miofascial'],
    ['electroterapia', 'Electroterapia'],
    ['ultrasonido', 'Ultrasonido'],
    ['puncionSeca', 'Punción seca'],
    ['vendajeFuncional', 'Vendaje funcional / kinesiotape'],
    ['reeducacionPostural', 'Reeducación postural'],
  ] as const

  for (const [key, label] of planChecks) {
    ws.getCell(`A${row}`).value = `${data.planTratamiento[key] ? '☑' : '☐'} ${label}`
    ws.getCell(`A${row}`).border = thinBorder
    row++
  }
  ws.getCell(`A${row}`).value = `Frecuencia semanal: ${data.planTratamiento.frecuenciaSemanal}`
  row++
  ws.getCell(`A${row}`).value = `Duración estimada: ${data.planTratamiento.duracionEstimada}`
  row += 2

  // Evolución
  ws.mergeCells(`A${row}:D${row}`)
  const evoHeader = ws.getCell(`A${row}`)
  evoHeader.value = 'EVOLUCIÓN'
  evoHeader.font = { bold: true }
  evoHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY } }
  evoHeader.border = thinBorder
  row++

  ws.getCell(`A${row}`).value = 'Fecha'
  ws.getCell(`A${row}`).font = { bold: true }
  ws.getCell(`A${row}`).border = thinBorder
  ws.getCell(`B${row}`).value = 'EVA'
  ws.getCell(`B${row}`).font = { bold: true }
  ws.getCell(`B${row}`).border = thinBorder
  ws.getCell(`C${row}`).value = 'Cambios en ROM'
  ws.getCell(`C${row}`).font = { bold: true }
  ws.getCell(`C${row}`).border = thinBorder
  ws.getCell(`D${row}`).value = 'Observaciones'
  ws.getCell(`D${row}`).font = { bold: true }
  ws.getCell(`D${row}`).border = thinBorder
  row++

  for (const evo of data.evolucion) {
    ws.getCell(`A${row}`).value = evo.fecha
    ws.getCell(`A${row}`).border = thinBorder
    ws.getCell(`B${row}`).value = evo.eva
    ws.getCell(`B${row}`).border = thinBorder
    ws.getCell(`C${row}`).value = evo.cambiosRom
    ws.getCell(`C${row}`).border = thinBorder
    ws.getCell(`D${row}`).value = evo.observaciones
    ws.getCell(`D${row}`).border = thinBorder
    row++
  }
  row++

  // Consentimiento
  ws.mergeCells(`A${row}:D${row}`)
  const consHeader = ws.getCell(`A${row}`)
  consHeader.value = 'CONSENTIMIENTO INFORMADO'
  consHeader.font = { bold: true }
  consHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY } }
  consHeader.border = thinBorder
  row++
  ws.mergeCells(`A${row}:D${row}`)
  ws.getCell(`A${row}`).value = 'Declaro que autorizo la evaluación y tratamiento kinesiológico.'
  row++
  ws.getCell(`A${row}`).value = `Firma del paciente: ${data.consentimiento.firmaPaciente}`
  row++
  ws.getCell(`A${row}`).value = `Firma y sello del profesional: ${data.consentimiento.firmaProfesional}`
  row++
  ws.getCell(`A${row}`).value = `Fecha: ${data.consentimiento.fecha}`
  row += 2

  // Registro Fotográfico
  const photos = data.registroFotografico ?? []
  if (photos.length > 0) {
    ws.mergeCells(`A${row}:D${row}`)
    const photoHeader = ws.getCell(`A${row}`)
    photoHeader.value = 'REGISTRO FOTOGRÁFICO'
    photoHeader.font = { bold: true }
    photoHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY } }
    photoHeader.border = thinBorder
    row++

    const IMG_W = 160  // px
    const IMG_H = 120  // px
    // Excel row height is in points; 1pt ≈ 1px * 0.75
    const ROW_HEIGHT_PT = IMG_H * 0.75

    // Two photos per row, columns A-B and C-D
    for (let i = 0; i < photos.length; i += 2) {
      ws.getRow(row).height = ROW_HEIGHT_PT

      const addPhoto = (dataUrl: string, colOffset: number) => {
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
        if (!match) return
        const mime = match[1]
        const ext = mime.includes('png') ? 'png' : 'jpeg'
        const imgId = workbook.addImage({ base64: match[2], extension: ext as 'jpeg' | 'png' })
        ws.addImage(imgId, {
          tl: { col: colOffset, row: row - 1 },
          ext: { width: IMG_W, height: IMG_H },
        })
      }

      addPhoto(photos[i], 0)
      if (i + 1 < photos.length) addPhoto(photos[i + 1], 2)

      row++
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
