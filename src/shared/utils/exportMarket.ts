import { triggerDownload } from './download'
import { hdmLogoBase64 } from '@/shared/assets/hdm-logo-base64'
import type {
  TopPerformingContentResponse,
  ContentMatrixResponse, ContentMatrixStageIdea,
  AIHooksResponse,
  ContentIntelligenceResult,
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

// ════════════════════════════════════════════════════════════
// CONTENT INTELLIGENCE (FULL REPORT)
// ════════════════════════════════════════════════════════════

export async function exportIntelligencePDF(data: ContentIntelligenceResult): Promise<void> {
  const ctx = await initPDF()
  const { doc, autoTable } = ctx
  const margin = 15
  const pw = doc.internal.pageSize.getWidth()
  let y = 55

  addPdfCoverTitle(ctx, `Market Intelligence Report — ${data.industry}`, `Location: ${data.location}`)

  // ── Summary ──
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Executive Summary', margin, y)
  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)

  const summary = data.summary
  const summaryItems = [
    `Total Opportunities: ${summary.total_opportunities}`,
    `Content Gaps Found: ${summary.gaps_found}`,
    `Content Ideas Generated: ${summary.content_ideas}`,
    `Top Performers Analyzed: ${summary.top_performers_analyzed}`,
  ]
  for (const item of summaryItems) {
    doc.text(`  •  ${item}`, margin, y)
    y += 4.5
  }
  y += 4

  // ── Competing Domains ──
  const opp = data.content_opportunities
  if (opp?.top_competing_domains?.length) {
    if (y + 30 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Top Competing Domains', margin, y)
    y += 4
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Domain', 'Content Count']],
      body: opp.top_competing_domains.map(d => [d.domain, String(d.content_count)]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 30 } },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ── Opportunities: Top Performing Content ──
  if (opp?.top_performing_content?.length) {
    if (y + 20 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Top Performing Content', margin, y)
    y += 4
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['#', 'Title', 'Query', 'Position', 'Domain']],
      body: opp.top_performing_content.map((c, i) => [
        String(i + 1), c.title, c.query, String(c.position), c.domain,
      ]),
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 55 }, 2: { cellWidth: 30 }, 3: { cellWidth: 15 }, 4: { cellWidth: 30 } },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ── Opportunities: Content by Type ──
  if (opp?.content_by_type) {
    for (const [typeKey, items] of Object.entries(opp.content_by_type)) {
      if (!items?.length) continue
      if (y + 20 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(`Content Type: ${typeKey.replace(/_/g, ' ')}`, margin, y)
      y += 4
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['#', 'Title', 'Query', 'Position', 'Domain']],
        body: items.map((c: any, i: number) => [
          String(i + 1), c.title, c.query, String(c.position), c.domain,
        ]),
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 55 }, 2: { cellWidth: 30 }, 3: { cellWidth: 15 }, 4: { cellWidth: 30 } },
      })
      y = (doc as any).lastAutoTable.finalY + 8
    }
  }

  // ── Content Gaps ──
  const gaps = data.content_gaps
  if (gaps?.content_gaps?.length) {
    if (y + 20 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Content Gaps', margin, y)
    y += 4
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['#', 'Topic', 'Score', 'Suggested Type', 'Reason']],
      body: gaps.content_gaps.map((g, i) => [
        String(i + 1), g.topic, String(g.opportunity_score), g.suggested_content_type, g.reason,
      ]),
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 30 }, 2: { cellWidth: 12 }, 3: { cellWidth: 25 }, 4: { cellWidth: 80 } },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }
  if (gaps?.recommendation) {
    if (y + 10 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(`Recommendation: ${gaps.recommendation}`, pw - 30)
    for (const line of lines) { doc.text(line, margin, y); y += 4.5 }
    y += 4
  }

  // ── Content Matrix ──
  const matrix = data.content_matrix
  if (matrix?.content_matrix) {
    const stageLabels: Record<string, string> = { TOFU: 'TOFU — Awareness', MOFU: 'MOFU — Consideration', BOFU: 'BOFU — Decision' }
    const stages = matrix.content_matrix as Record<string, any>

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
      doc.text(`Goal: ${stage.goal}  |  Formats: ${(stage.recommended_formats ?? []).join(', ')}`, margin, y + 3)
      y += 7
      doc.setTextColor(0, 0, 0)

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['#', 'Suggested Title', 'Topic', 'Angle']],
        body: stage.content_ideas.map((idea: ContentMatrixStageIdea, i: number) => [
          String(i + 1), idea.suggested_title, idea.topic, idea.content_angle,
        ]),
        styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 55 }, 2: { cellWidth: 35 }, 3: { cellWidth: 60 } },
      })
      y = (doc as any).lastAutoTable.finalY + 8
    }
  }

  // ── Top Performers ──
  const tp = data.top_performers
  if (tp?.common_patterns) {
    if (y + 20 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Top Performers — Patterns', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    if (tp.common_patterns.most_common_type) {
      doc.text(`Most Common Type: ${tp.common_patterns.most_common_type[0]} (${tp.common_patterns.most_common_type[1]})`, margin, y)
      y += 4.5
    }
    if (tp.common_patterns.dominant_domains?.length) {
      doc.text(`Dominant Domains: ${tp.common_patterns.dominant_domains.join(', ')}`, margin, y)
      y += 4.5
    }
    doc.text(`Average Position: ${tp.common_patterns.average_position}`, margin, y)
    y += 8
  }

  if (tp?.top_performers?.length) {
    if (y + 20 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Top Performers', margin, y)
    y += 4
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['#', 'Title', 'Type', 'Pos', 'Why It Ranks', 'Your Opportunity']],
      body: tp.top_performers.map((p, i) => [
        String(i + 1), p.title, p.content_type, String(p.position), p.why_it_ranks, p.your_opportunity,
      ]),
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 35 }, 2: { cellWidth: 14 }, 3: { cellWidth: 10 }, 4: { cellWidth: 45 }, 5: { cellWidth: 45 } },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ── Action Items ──
  if (tp?.action_items?.length) {
    if (y + 5 + tp.action_items.length * 5 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Action Items', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    for (const item of tp.action_items) {
      if (y > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
      doc.text(`  • ${item}`, margin, y)
      y += 4.5
    }
  }

  addPdfFooter(ctx)
  triggerDownload(doc.output('blob'), `market-intelligence-${data.industry}.pdf`)
}

export async function exportIntelligencePPTX(data: ContentIntelligenceResult): Promise<void> {
  const { pptx, purple, white, gray, cardBg, addSlide } = await initPPTX()

  // Title slide
  const titleSlide = pptx.addSlide()
  titleSlide.background = { fill: '1E1B2E' }
  titleSlide.addImage({ data: hdmLogoBase64, x: 5.33, y: 1.5, w: 1.5, h: 1.5 })
  titleSlide.addText('Market Intelligence Report', { x: 1, y: 3.2, w: 10.5, h: 0.8, fontSize: 28, color: white, bold: true, align: 'center' })
  titleSlide.addText(`${data.industry}  •  ${data.location}`, { x: 1, y: 4, w: 10.5, h: 0.5, fontSize: 14, color: gray, align: 'center' })
  titleSlide.addText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), { x: 1, y: 4.5, w: 10.5, h: 0.4, fontSize: 10, color: gray, align: 'center' })
  titleSlide.addShape(pptx.shapes.RECTANGLE, { x: 3, y: 4.9, w: 6.5, h: 0.04, fill: { color: purple } })
  titleSlide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y: 7.1, w: 12.4, h: 0.01, fill: { color: '3F3A5C' } })
  titleSlide.addText('HDM Ad Creator', { x: 4, y: 7.15, w: 5.33, h: 0.3, fontSize: 8, color: gray, align: 'center' })

  // Summary slide
  const summarySlide = addSlide('Executive Summary')
  const summaryRows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
    [{ text: 'Metric', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Value', options: { bold: true, color: white, fill: { color: purple } } }],
    [{ text: 'Total Opportunities', options: { color: white } }, { text: String(data.summary.total_opportunities), options: { color: gray } }],
    [{ text: 'Content Gaps', options: { color: white } }, { text: String(data.summary.gaps_found), options: { color: gray } }],
    [{ text: 'Content Ideas', options: { color: white } }, { text: String(data.summary.content_ideas), options: { color: gray } }],
    [{ text: 'Top Performers', options: { color: white } }, { text: String(data.summary.top_performers_analyzed), options: { color: gray } }],
  ]
  summarySlide.addTable(summaryRows, { x: 0.8, y: 1.1, w: 11.5, fontSize: 11, rowH: 0.45, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [5, 6.5] })

  // Competing Domains
  const opp = data.content_opportunities
  if (opp?.top_competing_domains?.length) {
    const slide = addSlide('Top Competing Domains')
    const rows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
      [{ text: 'Domain', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Content Count', options: { bold: true, color: white, fill: { color: purple } } }],
      ...opp.top_competing_domains.map(d => [
        { text: d.domain, options: { color: white, bold: true } },
        { text: String(d.content_count), options: { color: gray } },
      ]),
    ]
    slide.addTable(rows, { x: 0.8, y: 1.1, w: 11.5, fontSize: 10, rowH: 0.4, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [9, 2.5] })
  }

  // Content by Type slides
  if (opp?.content_by_type) {
    for (const [typeKey, items] of Object.entries(opp.content_by_type)) {
      if (!items?.length) continue
      const slide = addSlide(`Content Type: ${typeKey.replace(/_/g, ' ')}`)
      const rows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
        [{ text: '#', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Title', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Query', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Pos', options: { bold: true, color: white, fill: { color: purple } } }],
        ...items.map((c: any, i: number) => [
          { text: String(i + 1), options: { color: gray } },
          { text: c.title, options: { color: white, bold: true, fontSize: 8 } },
          { text: c.query, options: { color: gray, fontSize: 8 } },
          { text: String(c.position), options: { color: gray } },
        ]),
      ]
      slide.addTable(rows, { x: 0.8, y: 1.1, w: 11.5, fontSize: 9, rowH: 0.45, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [0.5, 6.5, 3, 1.5], autoPage: true })
    }
  }

  // Content Gaps
  const gaps = data.content_gaps
  if (gaps?.content_gaps?.length) {
    const slide = addSlide('Content Gaps')
    const rows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
      [{ text: '#', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Topic', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Score', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Type', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Reason', options: { bold: true, color: white, fill: { color: purple } } }],
      ...gaps.content_gaps.map((g, i) => [
        { text: String(i + 1), options: { color: gray } },
        { text: g.topic, options: { color: white, bold: true, fontSize: 8 } },
        { text: String(g.opportunity_score), options: { color: gray } },
        { text: g.suggested_content_type, options: { color: '22C55E', fontSize: 8 } },
        { text: g.reason, options: { color: gray, fontSize: 8 } },
      ]),
    ]
    slide.addTable(rows, { x: 0.8, y: 1.1, w: 11.5, fontSize: 9, rowH: 0.5, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [0.5, 2.5, 1, 2, 5.5], autoPage: true })
  }

  // Matrix slides
  const matrix = data.content_matrix
  if (matrix?.content_matrix) {
    const stageLabels: Record<string, string> = { TOFU: 'TOFU — Awareness', MOFU: 'MOFU — Consideration', BOFU: 'BOFU — Decision' }
    const stages = matrix.content_matrix as Record<string, any>
    for (const [key, stage] of Object.entries(stages)) {
      if (!stage?.content_ideas?.length) continue
      const slide = addSlide(stageLabels[key] ?? key)
      const rows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
        [{ text: '#', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Title', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Topic', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Angle', options: { bold: true, color: white, fill: { color: purple } } }],
        ...stage.content_ideas.map((idea: ContentMatrixStageIdea, i: number) => [
          { text: String(i + 1), options: { color: gray } },
          { text: idea.suggested_title, options: { color: white, bold: true, fontSize: 8 } },
          { text: idea.topic, options: { color: gray, fontSize: 8 } },
          { text: idea.content_angle, options: { color: gray, fontSize: 8 } },
        ]),
      ]
      slide.addTable(rows, { x: 0.8, y: 1.1, w: 11.5, fontSize: 9, rowH: 0.4, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [0.5, 4, 3, 4], autoPage: true })
    }
  }

  // Top Performers patterns
  const tp = data.top_performers
  if (tp?.common_patterns) {
    const slide = addSlide('Top Performers — Patterns')
    const rows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
      [{ text: 'Metric', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Value', options: { bold: true, color: white, fill: { color: purple } } }],
    ]
    if (tp.common_patterns.most_common_type) rows.push([{ text: 'Most Common Type', options: { color: white } }, { text: `${tp.common_patterns.most_common_type[0]} (${tp.common_patterns.most_common_type[1]})`, options: { color: gray } }])
    rows.push([{ text: 'Avg Position', options: { color: white } }, { text: String(tp.common_patterns.average_position), options: { color: gray } }])
    if (tp.common_patterns.dominant_domains?.length) rows.push([{ text: 'Dominant Domains', options: { color: white } }, { text: tp.common_patterns.dominant_domains.join(', '), options: { color: gray, fontSize: 9 } }])
    slide.addTable(rows, { x: 0.8, y: 1.1, w: 11.5, fontSize: 10, rowH: 0.45, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [3.5, 8] })
  }

  // Top performers table
  if (tp?.top_performers?.length) {
    const slide = addSlide('Top Performers')
    const rows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
      [{ text: '#', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Title', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Type', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Pos', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Why It Ranks', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Opportunity', options: { bold: true, color: white, fill: { color: purple } } }],
      ...tp.top_performers.map((p, i) => [
        { text: String(i + 1), options: { color: gray } },
        { text: p.title, options: { color: white, bold: true, fontSize: 8 } },
        { text: p.content_type, options: { color: '22C55E', fontSize: 8 } },
        { text: String(p.position), options: { color: gray } },
        { text: p.why_it_ranks, options: { color: gray, fontSize: 8 } },
        { text: p.your_opportunity, options: { color: gray, fontSize: 8 } },
      ]),
    ]
    slide.addTable(rows, { x: 0.8, y: 1.1, w: 11.5, fontSize: 9, rowH: 0.5, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [0.5, 2.5, 1.2, 0.6, 3.5, 3.2], autoPage: true })
  }

  // Action Items
  if (tp?.action_items?.length) {
    const slide = addSlide('Action Items')
    slide.addText(tp.action_items.map(ai => ({ text: `• ${ai}\n`, options: { fontSize: 12, color: gray, lineSpacing: 24 } })), { x: 0.8, y: 1.1, w: 11.5, h: 5, valign: 'top' })
  }

  triggerDownload(await pptx.write({ outputType: 'blob' }) as Blob, `market-intelligence-${data.industry}.pptx`)
}

export async function exportIntelligenceXLSX(data: ContentIntelligenceResult): Promise<void> {
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

  // Summary sheet
  const sWs = wb.addWorksheet('Summary')
  sWs.columns = [{ header: 'Metric', key: 'm', width: 30 }, { header: 'Value', key: 'v', width: 60 }]
  sWs.getRow(1).eachCell(sh)
  sWs.addRow({ m: 'Industry', v: data.industry }).eachCell(sc)
  sWs.addRow({ m: 'Location', v: data.location }).eachCell(sc)
  sWs.addRow({ m: 'Total Opportunities', v: String(data.summary.total_opportunities) }).eachCell(sc)
  sWs.addRow({ m: 'Content Gaps', v: String(data.summary.gaps_found) }).eachCell(sc)
  sWs.addRow({ m: 'Content Ideas', v: String(data.summary.content_ideas) }).eachCell(sc)
  sWs.addRow({ m: 'Top Performers Analyzed', v: String(data.summary.top_performers_analyzed) }).eachCell(sc)

  // Competing Domains in Summary
  const opp = data.content_opportunities
  if (opp?.top_competing_domains?.length) {
    sWs.addRow({ m: '', v: '' }).eachCell(sc)
    sWs.addRow({ m: 'Top Competing Domains', v: 'Content Count' }).eachCell(sh)
    for (const d of opp.top_competing_domains) {
      sWs.addRow({ m: d.domain, v: String(d.content_count) }).eachCell(sc)
    }
  }

  // Opportunities sheet
  if (opp?.top_performing_content?.length) {
    const ws = wb.addWorksheet('Opportunities')
    ws.columns = [
      { header: '#', key: 'n', width: 5 }, { header: 'Title', key: 'title', width: 40 },
      { header: 'Snippet', key: 'snip', width: 50 }, { header: 'URL', key: 'url', width: 35 },
      { header: 'Position', key: 'pos', width: 10 }, { header: 'Query', key: 'query', width: 25 },
      { header: 'Domain', key: 'dom', width: 20 },
    ]
    ws.getRow(1).eachCell(sh)
    for (const [i, c] of opp.top_performing_content.entries()) {
      ws.addRow({ n: i + 1, title: c.title, snip: c.snippet, url: c.url, pos: c.position, query: c.query, dom: c.domain }).eachCell(sc)
    }
  }

  // Content by Type sheet
  if (opp?.content_by_type) {
    const ws = wb.addWorksheet('Content by Type')
    ws.columns = [
      { header: 'Type', key: 'type', width: 18 }, { header: '#', key: 'n', width: 5 },
      { header: 'Title', key: 'title', width: 40 }, { header: 'Snippet', key: 'snip', width: 50 },
      { header: 'Query', key: 'query', width: 25 }, { header: 'Position', key: 'pos', width: 10 },
      { header: 'Domain', key: 'dom', width: 20 },
    ]
    ws.getRow(1).eachCell(sh)
    for (const [typeKey, items] of Object.entries(opp.content_by_type)) {
      for (const [i, c] of (items as any[]).entries()) {
        ws.addRow({ type: typeKey.replace(/_/g, ' '), n: i + 1, title: c.title, snip: c.snippet, query: c.query, pos: c.position, dom: c.domain }).eachCell(sc)
      }
    }
  }

  // Content Gaps sheet
  const gaps = data.content_gaps
  if (gaps?.content_gaps?.length) {
    const ws = wb.addWorksheet('Content Gaps')
    ws.columns = [
      { header: '#', key: 'n', width: 5 }, { header: 'Topic', key: 'topic', width: 30 },
      { header: 'Opportunity Score', key: 'score', width: 15 }, { header: 'Suggested Type', key: 'type', width: 20 },
      { header: 'Reason', key: 'reason', width: 60 },
    ]
    ws.getRow(1).eachCell(sh)
    for (const [i, g] of gaps.content_gaps.entries()) {
      ws.addRow({ n: i + 1, topic: g.topic, score: g.opportunity_score, type: g.suggested_content_type, reason: g.reason }).eachCell(sc)
    }
    if (gaps.recommendation) {
      ws.addRow({ n: '', topic: '', score: '', type: 'Recommendation:', reason: gaps.recommendation }).eachCell(sc)
    }
  }

  // Content Matrix sheets (TOFU, MOFU, BOFU)
  const matrix = data.content_matrix
  if (matrix?.content_matrix) {
    const stages = matrix.content_matrix as Record<string, any>
    for (const [key, stage] of Object.entries(stages)) {
      if (!stage?.content_ideas?.length) continue
      const ws = wb.addWorksheet(key)
      ws.columns = [
        { header: '#', key: 'n', width: 5 }, { header: 'Suggested Title', key: 'title', width: 40 },
        { header: 'Topic', key: 'topic', width: 25 }, { header: 'Content Angle', key: 'angle', width: 40 },
        { header: 'Title Inspiration', key: 'insp', width: 35 }, { header: 'Position', key: 'pos', width: 10 },
      ]
      ws.getRow(1).eachCell(sh)
      for (const [i, idea] of (stage.content_ideas as ContentMatrixStageIdea[]).entries()) {
        ws.addRow({ n: i + 1, title: idea.suggested_title, topic: idea.topic, angle: idea.content_angle, insp: idea.title_inspiration, pos: idea.position ?? '' }).eachCell(sc)
      }
    }
  }

  // Top Performers sheet
  const tp = data.top_performers
  if (tp?.top_performers?.length) {
    const ws = wb.addWorksheet('Top Performers')
    ws.columns = [
      { header: '#', key: 'n', width: 5 }, { header: 'Title', key: 'title', width: 40 },
      { header: 'Type', key: 'type', width: 15 }, { header: 'Position', key: 'pos', width: 10 },
      { header: 'Domain', key: 'dom', width: 20 }, { header: 'Search Query', key: 'query', width: 25 },
      { header: 'Why It Ranks', key: 'why', width: 50 }, { header: 'Your Opportunity', key: 'opp', width: 50 },
    ]
    ws.getRow(1).eachCell(sh)
    for (const [i, p] of tp.top_performers.entries()) {
      ws.addRow({ n: i + 1, title: p.title, type: p.content_type, pos: p.position, dom: p.domain, query: p.search_query, why: p.why_it_ranks, opp: p.your_opportunity }).eachCell(sc)
    }
  }

  // Patterns sheet
  if (tp?.common_patterns) {
    const ws = wb.addWorksheet('Patterns')
    ws.columns = [{ header: 'Metric', key: 'm', width: 25 }, { header: 'Value', key: 'v', width: 70 }]
    ws.getRow(1).eachCell(sh)
    if (tp.common_patterns.most_common_type) ws.addRow({ m: 'Most Common Type', v: `${tp.common_patterns.most_common_type[0]} (${tp.common_patterns.most_common_type[1]})` }).eachCell(sc)
    ws.addRow({ m: 'Average Position', v: String(tp.common_patterns.average_position) }).eachCell(sc)
    if (tp.common_patterns.dominant_domains?.length) ws.addRow({ m: 'Dominant Domains', v: tp.common_patterns.dominant_domains.join(', ') }).eachCell(sc)
  }

  // Action Items sheet
  if (tp?.action_items?.length) {
    const ws = wb.addWorksheet('Action Items')
    ws.columns = [{ header: '#', key: 'n', width: 5 }, { header: 'Action', key: 'a', width: 80 }]
    ws.getRow(1).eachCell(sh)
    for (const [i, ai] of tp.action_items.entries()) {
      ws.addRow({ n: i + 1, a: ai }).eachCell(sc)
    }
  }

  triggerDownload(new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `market-intelligence-${data.industry}.xlsx`)
}
