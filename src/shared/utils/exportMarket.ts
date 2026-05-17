import { triggerDownload } from './download'
import { hdmLogoBase64 } from '@/shared/assets/hdm-logo-base64'
import type {
  TopPerformingContentResponse,
  ContentMatrixResponse, ContentMatrixStageIdea,
  AIHooksResponse,
} from '@/features/market/types'

// ── Shared helpers ────────────────────────────────────────

async function initPDF() {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  return { doc, autoTable }
}

type PdfCtx = { doc: any; autoTable: any }

function addPdfFooter(ctx: PdfCtx) {
  const { doc } = ctx
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    const footerY = ph - 10
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.line(15, ph - 14, pw - 15, ph - 14)
    const txt = `HDM Ad Creator  •  Page ${i} of ${total}`
    doc.setFontSize(7.5)
    doc.setTextColor(130, 130, 130)
    const tw = doc.getTextWidth(txt)
    const logoSize = 5
    const cx = pw / 2
    const totalW = logoSize + 2 + tw
    const sx = cx - totalW / 2
    doc.addImage(hdmLogoBase64, 'JPEG', sx, footerY - 3.5, logoSize, logoSize)
    doc.text(txt, sx + logoSize + 2, footerY)
  }
}

function addPdfCoverTitle(ctx: PdfCtx, title: string, subtitle: string) {
  const { doc } = ctx
  const pw = doc.internal.pageSize.getWidth()
  doc.setFillColor(88, 28, 135)
  doc.rect(0, 0, pw, 45, 'F')
  doc.addImage(hdmLogoBase64, 'JPEG', pw - 15 - 16, 10, 16, 16)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.text(title, 15, 22)
  doc.setFontSize(11)
  doc.text(subtitle, 15, 32)
  doc.setFontSize(8)
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 15, 40)
  doc.setTextColor(0, 0, 0)
}

async function initPPTX() {
  const PptxGenJS = (await import('pptxgenjs')).default
  const pptx: any = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'HDM Ad Creator'
  const purple = '581C87'
  const white = 'FFFFFF'
  const gray = '94A3B8'
  const darkBg = '1E1B2E'
  const cardBg = '2A2640'

  const addSlide = (title: string) => {
    const slide = pptx.addSlide()
    slide.background = { fill: darkBg }
    slide.addImage({ data: hdmLogoBase64, x: 12.1, y: 0.15, w: 0.55, h: 0.55 })
    slide.addText(title, { x: 0.8, y: 0.3, w: 9, h: 0.5, fontSize: 22, color: white, bold: true })
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y: 0.9, w: 1.5, h: 0.04, fill: { color: purple } })
    // Footer
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y: 7.1, w: 12.4, h: 0.01, fill: { color: '3F3A5C' } })
    slide.addText('HDM Ad Creator', { x: 4, y: 7.15, w: 5.33, h: 0.3, fontSize: 8, color: gray, align: 'center' })
    return slide
  }

  return { pptx, purple, white, gray, cardBg, addSlide }
}

// ════════════════════════════════════════════════════════════
// TOP PERFORMING CONTENT
// ════════════════════════════════════════════════════════════

export async function exportTopPerformingPDF(data: TopPerformingContentResponse): Promise<void> {
  const ctx = await initPDF()
  const { doc, autoTable } = ctx
  const margin = 15
  let y = 55

  addPdfCoverTitle(ctx, 'Top Performing Content', data.industry)

  // Patterns summary
  if (data.common_patterns) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Common Patterns', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    if (data.common_patterns.most_common_type) {
      doc.text(`Most Common Type: ${data.common_patterns.most_common_type[0]} (${data.common_patterns.most_common_type[1]})`, margin, y)
      y += 4.5
    }
    if (data.common_patterns.dominant_domains?.length) {
      doc.text(`Dominant Domains: ${data.common_patterns.dominant_domains.join(', ')}`, margin, y)
      y += 4.5
    }
    doc.text(`Average Position: ${data.common_patterns.average_position}`, margin, y)
    y += 8
  }

  // Top performers table
  if (data.top_performers?.length) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Top Performers', margin, y)
    y += 4
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['#', 'Title', 'Type', 'Position', 'Why It Ranks', 'Your Opportunity']],
      body: data.top_performers.map((tp, i) => [
        String(i + 1), tp.title, tp.content_type, String(tp.position), tp.why_it_ranks, tp.your_opportunity,
      ]),
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 35 }, 2: { cellWidth: 18 }, 3: { cellWidth: 14 }, 4: { cellWidth: 45 }, 5: { cellWidth: 45 } },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // Action items
  if (data.action_items?.length) {
    if (y + 5 + data.action_items.length * 5 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Action Items', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    for (const item of data.action_items) {
      if (y > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
      doc.text(`  • ${item}`, margin, y)
      y += 4.5
    }
  }

  addPdfFooter(ctx)
  triggerDownload(doc.output('blob'), `top-performing-${data.industry}.pdf`)
}

export async function exportTopPerformingPPTX(data: TopPerformingContentResponse): Promise<void> {
  const { pptx, purple, white, gray, cardBg, addSlide } = await initPPTX()

  // Patterns slide
  if (data.common_patterns) {
    const slide = addSlide('Common Patterns')
    const rows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
      [
        { text: 'Metric', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Value', options: { bold: true, color: white, fill: { color: purple } } },
      ],
    ]
    if (data.common_patterns.most_common_type) {
      rows.push([{ text: 'Most Common Type', options: { color: white } }, { text: `${data.common_patterns.most_common_type[0]} (${data.common_patterns.most_common_type[1]})`, options: { color: gray } }])
    }
    rows.push([{ text: 'Avg Position', options: { color: white } }, { text: String(data.common_patterns.average_position), options: { color: gray } }])
    if (data.common_patterns.dominant_domains?.length) {
      rows.push([{ text: 'Dominant Domains', options: { color: white } }, { text: data.common_patterns.dominant_domains.join(', '), options: { color: gray, fontSize: 9 } }])
    }
    slide.addTable(rows, { x: 0.8, y: 1.1, w: 11.5, fontSize: 10, rowH: 0.4, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [3.5, 8] })
  }

  // Top performers
  if (data.top_performers?.length) {
    const slide = addSlide('Top Performers')
    const rows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
      [
        { text: '#', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Title', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Type', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Pos', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Why It Ranks', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Opportunity', options: { bold: true, color: white, fill: { color: purple } } },
      ],
      ...data.top_performers.map((tp, i) => [
        { text: String(i + 1), options: { color: gray } },
        { text: tp.title, options: { color: white, bold: true, fontSize: 8 } },
        { text: tp.content_type, options: { color: '22C55E', fontSize: 8 } },
        { text: String(tp.position), options: { color: gray } },
        { text: tp.why_it_ranks, options: { color: gray, fontSize: 8 } },
        { text: tp.your_opportunity, options: { color: gray, fontSize: 8 } },
      ]),
    ]
    slide.addTable(rows, { x: 0.8, y: 1.1, w: 11.5, fontSize: 9, rowH: 0.5, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [0.5, 2.5, 1.2, 0.6, 3.5, 3.2], autoPage: true })
  }

  // Action items
  if (data.action_items?.length) {
    const slide = addSlide('Action Items')
    slide.addText(data.action_items.map(ai => ({ text: `• ${ai}\n`, options: { fontSize: 11, color: gray, lineSpacing: 22 } })), { x: 0.8, y: 1.1, w: 11.5, h: 5, valign: 'top' })
  }

  triggerDownload(await pptx.write({ outputType: 'blob' }) as Blob, `top-performing-${data.industry}.pptx`)
}

export async function exportTopPerformingXLSX(data: TopPerformingContentResponse): Promise<void> {
  const ExcelJS = (await import('exceljs')).default
  const wb: any = new ExcelJS.Workbook()
  wb.creator = 'HDM Ad Creator'
  wb.created = new Date()

  const hFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF581C87' } }
  const hFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  const cFont = { size: 10 }
  const brd = { top: { style: 'thin', color: { argb: 'FF3F3A5C' } }, left: { style: 'thin', color: { argb: 'FF3F3A5C' } }, bottom: { style: 'thin', color: { argb: 'FF3F3A5C' } }, right: { style: 'thin', color: { argb: 'FF3F3A5C' } } }
  const sh = (c: any) => { c.fill = hFill; c.font = hFont; c.border = brd; c.alignment = { horizontal: 'center', vertical: 'middle' } }
  const sc = (c: any) => { c.font = cFont; c.border = brd; c.alignment = { vertical: 'top', wrapText: true } }

  // Patterns sheet
  const pws = wb.addWorksheet('Patterns')
  pws.columns = [{ header: 'Metric', key: 'm', width: 30 }, { header: 'Value', key: 'v', width: 60 }]
  pws.getRow(1).eachCell(sh)
  if (data.common_patterns?.most_common_type) pws.addRow({ m: 'Most Common Type', v: `${data.common_patterns.most_common_type[0]} (${data.common_patterns.most_common_type[1]})` }).eachCell(sc)
  if (data.common_patterns?.average_position !== undefined) pws.addRow({ m: 'Average Position', v: String(data.common_patterns.average_position) }).eachCell(sc)
  if (data.common_patterns?.dominant_domains?.length) pws.addRow({ m: 'Dominant Domains', v: data.common_patterns.dominant_domains.join(', ') }).eachCell(sc)

  // Top performers sheet
  if (data.top_performers?.length) {
    const ws = wb.addWorksheet('Top Performers')
    ws.columns = [
      { header: '#', key: 'n', width: 5 }, { header: 'Title', key: 'title', width: 35 },
      { header: 'Type', key: 'type', width: 15 }, { header: 'Position', key: 'pos', width: 10 },
      { header: 'Domain', key: 'dom', width: 20 }, { header: 'Why It Ranks', key: 'why', width: 50 },
      { header: 'Your Opportunity', key: 'opp', width: 50 },
    ]
    ws.getRow(1).eachCell(sh)
    for (const [i, tp] of data.top_performers.entries()) {
      ws.addRow({ n: i + 1, title: tp.title, type: tp.content_type, pos: tp.position, dom: tp.domain, why: tp.why_it_ranks, opp: tp.your_opportunity }).eachCell(sc)
    }
  }

  // Action items sheet
  if (data.action_items?.length) {
    const ws = wb.addWorksheet('Action Items')
    ws.columns = [{ header: '#', key: 'n', width: 5 }, { header: 'Action', key: 'a', width: 80 }]
    ws.getRow(1).eachCell(sh)
    for (const [i, ai] of data.action_items.entries()) {
      ws.addRow({ n: i + 1, a: ai }).eachCell(sc)
    }
  }

  triggerDownload(new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `top-performing-${data.industry}.xlsx`)
}

// ════════════════════════════════════════════════════════════
// CONTENT MATRIX
// ════════════════════════════════════════════════════════════

export async function exportContentMatrixPDF(data: ContentMatrixResponse): Promise<void> {
  const ctx = await initPDF()
  const { doc, autoTable } = ctx
  const margin = 15
  let y = 55

  addPdfCoverTitle(ctx, 'Content Matrix', data.industry)

  // Summary
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(`Total Ideas: ${data.total_content_ideas}`, margin, y)
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Priority: ${data.priority_recommendation}`, margin, y)
  y += 8

  const stageLabels: Record<string, string> = { TOFU: 'TOFU — Awareness', MOFU: 'MOFU — Consideration', BOFU: 'BOFU — Decision' }
  const stages = data.content_matrix as Record<string, any>

  for (const [key, stage] of Object.entries(stages)) {
    if (!stage?.content_ideas?.length) continue
    if (y + 20 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(stageLabels[key] ?? key, margin, y)
    y += 2
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(`Goal: ${stage.goal}`, margin, y + 3)
    y += 7
    doc.setTextColor(0, 0, 0)

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['#', 'Suggested Title', 'Topic', 'Angle', 'Type']],
      body: stage.content_ideas.map((idea: ContentMatrixStageIdea, i: number) => [
        String(i + 1), idea.suggested_title, idea.topic, idea.content_angle, idea.type ?? '',
      ]),
      styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 50 }, 2: { cellWidth: 30 }, 3: { cellWidth: 55 }, 4: { cellWidth: 20 } },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  addPdfFooter(ctx)
  triggerDownload(doc.output('blob'), `content-matrix-${data.industry}.pdf`)
}

export async function exportContentMatrixPPTX(data: ContentMatrixResponse): Promise<void> {
  const { pptx, purple, white, gray, cardBg, addSlide } = await initPPTX()
  const stages = data.content_matrix as Record<string, any>
  const stageLabels: Record<string, string> = { TOFU: 'TOFU — Awareness', MOFU: 'MOFU — Consideration', BOFU: 'BOFU — Decision' }

  for (const [key, stage] of Object.entries(stages)) {
    if (!stage?.content_ideas?.length) continue
    const slide = addSlide(stageLabels[key] ?? key)

    const rows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
      [
        { text: '#', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Title', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Topic', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Angle', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Type', options: { bold: true, color: white, fill: { color: purple } } },
      ],
      ...stage.content_ideas.map((idea: ContentMatrixStageIdea, i: number) => [
        { text: String(i + 1), options: { color: gray } },
        { text: idea.suggested_title, options: { color: white, bold: true, fontSize: 8 } },
        { text: idea.topic, options: { color: gray, fontSize: 8 } },
        { text: idea.content_angle, options: { color: gray, fontSize: 8 } },
        { text: idea.type ?? '', options: { color: '22C55E', fontSize: 8 } },
      ]),
    ]
    slide.addTable(rows, { x: 0.8, y: 1.1, w: 11.5, fontSize: 9, rowH: 0.4, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [0.5, 3.5, 2.5, 4, 1], autoPage: true })
  }

  triggerDownload(await pptx.write({ outputType: 'blob' }) as Blob, `content-matrix-${data.industry}.pptx`)
}

export async function exportContentMatrixXLSX(data: ContentMatrixResponse): Promise<void> {
  const ExcelJS = (await import('exceljs')).default
  const wb: any = new ExcelJS.Workbook()
  wb.creator = 'HDM Ad Creator'
  wb.created = new Date()

  const hFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF581C87' } }
  const hFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  const cFont = { size: 10 }
  const brd = { top: { style: 'thin', color: { argb: 'FF3F3A5C' } }, left: { style: 'thin', color: { argb: 'FF3F3A5C' } }, bottom: { style: 'thin', color: { argb: 'FF3F3A5C' } }, right: { style: 'thin', color: { argb: 'FF3F3A5C' } } }
  const sh = (c: any) => { c.fill = hFill; c.font = hFont; c.border = brd; c.alignment = { horizontal: 'center', vertical: 'middle' } }
  const sc = (c: any) => { c.font = cFont; c.border = brd; c.alignment = { vertical: 'top', wrapText: true } }

  const stages = data.content_matrix as Record<string, any>
  for (const [key, stage] of Object.entries(stages)) {
    if (!stage?.content_ideas?.length) continue
    const ws = wb.addWorksheet(key)
    ws.columns = [
      { header: '#', key: 'n', width: 5 }, { header: 'Suggested Title', key: 'title', width: 40 },
      { header: 'Topic', key: 'topic', width: 25 }, { header: 'Content Angle', key: 'angle', width: 40 },
      { header: 'Type', key: 'type', width: 15 }, { header: 'Title Inspiration', key: 'insp', width: 35 },
    ]
    ws.getRow(1).eachCell(sh)
    for (const [i, idea] of (stage.content_ideas as ContentMatrixStageIdea[]).entries()) {
      ws.addRow({ n: i + 1, title: idea.suggested_title, topic: idea.topic, angle: idea.content_angle, type: idea.type ?? '', insp: idea.title_inspiration }).eachCell(sc)
    }
  }

  triggerDownload(new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `content-matrix-${data.industry}.xlsx`)
}

// ════════════════════════════════════════════════════════════
// AI HOOKS
// ════════════════════════════════════════════════════════════

export async function exportHooksPDF(data: AIHooksResponse): Promise<void> {
  const ctx = await initPDF()
  const { doc, autoTable } = ctx
  const margin = 15
  let y = 55

  addPdfCoverTitle(ctx, 'AI-Generated Hooks', data.brand_name || data.industry)

  // Analysis summary
  if (data.analysis) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Analysis', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    if (data.analysis.recommended_approach) {
      const lines = doc.splitTextToSize(`Recommended Approach: ${data.analysis.recommended_approach}`, doc.internal.pageSize.getWidth() - 30)
      for (const line of lines) { doc.text(line, margin, y); y += 4.5 }
      y += 2
    }
    if (data.analysis.power_words_used?.length) {
      doc.text(`Power Words: ${data.analysis.power_words_used.join(', ')}`, margin, y)
      y += 6
    }
  }

  // Hooks table
  if (data.hooks?.length) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Hooks', margin, y)
    y += 4

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['#', 'Hook', 'Type', 'Platforms', 'Inspired By']],
      body: data.hooks.map((h, i) => [
        String(i + 1), h.hook, h.type, h.platform_fit?.join(', ') ?? '', h.inspired_by,
      ]),
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 70 }, 2: { cellWidth: 20 }, 3: { cellWidth: 30 }, 4: { cellWidth: 35 } },
    })
  }

  addPdfFooter(ctx)
  triggerDownload(doc.output('blob'), `hooks-${data.industry}.pdf`)
}

export async function exportHooksPPTX(data: AIHooksResponse): Promise<void> {
  const { pptx, purple, white, gray, cardBg, addSlide } = await initPPTX()

  // Analysis slide
  if (data.analysis) {
    const slide = addSlide('Analysis')
    const texts: string[] = []
    if (data.analysis.recommended_approach) texts.push(`Recommended: ${data.analysis.recommended_approach}`)
    if (data.analysis.power_words_used?.length) texts.push(`Power Words: ${data.analysis.power_words_used.join(', ')}`)
    if (data.analysis.common_patterns?.length) texts.push(...data.analysis.common_patterns.map(p => `• ${p}`))
    slide.addText(texts.join('\n'), { x: 0.8, y: 1.1, w: 11.5, h: 5, fontSize: 12, color: gray, lineSpacing: 22, valign: 'top' })
  }

  // Hooks table
  if (data.hooks?.length) {
    const slide = addSlide('Hooks')
    const rows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
      [
        { text: '#', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Hook', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Type', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Platforms', options: { bold: true, color: white, fill: { color: purple } } },
      ],
      ...data.hooks.map((h, i) => [
        { text: String(i + 1), options: { color: gray } },
        { text: h.hook, options: { color: white, bold: true, fontSize: 9 } },
        { text: h.type, options: { color: '22C55E', fontSize: 8 } },
        { text: h.platform_fit?.join(', ') ?? '', options: { color: gray, fontSize: 8 } },
      ]),
    ]
    slide.addTable(rows, { x: 0.8, y: 1.1, w: 11.5, fontSize: 9, rowH: 0.45, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [0.5, 6.5, 2, 2.5], autoPage: true })
  }

  triggerDownload(await pptx.write({ outputType: 'blob' }) as Blob, `hooks-${data.industry}.pptx`)
}

export async function exportHooksXLSX(data: AIHooksResponse): Promise<void> {
  const ExcelJS = (await import('exceljs')).default
  const wb: any = new ExcelJS.Workbook()
  wb.creator = 'HDM Ad Creator'
  wb.created = new Date()

  const hFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF581C87' } }
  const hFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  const cFont = { size: 10 }
  const brd = { top: { style: 'thin', color: { argb: 'FF3F3A5C' } }, left: { style: 'thin', color: { argb: 'FF3F3A5C' } }, bottom: { style: 'thin', color: { argb: 'FF3F3A5C' } }, right: { style: 'thin', color: { argb: 'FF3F3A5C' } } }
  const sh = (c: any) => { c.fill = hFill; c.font = hFont; c.border = brd; c.alignment = { horizontal: 'center', vertical: 'middle' } }
  const sc = (c: any) => { c.font = cFont; c.border = brd; c.alignment = { vertical: 'top', wrapText: true } }

  // Hooks sheet
  if (data.hooks?.length) {
    const ws = wb.addWorksheet('Hooks')
    ws.columns = [
      { header: '#', key: 'n', width: 5 }, { header: 'Hook', key: 'hook', width: 60 },
      { header: 'Type', key: 'type', width: 18 }, { header: 'Platforms', key: 'plat', width: 25 },
      { header: 'Inspired By', key: 'insp', width: 40 },
    ]
    ws.getRow(1).eachCell(sh)
    for (const [i, h] of data.hooks.entries()) {
      ws.addRow({ n: i + 1, hook: h.hook, type: h.type, plat: h.platform_fit?.join(', ') ?? '', insp: h.inspired_by }).eachCell(sc)
    }
  }

  // Analysis sheet
  if (data.analysis) {
    const ws = wb.addWorksheet('Analysis')
    ws.columns = [{ header: 'Category', key: 'cat', width: 25 }, { header: 'Details', key: 'det', width: 70 }]
    ws.getRow(1).eachCell(sh)
    if (data.analysis.recommended_approach) ws.addRow({ cat: 'Recommended Approach', det: data.analysis.recommended_approach }).eachCell(sc)
    if (data.analysis.power_words_used?.length) ws.addRow({ cat: 'Power Words', det: data.analysis.power_words_used.join(', ') }).eachCell(sc)
    if (data.analysis.common_patterns?.length) {
      for (const [i, p] of data.analysis.common_patterns.entries()) {
        ws.addRow({ cat: `Pattern ${i + 1}`, det: p }).eachCell(sc)
      }
    }
  }

  triggerDownload(new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `hooks-${data.industry}.xlsx`)
}
