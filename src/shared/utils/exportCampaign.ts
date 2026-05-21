import { triggerDownload } from './download'
import { hdmLogoBase64 } from '@/shared/assets/hdm-logo-base64'
import type { Campaign, CampaignStep } from '@/features/campaigns/types'

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
  doc.rect(0, 0, pw, 50, 'F')
  doc.addImage(hdmLogoBase64, 'JPEG', pw - 15 - 16, 12, 16, 16)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.text(title, 15, 24)
  doc.setFontSize(12)
  doc.text(subtitle, 15, 34)
  doc.setFontSize(9)
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 15, 42)
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
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y: 7.1, w: 12.4, h: 0.01, fill: { color: '3F3A5C' } })
    slide.addText('HDM Ad Creator', { x: 4, y: 7.15, w: 5.33, h: 0.3, fontSize: 8, color: gray, align: 'center' })
    return slide
  }

  return { pptx, purple, white, gray, cardBg, addSlide }
}

function obj(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : null
}

function parse<T>(raw: unknown): T[] {
  return Array.isArray(raw) ? raw as T[] : []
}

function str(raw: unknown): string {
  return typeof raw === 'string' ? raw : String(raw ?? '')
}

// ── Data extraction helpers ───────────────────────────────

type StepMap = Record<string, CampaignStep | undefined>

function buildStepMap(steps: CampaignStep[]): StepMap {
  const map: StepMap = {}
  for (const s of steps) map[s.step_type] = s
  return map
}

function extractResponsePayload(step: CampaignStep | undefined): Record<string, unknown> {
  if (!step) return {}
  return step.response_payload ?? {}
}

// ── PDF Export ────────────────────────────────────────────

export async function exportCampaignPDF(campaign: Campaign, steps: CampaignStep[]): Promise<void> {
  const ctx = await initPDF()
  const { doc, autoTable } = ctx
  const margin = 15
  let y = 60

  const stepMap = buildStepMap(steps)
  const summary = (campaign as any).summary ?? {}
  const ctxPayload = (campaign as any).context_payload ?? {}
  const brand = campaign.brand
  const platforms: string[] = ctxPayload.selected_platforms ?? []

  // Cover page
  const campaignName = campaign.name || brand?.company_name || 'Campaign Report'
  addPdfCoverTitle(ctx, campaignName, brand?.company_name ?? 'Campaign Report')

  // ── Campaign Overview ──
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Campaign Overview', margin, y)
  y += 6

  const overviewRows: string[][] = [
    ['Status', campaign.status.toUpperCase()],
    ['Brand', brand?.company_name ?? '-'],
    ['Industry', brand?.selected_industry?.name ?? '-'],
    ['Website', brand?.website_url ?? '-'],
  ]

  const flags = [
    campaign.segmentation_completed,
    campaign.ppc_viability_completed,
    campaign.funnel_completed,
    campaign.content_strategy_completed,
    campaign.meta_ads_completed,
    campaign.google_ads_completed,
    campaign.linkedin_ads_completed,
  ]
  const done = flags.filter(Boolean).length
  overviewRows.push(['Progress', `${done} / 7 steps completed (${Math.round((done / 7) * 100)}%)`])

  if (platforms.length) overviewRows.push(['Platforms', platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')])

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Property', 'Value']],
    body: overviewRows,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 'auto' } },
  })
  y = (doc as any).lastAutoTable.finalY + 10

  // ── Segmentation ──
  const segSummary = obj(summary.segmentation)
  if (segSummary) {
    if (y + 30 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Market Segmentation', margin, y)
    y += 4

    const segRows: string[][] = [
      ['Location', str(segSummary.location)],
      ['Business Type', str(segSummary.business_type)],
      ['Segments Count', str(segSummary.segments_count)],
      ['Deep Research', segSummary.has_deep_research ? 'Enabled' : 'Disabled'],
    ]
    const productDesc = (ctxPayload.segmentation as any)?.product_description
    if (productDesc) segRows.push(['Product Description', str(productDesc)])

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Attribute', 'Value']],
      body: segRows,
      styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 'auto' } },
    })
    y = (doc as any).lastAutoTable.finalY + 6

    // Segments from step response_payload
    const segPayload = extractResponsePayload(stepMap.segmentation)
    const segments = parse<Record<string, unknown>>(segPayload.segments ?? segPayload.market_segments)
    if (segments.length) {
      if (y + 20 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Segments', margin, y)
      y += 3

      const segDetailRows = segments.map((s, i) => [
        String(i + 1),
        str(s.name ?? s.segment_name ?? '-'),
        str(s.description ?? '-'),
        str(s.population_estimate ?? s.size ?? '-'),
      ])

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['#', 'Name', 'Description', 'Size']],
        body: segDetailRows,
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 40 }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 30 } },
      })
      y = (doc as any).lastAutoTable.finalY + 8
    }
  }

  // ── PPC Viability ──
  const ppcSummary = obj(summary.ppc_viability)
  if (ppcSummary) {
    if (y + 30 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('PPC Viability', margin, y)
    y += 4

    const ppcRows: string[][] = [
      ['Total Services', str(ppcSummary.services_count)],
      ['PPC Ready', `${str(ppcSummary.ppc_ready_services)} of ${str(ppcSummary.services_count)}`],
      ['Brand-First', str(ppcSummary.brand_first_services)],
    ]
    const budgetAlloc = str(ppcSummary.recommended_initial_budget_allocation)
    if (budgetAlloc && budgetAlloc !== 'undefined') ppcRows.push(['Budget Allocation', budgetAlloc])

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Metric', 'Value']],
      body: ppcRows,
      styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 'auto' } },
    })
    y = (doc as any).lastAutoTable.finalY + 6

    // Top ranked services
    const topServices = parse<string>(ppcSummary.top_ranked_services)
    if (topServices.length) {
      if (y + 10 + topServices.length * 5 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Top Ranked Services', margin, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      for (const svc of topServices) {
        if (y > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
        doc.text(`  • ${str(svc)}`, margin, y)
        y += 4.5
      }
      y += 4
    }

    // Services from step response_payload
    const ppcPayload = extractResponsePayload(stepMap.ppc_viability)
    const services = parse<Record<string, unknown>>(ppcPayload.services ?? ppcPayload.ppc_analysis)
    if (services.length) {
      if (y + 20 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('PPC Analysis', margin, y)
      y += 3

      const svcRows = services.map((s, i) => [
        String(i + 1),
        str(s.service_name ?? s.name ?? '-'),
        str(s.ppc_score ?? s.viability_score ?? s.score ?? '-'),
        str(s.recommendation ?? s.ppc_recommendation ?? '-'),
      ])

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['#', 'Service', 'Score', 'Recommendation']],
        body: svcRows,
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 40 }, 2: { cellWidth: 20 }, 3: { cellWidth: 'auto' } },
      })
      y = (doc as any).lastAutoTable.finalY + 8
    }
  }

  // ── Marketing Funnel ──
  const funnelSummary = obj(summary.funnel)
  if (funnelSummary) {
    if (y + 30 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Marketing Funnel', margin, y)
    y += 4

    const funnelRows: string[][] = [
      ['Persona Profiles', str(funnelSummary.persona_profiles_count)],
      ['Dominant Stage', str(funnelSummary.dominant_stage_overall).toUpperCase()],
    ]
    if (funnelSummary.tofu_budget_percentage != null) {
      funnelRows.push(
        ['TOFU Budget', `${funnelSummary.tofu_budget_percentage}%`],
        ['MOFU Budget', `${funnelSummary.mofu_budget_percentage}%`],
        ['BOFU Budget', `${funnelSummary.bofu_budget_percentage}%`],
      )
    }

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Metric', 'Value']],
      body: funnelRows,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 'auto' } },
    })
    y = (doc as any).lastAutoTable.finalY + 8

    // Persona profiles from step response_payload
    const funnelPayload = extractResponsePayload(stepMap.funnel)
    const personas = parse<Record<string, unknown>>(funnelPayload.persona_profiles ?? funnelPayload.personas)
    if (personas.length) {
      if (y + 20 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Persona Profiles', margin, y)
      y += 3

      const personaRows = personas.map((p, i) => [
        String(i + 1),
        str(p.name ?? p.persona_name ?? '-'),
        str(p.funnel_stage ?? p.stage ?? '-'),
        str(p.description ?? p.demographics ?? '-'),
      ])

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['#', 'Persona', 'Stage', 'Description']],
        body: personaRows,
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 35 }, 2: { cellWidth: 20 }, 3: { cellWidth: 'auto' } },
      })
      y = (doc as any).lastAutoTable.finalY + 8
    }
  }

  // ── Content Strategy ──
  const contentSummary = obj(summary.content_strategy)
  if (contentSummary) {
    if (y + 30 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Content Strategy', margin, y)
    y += 4

    const cRows: string[][] = [
      ['Content Pieces', str(contentSummary.content_pieces_count)],
    ]
    if (contentSummary.primary_objective) cRows.push(['Primary Objective', str(contentSummary.primary_objective)])

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Metric', 'Value']],
      body: cRows,
      styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 'auto' } },
    })
    y = (doc as any).lastAutoTable.finalY + 6

    // Key themes
    const themes = parse<string>(contentSummary.key_themes)
    if (themes.length) {
      if (y + 10 + themes.length * 5 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Key Themes', margin, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      for (const theme of themes) {
        if (y > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
        doc.text(`  • ${str(theme)}`, margin, y)
        y += 4.5
      }
      y += 4
    }

    // Content pieces from step response_payload
    const contentPayload = extractResponsePayload(stepMap.content_strategy)
    const pieces = parse<Record<string, unknown>>(contentPayload.content_pieces ?? contentPayload.content_plan)
    if (pieces.length) {
      if (y + 20 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Content Pieces', margin, y)
      y += 3

      const pieceRows = pieces.map((p, i) => [
        String(i + 1),
        str(p.title ?? p.suggested_title ?? '-'),
        str(p.type ?? p.content_type ?? '-'),
        str(p.funnel_stage ?? p.stage ?? '-'),
      ])

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['#', 'Title', 'Type', 'Stage']],
        body: pieceRows,
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 25 }, 3: { cellWidth: 20 } },
      })
      y = (doc as any).lastAutoTable.finalY + 8
    }
  }

  // ── Platform Ads Status ──
  if (platforms.length) {
    if (y + 20 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Platform Ads Status', margin, y)
    y += 4

    const platRows = platforms.map(p => {
      const flag = `${p}_ads_completed` as keyof Campaign
      const completed = (campaign as any)[flag] ?? false
      return [
        p.charAt(0).toUpperCase() + p.slice(1),
        completed ? 'Completed' : 'Pending',
      ]
    })

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Platform', 'Status']],
      body: platRows,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 'auto' } },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ── Steps Summary ──
  if (steps.length) {
    if (y + 20 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Campaign Steps', margin, y)
    y += 4

    const stepLabelMap: Record<string, string> = {
      segmentation: 'Segmentation',
      ppc_viability: 'PPC Viability',
      funnel: 'Marketing Funnel',
      content_strategy: 'Content Strategy',
      meta_ads: 'Meta Ads Strategy',
      google_ads: 'Google Ads Strategy',
      linkedin_ads: 'LinkedIn Ads Strategy',
    }

    const stepRows = steps.map(s => [
      stepLabelMap[s.step_type] ?? s.step_type,
      s.status.toUpperCase(),
      s.completed_at ? new Date(s.completed_at).toLocaleDateString() : '-',
    ])

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Step', 'Status', 'Completed']],
      body: stepRows,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 30 }, 2: { cellWidth: 30 } },
    })
  }

  addPdfFooter(ctx)
  const filename = `${campaignName.replace(/[^a-zA-Z0-9]/g, '_')}-report.pdf`
  triggerDownload(doc.output('blob'), filename)
}

// ── PPTX Export ───────────────────────────────────────────

export async function exportCampaignPPTX(campaign: Campaign, steps: CampaignStep[]): Promise<void> {
  const { pptx, purple, white, gray, cardBg, addSlide } = await initPPTX()

  const stepMap = buildStepMap(steps)
  const summary = (campaign as any).summary ?? {}
  const ctxPayload = (campaign as any).context_payload ?? {}
  const brand = campaign.brand
  const platforms: string[] = ctxPayload.selected_platforms ?? []

  const flags = [
    campaign.segmentation_completed,
    campaign.ppc_viability_completed,
    campaign.funnel_completed,
    campaign.content_strategy_completed,
    campaign.meta_ads_completed,
    campaign.google_ads_completed,
    campaign.linkedin_ads_completed,
  ]
  const done = flags.filter(Boolean).length

  // ── Title Slide ──
  const campaignName = campaign.name || brand?.company_name || 'Campaign Report'
  const titleSlide = pptx.addSlide()
  titleSlide.background = { fill: '1E1B2E' }
  titleSlide.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: '100%', h: 1.2, fill: { color: purple } })
  titleSlide.addImage({ data: hdmLogoBase64, x: 11.8, y: 0.15, w: 0.9, h: 0.9 })
  titleSlide.addText('Campaign Report', { x: 0.8, y: 0.25, w: 9, h: 0.6, fontSize: 32, color: white, bold: true })
  titleSlide.addText(campaignName, { x: 0.8, y: 1.5, w: 9, h: 0.5, fontSize: 20, color: gray })
  titleSlide.addText(brand?.company_name ?? '', { x: 0.8, y: 2.1, w: 9, h: 0.4, fontSize: 14, color: gray })
  titleSlide.addText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), { x: 0.8, y: 2.6, w: 5, h: 0.3, fontSize: 12, color: gray })

  // ── Overview Slide ──
  const overviewSlide = addSlide('Campaign Overview')
  const overviewRows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
    [
      { text: 'Property', options: { bold: true, color: white, fill: { color: purple } } },
      { text: 'Value', options: { bold: true, color: white, fill: { color: purple } } },
    ],
    [{ text: 'Status', options: { color: white } }, { text: campaign.status.toUpperCase(), options: { color: campaign.status === 'completed' ? '22C55E' : 'FBBF24' } }],
    [{ text: 'Brand', options: { color: white } }, { text: brand?.company_name ?? '-', options: { color: gray } }],
    [{ text: 'Industry', options: { color: white } }, { text: brand?.selected_industry?.name ?? '-', options: { color: gray } }],
    [{ text: 'Progress', options: { color: white } }, { text: `${done} / 7 (${Math.round((done / 7) * 100)}%)`, options: { color: '22C55E', bold: true } }],
  ]
  if (platforms.length) {
    overviewRows.push([{ text: 'Platforms', options: { color: white } }, { text: platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', '), options: { color: gray } }])
  }
  overviewSlide.addTable(overviewRows, {
    x: 0.8, y: 1.1, w: 11.5,
    fontSize: 10, rowH: 0.4,
    border: { pt: 0.5, color: '3F3A5C' },
    fill: { color: cardBg },
    colW: [3.5, 8],
  })

  // ── Segmentation Slide ──
  const segSummary = obj(summary.segmentation)
  if (segSummary) {
    const slide = addSlide('Market Segmentation')
    const rows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
      [
        { text: 'Attribute', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Value', options: { bold: true, color: white, fill: { color: purple } } },
      ],
      [{ text: 'Location', options: { color: white } }, { text: str(segSummary.location), options: { color: gray } }],
      [{ text: 'Business Type', options: { color: white } }, { text: str(segSummary.business_type), options: { color: gray } }],
      [{ text: 'Segments', options: { color: white } }, { text: str(segSummary.segments_count), options: { color: '22C55E', bold: true } }],
      [{ text: 'Deep Research', options: { color: white } }, { text: segSummary.has_deep_research ? 'Enabled' : 'Disabled', options: { color: segSummary.has_deep_research ? '22C55E' : gray } }],
    ]
    slide.addTable(rows, {
      x: 0.8, y: 1.1, w: 11.5,
      fontSize: 10, rowH: 0.4,
      border: { pt: 0.5, color: '3F3A5C' },
      fill: { color: cardBg },
      colW: [3.5, 8],
    })

    // Segments from step
    const segPayload = extractResponsePayload(stepMap.segmentation)
    const segments = parse<Record<string, unknown>>(segPayload.segments ?? segPayload.market_segments)
    if (segments.length) {
      const segSlide = addSlide('Segments')
      const segRows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
        [
          { text: '#', options: { bold: true, color: white, fill: { color: purple } } },
          { text: 'Name', options: { bold: true, color: white, fill: { color: purple } } },
          { text: 'Description', options: { bold: true, color: white, fill: { color: purple } } },
        ],
        ...segments.map((s, i) => [
          { text: String(i + 1), options: { color: gray } },
          { text: str(s.name ?? s.segment_name), options: { color: white, bold: true } },
          { text: str(s.description), options: { color: gray, fontSize: 9 } },
        ]),
      ]
      segSlide.addTable(segRows, {
        x: 0.8, y: 1.1, w: 11.5,
        fontSize: 10, rowH: 0.4,
        border: { pt: 0.5, color: '3F3A5C' },
        fill: { color: cardBg },
        colW: [0.6, 3, 7.9],
        autoPage: true,
      })
    }
  }

  // ── PPC Viability Slide ──
  const ppcSummary = obj(summary.ppc_viability)
  if (ppcSummary) {
    const slide = addSlide('PPC Viability')
    const rows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
      [
        { text: 'Metric', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Value', options: { bold: true, color: white, fill: { color: purple } } },
      ],
      [{ text: 'Total Services', options: { color: white } }, { text: str(ppcSummary.services_count), options: { color: gray } }],
      [{ text: 'PPC Ready', options: { color: white } }, { text: `${str(ppcSummary.ppc_ready_services)} / ${str(ppcSummary.services_count)}`, options: { color: '22C55E', bold: true } }],
      [{ text: 'Brand-First', options: { color: white } }, { text: str(ppcSummary.brand_first_services), options: { color: gray } }],
    ]
    slide.addTable(rows, {
      x: 0.8, y: 1.1, w: 11.5,
      fontSize: 10, rowH: 0.4,
      border: { pt: 0.5, color: '3F3A5C' },
      fill: { color: cardBg },
      colW: [3.5, 8],
    })

    // Top services
    const topServices = parse<string>(ppcSummary.top_ranked_services)
    if (topServices.length) {
      slide.addText('Top Ranked Services', { x: 0.8, y: 3.5, w: 5, h: 0.3, fontSize: 12, color: white, bold: true })
      slide.addText(topServices.map(s => `• ${s}`).join('\n'), {
        x: 0.8, y: 3.9, w: 11.5, h: 3, fontSize: 10, color: gray, lineSpacing: 18, valign: 'top',
      })
    }
  }

  // ── Marketing Funnel Slide ──
  const funnelSummary = obj(summary.funnel)
  if (funnelSummary) {
    const slide = addSlide('Marketing Funnel')
    const rows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
      [
        { text: 'Metric', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Value', options: { bold: true, color: white, fill: { color: purple } } },
      ],
      [{ text: 'Persona Profiles', options: { color: white } }, { text: str(funnelSummary.persona_profiles_count), options: { color: '22C55E', bold: true } }],
      [{ text: 'Dominant Stage', options: { color: white } }, { text: str(funnelSummary.dominant_stage_overall).toUpperCase(), options: { color: 'FBBF24' } }],
    ]
    if (funnelSummary.tofu_budget_percentage != null) {
      rows.push(
        [{ text: 'TOFU Budget', options: { color: '60A5FA' } }, { text: `${funnelSummary.tofu_budget_percentage}%`, options: { color: '60A5FA', bold: true } }],
        [{ text: 'MOFU Budget', options: { color: 'FBBF24' } }, { text: `${funnelSummary.mofu_budget_percentage}%`, options: { color: 'FBBF24', bold: true } }],
        [{ text: 'BOFU Budget', options: { color: 'F472B6' } }, { text: `${funnelSummary.bofu_budget_percentage}%`, options: { color: 'F472B6', bold: true } }],
      )
    }
    slide.addTable(rows, {
      x: 0.8, y: 1.1, w: 11.5,
      fontSize: 10, rowH: 0.4,
      border: { pt: 0.5, color: '3F3A5C' },
      fill: { color: cardBg },
      colW: [3.5, 8],
    })

    // Personas from step
    const funnelPayload = extractResponsePayload(stepMap.funnel)
    const personas = parse<Record<string, unknown>>(funnelPayload.persona_profiles ?? funnelPayload.personas)
    if (personas.length) {
      const personaSlide = addSlide('Persona Profiles')
      const pRows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
        [
          { text: '#', options: { bold: true, color: white, fill: { color: purple } } },
          { text: 'Persona', options: { bold: true, color: white, fill: { color: purple } } },
          { text: 'Stage', options: { bold: true, color: white, fill: { color: purple } } },
          { text: 'Description', options: { bold: true, color: white, fill: { color: purple } } },
        ],
        ...personas.map((p, i) => [
          { text: String(i + 1), options: { color: gray } },
          { text: str(p.name ?? p.persona_name), options: { color: white, bold: true } },
          { text: str(p.funnel_stage ?? p.stage), options: { color: '22C55E' } },
          { text: str(p.description ?? p.demographics), options: { color: gray, fontSize: 8 } },
        ]),
      ]
      personaSlide.addTable(pRows, {
        x: 0.8, y: 1.1, w: 11.5,
        fontSize: 10, rowH: 0.5,
        border: { pt: 0.5, color: '3F3A5C' },
        fill: { color: cardBg },
        colW: [0.5, 2.5, 1.5, 7],
        autoPage: true,
      })
    }
  }

  // ── Content Strategy Slide ──
  const contentSummary = obj(summary.content_strategy)
  if (contentSummary) {
    const slide = addSlide('Content Strategy')
    const rows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
      [
        { text: 'Metric', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Value', options: { bold: true, color: white, fill: { color: purple } } },
      ],
      [{ text: 'Content Pieces', options: { color: white } }, { text: str(contentSummary.content_pieces_count), options: { color: '22C55E', bold: true } }],
    ]
    if (contentSummary.primary_objective) {
      rows.push([{ text: 'Primary Objective', options: { color: white } }, { text: str(contentSummary.primary_objective), options: { color: gray, fontSize: 9 } }])
    }
    slide.addTable(rows, {
      x: 0.8, y: 1.1, w: 11.5,
      fontSize: 10, rowH: 0.4,
      border: { pt: 0.5, color: '3F3A5C' },
      fill: { color: cardBg },
      colW: [3.5, 8],
    })

    // Key themes
    const themes = parse<string>(contentSummary.key_themes)
    if (themes.length) {
      slide.addText('Key Themes', { x: 0.8, y: 2.8, w: 5, h: 0.3, fontSize: 12, color: white, bold: true })
      slide.addText(themes.map(t => `• ${t}`).join('\n'), {
        x: 0.8, y: 3.2, w: 11.5, h: 3.5, fontSize: 11, color: gray, lineSpacing: 20, valign: 'top',
      })
    }
  }

  // ── Platform Ads Slide ──
  if (platforms.length) {
    const slide = addSlide('Platform Ads Status')
    const rows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
      [
        { text: 'Platform', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Status', options: { bold: true, color: white, fill: { color: purple } } },
      ],
      ...platforms.map(p => {
        const flag = `${p}_ads_completed` as keyof Campaign
        const completed = (campaign as any)[flag] ?? false
        return [
          { text: p.charAt(0).toUpperCase() + p.slice(1), options: { color: white, bold: true } },
          { text: completed ? 'Completed' : 'Pending', options: { color: completed ? '22C55E' : 'FBBF24' } },
        ]
      }),
    ]
    slide.addTable(rows, {
      x: 0.8, y: 1.1, w: 11.5,
      fontSize: 10, rowH: 0.4,
      border: { pt: 0.5, color: '3F3A5C' },
      fill: { color: cardBg },
      colW: [5, 6.5],
    })
  }

  // ── Steps Overview Slide ──
  if (steps.length) {
    const stepLabelMap: Record<string, string> = {
      segmentation: 'Segmentation',
      ppc_viability: 'PPC Viability',
      funnel: 'Marketing Funnel',
      content_strategy: 'Content Strategy',
      meta_ads: 'Meta Ads',
      google_ads: 'Google Ads',
      linkedin_ads: 'LinkedIn Ads',
    }
    const slide = addSlide('Campaign Steps')
    const rows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
      [
        { text: 'Step', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Status', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Completed', options: { bold: true, color: white, fill: { color: purple } } },
      ],
      ...steps.map(s => [
        { text: stepLabelMap[s.step_type] ?? s.step_type, options: { color: white } },
        { text: s.status.toUpperCase(), options: { color: s.status === 'completed' ? '22C55E' : s.status === 'running' ? 'FBBF24' : gray } },
        { text: s.completed_at ? new Date(s.completed_at).toLocaleDateString() : '-', options: { color: gray } },
      ]),
    ]
    slide.addTable(rows, {
      x: 0.8, y: 1.1, w: 11.5,
      fontSize: 10, rowH: 0.4,
      border: { pt: 0.5, color: '3F3A5C' },
      fill: { color: cardBg },
      colW: [4, 3, 4.5],
    })
  }

  const filename = `${campaignName.replace(/[^a-zA-Z0-9]/g, '_')}-report.pptx`
  triggerDownload(await pptx.write({ outputType: 'blob' }) as Blob, filename)
}
