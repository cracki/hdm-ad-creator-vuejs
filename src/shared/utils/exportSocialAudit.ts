import { triggerDownload } from './download'
import { hdmLogoBase64 } from '@/shared/assets/hdm-logo-base64'

// ── Types ────────────────────────────────────────────────

interface PlatformRec {
  platform: string
  priority: string
  rationale: string
  required_effort: string
  potential_roi: string
}

interface ContentGap {
  gap: string
  impact: string
  recommendation: string
}

interface TeamMember {
  role: string
  time_commitment: string
  skills_needed: string[]
}

interface Tool {
  tool: string
  purpose: string
  estimated_cost: string
}

interface WeekTask {
  week: number
  tasks: string[]
  deliverables: string[]
}

function parse<T>(raw: unknown): T[] {
  return Array.isArray(raw) ? raw as T[] : []
}

function obj(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : null
}

function fmt(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return v.map(item => fmt(item)).join(', ')
  if (typeof v === 'object') {
    const entries = Object.entries(v as Record<string, unknown>)
    return entries.map(([k, val]) => `${fmtLabel(k)}: ${fmt(val)}`).join('\n')
  }
  return String(v)
}

function fmtLabel(key: string): string {
  const abbr: Record<string, string> = { dm: 'DM', roi: 'ROI', kpi: 'KPI', cta: 'CTA', ppc: 'PPC', seo: 'SEO', api: 'API' }
  return key
    .replace(/_/g, ' ')
    .split(' ')
    .map(w => { const l = w.toLowerCase(); return abbr[l] ?? (w.charAt(0).toUpperCase() + w.slice(1)) })
    .join(' ')
}

// ── PDF Export ────────────────────────────────────────────

export async function exportAuditPDF(
  data: Record<string, unknown>,
  brandName: string,
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  const contentWidth = pageWidth - margin * 2

  let y = margin

  const ensureSpace = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage()
      y = margin
    }
  }

  // ── Cover / Title ──
  doc.setFillColor(88, 28, 135) // purple-800
  doc.rect(0, 0, pageWidth, 50, 'F')

  // Logo on cover
  doc.addImage(hdmLogoBase64, 'JPEG', pageWidth - margin - 16, 12, 16, 16)

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.text('Social Media Audit', margin, 22)
  doc.setFontSize(12)
  doc.text(brandName, margin, 32)
  doc.setFontSize(9)
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), margin, 40)

  doc.setTextColor(0, 0, 0)
  y = 60

  // ── Executive Summary ──
  const summary = typeof data.executive_summary === 'string' ? data.executive_summary : ''
  if (summary) {
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Executive Summary', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const lines = doc.splitTextToSize(summary, contentWidth)
    for (const line of lines) {
      ensureSpace(5)
      doc.text(line, margin, y)
      y += 4.5
    }
    y += 6
  }

  // ── Platform Recommendations ──
  const platforms = parse<PlatformRec>(data.platform_recommendations)
  if (platforms.length) {
    ensureSpace(20)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Platform Recommendations', margin, y)
    y += 4

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Platform', 'Priority', 'Effort', 'ROI', 'Rationale']],
      body: platforms.map(p => [p.platform, p.priority, p.required_effort, p.potential_roi, p.rationale]),
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 18 }, 2: { cellWidth: 18 }, 3: { cellWidth: 15 }, 4: { cellWidth: 'auto' } },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ── Content Gaps ──
  const gaps = parse<ContentGap>(data.content_gaps)
  if (gaps.length) {
    ensureSpace(20)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Content Gaps', margin, y)
    y += 4

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['#', 'Gap', 'Impact', 'Recommendation']],
      body: gaps.map((g, i) => [String(i + 1), g.gap, g.impact, g.recommendation]),
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 55 }, 2: { cellWidth: 18 }, 3: { cellWidth: 'auto' } },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ── Competitive Benchmarks ──
  const benchmarks = obj(data.competitive_benchmarks)
  if (benchmarks) {
    ensureSpace(30)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Competitive Benchmarks', margin, y)
    y += 4

    const benchRows: string[][] = []
    if (benchmarks.average_posting_frequency) benchRows.push(['Posting Frequency', fmt(benchmarks.average_posting_frequency)])
    if (benchmarks.average_engagement_rate) benchRows.push(['Engagement Rate', fmt(benchmarks.average_engagement_rate)])

    if (benchRows.length) {
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Metric', 'Value']],
        body: benchRows,
        styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 'auto' } },
      })
      y = (doc as any).lastAutoTable.finalY + 6
    }

    const contentTypes = parse<string>(benchmarks.common_content_types)
    if (contentTypes.length) {
      ensureSpace(10)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Common Content Types:', margin, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      for (const ct of contentTypes) {
        ensureSpace(5)
        doc.text(`  • ${ct}`, margin, y)
        y += 4.5
      }
      y += 4
    }
  }

  // ── Resource Plan ──
  const resourcePlan = obj(data.resource_plan)
  if (resourcePlan) {
    const team = parse<TeamMember>(resourcePlan.team)
    const tools = parse<Tool>(resourcePlan.tools)
    const budget = obj(resourcePlan.monthly_budget_estimate)

    if (team.length) {
      ensureSpace(20)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text('Team', margin, y)
      y += 4

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Role', 'Commitment', 'Skills']],
        body: team.map(m => [m.role, m.time_commitment, m.skills_needed?.join(', ') ?? '']),
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 25 }, 2: { cellWidth: 'auto' } },
      })
      y = (doc as any).lastAutoTable.finalY + 6
    }

    if (tools.length) {
      ensureSpace(20)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text('Tools', margin, y)
      y += 4

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Tool', 'Purpose', 'Cost']],
        body: tools.map(t => [t.tool, t.purpose, t.estimated_cost]),
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 30 } },
      })
      y = (doc as any).lastAutoTable.finalY + 6
    }

    if (budget) {
      ensureSpace(20)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text('Monthly Budget', margin, y)
      y += 4

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Category', 'Amount']],
        body: Object.entries(budget).map(([k, v]) => [fmtLabel(k), fmt(v)]),
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 40 } },
      })
      y = (doc as any).lastAutoTable.finalY + 8
    }
  }

  // ── 90-Day Action Plan ──
  const actionPlan = obj(data.action_plan_90_days)
  if (actionPlan) {
    ensureSpace(20)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('90-Day Action Plan', margin, y)
    y += 4

    const monthNames: Record<string, string> = { month_1: 'Month 1 — Foundation', month_2: 'Month 2 — Growth', month_3: 'Month 3 — Scale' }
    const actionRows: string[][] = []

    for (const monthKey of ['month_1', 'month_2', 'month_3']) {
      const weeks = parse<WeekTask>(actionPlan[monthKey])
      for (const w of weeks) {
        actionRows.push([
          monthNames[monthKey] ?? monthKey,
          `Week ${w.week}`,
          w.tasks?.join('\n') ?? '',
          w.deliverables?.join('\n') ?? '',
        ])
      }
    }

    if (actionRows.length) {
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Month', 'Week', 'Tasks', 'Deliverables']],
        body: actionRows,
        styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 18 }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 50 } },
      })
      y = (doc as any).lastAutoTable.finalY + 8
    }
  }

  // ── Success Metrics ──
  const metrics = obj(data.success_metrics)
  if (metrics) {
    ensureSpace(20)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Success Metrics', margin, y)
    y += 4

    const metricRows: string[][] = []
    for (const periodKey of ['30_days', '60_days', '90_days']) {
      const period = obj(metrics[periodKey])
      if (period) {
        for (const [k, v] of Object.entries(period)) {
          metricRows.push([
            periodKey === '30_days' ? '30 Days' : periodKey === '60_days' ? '60 Days' : '90 Days',
            fmtLabel(k),
            fmt(v),
          ])
        }
      }
    }

    if (metricRows.length) {
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Period', 'Metric', 'Target']],
        body: metricRows,
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 45 }, 2: { cellWidth: 'auto' } },
      })
    }
  }

  // ── Footer: logo + app name + page number (centered) ──
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const pageH = doc.internal.pageSize.getHeight()
    const footerY = pageH - 10

    // Footer line
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.line(margin, pageH - 14, pageWidth - margin, pageH - 14)

    // Footer text: "HDM Ad Creator  •  Page X of Y"
    const footerText = `HDM Ad Creator  •  Page ${i} of ${totalPages}`
    doc.setFontSize(7.5)
    doc.setTextColor(130, 130, 130)
    const textWidth = doc.getTextWidth(footerText)

    // Logo (half size = 5mm) left of centered text
    const logoSize = 5
    const centerX = pageWidth / 2
    const totalFooterW = logoSize + 2 + textWidth
    const startX = centerX - totalFooterW / 2

    doc.addImage(hdmLogoBase64, 'JPEG', startX, footerY - 3.5, logoSize, logoSize)
    doc.text(footerText, startX + logoSize + 2, footerY)
  }

  const blob = doc.output('blob')
  triggerDownload(blob, `${brandName}-social-audit.pdf`)
}

// ── PowerPoint Export ────────────────────────────────────

export async function exportAuditPPTX(
  data: Record<string, unknown>,
  brandName: string,
): Promise<void> {
  const PptxGenJS = (await import('pptxgenjs')).default

  const pptx: any = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'HDM Platform'
  pptx.subject = `Social Media Audit — ${brandName}`

  const purple = '581C87' as const
  const white = 'FFFFFF' as const
  const gray = '94A3B8' as const
  const darkBg = '1E1B2E' as const
  const cardBg = '2A2640' as const

  const addSlide = () => {
    const slide = pptx.addSlide()
    slide.background = { fill: darkBg }
    // Logo top-right
    slide.addImage({ data: hdmLogoBase64, x: 12.1, y: 0.15, w: 0.55, h: 0.55 })
    // Footer: app name + line
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y: 7.1, w: 12.4, h: 0.01, fill: { color: '3F3A5C' } })
    slide.addText('HDM Ad Creator', { x: 4, y: 7.15, w: 5.33, h: 0.3, fontSize: 8, color: gray, align: 'center' })
    return slide
  }

  // ── Title Slide ──
  const titleSlide = pptx.addSlide()
  titleSlide.background = { fill: darkBg }
  titleSlide.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: '100%', h: 1.2, fill: { color: purple } })
  // Large logo on title slide
  titleSlide.addImage({ data: hdmLogoBase64, x: 11.8, y: 0.15, w: 0.9, h: 0.9 })
  titleSlide.addText('Social Media Audit', { x: 0.8, y: 0.25, w: 9, h: 0.6, fontSize: 32, color: white, bold: true })
  titleSlide.addText(brandName, { x: 0.8, y: 1.5, w: 9, h: 0.5, fontSize: 20, color: gray })
  titleSlide.addText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), { x: 0.8, y: 2.1, w: 5, h: 0.4, fontSize: 12, color: gray })

  // ── Executive Summary ──
  const summary = typeof data.executive_summary === 'string' ? data.executive_summary : ''
  if (summary) {
    const slide = addSlide()
    slide.addText('Executive Summary', { x: 0.8, y: 0.3, w: 9, h: 0.5, fontSize: 22, color: white, bold: true })
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y: 0.9, w: 1.5, h: 0.04, fill: { color: purple } })
    slide.addText(summary, { x: 0.8, y: 1.1, w: 11.5, h: 3.5, fontSize: 12, color: gray, lineSpacing: 18, valign: 'top' })
  }

  // ── Platform Recommendations ──
  const platforms = parse<PlatformRec>(data.platform_recommendations)
  if (platforms.length) {
    const slide = addSlide()
    slide.addText('Platform Recommendations', { x: 0.8, y: 0.3, w: 9, h: 0.5, fontSize: 22, color: white, bold: true })
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y: 0.9, w: 1.5, h: 0.04, fill: { color: purple } })

    const rows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
      [
        { text: 'Platform', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Priority', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Effort', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'ROI', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Rationale', options: { bold: true, color: white, fill: { color: purple } } },
      ],
      ...platforms.map(p => [
        { text: p.platform, options: { bold: true, color: white } },
        { text: p.priority.toUpperCase(), options: { color: p.priority === 'high' ? '22C55E' : p.priority === 'medium' ? 'FBBF24' : '60A5FA' } },
        { text: p.required_effort, options: { color: gray } },
        { text: p.potential_roi, options: { color: gray } },
        { text: p.rationale, options: { color: gray, fontSize: 9 } },
      ]),
    ]

    slide.addTable(rows, {
      x: 0.8, y: 1.1, w: 11.5,
      fontSize: 10,
      rowH: 0.4,
      border: { pt: 0.5, color: '3F3A5C' },
      fill: { color: cardBg },
      colW: [1.5, 1, 1, 0.8, 7.2],
      autoPage: true,
    })
  }

  // ── Content Gaps ──
  const gaps = parse<ContentGap>(data.content_gaps)
  if (gaps.length) {
    const slide = addSlide()
    slide.addText('Content Gaps', { x: 0.8, y: 0.3, w: 9, h: 0.5, fontSize: 22, color: white, bold: true })
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y: 0.9, w: 1.5, h: 0.04, fill: { color: purple } })

    const gapRows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
      [
        { text: '#', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Gap', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Impact', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Recommendation', options: { bold: true, color: white, fill: { color: purple } } },
      ],
      ...gaps.map((g, i) => [
        { text: String(i + 1), options: { color: gray } },
        { text: g.gap, options: { color: white, bold: true } },
        { text: g.impact, options: { color: g.impact === 'high' ? '22C55E' : g.impact === 'medium' ? 'FBBF24' : '60A5FA' } },
        { text: g.recommendation, options: { color: gray, fontSize: 9 } },
      ]),
    ]

    slide.addTable(gapRows, {
      x: 0.8, y: 1.1, w: 11.5,
      fontSize: 10,
      rowH: 0.45,
      border: { pt: 0.5, color: '3F3A5C' },
      fill: { color: cardBg },
      colW: [0.5, 3.5, 1, 6.5],
      autoPage: true,
    })
  }

  // ── Competitive Benchmarks ──
  const benchmarks = obj(data.competitive_benchmarks)
  if (benchmarks) {
    const slide = addSlide()
    slide.addText('Competitive Benchmarks', { x: 0.8, y: 0.3, w: 9, h: 0.5, fontSize: 22, color: white, bold: true })
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y: 0.9, w: 1.5, h: 0.04, fill: { color: purple } })

    let by = 1.2
    if (benchmarks.average_posting_frequency) {
      slide.addText('Average Posting Frequency', { x: 0.8, y: by, w: 5, h: 0.3, fontSize: 12, color: white, bold: true })
      slide.addText(fmt(benchmarks.average_posting_frequency), { x: 0.8, y: by + 0.35, w: 11, h: 0.6, fontSize: 10, color: gray, valign: 'top' })
      by += 1.1
    }
    if (benchmarks.average_engagement_rate) {
      slide.addText('Average Engagement Rate', { x: 0.8, y: by, w: 5, h: 0.3, fontSize: 12, color: white, bold: true })
      slide.addText(fmt(benchmarks.average_engagement_rate), { x: 0.8, y: by + 0.35, w: 11, h: 0.6, fontSize: 10, color: gray, valign: 'top' })
      by += 1.1
    }

    const contentTypes = parse<string>(benchmarks.common_content_types)
    if (contentTypes.length) {
      slide.addText('Common Content Types', { x: 0.8, y: by, w: 5, h: 0.3, fontSize: 12, color: white, bold: true })
      slide.addText(contentTypes.map(ct => `• ${ct}`).join('\n'), { x: 0.8, y: by + 0.35, w: 11, h: 2, fontSize: 10, color: gray, lineSpacing: 18, valign: 'top' })
    }
  }

  // ── Resource Plan ──
  const resourcePlan = obj(data.resource_plan)
  if (resourcePlan) {
    const team = parse<TeamMember>(resourcePlan.team)
    const tools = parse<Tool>(resourcePlan.tools)

    if (team.length) {
      const slide = addSlide()
      slide.addText('Team Resources', { x: 0.8, y: 0.3, w: 9, h: 0.5, fontSize: 22, color: white, bold: true })
      slide.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y: 0.9, w: 1.5, h: 0.04, fill: { color: purple } })

      const teamRows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
        [
          { text: 'Role', options: { bold: true, color: white, fill: { color: purple } } },
          { text: 'Commitment', options: { bold: true, color: white, fill: { color: purple } } },
          { text: 'Skills', options: { bold: true, color: white, fill: { color: purple } } },
        ],
        ...team.map(m => [
          { text: m.role, options: { color: white, bold: true } },
          { text: m.time_commitment, options: { color: gray } },
          { text: m.skills_needed?.join(', ') ?? '', options: { color: gray, fontSize: 9 } },
        ]),
      ]

      slide.addTable(teamRows, {
        x: 0.8, y: 1.1, w: 11.5,
        fontSize: 10,
        rowH: 0.4,
        border: { pt: 0.5, color: '3F3A5C' },
        fill: { color: cardBg },
        colW: [3.5, 1.5, 6.5],
        autoPage: true,
      })
    }

    if (tools.length) {
      const slide = addSlide()
      slide.addText('Tools & Budget', { x: 0.8, y: 0.3, w: 9, h: 0.5, fontSize: 22, color: white, bold: true })
      slide.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y: 0.9, w: 1.5, h: 0.04, fill: { color: purple } })

      const toolRows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
        [
          { text: 'Tool', options: { bold: true, color: white, fill: { color: purple } } },
          { text: 'Purpose', options: { bold: true, color: white, fill: { color: purple } } },
          { text: 'Cost', options: { bold: true, color: white, fill: { color: purple } } },
        ],
        ...tools.map(t => [
          { text: t.tool, options: { color: white, bold: true } },
          { text: t.purpose, options: { color: gray, fontSize: 9 } },
          { text: t.estimated_cost, options: { color: '22C55E' } },
        ]),
      ]

      slide.addTable(toolRows, {
        x: 0.8, y: 1.1, w: 11.5,
        fontSize: 10,
        rowH: 0.4,
        border: { pt: 0.5, color: '3F3A5C' },
        fill: { color: cardBg },
        colW: [3, 6, 2.5],
        autoPage: true,
      })

      const budget = obj(resourcePlan.monthly_budget_estimate)
      if (budget) {
        const budgetText = Object.entries(budget)
          .map(([k, v]) => `${fmtLabel(k)}: ${fmt(v)}`)
          .join('   |   ')
        slide.addText(budgetText, { x: 0.8, y: 6.5, w: 11.5, h: 0.4, fontSize: 10, color: '22C55E', bold: true })
      }
    }
  }

  // ── Action Plan (one slide per month) ──
  const actionPlan = obj(data.action_plan_90_days)
  if (actionPlan) {
    const monthNames: Record<string, string> = { month_1: 'Month 1 — Foundation', month_2: 'Month 2 — Growth', month_3: 'Month 3 — Scale' }

    for (const monthKey of ['month_1', 'month_2', 'month_3']) {
      const weeks = parse<WeekTask>(actionPlan[monthKey])
      if (!weeks.length) continue

      const slide = addSlide()
      slide.addText(monthNames[monthKey] ?? monthKey, { x: 0.8, y: 0.3, w: 9, h: 0.5, fontSize: 22, color: white, bold: true })
      slide.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y: 0.9, w: 1.5, h: 0.04, fill: { color: purple } })

      const rows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
        [
          { text: 'Week', options: { bold: true, color: white, fill: { color: purple } } },
          { text: 'Tasks', options: { bold: true, color: white, fill: { color: purple } } },
          { text: 'Deliverables', options: { bold: true, color: white, fill: { color: purple } } },
        ],
        ...weeks.map(w => [
          { text: `Week ${w.week}`, options: { color: white, bold: true } },
          { text: w.tasks?.join('\n') ?? '', options: { color: gray, fontSize: 9 } },
          { text: w.deliverables?.join('\n') ?? '', options: { color: gray, fontSize: 9 } },
        ]),
      ]

      slide.addTable(rows, {
        x: 0.8, y: 1.1, w: 11.5,
        fontSize: 10,
        rowH: 0.6,
        border: { pt: 0.5, color: '3F3A5C' },
        fill: { color: cardBg },
        colW: [1.2, 6, 4.3],
      })
    }
  }

  // ── Success Metrics ──
  const metrics = obj(data.success_metrics)
  if (metrics) {
    const slide = addSlide()
    slide.addText('Success Metrics', { x: 0.8, y: 0.3, w: 9, h: 0.5, fontSize: 22, color: white, bold: true })
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y: 0.9, w: 1.5, h: 0.04, fill: { color: purple } })

    const metricRows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
      [
        { text: 'Period', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Metric', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Target', options: { bold: true, color: white, fill: { color: purple } } },
      ],
    ]

    for (const periodKey of ['30_days', '60_days', '90_days']) {
      const period = obj(metrics[periodKey])
      if (!period) continue
      const label = periodKey === '30_days' ? '30 Days' : periodKey === '60_days' ? '60 Days' : '90 Days'
      for (const [k, v] of Object.entries(period)) {
        metricRows.push([
          { text: label, options: { color: white } },
          { text: fmtLabel(k), options: { color: gray } },
          { text: fmt(v), options: { color: '22C55E' } },
        ])
      }
    }

    slide.addTable(metricRows, {
      x: 0.8, y: 1.1, w: 11.5,
      fontSize: 10,
      rowH: 0.35,
      border: { pt: 0.5, color: '3F3A5C' },
      fill: { color: cardBg },
      colW: [2, 4.5, 5],
    })
  }

  const blob = await pptx.write({ outputType: 'blob' }) as Blob
  triggerDownload(blob, `${brandName}-social-audit.pptx`)
}

// ── Excel Export ──────────────────────────────────────────

export async function exportAuditXLSX(
  data: Record<string, unknown>,
  brandName: string,
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default

  const workbook: any = new ExcelJS.Workbook()
  workbook.creator = 'HDM Platform'
  workbook.created = new Date()

  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF581C87' } }
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  const cellFont = { size: 10 }
  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FF3F3A5C' } },
    left: { style: 'thin', color: { argb: 'FF3F3A5C' } },
    bottom: { style: 'thin', color: { argb: 'FF3F3A5C' } },
    right: { style: 'thin', color: { argb: 'FF3F3A5C' } },
  }

  const styleHeader = (cell: any) => {
    cell.fill = headerFill
    cell.font = headerFont
    cell.border = thinBorder
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  }

  const styleCell = (cell: any) => {
    cell.font = cellFont
    cell.border = thinBorder
    cell.alignment = { vertical: 'top', wrapText: true }
  }

  // ── Sheet: Executive Summary ──
  const summarySheet = workbook.addWorksheet('Executive Summary')
  const summary = typeof data.executive_summary === 'string' ? data.executive_summary : ''
  summarySheet.getColumn(1).width = 80
  const titleCell = summarySheet.getCell('A1')
  titleCell.value = `Social Media Audit — ${brandName}`
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF581C87' } }
  summarySheet.getCell('A2').value = `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
  summarySheet.getCell('A2').font = { size: 10, color: { argb: 'FF94A3B8' } }
  summarySheet.getCell('A4').value = summary
  summarySheet.getCell('A4').alignment = { wrapText: true }
  summarySheet.getRow(4).height = 120

  // ── Sheet: Platform Recommendations ──
  const platforms = parse<PlatformRec>(data.platform_recommendations)
  if (platforms.length) {
    const ws = workbook.addWorksheet('Platforms')
    ws.columns = [
      { header: 'Platform', key: 'platform', width: 15 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Effort', key: 'effort', width: 12 },
      { header: 'ROI', key: 'roi', width: 10 },
      { header: 'Rationale', key: 'rationale', width: 60 },
    ]
    ws.getRow(1).eachCell(styleHeader)
    for (const p of platforms) {
      const row = ws.addRow({ platform: p.platform, priority: p.priority, effort: p.required_effort, roi: p.potential_roi, rationale: p.rationale })
      row.eachCell(styleCell)
    }
  }

  // ── Sheet: Content Gaps ──
  const gaps = parse<ContentGap>(data.content_gaps)
  if (gaps.length) {
    const ws = workbook.addWorksheet('Content Gaps')
    ws.columns = [
      { header: '#', key: 'num', width: 5 },
      { header: 'Gap', key: 'gap', width: 45 },
      { header: 'Impact', key: 'impact', width: 12 },
      { header: 'Recommendation', key: 'rec', width: 60 },
    ]
    ws.getRow(1).eachCell(styleHeader)
    for (const [i, g] of gaps.entries()) {
      const row = ws.addRow({ num: i + 1, gap: g.gap, impact: g.impact, rec: g.recommendation })
      row.eachCell(styleCell)
    }
  }

  // ── Sheet: Benchmarks ──
  const benchmarks = obj(data.competitive_benchmarks)
  if (benchmarks) {
    const ws = workbook.addWorksheet('Benchmarks')
    ws.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 80 },
    ]
    ws.getRow(1).eachCell(styleHeader)

    if (benchmarks.average_posting_frequency) {
      const row = ws.addRow({ metric: 'Average Posting Frequency', value: fmt(benchmarks.average_posting_frequency) })
      row.eachCell(styleCell)
    }
    if (benchmarks.average_engagement_rate) {
      const row = ws.addRow({ metric: 'Average Engagement Rate', value: fmt(benchmarks.average_engagement_rate) })
      row.eachCell(styleCell)
    }

    const contentTypes = parse<string>(benchmarks.common_content_types)
    if (contentTypes.length) {
      const row = ws.addRow({ metric: 'Common Content Types', value: contentTypes.join('\n') })
      row.eachCell(styleCell)
      row.height = 80
    }
  }

  // ── Sheet: Team ──
  const resourcePlan = obj(data.resource_plan)
  if (resourcePlan) {
    const team = parse<TeamMember>(resourcePlan.team)
    if (team.length) {
      const ws = workbook.addWorksheet('Team')
      ws.columns = [
        { header: 'Role', key: 'role', width: 30 },
        { header: 'Commitment', key: 'commitment', width: 15 },
        { header: 'Skills', key: 'skills', width: 60 },
      ]
      ws.getRow(1).eachCell(styleHeader)
      for (const m of team) {
        const row = ws.addRow({ role: m.role, commitment: m.time_commitment, skills: m.skills_needed?.join(', ') ?? '' })
        row.eachCell(styleCell)
      }
    }

    // ── Sheet: Tools ──
    const tools = parse<Tool>(resourcePlan.tools)
    if (tools.length) {
      const ws = workbook.addWorksheet('Tools')
      ws.columns = [
        { header: 'Tool', key: 'tool', width: 30 },
        { header: 'Purpose', key: 'purpose', width: 50 },
        { header: 'Estimated Cost', key: 'cost', width: 20 },
      ]
      ws.getRow(1).eachCell(styleHeader)
      for (const t of tools) {
        const row = ws.addRow({ tool: t.tool, purpose: t.purpose, cost: t.estimated_cost })
        row.eachCell(styleCell)
      }
    }

    // ── Budget in Tools sheet or separate ──
    const budget = obj(resourcePlan.monthly_budget_estimate)
    if (budget) {
      const ws = workbook.addWorksheet('Budget')
      ws.columns = [
        { header: 'Category', key: 'category', width: 25 },
        { header: 'Amount', key: 'amount', width: 20 },
      ]
      ws.getRow(1).eachCell(styleHeader)
      for (const [k, v] of Object.entries(budget)) {
        const row = ws.addRow({ category: fmtLabel(k), amount: fmt(v) })
        row.eachCell(styleCell)
      }
    }
  }

  // ── Sheet: Action Plan ──
  const actionPlan = obj(data.action_plan_90_days)
  if (actionPlan) {
    const ws = workbook.addWorksheet('Action Plan')
    ws.columns = [
      { header: 'Month', key: 'month', width: 25 },
      { header: 'Week', key: 'week', width: 10 },
      { header: 'Tasks', key: 'tasks', width: 55 },
      { header: 'Deliverables', key: 'deliverables', width: 40 },
    ]
    ws.getRow(1).eachCell(styleHeader)

    const monthNames: Record<string, string> = { month_1: 'Month 1 — Foundation', month_2: 'Month 2 — Growth', month_3: 'Month 3 — Scale' }
    for (const monthKey of ['month_1', 'month_2', 'month_3']) {
      const weeks = parse<WeekTask>(actionPlan[monthKey])
      for (const w of weeks) {
        const row = ws.addRow({
          month: monthNames[monthKey] ?? monthKey,
          week: `Week ${w.week}`,
          tasks: w.tasks?.join('\n') ?? '',
          deliverables: w.deliverables?.join('\n') ?? '',
        })
        row.eachCell(styleCell)
        row.height = 60
      }
    }
  }

  // ── Sheet: Success Metrics ──
  const metrics = obj(data.success_metrics)
  if (metrics) {
    const ws = workbook.addWorksheet('Success Metrics')
    ws.columns = [
      { header: 'Period', key: 'period', width: 15 },
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Target', key: 'target', width: 50 },
    ]
    ws.getRow(1).eachCell(styleHeader)

    for (const periodKey of ['30_days', '60_days', '90_days']) {
      const period = obj(metrics[periodKey])
      if (!period) continue
      const label = periodKey === '30_days' ? '30 Days' : periodKey === '60_days' ? '60 Days' : '90 Days'
      for (const [k, v] of Object.entries(period)) {
        const row = ws.addRow({ period: label, metric: fmtLabel(k), target: fmt(v) })
        row.eachCell(styleCell)
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  triggerDownload(blob, `${brandName}-social-audit.xlsx`)
}
