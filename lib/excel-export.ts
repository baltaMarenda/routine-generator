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
  for (let i = 0; i < conditioningItems.length; i += 2) {
    const item1 = conditioningItems[i] ? `${String.fromCharCode(97 + i)}) ${conditioningItems[i]}` : ''
    const item2 = conditioningItems[i + 1] ? `${String.fromCharCode(97 + i + 1)}) ${conditioningItems[i + 1]}` : ''
    
    const condRow = worksheet.addRow([item1, '', '', '', item2])
    condRow.getCell(1).font = normalFont
    condRow.getCell(1).border = thinBorder
    condRow.getCell(2).border = thinBorder
    condRow.getCell(3).border = thinBorder
    condRow.getCell(5).font = normalFont
    condRow.getCell(5).border = thinBorder
    condRow.getCell(6).border = thinBorder
    condRow.getCell(7).border = thinBorder
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
        cell.alignment = { horizontal: col === 1 || col === 12 ? 'left' : 'center', vertical: 'middle' }
      }
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
  
  const clientName = data.clientName?.trim() || 'Cliente'
  const fileName = `Rutina_${clientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
  
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = fileName
  link.click()
  URL.revokeObjectURL(link.href)
}
