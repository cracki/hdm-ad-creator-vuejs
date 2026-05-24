import { triggerDownload } from './download'
import { initPDF, initPPTX, addPdfFooter, addPdfCoverTitle } from './exportCampaign'
import type { FunnelStrategies, VisualConcept, PlatformTargeting, PublishingScheduleItem } from '@/features/fullFunnel/types'

type AdsByStage = Record<string, any[]>

function esc(v: unknown): string {
  return String(v ?? '').replace(/"/g, '""')
}

function csvRow(...cols: string[]): string {
  return cols.map((c) => `"${c}"`).join(',')
}

// ── CSV ────────────────────────────────────────────────────

export function exportFullFunnelCSV(
  _data: Record<string, any>,
  adsByStage: AdsByStage,
  strategies: FunnelStrategies | null,
  visuals: VisualConcept[],
  targeting: Record<string, PlatformTargeting>,
  schedule: PublishingScheduleItem[],
): void {
  const rows: string[] = []

  // Ads section
  rows.push('=== AD COPIES ===')
  rows.push(csvRow('Funnel Stage', 'Platform', 'Headline', 'Body Copy', 'CTA', 'Hook'))
  Object.entries(adsByStage).forEach(([, ads]) => {
    ads.forEach((ad) => {
      rows.push(csvRow(
        esc(ad.funnel_stage),
        esc(ad.platform),
        esc(ad.headline),
        esc(ad.body_text ?? ad.body),
        esc(ad.cta_button ?? ad.cta_text),
        esc(ad.hook),
      ))
    })
  })

  // Strategies section
  if (strategies) {
    rows.push('')
    rows.push('=== FUNNEL STRATEGIES ===')
    rows.push(csvRow('Stage', 'Objective', 'Psychology', 'Message Angle', 'Budget %', 'Key Messages', 'Emotional Hooks', 'Recommended Formats', 'Success Metrics'))
    for (const stageId of ['tofu', 'mofu', 'bofu']) {
      const s = (strategies as any)[stageId]
      if (!s) continue
      rows.push(csvRow(
        esc(s.stage),
        esc(s.objective),
        esc(s.psychology),
        esc(s.message_angle),
        esc(s.budget_allocation_percent),
        esc((s.key_messages ?? []).join('; ')),
        esc((s.emotional_hooks ?? []).join('; ')),
        esc((s.recommended_formats ?? []).join('; ')),
        esc((s.success_metrics ?? []).join('; ')),
      ))
    }

    if (strategies.core_strategy) {
      rows.push('')
      rows.push('=== CORE STRATEGY ===')
      rows.push(csvRow('Value Proposition', 'Brand Promise', 'Emotional Narrative', 'Content Pillars'))
      rows.push(csvRow(
        esc(strategies.core_strategy.value_proposition),
        esc(strategies.core_strategy.brand_promise),
        esc(strategies.core_strategy.emotional_narrative),
        esc((strategies.core_strategy.content_pillars ?? []).join('; ')),
      ))
    }
  }

  // Visual concepts section
  if (visuals.length) {
    rows.push('')
    rows.push('=== VISUAL CONCEPTS ===')
    rows.push(csvRow('Platform', 'Stage', 'Style', 'Mood', 'Format', 'Dimensions', 'Color Palette', 'Image Prompt', 'Video Script', 'Visual Psychology'))
    visuals.forEach((vc) => {
      rows.push(csvRow(
        esc(vc.platform),
        esc(vc.funnel_stage),
        esc(vc.style),
        esc(vc.mood),
        esc(vc.format),
        vc.dimensions ? esc(`${vc.dimensions.width}x${vc.dimensions.height} (${vc.dimensions.aspect_ratio})`) : '',
        esc((vc.color_palette ?? []).join(', ')),
        esc(vc.image_prompt),
        esc(vc.video_script),
        esc(vc.visual_psychology),
      ))
    })
  }

  // Targeting section
  if (Object.keys(targeting).length) {
    rows.push('')
    rows.push('=== TARGETING SPECS ===')
    rows.push(csvRow('Platform', 'Stage', 'Strategy', 'Estimated Reach', 'Exclusions'))
    Object.entries(targeting).forEach(([platform, spec]) => {
      for (const stageId of ['tofu', 'mofu', 'bofu']) {
        const s = (spec as any)[stageId]
        if (!s) continue
        rows.push(csvRow(
          esc(platform),
          esc(stageId),
          esc(s.strategy),
          esc(s.estimated_reach),
          esc((s.exclude ?? []).join('; ')),
        ))
      }
    })
  }

  // Schedule section
  if (schedule.length) {
    rows.push('')
    rows.push('=== PUBLISHING SCHEDULE ===')
    rows.push(csvRow('Date', 'Time', 'Day', 'Platform', 'Stage', 'Ad Format', 'Headline Preview', 'Notes'))
    schedule.forEach((item) => {
      rows.push(csvRow(
        esc(item.date),
        esc(item.time),
        esc(item.day_of_week),
        esc(item.platform),
        esc(item.funnel_stage),
        esc(item.ad_format),
        esc(item.headline_preview),
        esc(item.notes),
      ))
    })
  }

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' })
  triggerDownload(blob, `full-funnel-${Date.now()}.csv`)
}

// ── PDF ────────────────────────────────────────────────────

export async function exportFullFunnelPDF(
  data: Record<string, any>,
  adsByStage: AdsByStage,
  strategies: FunnelStrategies | null,
  visuals: VisualConcept[],
  targeting: Record<string, PlatformTargeting>,
  schedule: PublishingScheduleItem[],
  brandName: string,
): Promise<void> {
  const ctx = await initPDF()
  const { doc, autoTable } = ctx
  const margin = 15
  let y = 60

  const campaignName = data.campaign_name ?? brandName ?? 'Full Funnel Campaign'
  addPdfCoverTitle(ctx, campaignName, `Full Funnel Campaign — ${brandName}`)

  const checkPage = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage()
      y = margin
    }
  }

  // Overview
  checkPage(30)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Campaign Overview', margin, y)
  y += 4

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Property', 'Value']],
    body: [
      ['Brand', brandName],
      ['Budget', `${data.currency ?? 'USD'} ${data.total_budget?.parsedValue ?? data.total_budget ?? '-'}`],
      ['Duration', `${data.duration_days ?? '-'} days`],
      ['Platforms', (data.platforms ?? []).join(', ')],
      ['Total Ads', String(data.total_ads ?? Object.values(adsByStage).flat().length)],
      ['Status', String(data.status ?? 'draft')],
    ],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 'auto' } },
  })
  y = (doc as any).lastAutoTable.finalY + 10

  // Ads
  const allAds = Object.entries(adsByStage)
  if (allAds.length) {
    checkPage(30)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Ad Copies', margin, y)
    y += 4

    const adRows = allAds.flatMap(([, ads]) =>
      ads.map((ad) => [
        String(ad.funnel_stage ?? '').toUpperCase(),
        String(ad.platform ?? ''),
        String(ad.headline ?? ''),
        String(ad.cta_button ?? ad.cta_text ?? ''),
      ]),
    )

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Stage', 'Platform', 'Headline', 'CTA']],
      body: adRows,
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 18 }, 1: { cellWidth: 22 }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 35 } },
    })
    y = (doc as any).lastAutoTable.finalY + 10
  }

  // Strategies
  if (strategies) {
    checkPage(30)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Funnel Strategies', margin, y)
    y += 4

    for (const stageId of ['tofu', 'mofu', 'bofu']) {
      const s = (strategies as any)[stageId]
      if (!s) continue
      checkPage(25)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(`${stageId.toUpperCase()} — ${s.objective ?? ''}`, margin, y)
      y += 4

      const rows: string[][] = [
        ['Budget', `${s.budget_allocation_percent ?? 0}%`],
        ['Psychology', String(s.psychology ?? '')],
        ['Message Angle', String(s.message_angle ?? '')],
        ['Key Messages', (s.key_messages ?? []).join('\n')],
        ['Emotional Hooks', (s.emotional_hooks ?? []).join(', ')],
        ['Formats', (s.recommended_formats ?? []).join(', ')],
        ['Metrics', (s.success_metrics ?? []).join(', ')],
      ]

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Attribute', 'Value']],
        body: rows,
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 'auto' } },
      })
      y = (doc as any).lastAutoTable.finalY + 6
    }

    if (strategies.core_strategy) {
      checkPage(25)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Core Strategy', margin, y)
      y += 4

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Element', 'Details']],
        body: [
          ['Value Proposition', strategies.core_strategy.value_proposition ?? ''],
          ['Brand Promise', strategies.core_strategy.brand_promise ?? ''],
          ['Emotional Narrative', strategies.core_strategy.emotional_narrative ?? ''],
          ['Content Pillars', (strategies.core_strategy.content_pillars ?? []).join('\n')],
        ],
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 'auto' } },
      })
      y = (doc as any).lastAutoTable.finalY + 8
    }
  }

  // Visual Concepts
  if (visuals.length) {
    checkPage(30)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Visual Concepts', margin, y)
    y += 4

    const vcRows = visuals.map((vc) => [
      `${vc.platform ?? ''} / ${(vc.funnel_stage ?? '').toUpperCase()}`,
      String(vc.format ?? ''),
      (vc.color_palette ?? []).join(', '),
      String(vc.mood ?? ''),
    ])

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Platform / Stage', 'Format', 'Colors', 'Mood']],
      body: vcRows,
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 25 }, 2: { cellWidth: 45 }, 3: { cellWidth: 'auto' } },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // Targeting
  if (Object.keys(targeting).length) {
    checkPage(30)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Targeting Specifications', margin, y)
    y += 4

    const tRows: string[][] = []
    Object.entries(targeting).forEach(([platform, spec]) => {
      for (const stageId of ['tofu', 'mofu', 'bofu']) {
        const s = (spec as any)[stageId]
        if (!s) continue
        tRows.push([
          `${platform.toUpperCase()} / ${stageId.toUpperCase()}`,
          String(s.estimated_reach ?? ''),
          String(s.strategy ?? '').substring(0, 120),
          (s.exclude ?? []).join(', '),
        ])
      }
    })

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Platform / Stage', 'Est. Reach', 'Strategy', 'Exclusions']],
      body: tRows,
      styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 25 }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 35 } },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // Schedule
  if (schedule.length) {
    checkPage(30)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Publishing Schedule', margin, y)
    y += 4

    const sRows = schedule.map((item) => [
      item.date,
      item.time,
      item.platform.toUpperCase(),
      item.funnel_stage.toUpperCase(),
      item.ad_format ?? '',
      item.notes ?? '',
    ])

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Date', 'Time', 'Platform', 'Stage', 'Format', 'Notes']],
      body: sRows,
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 18 }, 2: { cellWidth: 22 }, 3: { cellWidth: 18 }, 4: { cellWidth: 25 }, 5: { cellWidth: 'auto' } },
    })
  }

  addPdfFooter(ctx)
  const filename = `${campaignName.replace(/[^a-zA-Z0-9]/g, '_')}-full-funnel.pdf`
  triggerDownload(doc.output('blob'), filename)
}

// ── PPTX ───────────────────────────────────────────────────

export async function exportFullFunnelPPTX(
  data: Record<string, any>,
  adsByStage: AdsByStage,
  strategies: FunnelStrategies | null,
  visuals: VisualConcept[],
  targeting: Record<string, PlatformTargeting>,
  schedule: PublishingScheduleItem[],
  brandName: string,
): Promise<void> {
  const { pptx, purple, white, gray, cardBg, addSlide } = await initPPTX()

  const campaignName = data.campaign_name ?? brandName ?? 'Full Funnel Campaign'

  // Title slide
  const titleSlide = pptx.addSlide()
  titleSlide.background = { fill: '1E1B2E' }
  titleSlide.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: '100%', h: 1.2, fill: { color: purple } })
  titleSlide.addText('Full Funnel Campaign', { x: 0.8, y: 0.25, w: 9, h: 0.6, fontSize: 32, color: white, bold: true })
  titleSlide.addText(campaignName, { x: 0.8, y: 1.5, w: 9, h: 0.5, fontSize: 20, color: gray })
  titleSlide.addText(brandName, { x: 0.8, y: 2.1, w: 9, h: 0.4, fontSize: 14, color: gray })
  titleSlide.addText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), { x: 0.8, y: 2.6, w: 5, h: 0.3, fontSize: 12, color: gray })

  // Overview slide
  const overviewSlide = addSlide('Campaign Overview')
  overviewSlide.addTable([
    [
      { text: 'Property', options: { bold: true, color: white, fill: { color: purple } } },
      { text: 'Value', options: { bold: true, color: white, fill: { color: purple } } },
    ],
    [{ text: 'Brand', options: { color: white } }, { text: brandName, options: { color: gray } }],
    [{ text: 'Budget', options: { color: white } }, { text: `${data.currency ?? 'USD'} ${data.total_budget?.parsedValue ?? data.total_budget ?? '-'}`, options: { color: gray } }],
    [{ text: 'Duration', options: { color: white } }, { text: `${data.duration_days ?? '-'} days`, options: { color: gray } }],
    [{ text: 'Platforms', options: { color: white } }, { text: (data.platforms ?? []).join(', '), options: { color: gray } }],
    [{ text: 'Total Ads', options: { color: white } }, { text: String(data.total_ads ?? Object.values(adsByStage).flat().length), options: { color: '22C55E', bold: true } }],
  ], { x: 0.8, y: 1.1, w: 11.5, fontSize: 10, rowH: 0.4, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [3.5, 8] })

  // Ads slide
  const allAds = Object.entries(adsByStage).flatMap(([, ads]) => ads)
  if (allAds.length) {
    const adsSlide = addSlide('Ad Copies')
    adsSlide.addTable([
      [
        { text: 'Stage', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Platform', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Headline', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'CTA', options: { bold: true, color: white, fill: { color: purple } } },
      ],
      ...allAds.map((ad) => [
        { text: String(ad.funnel_stage ?? '').toUpperCase(), options: { color: '60A5FA' } },
        { text: String(ad.platform ?? ''), options: { color: gray } },
        { text: String(ad.headline ?? ''), options: { color: white, fontSize: 9 } },
        { text: String(ad.cta_button ?? ad.cta_text ?? ''), options: { color: gray, fontSize: 9 } },
      ]),
    ], { x: 0.8, y: 1.1, w: 11.5, fontSize: 10, rowH: 0.4, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [1.2, 1.5, 6.5, 2.3], autoPage: true })
  }

  // Strategies slides
  if (strategies) {
    const stratSlide = addSlide('Funnel Strategies')
    const stratRows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
      [
        { text: 'Stage', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Objective', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Budget', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Key Messages', options: { bold: true, color: white, fill: { color: purple } } },
      ],
    ]
    for (const stageId of ['tofu', 'mofu', 'bofu']) {
      const s = (strategies as any)[stageId]
      if (!s) continue
      stratRows.push([
        { text: stageId.toUpperCase(), options: { color: '60A5FA', bold: true } },
        { text: String(s.objective ?? ''), options: { color: gray } },
        { text: `${s.budget_allocation_percent ?? 0}%`, options: { color: '22C55E' } },
        { text: (s.key_messages ?? []).join('\n'), options: { color: gray, fontSize: 8 } },
      ])
    }
    stratSlide.addTable(stratRows, { x: 0.8, y: 1.1, w: 11.5, fontSize: 10, rowH: 0.5, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [1.2, 2, 1, 7.3], autoPage: false })

    if (strategies.core_strategy) {
      const coreSlide = addSlide('Core Strategy')
      coreSlide.addTable([
        [
          { text: 'Element', options: { bold: true, color: white, fill: { color: purple } } },
          { text: 'Details', options: { bold: true, color: white, fill: { color: purple } } },
        ],
        [{ text: 'Value Proposition', options: { color: white } }, { text: strategies.core_strategy.value_proposition ?? '', options: { color: gray, fontSize: 9 } }],
        [{ text: 'Brand Promise', options: { color: white } }, { text: strategies.core_strategy.brand_promise ?? '', options: { color: gray, fontSize: 9 } }],
        [{ text: 'Emotional Narrative', options: { color: white } }, { text: strategies.core_strategy.emotional_narrative ?? '', options: { color: gray, fontSize: 9 } }],
        [{ text: 'Content Pillars', options: { color: white } }, { text: (strategies.core_strategy.content_pillars ?? []).join('\n'), options: { color: gray, fontSize: 9 } }],
      ], { x: 0.8, y: 1.1, w: 11.5, fontSize: 10, rowH: 0.5, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [3, 8.5] })
    }
  }

  // Visuals slide
  if (visuals.length) {
    const visSlide = addSlide('Visual Concepts')
    visSlide.addTable([
      [
        { text: 'Platform', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Stage', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Format', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Mood', options: { bold: true, color: white, fill: { color: purple } } },
      ],
      ...visuals.map((vc) => [
        { text: String(vc.platform ?? ''), options: { color: white } },
        { text: String(vc.funnel_stage ?? '').toUpperCase(), options: { color: '60A5FA' } },
        { text: String(vc.format ?? ''), options: { color: gray } },
        { text: String(vc.mood ?? ''), options: { color: gray, fontSize: 8 } },
      ]),
    ], { x: 0.8, y: 1.1, w: 11.5, fontSize: 10, rowH: 0.4, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [2, 1.5, 2.5, 5.5], autoPage: true })
  }

  // Targeting slide
  if (Object.keys(targeting).length) {
    const targSlide = addSlide('Targeting Specs')
    const tRows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
      [
        { text: 'Platform', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Stage', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Reach', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Strategy', options: { bold: true, color: white, fill: { color: purple } } },
      ],
    ]
    Object.entries(targeting).forEach(([platform, spec]) => {
      for (const stageId of ['tofu', 'mofu', 'bofu']) {
        const s = (spec as any)[stageId]
        if (!s) continue
        tRows.push([
          { text: platform.toUpperCase(), options: { color: white, bold: true } },
          { text: stageId.toUpperCase(), options: { color: '60A5FA' } },
          { text: String(s.estimated_reach ?? ''), options: { color: '22C55E' } },
          { text: String(s.strategy ?? '').substring(0, 150), options: { color: gray, fontSize: 8 } },
        ])
      }
    })
    targSlide.addTable(tRows, { x: 0.8, y: 1.1, w: 11.5, fontSize: 10, rowH: 0.4, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [1.8, 1.2, 1.8, 6.7], autoPage: true })
  }

  // Schedule slide
  if (schedule.length) {
    const schSlide = addSlide('Publishing Schedule')
    schSlide.addTable([
      [
        { text: 'Date', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Time', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Platform', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Stage', options: { bold: true, color: white, fill: { color: purple } } },
        { text: 'Notes', options: { bold: true, color: white, fill: { color: purple } } },
      ],
      ...schedule.map((item) => [
        { text: item.date, options: { color: gray } },
        { text: item.time, options: { color: white, bold: true } },
        { text: item.platform.toUpperCase(), options: { color: gray } },
        { text: item.funnel_stage.toUpperCase(), options: { color: '60A5FA' } },
        { text: item.notes ?? '', options: { color: gray, fontSize: 8 } },
      ]),
    ], { x: 0.8, y: 1.1, w: 11.5, fontSize: 10, rowH: 0.4, border: { pt: 0.5, color: '3F3A5C' }, fill: { color: cardBg }, colW: [2, 1.2, 1.8, 1.2, 5.3], autoPage: true })
  }

  const filename = `${campaignName.replace(/[^a-zA-Z0-9]/g, '_')}-full-funnel.pptx`
  triggerDownload(await pptx.write({ outputType: 'blob' }) as Blob, filename)
}
