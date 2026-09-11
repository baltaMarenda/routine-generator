import type { RoutineData, DayRoutine } from './types'
import ExcelJS from 'exceljs'

const orangeColor = 'FFE67E22'
const whiteColor = 'FFFFFFFF'
const lightGrayColor = 'FFF5F5F5'
const blackColor = 'FF000000'

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: blackColor } },
  left: { style: 'thin', color: { argb: blackColor } },
  bottom: { style: 'thin', color: { argb: blackColor } },
  right: { style: 'thin', color: { argb: blackColor } }
}

// Estimate how many lines a text needs when wrapped inside a cell/merged range
// of the given total column width (in Excel width units ~= characters).
function estimateWrappedLines(text: string, totalWidth: number): number {
  if (!text) return 1
  const charsPerLine = Math.max(1, Math.floor(totalWidth * 0.9))
  return Math.max(1, Math.ceil(text.length / charsPerLine))
}

const rowLineHeight = 15

const boldFont: Partial<ExcelJS.Font> = { bold: true, size: 10, name: 'Arial' }
const normalFont: Partial<ExcelJS.Font> = { size: 10, name: 'Arial' }
const whiteFont: Partial<ExcelJS.Font> = { bold: true, size: 10, name: 'Arial', color: { argb: whiteColor } }
const logoFont: Partial<ExcelJS.Font> = { bold: true, size: 16, name: 'Arial' }
const subLogoFont: Partial<ExcelJS.Font> = { size: 9, name: 'Arial', color: { argb: orangeColor } }

function addDaySheet(workbook: ExcelJS.Workbook, day: DayRoutine, clientName: string) {
  const worksheet = workbook.addWorksheet(day.name)

  worksheet.pageSetup.orientation = 'landscape'
  worksheet.pageSetup.fitToPage = true
  worksheet.pageSetup.fitToWidth = 1
  worksheet.pageSetup.fitToHeight = 0
  worksheet.pageSetup.paperSize = 9 // A4

  worksheet.columns = [
    { width: 35 },
    { width: 12 },
    { width: 8 },
    { width: 12 },
    { width: 8 },
    { width: 12 },
    { width: 8 },
    { width: 12 },
    { width: 8 },
    { width: 12 },
    { width: 8 },
    { width: 18 },
  ]

  const row1 = worksheet.addRow(['GOBLET'])
  row1.getCell(1).font = logoFont

  const row2 = worksheet.addRow(['FUERZA & MOVIMIENTO'])
  row2.getCell(1).font = subLogoFont

  worksheet.addRow([])

  const row4 = worksheet.addRow(['NOMBRE Y APELLIDO', clientName || '', '', 'FASES:', day.phase || ''])
  row4.getCell(1).font = boldFont
  row4.getCell(1).border = thinBorder
  row4.getCell(2).font = normalFont
  row4.getCell(2).border = thinBorder
  row4.getCell(4).font = boldFont
  row4.getCell(4).border = thinBorder
  row4.getCell(5).font = normalFont
  row4.getCell(5).border = thinBorder

  const row5 = worksheet.addRow(['TIPO DE PLAN', day.planType || '', '', 'OBSERVACIONES', day.observations || ''])
  row5.getCell(1).font = boldFont
  row5.getCell(1).border = thinBorder
  row5.getCell(2).font = normalFont
  row5.getCell(2).border = thinBorder
  row5.getCell(4).font = boldFont
  row5.getCell(4).border = thinBorder
  row5.getCell(5).font = normalFont
  row5.getCell(5).border = thinBorder

  worksheet.addRow([])

  const condHeader = worksheet.addRow(['Acondicionamiento:'])
  condHeader.getCell(1).font = { ...boldFont, color: { argb: orangeColor } }

  const conditioningItems = day.conditioning.filter(c => c.trim() !== '')
  // Left item spans columns 1-5, right item spans columns 6-12. Total widths
  // of each span are used to estimate wrapping so long items flow onto the
  // line below instead of being cut off.
  const leftSpanWidth = 35 + 12 + 8 + 12 + 8
  const rightSpanWidth = 12 + 8 + 12 + 8 + 12 + 8 + 18
  for (let i = 0; i < conditioningItems.length; i += 2) {
    const item1 = conditioningItems[i] ? `${String.fromCharCode(97 + i)}) ${conditioningItems[i]}` : ''
    const item2 = conditioningItems[i + 1] ? `${String.fromCharCode(97 + i + 1)}) ${conditioningItems[i + 1]}` : ''

    const condRow = worksheet.addRow([item1, '', '', '', '', item2])
    const condRowNum = condRow.number
    worksheet.mergeCells(condRowNum, 1, condRowNum, 5)
    worksheet.mergeCells(condRowNum, 6, condRowNum, 12)

    for (let col = 1; col <= 12; col++) {
      const cell = condRow.getCell(col)
      cell.font = normalFont
      cell.border = thinBorder
      cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
    }

    // Merged cells are not auto-fit by Excel, so estimate the wrapped height
    // and set it explicitly (based on whichever side needs the most lines).
    const lines = Math.max(
      estimateWrappedLines(item1, leftSpanWidth),
      estimateWrappedLines(item2, rightSpanWidth)
    )
    condRow.height = lines * rowLineHeight
  }

  worksheet.addRow([])

  day.blocks.forEach(block => {
    const blockHeaderRow = worksheet.addRow([
      block.name, 'SEM 1', '', 'SEM 2', '', 'SEM 3', '', 'SEM 4', '', 'SEM 5', '', 'Observaciones'
    ])
    
    for (let col = 1; col <= 12; col++) {
      const cell = blockHeaderRow.getCell(col)
      cell.font = whiteFont
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: orangeColor } }
      cell.border = thinBorder
      cell.alignment = { horizontal: col === 1 ? 'left' : 'center', vertical: 'middle' }
    }

    const headerRowNum = blockHeaderRow.number
    worksheet.mergeCells(headerRowNum, 2, headerRowNum, 3)
    worksheet.mergeCells(headerRowNum, 4, headerRowNum, 5)
    worksheet.mergeCells(headerRowNum, 6, headerRowNum, 7)
    worksheet.mergeCells(headerRowNum, 8, headerRowNum, 9)
    worksheet.mergeCells(headerRowNum, 10, headerRowNum, 11)

    const subHeaderRow = worksheet.addRow([
      'Ejercicios', 'S/R', 'KILOS', 'S/R', 'KILOS', 'S/R', 'KILOS', 'S/R', 'KILOS', 'S/R', 'KILOS', ''
    ])
    
    for (let col = 1; col <= 12; col++) {
      const cell = subHeaderRow.getCell(col)
      cell.font = boldFont
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightGrayColor } }
      cell.border = thinBorder
      cell.alignment = { horizontal: col === 1 ? 'left' : 'center', vertical: 'middle' }
    }

    const blockLetter = block.name.slice(-1).toLowerCase()
    block.exercises.forEach((exercise, exIndex) => {
      const prefix = `${blockLetter}${exIndex + 1}_`
      const exerciseName = exercise.name && !exercise.name.startsWith('Ejercicio') 
        ? `${prefix}${exercise.name}` 
        : prefix

      const exRow = worksheet.addRow([
        exerciseName,
        exercise.weeks[0]?.setsReps || '',
        exercise.weeks[0]?.kilos || '',
        exercise.weeks[1]?.setsReps || '',
        exercise.weeks[1]?.kilos || '',
        exercise.weeks[2]?.setsReps || '',
        exercise.weeks[2]?.kilos || '',
        exercise.weeks[3]?.setsReps || '',
        exercise.weeks[3]?.kilos || '',
        exercise.weeks[4]?.setsReps || '',
        exercise.weeks[4]?.kilos || '',
        exercise.observations || ''
      ])

      for (let col = 1; col <= 12; col++) {
        const cell = exRow.getCell(col)
        cell.font = normalFont
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: whiteColor } }
        cell.border = thinBorder
        const wrap = col === 1 || col === 12
        cell.alignment = {
          horizontal: wrap ? 'left' : 'center',
          vertical: 'middle',
          wrapText: wrap,
        }
      }

      // The exercise name (col 1, width 35) can't get wider without pushing the
      // sheet past A4, so long names wrap onto the line below. These are plain
      // (non-merged) cells, so the spreadsheet app auto-fits the row height to
      // the wrapped text on open — no explicit height needed.
    })

    worksheet.addRow([])
  })
}

export async function exportRoutineToExcel(data: RoutineData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()

  // Create a sheet for each day
  for (const day of data.days) {
    addDaySheet(workbook, day, data.clientName)
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

// Legacy export function for backwards compatibility (downloads directly)
export async function exportToExcel(data: RoutineData) {
  const buffer = await exportRoutineToExcel(data)
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  
  const clientName = data.clientName?.trim() || 'Alumno'
  const fileName = `Rutina_${clientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
  
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = fileName
  link.click()
  URL.revokeObjectURL(link.href)
}
