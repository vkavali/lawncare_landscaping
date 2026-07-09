import PDFDocument from 'pdfkit'

const BRAND_COLOR: [number, number, number] = [25, 88, 71] // #195847

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

interface LineItem {
  description: string
  qty: number
  unitCents: number
  totalCents: number
}

interface PdfOptions {
  type: 'estimate' | 'invoice'
  number: string
  businessName: string
  clientName?: string
  clientEmail?: string
  date: Date
  dueDate?: Date
  lines: LineItem[]
  totalCents: number
  notes?: string
}

export function generatePdf(options: PdfOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Header
    doc.fillColor(BRAND_COLOR).fontSize(24).font('Helvetica-Bold').text('Verde Ops', 50, 50)
    doc
      .fillColor('#333')
      .fontSize(10)
      .font('Helvetica')
      .text(`${options.type === 'estimate' ? 'ESTIMATE' : 'INVOICE'} #${options.number}`, 50, 82)
      .text(`Date: ${options.date.toLocaleDateString('en-US')}`, 50, 96)

    if (options.dueDate) {
      doc.text(`Due: ${options.dueDate.toLocaleDateString('en-US')}`, 50, 110)
    }

    // Bill to
    const billY = 140
    doc.fillColor(BRAND_COLOR).fontSize(10).font('Helvetica-Bold').text('BILL TO', 50, billY)
    doc
      .fillColor('#333')
      .font('Helvetica')
      .text(options.clientName ?? 'Customer', 50, billY + 14)
    if (options.clientEmail) {
      doc.text(options.clientEmail, 50, billY + 28)
    }

    // Table header
    const tableY = 200
    doc
      .fillColor(BRAND_COLOR)
      .rect(50, tableY, 511, 20)
      .fill()
      .fillColor('#fff')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('DESCRIPTION', 56, tableY + 6)
      .text('QTY', 340, tableY + 6)
      .text('UNIT PRICE', 380, tableY + 6)
      .text('TOTAL', 470, tableY + 6)

    // Table rows
    let y = tableY + 26
    doc.fillColor('#333').font('Helvetica').fontSize(9)

    for (const line of options.lines) {
      if (y > 680) {
        doc.addPage()
        y = 50
      }
      doc
        .text(line.description.slice(0, 60), 56, y, { width: 275 })
        .text(String(line.qty), 340, y)
        .text(formatCents(line.unitCents), 380, y)
        .text(formatCents(line.totalCents), 470, y)

      y += 18
      doc.moveTo(50, y - 2).lineTo(561, y - 2).strokeColor('#e0ddd6').stroke()
    }

    // Total
    y += 10
    doc
      .fillColor(BRAND_COLOR)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text('TOTAL', 380, y)
      .text(formatCents(options.totalCents), 470, y)

    // Notes
    if (options.notes) {
      y += 30
      doc
        .fillColor('#555')
        .font('Helvetica')
        .fontSize(9)
        .text('Notes:', 50, y, { continued: false })
        .text(options.notes, 50, y + 14, { width: 460 })
    }

    doc.end()
  })
}
