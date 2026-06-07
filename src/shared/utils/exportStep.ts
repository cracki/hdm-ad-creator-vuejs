import { triggerDownload } from './download'
import { exportCsv } from './csv'
import { initPDF, initPPTX, addPdfFooter, addPdfCoverTitle, parse, str } from './exportCampaign'
import { hdmLogoBase64 } from '@/shared/assets/hdm-logo-base64'

type ExportFormat = 'csv' | 'pdf' | 'pptx'
type StepCtx = { stepName: string; campaignName: string; brandName?: string }
type R = Record<string, unknown>

function safeName(ctx: StepCtx): string {
  return ctx.campaignName.replace(/[^a-zA-Z0-9]/g, '_')
}

function joinArr(raw: unknown): string {
  if (Array.isArray(raw)) return raw.map((v) => (typeof v === 'string' ? v : String(v ?? ''))).join('; ')
  if (typeof raw === 'string') return raw
  return ''
}

// ── Segmentation ──────────────────────────────────────────────

function segField(s: R): Record<string, string> {
  const g = (s as any).goals_motivations ?? s
  const p = (s as any).pain_points ?? {}
  const d = (s as any).demographic_profile ?? {}
  const dk = d.key_identifiers ?? {}
  const sa = (s as any).strategic_approach ?? {}
  const ab = (s as any).attitudes_beliefs ?? {}
  const bt = (s as any).behavioral_traits ?? {}
  return {
    persona_name: str(s.persona_name ?? s.name ?? s.segment_name),
    primary_goal: str(g.primary_goal),
    secondary_goals: joinArr(g.secondary_goals),
    fears: joinArr(g.fears_anti_goals),
    emotional_pains: joinArr(p.emotional_pains),
    functional_pains: joinArr(p.functional_pains),
    age_range: str(dk.age_range),
    occupation: str(dk.occupation),
    gender: str(dk.gender_split),
    income: str(dk.income_level),
    contextual: joinArr(d.contextual_identifiers),
    value_proposition: str(sa.value_proposition),
    messaging_tone: str(sa.core_messaging_tone),
    priority_channels: joinArr(sa.priority_channels),
    content_strategy: str(sa.content_offer_strategy),
    retention_levers: joinArr(sa.key_retention_levers),
    self_belief: str(ab.about_themselves),
    price_value: str(ab.about_price_value),
    product_category: str(ab.about_product_category),
    brand_loyalty: str(bt.brand_loyalty),
    media_consumption: str(bt.media_consumption),
    purchasing: str(bt.purchasing_behavior),
    info_gathering: str(bt.information_gathering),
  }
}

const SEG_CSV_COLS: { key: string; header: string }[] = [
  { key: 'persona_name', header: 'Persona Name' },
  { key: 'primary_goal', header: 'Primary Goal' },
  { key: 'secondary_goals', header: 'Secondary Goals' },
  { key: 'fears', header: 'Fears / Anti-Goals' },
  { key: 'emotional_pains', header: 'Emotional Pain Points' },
  { key: 'functional_pains', header: 'Functional Pain Points' },
  { key: 'age_range', header: 'Age Range' },
  { key: 'occupation', header: 'Occupation' },
  { key: 'gender', header: 'Gender Split' },
  { key: 'income', header: 'Income Level' },
  { key: 'contextual', header: 'Contextual Identifiers' },
  { key: 'value_proposition', header: 'Value Proposition' },
  { key: 'messaging_tone', header: 'Messaging Tone' },
  { key: 'priority_channels', header: 'Priority Channels' },
  { key: 'content_strategy', header: 'Content Offer Strategy' },
  { key: 'retention_levers', header: 'Retention Levers' },
  { key: 'self_belief', header: 'Self Belief' },
  { key: 'price_value', header: 'Price/Value Attitude' },
  { key: 'product_category', header: 'Product Category Attitude' },
  { key: 'brand_loyalty', header: 'Brand Loyalty' },
  { key: 'media_consumption', header: 'Media Consumption' },
  { key: 'purchasing', header: 'Purchasing Behavior' },
  { key: 'info_gathering', header: 'Info Gathering' },
]

function renderDeepResearchPDF(doc: any, autoTable: any, margin: number, y: number, dr: R): number {
  const pageH = () => doc.internal.pageSize.getHeight()
  doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text('Deep Research (Brand Intelligence)', margin, y); y += 6

  for (const [key, val] of Object.entries(dr)) {
    if (y > pageH() - 25) { doc.addPage(); y = margin }
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

    if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text(label, margin, y); y += 4
      const first = val[0] as R
      const cols = Object.keys(first).slice(0, 6)
      const body = val.map((item: any) => cols.map((c) => {
        const v = item[c]
        if (Array.isArray(v)) return joinArr(v)
        if (typeof v === 'object' && v !== null) return JSON.stringify(v)
        return str(v)
      }))
      autoTable(doc, { startY: y, margin: { left: margin, right: margin }, head: [cols.map((c) => c.replace(/_/g, ' '))], body, styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' }, headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' } })
      y = (doc as any).lastAutoTable.finalY + 6
    } else if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') {
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text(label, margin, y); y += 4
      doc.setFontSize(8); doc.setFont('helvetica', 'normal')
      for (const item of val) {
        if (y > pageH() - 20) { doc.addPage(); y = margin }
        const lines = doc.splitTextToSize(`  • ${String(item)}`, doc.internal.pageSize.getWidth() - margin * 2)
        for (const line of lines) { doc.text(line, margin, y); y += 3.5 }
      }
      y += 3
    } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text(label, margin, y); y += 4
      const nestedRows: string[][] = []
      for (const [nk, nv] of Object.entries(val as R)) {
        const text = Array.isArray(nv) ? joinArr(nv) : typeof nv === 'object' && nv !== null ? JSON.stringify(nv) : str(nv)
        nestedRows.push([nk.replace(/_/g, ' '), text])
      }
      if (nestedRows.length) {
        autoTable(doc, { startY: y, margin: { left: margin, right: margin }, head: [['Key', 'Value']], body: nestedRows, styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' }, headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' }, columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 'auto' } } })
        y = (doc as any).lastAutoTable.finalY + 6
      }
    } else {
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text(label, margin, y); y += 4
      doc.setFontSize(8); doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(String(val ?? ''), doc.internal.pageSize.getWidth() - margin * 2)
      for (const line of lines) { if (y > pageH() - 20) { doc.addPage(); y = margin }; doc.text(line, margin, y); y += 3.5 }
      y += 3
    }
  }
  return y
}

export async function exportSegmentation(format: ExportFormat, payload: R, ctx: StepCtx): Promise<void> {
  const data = (payload.data ?? payload) as R
  const segments = parse<R>(data.segments ?? data.personas ?? data.market_segments)
  const deepResearch = (payload.deep_research ?? data.deep_research) as R | undefined
  const assumptions = data.assumptions as R | undefined

  if (format === 'csv') {
    const rows = segments.map((s) => segField(s))
    exportCsv(rows as any, `${safeName(ctx)}-segmentation`, SEG_CSV_COLS)
    return
  }

  if (format === 'pdf') {
    const { doc, autoTable } = await initPDF()
    const margin = 15
    let y = 60
    addPdfCoverTitle({ doc, autoTable }, ctx.stepName, ctx.campaignName)
    const pageH = () => doc.internal.pageSize.getHeight()

    const summaryRows: string[][] = [
      ['Segments', String(segments.length)],
      ['Deep Research', deepResearch ? 'Enabled' : 'Disabled'],
      ['Location', str(data.location ?? payload.location)],
      ['Business Type', str(data.business_type ?? payload.business_type)],
    ]
    autoTable(doc, { startY: y, margin: { left: margin, right: margin }, head: [['Attribute', 'Value']], body: summaryRows, styles: { fontSize: 9, cellPadding: 2 }, headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' }, columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 'auto' } } })
    y = (doc as any).lastAutoTable.finalY + 8

    for (let i = 0; i < segments.length; i++) {
      const f = segField(segments[i])
      if (y + 30 > pageH() - 20) { doc.addPage(); y = margin }
      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text(`Segment ${i + 1}: ${f.persona_name}`, margin, y); y += 5
      const rows = Object.entries(f).filter(([k]) => k !== 'persona_name').map(([k, v]) => [SEG_CSV_COLS.find((c) => c.key === k)?.header ?? k, v])
      autoTable(doc, { startY: y, margin: { left: margin, right: margin }, head: [['Attribute', 'Value']], body: rows, styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' }, headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' }, columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 'auto' } } })
      y = (doc as any).lastAutoTable.finalY + 8
    }

    if (assumptions) {
      if (y + 30 > pageH() - 20) { doc.addPage(); y = margin }
      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('Assumptions', margin, y); y += 5
      const aRows: string[][] = []
      for (const [ak, av] of Object.entries(assumptions)) {
        if (typeof av === 'string') aRows.push([ak.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), av])
      }
      if (aRows.length) {
        autoTable(doc, { startY: y, margin: { left: margin, right: margin }, head: [['Attribute', 'Value']], body: aRows, styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' }, headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' }, columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 'auto' } } })
        y = (doc as any).lastAutoTable.finalY + 8
      }
    }

    if (deepResearch && typeof deepResearch === 'object') {
      if (y + 20 > pageH() - 20) { doc.addPage(); y = margin }
      y = renderDeepResearchPDF(doc, autoTable, margin, y, deepResearch)
    }

    addPdfFooter({ doc, autoTable })
    triggerDownload(doc.output('blob'), `${safeName(ctx)}-segmentation.pdf`)
    return
  }

  const { pptx, purple, white, gray, cardBg, addSlide } = await initPPTX()
  const titleSlide = pptx.addSlide()
  titleSlide.background = { fill: '1E1B2E' }
  titleSlide.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: '100%', h: 1.2, fill: { color: purple } })
  titleSlide.addImage({ data: hdmLogoBase64, x: 11.8, y: 0.15, w: 0.9, h: 0.9 })
  titleSlide.addText(ctx.stepName, { x: 0.8, y: 0.25, w: 9, h: 0.6, fontSize: 32, color: white, bold: true })
  titleSlide.addText(ctx.campaignName, { x: 0.8, y: 1.5, w: 9, h: 0.5, fontSize: 20, color: gray })

  const overviewSlide = addSlide('Overview')
  overviewSlide.addTable([
    [{ text: 'Attribute', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Value', options: { bold: true, color: white, fill: { color: purple } } }],
    [{ text: 'Segments', options: { color: white } }, { text: String(segments.length), options: { color: '22C55E', bold: true } }],
    [{ text: 'Deep Research', options: { color: white } }, { text: deepResearch ? 'Enabled' : 'Disabled', options: { color: deepResearch ? '22C55E' : gray } }],
  ], { x: 0.8, y: 1.1, w: 11.5, fontSize: 10, rowH: 0.4, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [3.5, 8] })

  for (let i = 0; i < segments.length; i++) {
    const f = segField(segments[i])
    const slide = addSlide(`Segment ${i + 1}: ${f.persona_name}`)
    slide.addTable([
      [{ text: 'Attribute', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Value', options: { bold: true, color: white, fill: { color: purple } } }],
      [{ text: 'Primary Goal', options: { color: white } }, { text: f.primary_goal, options: { color: gray, fontSize: 9 } }],
      [{ text: 'Demographics', options: { color: white } }, { text: `${f.age_range} | ${f.occupation}`, options: { color: gray, fontSize: 9 } }],
      [{ text: 'Value Proposition', options: { color: white } }, { text: f.value_proposition, options: { color: gray, fontSize: 8 } }],
      [{ text: 'Channels', options: { color: white } }, { text: f.priority_channels, options: { color: gray, fontSize: 8 } }],
      [{ text: 'Emotional Pains', options: { color: 'F472B6' } }, { text: f.emotional_pains, options: { color: gray, fontSize: 8 } }],
      [{ text: 'Functional Pains', options: { color: 'F472B6' } }, { text: f.functional_pains, options: { color: gray, fontSize: 8 } }],
      [{ text: 'Messaging Tone', options: { color: '22C55E' } }, { text: f.messaging_tone, options: { color: gray, fontSize: 9 } }],
    ], { x: 0.8, y: 1.1, w: 11.5, fontSize: 10, rowH: 0.45, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [3.5, 8] })
  }

  triggerDownload(await pptx.write({ outputType: 'blob' }) as Blob, `${safeName(ctx)}-segmentation.pptx`)
}

// ── PPC Viability ─────────────────────────────────────────────

export async function exportPPCViability(format: ExportFormat, payload: R, ctx: StepCtx): Promise<void> {
  const data = (payload.data ?? payload) as R
  const bpcScores = parse<R>((data as any).brand_trust_analysis?.services_bpc_scores ?? [])
  const blueprints = parse<R>((data as any).strategic_prioritization?.ppc_blueprints ?? (data as any).strategic_prioritization?.ppc_opportunity_ranking ?? [])
  const trustHierarchy = (data as any).brand_trust_analysis?.trust_factor_hierarchy as R | undefined
  const summary = data.summary as R | undefined
  const competitors = parse<R>((data as any).competitive_landscape?.competitors ?? [])
  const marketOverview = str((data as any).competitive_landscape?.market_overview)
  const budgetAlloc = str(summary?.recommended_initial_budget_allocation ?? (data as any).summary?.recommended_initial_budget_allocation)

  const allServices = bpcScores.length ? bpcScores : blueprints

  if (format === 'csv') {
    const rows = allServices.map((s) => ({
      service: str(s.service_name ?? s.name ?? s.service),
      bpc_score: str(s.bpc_score ?? s.ppc_score ?? s.viability_score ?? s.score),
      classification: str(s.classification),
      reasoning: str(s.reasoning ?? s.recommendation),
      priority: str(s.priority),
      campaign_objective: str(s.campaign_objective),
      key_platforms: joinArr(s.key_platforms ?? s.key_platforms),
      unique_value: str(s.unique_value_proposition),
      key_risk: str(s.key_risk),
    }))
    exportCsv(rows, `${safeName(ctx)}-ppc-viability`, [
      { key: 'service', header: 'Service' },
      { key: 'bpc_score', header: 'BPC Score' },
      { key: 'classification', header: 'Classification' },
      { key: 'reasoning', header: 'Reasoning' },
      { key: 'priority', header: 'Priority' },
      { key: 'campaign_objective', header: 'Campaign Objective' },
      { key: 'key_platforms', header: 'Key Platforms' },
      { key: 'unique_value', header: 'Unique Value Proposition' },
      { key: 'key_risk', header: 'Key Risk' },
    ])
    return
  }

  if (format === 'pdf') {
    const { doc, autoTable } = await initPDF()
    const margin = 15
    let y = 60
    addPdfCoverTitle({ doc, autoTable }, ctx.stepName, ctx.campaignName)
    const pageH = () => doc.internal.pageSize.getHeight()

    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text('Overview', margin, y); y += 6
    const overviewRows: string[][] = [
      ['Services Analyzed', str(summary?.total_services_analyzed ?? allServices.length)],
      ['PPC Ready', str(summary?.ppc_ready_services)],
      ['Brand First', str(summary?.brand_first_services)],
    ]
    if (budgetAlloc && budgetAlloc !== 'undefined') overviewRows.push(['Budget Allocation', budgetAlloc])
    autoTable(doc, { startY: y, margin: { left: margin, right: margin }, head: [['Metric', 'Value']], body: overviewRows, styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' }, headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' }, columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 'auto' } } })
    y = (doc as any).lastAutoTable.finalY + 8

    if (allServices.length) {
      if (y + 20 > pageH() - 20) { doc.addPage(); y = margin }
      doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text('Services Analysis', margin, y); y += 4
      const rows = allServices.map((s, i) => [
        String(i + 1),
        str(s.service_name ?? s.name ?? s.service),
        str(s.bpc_score ?? s.ppc_score ?? s.score),
        str(s.classification),
        str(s.reasoning ?? s.recommendation),
        str(s.priority),
      ])
      autoTable(doc, { startY: y, margin: { left: margin, right: margin }, head: [['#', 'Service', 'Score', 'Class', 'Reasoning', 'Priority']], body: rows, styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' }, headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' }, columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 28 }, 2: { cellWidth: 12 }, 3: { cellWidth: 18 }, 4: { cellWidth: 'auto' }, 5: { cellWidth: 12 } } })
      y = (doc as any).lastAutoTable.finalY + 8
    }

    if (trustHierarchy && typeof trustHierarchy === 'object') {
      if (y + 20 > pageH() - 20) { doc.addPage(); y = margin }
      doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text('Trust Factor Hierarchy', margin, y); y += 4
      const tRows = Object.entries(trustHierarchy).map(([k, v]) => [k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), String(v)])
      autoTable(doc, { startY: y, margin: { left: margin, right: margin }, head: [['Factor', 'Score']], body: tRows, styles: { fontSize: 9, cellPadding: 2 }, headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' }, columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 'auto' } } })
      y = (doc as any).lastAutoTable.finalY + 8
    }

    if (blueprints.length) {
      if (y + 20 > pageH() - 20) { doc.addPage(); y = margin }
      doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text('PPC Blueprints', margin, y); y += 4
      for (const bp of blueprints) {
        if (y + 30 > pageH() - 20) { doc.addPage(); y = margin }
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text(str(bp.service ?? bp.name), margin, y); y += 4
        const bpRows: string[][] = [
          ['Priority', str(bp.priority)],
          ['Objective', str(bp.campaign_objective)],
          ['Platforms', joinArr(bp.key_platforms)],
          ['UVP', str(bp.unique_value_proposition)],
          ['Risk', str(bp.key_risk)],
        ]
        const targeting = bp.targeting_strategy as R | undefined
        if (targeting) {
          if ((targeting as any).meta_audiences) bpRows.push(['Meta Audiences', joinArr((targeting as any).meta_audiences)])
          if ((targeting as any).google_ad_groups) bpRows.push(['Google Ad Groups', joinArr((targeting as any).google_ad_groups)])
          if ((targeting as any).linkedin_targeting) bpRows.push(['LinkedIn Targeting', joinArr((targeting as any).linkedin_targeting)])
        }
        autoTable(doc, { startY: y, margin: { left: margin, right: margin }, head: [['Attribute', 'Value']], body: bpRows, styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' }, headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' }, columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 'auto' } } })
        y = (doc as any).lastAutoTable.finalY + 6
      }
    }

    if (competitors.length) {
      if (y + 20 > pageH() - 20) { doc.addPage(); y = margin }
      doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text('Competitive Landscape', margin, y); y += 4
      const cRows = competitors.map((c) => [str(c.name), str(c.key_weakness), str(c.market_share), str(c.pricing_position)])
      autoTable(doc, { startY: y, margin: { left: margin, right: margin }, head: [['Competitor', 'Key Weakness', 'Market Share', 'Pricing']], body: cRows, styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' }, headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' }, columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 20 }, 3: { cellWidth: 15 } } })
      y = (doc as any).lastAutoTable.finalY + 6
    }

    if (marketOverview && marketOverview !== 'undefined') {
      if (y + 20 > pageH() - 20) { doc.addPage(); y = margin }
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text('Market Overview', margin, y); y += 4
      doc.setFontSize(8); doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(marketOverview, doc.internal.pageSize.getWidth() - margin * 2)
      for (const line of lines) { if (y > pageH() - 20) { doc.addPage(); y = margin }; doc.text(line, margin, y); y += 3.5 }
    }

    addPdfFooter({ doc, autoTable })
    triggerDownload(doc.output('blob'), `${safeName(ctx)}-ppc-viability.pdf`)
    return
  }

  const { pptx, purple, white, gray, cardBg, addSlide } = await initPPTX()
  const titleSlide = pptx.addSlide()
  titleSlide.background = { fill: '1E1B2E' }
  titleSlide.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: '100%', h: 1.2, fill: { color: purple } })
  titleSlide.addImage({ data: hdmLogoBase64, x: 11.8, y: 0.15, w: 0.9, h: 0.9 })
  titleSlide.addText(ctx.stepName, { x: 0.8, y: 0.25, w: 9, h: 0.6, fontSize: 32, color: white, bold: true })
  titleSlide.addText(ctx.campaignName, { x: 0.8, y: 1.5, w: 9, h: 0.5, fontSize: 20, color: gray })

  if (allServices.length) {
    const slide = addSlide('Services Analysis')
    slide.addTable([
      [{ text: '#', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Service', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Score', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Class', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Priority', options: { bold: true, color: white, fill: { color: purple } } }],
      ...allServices.map((s, i) => [
        { text: String(i + 1), options: { color: gray } },
        { text: str(s.service_name ?? s.name ?? s.service), options: { color: white, bold: true } },
        { text: str(s.bpc_score ?? s.ppc_score ?? s.score), options: { color: '22C55E' } },
        { text: str(s.classification), options: { color: str(s.classification).includes('Performance') ? '22C55E' : 'FBBF24' } },
        { text: str(s.priority), options: { color: gray } },
      ]),
    ], { x: 0.8, y: 1.1, w: 11.5, fontSize: 10, rowH: 0.4, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [0.6, 4, 1.2, 3, 1.2], autoPage: true })
  }

  if (competitors.length) {
    const slide = addSlide('Competitive Landscape')
    slide.addTable([
      [{ text: 'Competitor', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Weakness', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Share', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Pricing', options: { bold: true, color: white, fill: { color: purple } } }],
      ...competitors.map((c) => [
        { text: str(c.name), options: { color: white, bold: true } },
        { text: str(c.key_weakness), options: { color: gray, fontSize: 8 } },
        { text: str(c.market_share), options: { color: gray } },
        { text: str(c.pricing_position), options: { color: gray } },
      ]),
    ], { x: 0.8, y: 1.1, w: 11.5, fontSize: 10, rowH: 0.5, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [3, 5.5, 1.5, 1.5], autoPage: true })
  }

  triggerDownload(await pptx.write({ outputType: 'blob' }) as Blob, `${safeName(ctx)}-ppc-viability.pptx`)
}

// ── Funnel ────────────────────────────────────────────────────

export async function exportFunnel(format: ExportFormat, payload: R, ctx: StepCtx): Promise<void> {
  const data = (payload.data ?? payload) as R

  // Build flat stage list (same logic as FunnelView)
  const stages: R[] = []
  const personas = parse<R>((data as any).funnel_context?.persona_profiles ?? data.persona_profiles ?? data.personas)
  if (personas.length && personas[0] && typeof (personas[0] as any).messages === 'object') {
    for (const persona of personas) {
      const msgs = (persona as any).messages as Record<string, any> | undefined
      if (!msgs) continue
      for (const [stageKey, stageMsg] of Object.entries(msgs)) {
        stages.push({ stage: stageKey, name: (persona as any).persona_name, ...(stageMsg as R) })
      }
    }
  }
  if (!stages.length) {
    const raw = parse<R>(data.stages ?? data.funnel_stages ?? data.funnel)
    stages.push(...raw)
  }

  if (format === 'csv') {
    const rows = stages.map((s) => ({
      stage: str(s.stage ?? s.name),
      persona: str(s.persona_name ?? s.name),
      headline_angle: str(s.headline_angle ?? s.title),
      body_approach: str(s.body_approach ?? s.description),
      content_ideas: joinArr(s.content_ideas),
      cta: str(s.cta ?? s.call_to_action),
    }))
    exportCsv(rows, `${safeName(ctx)}-funnel`, [
      { key: 'stage', header: 'Stage' },
      { key: 'persona', header: 'Persona' },
      { key: 'headline_angle', header: 'Headline Angle' },
      { key: 'body_approach', header: 'Body Approach' },
      { key: 'content_ideas', header: 'Content Ideas' },
      { key: 'cta', header: 'CTA' },
    ])
    return
  }

  if (format === 'pdf') {
    const { doc, autoTable } = await initPDF()
    const margin = 15
    let y = 60
    addPdfCoverTitle({ doc, autoTable }, ctx.stepName, ctx.campaignName)

    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text('Overview', margin, y); y += 6
    autoTable(doc, { startY: y, margin: { left: margin, right: margin }, head: [['Metric', 'Value']], body: [['Stages', String(stages.length)], ['Personas', String(personas.length)]], styles: { fontSize: 9, cellPadding: 2 }, headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' }, columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 'auto' } } })
    y = (doc as any).lastAutoTable.finalY + 8

    if (stages.length) {
      if (y + 20 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
      doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text('Funnel Stages', margin, y); y += 4
      const rows = stages.map((s, i) => [
        String(i + 1),
        str(s.stage ?? s.name),
        str(s.persona_name ?? s.name),
        str(s.headline_angle ?? s.title),
        str(s.body_approach ?? s.description),
      ])
      autoTable(doc, { startY: y, margin: { left: margin, right: margin }, head: [['#', 'Stage', 'Persona', 'Headline', 'Body']], body: rows, styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' }, headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' }, columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 20 }, 2: { cellWidth: 30 }, 3: { cellWidth: 'auto' }, 4: { cellWidth: 'auto' } } })
    }

    addPdfFooter({ doc, autoTable })
    triggerDownload(doc.output('blob'), `${safeName(ctx)}-funnel.pdf`)
    return
  }

  const { pptx, purple, white, gray, cardBg, addSlide } = await initPPTX()
  const titleSlide = pptx.addSlide()
  titleSlide.background = { fill: '1E1B2E' }
  titleSlide.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: '100%', h: 1.2, fill: { color: purple } })
  titleSlide.addImage({ data: hdmLogoBase64, x: 11.8, y: 0.15, w: 0.9, h: 0.9 })
  titleSlide.addText(ctx.stepName, { x: 0.8, y: 0.25, w: 9, h: 0.6, fontSize: 32, color: white, bold: true })
  titleSlide.addText(ctx.campaignName, { x: 0.8, y: 1.5, w: 9, h: 0.5, fontSize: 20, color: gray })

  if (stages.length) {
    const slide = addSlide('Funnel Stages')
    slide.addTable([
      [{ text: '#', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Stage', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Persona', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Headline', options: { bold: true, color: white, fill: { color: purple } } }],
      ...stages.map((s, i) => [
        { text: String(i + 1), options: { color: gray } },
        { text: str(s.stage ?? s.name), options: { color: '22C55E' } },
        { text: str(s.persona_name ?? s.name), options: { color: white, bold: true } },
        { text: str(s.headline_angle ?? s.title), options: { color: gray, fontSize: 9 } },
      ]),
    ], { x: 0.8, y: 1.1, w: 11.5, fontSize: 10, rowH: 0.5, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [0.5, 1.5, 2.5, 7], autoPage: true })
  }

  triggerDownload(await pptx.write({ outputType: 'blob' }) as Blob, `${safeName(ctx)}-funnel.pptx`)
}

// ── Content Strategy ──────────────────────────────────────────

export async function exportContentStrategy(format: ExportFormat, payload: R, ctx: StepCtx): Promise<void> {
  const data = (payload.data ?? payload) as R
  const plan = parse<R>(data.content_plan ?? data.content_pieces ?? data.items)
  const keyThemes = parse<string>(data.key_themes)

  if (format === 'csv') {
    const rows = plan.map((item) => {
      const idea = (item.content_idea ?? item) as R
      return {
        persona: str(item.target_persona ?? item.persona),
        funnel_stage: str(item.funnel_stage ?? item.stage),
        content_type: str(item.content_type ?? item.type),
        title: str(idea.title ?? item.title ?? item.suggested_title),
        description: str(idea.description ?? item.description),
        justification: str(item.strategic_justification ?? item.justification),
      }
    })
    exportCsv(rows, `${safeName(ctx)}-content-strategy`, [
      { key: 'persona', header: 'Target Persona' },
      { key: 'funnel_stage', header: 'Funnel Stage' },
      { key: 'content_type', header: 'Content Type' },
      { key: 'title', header: 'Title' },
      { key: 'description', header: 'Description' },
      { key: 'justification', header: 'Strategic Justification' },
    ])
    return
  }

  if (format === 'pdf') {
    const { doc, autoTable } = await initPDF()
    const margin = 15
    let y = 60
    addPdfCoverTitle({ doc, autoTable }, ctx.stepName, ctx.campaignName)

    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text('Overview', margin, y); y += 6
    const overview: string[][] = [['Content Pieces', String(plan.length)]]
    if (keyThemes.length) overview.push(['Key Themes', keyThemes.join(', ')])
    autoTable(doc, { startY: y, margin: { left: margin, right: margin }, head: [['Metric', 'Value']], body: overview, styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' }, headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' }, columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 'auto' } } })
    y = (doc as any).lastAutoTable.finalY + 8

    if (plan.length) {
      if (y + 20 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
      doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text('Content Plan', margin, y); y += 4
      const rows = plan.map((item, i) => {
        const idea = (item.content_idea ?? item) as R
        return [
          String(i + 1),
          str(item.target_persona ?? item.persona),
          str(item.funnel_stage ?? item.stage),
          str(idea.title ?? item.title ?? item.suggested_title),
          str(idea.description ?? item.description),
        ]
      })
      autoTable(doc, { startY: y, margin: { left: margin, right: margin }, head: [['#', 'Persona', 'Stage', 'Title', 'Description']], body: rows, styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' }, headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' }, columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 25 }, 2: { cellWidth: 18 }, 3: { cellWidth: 35 }, 4: { cellWidth: 'auto' } } })
    }

    addPdfFooter({ doc, autoTable })
    triggerDownload(doc.output('blob'), `${safeName(ctx)}-content-strategy.pdf`)
    return
  }

  const { pptx, purple, white, gray, cardBg, addSlide } = await initPPTX()
  const titleSlide = pptx.addSlide()
  titleSlide.background = { fill: '1E1B2E' }
  titleSlide.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: '100%', h: 1.2, fill: { color: purple } })
  titleSlide.addImage({ data: hdmLogoBase64, x: 11.8, y: 0.15, w: 0.9, h: 0.9 })
  titleSlide.addText(ctx.stepName, { x: 0.8, y: 0.25, w: 9, h: 0.6, fontSize: 32, color: white, bold: true })
  titleSlide.addText(ctx.campaignName, { x: 0.8, y: 1.5, w: 9, h: 0.5, fontSize: 20, color: gray })

  if (plan.length) {
    const slide = addSlide('Content Plan')
    slide.addTable([
      [{ text: '#', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Persona', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Stage', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Title', options: { bold: true, color: white, fill: { color: purple } } }],
      ...plan.map((item, i) => {
        const idea = (item.content_idea ?? item) as R
        return [
          { text: String(i + 1), options: { color: gray } },
          { text: str(item.target_persona ?? item.persona), options: { color: white } },
          { text: str(item.funnel_stage ?? item.stage), options: { color: '22C55E' } },
          { text: str(idea.title ?? item.title ?? item.suggested_title), options: { color: gray, fontSize: 9 } },
        ]
      }),
    ], { x: 0.8, y: 1.1, w: 11.5, fontSize: 10, rowH: 0.5, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [0.5, 2.5, 1.5, 7], autoPage: true })
  }

  triggerDownload(await pptx.write({ outputType: 'blob' }) as Blob, `${safeName(ctx)}-content-strategy.pptx`)
}

// ── Ads Strategy ──────────────────────────────────────────────

export async function exportAdsStrategy(format: ExportFormat, payload: R, ctx: StepCtx): Promise<void> {
  // payload is the normalized ads-strategy response from the last platform run
  const data = (payload.data ?? payload) as R
  // Collect all strategy items
  const items: R[] = []
  for (const [key, val] of Object.entries(data)) {
    if (Array.isArray(val)) {
      for (const item of val) {
        if (item && typeof item === 'object') items.push({ platform: key, ...(item as R) })
      }
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      const nested = val as R
      if (nested.campaign_name || nested.budget || nested.bidding_strategy) {
        items.push({ platform: key, ...nested })
      }
    }
  }

  if (format === 'csv') {
    const rows = items.map((s) => ({
      platform: str(s.platform),
      campaign_name: str(s.campaign_name ?? s.campaign),
      budget: str(s.budget ?? s.budget_range),
      bidding: str(s.bidding_strategy ?? s.bidding),
      primary_kpi: str(s.primary_kpi ?? s.kpi),
      audience: str(s.audience_targeting ?? s.audience),
      messaging: str(s.key_messaging ?? s.messaging),
    }))
    exportCsv(rows, `${safeName(ctx)}-ads-strategy`, [
      { key: 'platform', header: 'Platform' },
      { key: 'campaign_name', header: 'Campaign Name' },
      { key: 'budget', header: 'Budget' },
      { key: 'bidding', header: 'Bidding Strategy' },
      { key: 'primary_kpi', header: 'Primary KPI' },
      { key: 'audience', header: 'Audience Targeting' },
      { key: 'messaging', header: 'Key Messaging' },
    ])
    return
  }

  if (format === 'pdf') {
    const { doc, autoTable } = await initPDF()
    const margin = 15
    let y = 60
    addPdfCoverTitle({ doc, autoTable }, ctx.stepName, ctx.campaignName)

    if (items.length) {
      doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text('Platform Strategies', margin, y); y += 4
      const rows = items.map((s, i) => [
        String(i + 1),
        str(s.platform),
        str(s.campaign_name ?? s.campaign),
        str(s.budget ?? s.budget_range),
        str(s.primary_kpi ?? s.kpi),
        str(s.key_messaging ?? s.messaging),
      ])
      autoTable(doc, { startY: y, margin: { left: margin, right: margin }, head: [['#', 'Platform', 'Campaign', 'Budget', 'KPI', 'Messaging']], body: rows, styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' }, headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' }, columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 20 }, 2: { cellWidth: 30 }, 3: { cellWidth: 20 }, 4: { cellWidth: 20 }, 5: { cellWidth: 'auto' } } })
    }

    addPdfFooter({ doc, autoTable })
    triggerDownload(doc.output('blob'), `${safeName(ctx)}-ads-strategy.pdf`)
    return
  }

  const { pptx, purple, white, gray, cardBg, addSlide } = await initPPTX()
  const titleSlide = pptx.addSlide()
  titleSlide.background = { fill: '1E1B2E' }
  titleSlide.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: '100%', h: 1.2, fill: { color: purple } })
  titleSlide.addImage({ data: hdmLogoBase64, x: 11.8, y: 0.15, w: 0.9, h: 0.9 })
  titleSlide.addText(ctx.stepName, { x: 0.8, y: 0.25, w: 9, h: 0.6, fontSize: 32, color: white, bold: true })
  titleSlide.addText(ctx.campaignName, { x: 0.8, y: 1.5, w: 9, h: 0.5, fontSize: 20, color: gray })

  if (items.length) {
    const slide = addSlide('Platform Strategies')
    slide.addTable([
      [{ text: '#', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Platform', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Campaign', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Budget', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'KPI', options: { bold: true, color: white, fill: { color: purple } } }],
      ...items.map((s, i) => [
        { text: String(i + 1), options: { color: gray } },
        { text: str(s.platform), options: { color: white, bold: true } },
        { text: str(s.campaign_name ?? s.campaign), options: { color: gray } },
        { text: str(s.budget ?? s.budget_range), options: { color: '22C55E' } },
        { text: str(s.primary_kpi ?? s.kpi), options: { color: gray } },
      ]),
    ], { x: 0.8, y: 1.1, w: 11.5, fontSize: 10, rowH: 0.5, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [0.5, 1.5, 3.5, 2, 4], autoPage: true })
  }

  triggerDownload(await pptx.write({ outputType: 'blob' }) as Blob, `${safeName(ctx)}-ads-strategy.pptx`)
}

// ── Ad Generation ─────────────────────────────────────────────

export async function exportAds(format: ExportFormat, ads: any[], ctx: StepCtx): Promise<void> {
  function adData(ad: any) {
    const d = ad.data ?? {}
    return { headline: d.headline ?? d.title ?? '', body: d.body ?? d.description ?? d.primary_text ?? '', cta: d.cta ?? d.call_to_action ?? '', framework: d.framework ?? d.creative_framework ?? '', score: d.score ?? d.quality_score ?? 0 }
  }

  if (format === 'csv') {
    const rows = ads.map((ad) => {
      const d = adData(ad)
      return { platform: ad.platform ?? '', funnel_stage: ad.funnel_stage ?? '', persona: ad.persona ?? '', headline: d.headline, body: d.body, cta: d.cta, framework: d.framework, score: d.score }
    })
    exportCsv(rows, `${safeName(ctx)}-ads`, [
      { key: 'platform', header: 'Platform' },
      { key: 'funnel_stage', header: 'Funnel Stage' },
      { key: 'persona', header: 'Persona' },
      { key: 'headline', header: 'Headline' },
      { key: 'body', header: 'Body' },
      { key: 'cta', header: 'CTA' },
      { key: 'framework', header: 'Framework' },
      { key: 'score', header: 'Score' },
    ])
    return
  }

  if (format === 'pdf') {
    const { doc, autoTable } = await initPDF()
    const margin = 15
    let y = 60
    addPdfCoverTitle({ doc, autoTable }, ctx.stepName, ctx.campaignName)

    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text('Overview', margin, y); y += 6
    autoTable(doc, { startY: y, margin: { left: margin, right: margin }, head: [['Metric', 'Value']], body: [['Total Ads', String(ads.length)]], styles: { fontSize: 9, cellPadding: 2 }, headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' }, columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 'auto' } } })
    y = (doc as any).lastAutoTable.finalY + 8

    if (ads.length) {
      if (y + 20 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
      doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text('Generated Ads', margin, y); y += 4
      const rows = ads.map((ad, i) => {
        const d = adData(ad)
        return [String(i + 1), ad.platform ?? '', ad.funnel_stage ?? '', ad.persona ?? '', d.headline, d.body, d.cta, String(d.score)]
      })
      autoTable(doc, { startY: y, margin: { left: margin, right: margin }, head: [['#', 'Platform', 'Stage', 'Persona', 'Headline', 'Body', 'CTA', 'Score']], body: rows, styles: { fontSize: 6, cellPadding: 2, overflow: 'linebreak' }, headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' }, columnStyles: { 0: { cellWidth: 7 }, 1: { cellWidth: 15 }, 2: { cellWidth: 14 }, 3: { cellWidth: 20 }, 4: { cellWidth: 'auto' }, 5: { cellWidth: 'auto' }, 6: { cellWidth: 18 }, 7: { cellWidth: 12 } } })
    }

    addPdfFooter({ doc, autoTable })
    triggerDownload(doc.output('blob'), `${safeName(ctx)}-ads.pdf`)
    return
  }

  const { pptx, purple, white, gray, cardBg, addSlide } = await initPPTX()
  const titleSlide = pptx.addSlide()
  titleSlide.background = { fill: '1E1B2E' }
  titleSlide.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: '100%', h: 1.2, fill: { color: purple } })
  titleSlide.addImage({ data: hdmLogoBase64, x: 11.8, y: 0.15, w: 0.9, h: 0.9 })
  titleSlide.addText(ctx.stepName, { x: 0.8, y: 0.25, w: 9, h: 0.6, fontSize: 32, color: white, bold: true })
  titleSlide.addText(ctx.campaignName, { x: 0.8, y: 1.5, w: 9, h: 0.5, fontSize: 20, color: gray })

  if (ads.length) {
    const slide = addSlide('Generated Ads')
    slide.addTable([
      [{ text: '#', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Platform', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Stage', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Headline', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'CTA', options: { bold: true, color: white, fill: { color: purple } } }],
      ...ads.map((ad, i) => {
        const d = adData(ad)
        return [
          { text: String(i + 1), options: { color: gray } },
          { text: ad.platform ?? '', options: { color: white } },
          { text: ad.funnel_stage ?? '', options: { color: '22C55E' } },
          { text: d.headline, options: { color: gray, fontSize: 9 } },
          { text: d.cta, options: { color: 'F472B6' } },
        ]
      }),
    ], { x: 0.8, y: 1.1, w: 11.5, fontSize: 10, rowH: 0.5, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [0.5, 1.5, 1.2, 6.5, 2.3], autoPage: true })
  }

  triggerDownload(await pptx.write({ outputType: 'blob' }) as Blob, `${safeName(ctx)}-ads.pptx`)
}

// ── Visuals ───────────────────────────────────────────────────

export async function exportVisuals(format: ExportFormat, payload: R, ctx: StepCtx): Promise<void> {
  const results = parse<R>(payload.results ?? payload.visuals ?? payload.images ?? [])
  if (!results.length) return

  if (format === 'csv') {
    const rows = results.map((v) => ({
      platform: str(v.platform),
      funnel_stage: str(v.funnel_stage ?? v.stage),
      persona: str(v.persona),
      visual_summary: str(v.visual_summary ?? v.summary ?? v.description),
      aspect_ratio: str(v.aspect_ratio),
      image_url: str(v.image_url ?? v.url),
    }))
    exportCsv(rows, `${safeName(ctx)}-visuals`, [
      { key: 'platform', header: 'Platform' },
      { key: 'funnel_stage', header: 'Funnel Stage' },
      { key: 'persona', header: 'Persona' },
      { key: 'visual_summary', header: 'Visual Summary' },
      { key: 'aspect_ratio', header: 'Aspect Ratio' },
      { key: 'image_url', header: 'Image URL' },
    ])
    return
  }

  async function fetchImageAsBase64(url: string): Promise<string | null> {
    try {
      const resp = await fetch(url, { mode: 'cors' })
      if (!resp.ok) return null
      const blob = await resp.blob()
      return new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => resolve('')
        reader.readAsDataURL(blob)
      })
    } catch { return null }
  }

  if (format === 'pdf') {
    const { doc, autoTable } = await initPDF()
    const margin = 15
    let y = 60
    addPdfCoverTitle({ doc, autoTable }, ctx.stepName, ctx.campaignName)
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = () => doc.internal.pageSize.getHeight()
    const imgMaxW = pageW - margin * 2
    const imgMaxH = 80

    // Overview table
    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text('Generated Visuals', margin, y); y += 6
    const overviewRows: string[][] = [
      ['Total Visuals', String(results.length)],
      ['Successful', String(results.filter((v) => v.success).length)],
      ['Failed', String(results.filter((v) => !v.success).length)],
    ]
    autoTable(doc, { startY: y, margin: { left: margin, right: margin }, head: [['Metric', 'Value']], body: overviewRows, styles: { fontSize: 9, cellPadding: 2 }, headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' }, columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 'auto' } } })
    y = (doc as any).lastAutoTable.finalY + 10

    for (let i = 0; i < results.length; i++) {
      const v = results[i]
      const imgUrl = str(v.image_url ?? v.url)
      const summary = str(v.visual_summary ?? v.summary ?? v.description)

      if (y + 40 > pageH() - 25) { doc.addPage(); y = margin }

      // Section header
      doc.setFontSize(11); doc.setFont('helvetica', 'bold')
      doc.setTextColor(88, 28, 135)
      doc.text(`Visual ${i + 1}`, margin, y); y += 5

      // Metadata
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(8); doc.setFont('helvetica', 'normal')
      const meta = `Platform: ${str(v.platform)}  |  Stage: ${str(v.funnel_stage ?? v.stage)}  |  Ratio: ${str(v.aspect_ratio)}  |  Quality: ${str(v.quality)}`
      doc.text(meta, margin, y); y += 4

      // Embed image if available
      if (v.success && imgUrl) {
        const base64 = await fetchImageAsBase64(imgUrl)
        if (base64) {
          // Calculate dimensions keeping aspect ratio
          const ratio = str(v.aspect_ratio)
          let imgW = imgMaxW
          let imgH = imgMaxH
          const [rw, rh] = ratio.split(':').map(Number)
          if (rw && rh) {
            const aspectRatio = rw / rh
            if (aspectRatio >= 1) {
              imgW = Math.min(imgMaxW, imgMaxH * aspectRatio)
              imgH = imgW / aspectRatio
            } else {
              imgH = Math.min(imgMaxH, imgMaxW / aspectRatio)
              imgW = imgH * aspectRatio
            }
          }
          const xOffset = margin + (imgMaxW - imgW) / 2

          if (y + imgH + 10 > pageH() - 25) { doc.addPage(); y = margin }
          doc.addImage(base64, 'JPEG', xOffset, y, imgW, imgH)
          y += imgH + 4
        } else {
          doc.setFontSize(7); doc.setTextColor(100, 100, 100)
          doc.text(`Image: ${imgUrl}`, margin, y); y += 4
        }
      }

      // Summary text
      if (summary) {
        if (y + 10 > pageH() - 25) { doc.addPage(); y = margin }
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80)
        const lines = doc.splitTextToSize(summary, imgMaxW)
        for (const line of lines) {
          if (y > pageH() - 20) { doc.addPage(); y = margin }
          doc.text(line, margin, y); y += 3.5
        }
      }
      y += 8
    }

    addPdfFooter({ doc, autoTable })
    triggerDownload(doc.output('blob'), `${safeName(ctx)}-visuals.pdf`)
    return
  }

  const { pptx, purple, white, gray, addSlide } = await initPPTX()
  const titleSlide = pptx.addSlide()
  titleSlide.background = { fill: '1E1B2E' }
  titleSlide.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: '100%', h: 1.2, fill: { color: purple } })
  titleSlide.addImage({ data: hdmLogoBase64, x: 11.8, y: 0.15, w: 0.9, h: 0.9 })
  titleSlide.addText(ctx.stepName, { x: 0.8, y: 0.25, w: 9, h: 0.6, fontSize: 32, color: white, bold: true })
  titleSlide.addText(ctx.campaignName, { x: 0.8, y: 1.5, w: 9, h: 0.5, fontSize: 20, color: gray })

  // One slide per visual with embedded image
  for (let i = 0; i < results.length; i++) {
    const v = results[i]
    const imgUrl = str(v.image_url ?? v.url)
    const summary = str(v.visual_summary ?? v.summary ?? v.description)
    const slide = addSlide(`Visual ${i + 1}`)

    // Embed image if available
    if (v.success && imgUrl) {
      const ratio = str(v.aspect_ratio)
      const [rw, rh] = ratio.split(':').map(Number)
      let imgW = 5
      let imgH = 3.5
      if (rw && rh) {
        const aspectRatio = rw / rh
        if (aspectRatio >= 1) {
          imgW = 5
          imgH = imgW / aspectRatio
        } else {
          imgH = 4.5
          imgW = imgH * aspectRatio
        }
      }
      slide.addImage({ path: imgUrl, x: 0.8, y: 1.2, w: imgW, h: imgH })

      // Metadata beside or below image
      const metaX = 0.8 + imgW + 0.5
      const metaW = 12.4 - metaX
      if (metaW > 2) {
        slide.addText([
          { text: `${str(v.platform)}  •  ${str(v.funnel_stage ?? v.stage)}`, options: { fontSize: 10, color: '60A5FA', bold: true } },
        ], { x: metaX, y: 1.2, w: metaW, h: 0.4 })
        if (summary) {
          slide.addText(summary, { x: metaX, y: 1.7, w: metaW, h: 2.5, fontSize: 9, color: gray, valign: 'top' })
        }
        slide.addText(`Ratio: ${ratio}  |  Quality: ${str(v.quality)}`, { x: metaX, y: 4.3, w: metaW, h: 0.3, fontSize: 8, color: '60A5FA' })
      }
    } else {
      // No image — show error / metadata only
      slide.addText('Image unavailable', { x: 0.8, y: 1.5, w: 11, h: 0.5, fontSize: 14, color: 'F472B6', bold: true })
      slide.addText(str(v.error ?? ''), { x: 0.8, y: 2.2, w: 11, h: 0.5, fontSize: 10, color: gray })
    }
  }

  triggerDownload(await pptx.write({ outputType: 'blob' }) as Blob, `${safeName(ctx)}-visuals.pptx`)
}

// ── Campaign Review ───────────────────────────────────────────

export async function exportReview(format: ExportFormat, campaign: any, adsList: any[], ctx: StepCtx): Promise<void> {
  const flags = [
    { label: 'Segmentation', done: campaign.segmentation_completed },
    { label: 'PPC Viability', done: campaign.ppc_viability_completed },
    { label: 'Funnel', done: campaign.funnel_completed },
    { label: 'Content Strategy', done: campaign.content_strategy_completed },
    { label: 'Meta Ads', done: campaign.meta_ads_completed },
    { label: 'Google Ads', done: campaign.google_ads_completed },
    { label: 'LinkedIn Ads', done: campaign.linkedin_ads_completed },
  ]
  const doneCount = flags.filter((f) => f.done).length

  if (format === 'csv') {
    const rows = [
      { property: 'Campaign', value: campaign.name ?? '' },
      { property: 'Brand', value: campaign.brand?.company_name ?? '' },
      { property: 'Status', value: campaign.status ?? '' },
      { property: 'Progress', value: `${doneCount} / ${flags.length}` },
      ...flags.map((f) => ({ property: f.label, value: f.done ? 'Completed' : 'Pending' })),
      { property: 'Total Ads', value: String(adsList.length) },
    ]
    exportCsv(rows, `${safeName(ctx)}-review`, [
      { key: 'property', header: 'Property' },
      { key: 'value', header: 'Value' },
    ])
    return
  }

  if (format === 'pdf') {
    const { doc, autoTable } = await initPDF()
    const margin = 15
    let y = 60
    addPdfCoverTitle({ doc, autoTable }, ctx.stepName, ctx.campaignName)

    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text('Campaign Status', margin, y); y += 6
    const rows: string[][] = [
      ['Campaign', campaign.name ?? ''],
      ['Brand', campaign.brand?.company_name ?? ''],
      ['Status', (campaign.status ?? '').toUpperCase()],
      ['Progress', `${doneCount} / ${flags.length} (${Math.round((doneCount / flags.length) * 100)}%)`],
      ...flags.map((f) => [f.label, f.done ? 'Completed' : 'Pending']),
      ['Total Ads', String(adsList.length)],
    ]
    autoTable(doc, { startY: y, margin: { left: margin, right: margin }, head: [['Property', 'Value']], body: rows, styles: { fontSize: 9, cellPadding: 2 }, headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' }, columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 'auto' } } })

    addPdfFooter({ doc, autoTable })
    triggerDownload(doc.output('blob'), `${safeName(ctx)}-review.pdf`)
    return
  }

  const { pptx, purple, white, gray, cardBg, addSlide } = await initPPTX()
  const titleSlide = pptx.addSlide()
  titleSlide.background = { fill: '1E1B2E' }
  titleSlide.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: '100%', h: 1.2, fill: { color: purple } })
  titleSlide.addImage({ data: hdmLogoBase64, x: 11.8, y: 0.15, w: 0.9, h: 0.9 })
  titleSlide.addText(ctx.stepName, { x: 0.8, y: 0.25, w: 9, h: 0.6, fontSize: 32, color: white, bold: true })
  titleSlide.addText(ctx.campaignName, { x: 0.8, y: 1.5, w: 9, h: 0.5, fontSize: 20, color: gray })

  const slide = addSlide('Campaign Status')
  slide.addTable([
    [{ text: 'Property', options: { bold: true, color: white, fill: { color: purple } } }, { text: 'Value', options: { bold: true, color: white, fill: { color: purple } } }],
    [{ text: 'Campaign', options: { color: white } }, { text: campaign.name ?? '-', options: { color: gray } }],
    [{ text: 'Brand', options: { color: white } }, { text: campaign.brand?.company_name ?? '-', options: { color: gray } }],
    [{ text: 'Progress', options: { color: white } }, { text: `${doneCount} / ${flags.length}`, options: { color: '22C55E', bold: true } }],
    ...flags.map((f) => [
      { text: f.label, options: { color: white } },
      { text: f.done ? 'Completed' : 'Pending', options: { color: f.done ? '22C55E' : 'FBBF24' } },
    ]),
    [{ text: 'Total Ads', options: { color: white } }, { text: String(adsList.length), options: { color: '22C55E', bold: true } }],
  ], { x: 0.8, y: 1.1, w: 11.5, fontSize: 10, rowH: 0.4, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [3.5, 8] })

  triggerDownload(await pptx.write({ outputType: 'blob' }) as Blob, `${safeName(ctx)}-review.pptx`)
}

// ── Full Funnel ────────────────────────────────────────────────

interface FullFunnelAd {
  funnel_stage?: string
  platform?: string
  headline?: string
  body_text?: string
  body?: string
  cta_button?: string
  cta_text?: string
  persona?: string
  score?: number
}

interface FullFunnelCtx extends StepCtx {
  budget?: number
  currency?: string
  duration?: number
  platforms?: string[]
  targetingSpecs?: Record<string, any>
}

export async function exportFullFunnel(
  format: ExportFormat,
  _campaignData: Record<string, unknown>,
  adsByStage: Record<string, FullFunnelAd[]>,
  ctx: FullFunnelCtx,
): Promise<void> {
  const allAds = Object.values(adsByStage).flat()
  const stageLabels: Record<string, string> = { tofu: 'TOFU', mofu: 'MOFU', bofu: 'BOFU' }

  if (format === 'csv') {
    const rows = allAds.map((ad) => ({
      funnel_stage: stageLabels[ad.funnel_stage ?? ''] ?? ad.funnel_stage ?? '',
      platform: str(ad.platform),
      headline: ad.headline ?? '',
      body: ad.body_text ?? ad.body ?? '',
      cta: ad.cta_button ?? ad.cta_text ?? '',
      persona: ad.persona ?? '',
    }))
    exportCsv(rows, `${safeName(ctx)}-full-funnel`, [
      { key: 'funnel_stage', header: 'Funnel Stage' },
      { key: 'platform', header: 'Platform' },
      { key: 'headline', header: 'Headline' },
      { key: 'body', header: 'Body Copy' },
      { key: 'cta', header: 'CTA' },
      { key: 'persona', header: 'Persona' },
    ])
    return
  }

  if (format === 'pdf') {
    const { doc, autoTable } = await initPDF()
    const margin = 15
    let y = 60
    addPdfCoverTitle({ doc, autoTable }, ctx.stepName, ctx.campaignName)
    const pageH = () => doc.internal.pageSize.getHeight()

    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text('Overview', margin, y); y += 6
    const overviewRows: string[][] = [
      ['Total Ads', String(allAds.length)],
      ['Platforms', (ctx.platforms ?? []).join(', ')],
      ['Budget', `${ctx.currency ?? 'USD'} ${(ctx.budget ?? 0).toLocaleString()}`],
      ['Duration', `${ctx.duration ?? 0} days`],
    ]
    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin },
      head: [['Metric', 'Value']], body: overviewRows,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 'auto' } },
    })
    y = (doc as any).lastAutoTable.finalY + 8

    for (const [stage, ads] of Object.entries(adsByStage)) {
      if (!ads.length) continue
      if (y + 30 > pageH() - 20) { doc.addPage(); y = margin }
      doc.setFontSize(12); doc.setFont('helvetica', 'bold')
      doc.text(`${stageLabels[stage] ?? stage} — ${ads.length} ads`, margin, y); y += 5
      const rows = ads.map((ad, i) => [
        String(i + 1),
        str(ad.platform),
        ad.headline ?? '',
        ad.body_text ?? ad.body ?? '',
        ad.cta_button ?? ad.cta_text ?? '',
      ])
      autoTable(doc, {
        startY: y, margin: { left: margin, right: margin },
        head: [['#', 'Platform', 'Headline', 'Body', 'CTA']], body: rows,
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 7 }, 1: { cellWidth: 18 }, 2: { cellWidth: 35 }, 3: { cellWidth: 'auto' }, 4: { cellWidth: 22 } },
      })
      y = (doc as any).lastAutoTable.finalY + 8
    }

    const specs = ctx.targetingSpecs
    if (specs && typeof specs === 'object') {
      if (y + 30 > pageH() - 20) { doc.addPage(); y = margin }
      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('Targeting Specs', margin, y); y += 5
      for (const [platform, spec] of Object.entries(specs)) {
        if (y + 30 > pageH() - 20) { doc.addPage(); y = margin }
        doc.setFontSize(10); doc.setFont('helvetica', 'bold')
        doc.text(String(platform).toUpperCase(), margin, y); y += 4
        const specRows: string[][] = []
        const s = spec as Record<string, any>
        if (s.demographics) {
          const d = s.demographics
          if (d.age_range) specRows.push(['Age Range', str(d.age_range)])
          if (d.gender) specRows.push(['Gender', str(d.gender)])
        }
        if (s.interests && Array.isArray(s.interests)) specRows.push(['Interests', s.interests.slice(0, 10).join(', ')])
        if (s.behaviors && Array.isArray(s.behaviors)) specRows.push(['Behaviors', s.behaviors.join(', ')])
        if (s.locations && Array.isArray(s.locations)) specRows.push(['Locations', s.locations.join(', ')])
        if (specRows.length) {
          autoTable(doc, {
            startY: y, margin: { left: margin, right: margin },
            head: [['Attribute', 'Value']], body: specRows,
            styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
            columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 'auto' } },
          })
          y = (doc as any).lastAutoTable.finalY + 6
        }
      }
    }

    addPdfFooter({ doc, autoTable })
    triggerDownload(doc.output('blob'), `${safeName(ctx)}-full-funnel.pdf`)
    return
  }

  const { pptx, purple, white, gray, cardBg, addSlide } = await initPPTX()
  const titleSlide = pptx.addSlide()
  titleSlide.background = { fill: '1E1B2E' }
  titleSlide.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: '100%', h: 1.2, fill: { color: purple } })
  titleSlide.addImage({ data: hdmLogoBase64, x: 11.8, y: 0.15, w: 0.9, h: 0.9 })
  titleSlide.addText(ctx.stepName, { x: 0.8, y: 0.25, w: 9, h: 0.6, fontSize: 32, color: white, bold: true })
  titleSlide.addText(ctx.campaignName, { x: 0.8, y: 1.5, w: 9, h: 0.5, fontSize: 20, color: gray })

  const overviewSlide = addSlide('Overview')
  overviewSlide.addTable([
    [
      { text: 'Metric', options: { bold: true, color: white, fill: { color: purple } } },
      { text: 'Value', options: { bold: true, color: white, fill: { color: purple } } },
    ],
    [{ text: 'Total Ads', options: { color: white } }, { text: String(allAds.length), options: { color: '22C55E', bold: true } }],
    [{ text: 'Platforms', options: { color: white } }, { text: (ctx.platforms ?? []).join(', '), options: { color: gray } }],
    [{ text: 'Budget', options: { color: white } }, { text: `${ctx.currency ?? 'USD'} ${(ctx.budget ?? 0).toLocaleString()}`, options: { color: '22C55E' } }],
    [{ text: 'Duration', options: { color: white } }, { text: `${ctx.duration ?? 0} days`, options: { color: gray } }],
  ], { x: 0.8, y: 1.1, w: 11.5, fontSize: 10, rowH: 0.4, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [3.5, 8] })

  for (const [stage, ads] of Object.entries(adsByStage)) {
    if (!ads.length) continue
    const slide = addSlide(`${stageLabels[stage] ?? stage} Ads`)
    slide.addTable([
      [
        { text: '#', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Platform', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Headline', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Body', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'CTA', options: { bold: true, color: white, fill: { color: purple } } },
      ],
      ...ads.map((ad, i) => [
        { text: String(i + 1), options: { color: gray } },
        { text: str(ad.platform), options: { color: white, bold: true } },
        { text: ad.headline ?? '', options: { color: gray, fontSize: 9 } },
        { text: (ad.body_text ?? ad.body ?? '').slice(0, 120), options: { color: gray, fontSize: 8 } },
        { text: ad.cta_button ?? ad.cta_text ?? '', options: { color: 'F472B6' } },
      ]),
    ], { x: 0.8, y: 1.1, w: 11.5, fontSize: 10, rowH: 0.5, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [0.5, 1.5, 3, 5, 2], autoPage: true })
  }

  const specs = ctx.targetingSpecs
  if (specs && typeof specs === 'object') {
    const slide = addSlide('Targeting Specs')
    const specRows: any[][] = [[
      { text: 'Platform', options: { bold: true, color: white, fill: { color: purple } } },
      { text: 'Demographics', options: { bold: true, color: white, fill: { color: purple } } },
      { text: 'Interests', options: { bold: true, color: white, fill: { color: purple } } },
    ]]
    for (const [platform, spec] of Object.entries(specs)) {
      const s = spec as Record<string, any>
      const demo = s.demographics ? `${str(s.demographics.age_range)} · ${str(s.demographics.gender)}` : '-'
      const interests = Array.isArray(s.interests) ? s.interests.slice(0, 6).join(', ') : '-'
      specRows.push([
        { text: String(platform).toUpperCase(), options: { color: white, bold: true } },
        { text: demo, options: { color: gray, fontSize: 9 } },
        { text: interests, options: { color: '22C55E', fontSize: 8 } },
      ])
    }
    slide.addTable(specRows, { x: 0.8, y: 1.1, w: 11.5, fontSize: 10, rowH: 0.5, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [2, 3.5, 6] })
  }

  triggerDownload(await pptx.write({ outputType: 'blob' }) as Blob, `${safeName(ctx)}-full-funnel.pptx`)
}
