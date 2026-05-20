import { triggerDownload } from './download'
import { hdmLogoBase64 } from '@/shared/assets/hdm-logo-base64'
import type { AnalysisRun } from '@/features/brands/types'

type PdfCtx = { doc: any; autoTable: any; y: number }

// ── Helpers ────────────────────────────────────────────────

function obj(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : null
}

function parse<T>(raw: unknown): T[] {
  return Array.isArray(raw) ? raw as T[] : []
}

function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\w/, c => c.toUpperCase())
}

/** Recursively convert any value to a readable string, avoiding [object Object]. */
function toStr(val: unknown): string {
  if (val == null) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'number' || typeof val === 'boolean') return String(val)
  if (Array.isArray(val)) return val.map(toStr).join(', ')
  if (typeof val === 'object') {
    const o = val as Record<string, unknown>
    // Try common text-like fields first
    for (const k of ['text', 'name', 'title', 'label', 'description', 'value', 'summary', 'content', 'message', 'opportunity', 'action', 'recommendation', 'rationale', 'strategy']) {
      if (typeof o[k] === 'string' && o[k]) return o[k]
    }
    // Fallback: flatten to "Key: Value" pairs for leaf values, skip nested objects
    const parts: string[] = []
    for (const [k, v] of Object.entries(o)) {
      if (v == null || typeof v === 'object') continue
      parts.push(`${formatLabel(k)}: ${toStr(v)}`)
    }
    return parts.length ? parts.join('\n') : ''
  }
  return ''
}

// Map of known Unicode chars to ASCII replacements
const CHAR_MAP: Record<string, string> = {
  '‘': "'", '’': "'", // smart single quotes
  '“': '"', '”': '"', // smart double quotes
  '—': '--',               // em-dash
  '–': '-',                // en-dash
  '•': '*',                // bullet
  '…': '...',              // ellipsis
  ' ': ' ',                // non-breaking space
  '→': '->',               // right arrow
  '←': '<-',               // left arrow
  '✓': 'v',                // checkmark
  '✗': 'x',                // cross
  '·': '-',                // middle dot
  '●': '*',                // black circle
  '○': 'o',                // white circle
}

/** Sanitize text for jsPDF (Helvetica only supports Win-1252). */
function sanitize(text: string): string {
  let out = ''
  for (const ch of text) {
    if (CHAR_MAP[ch]) {
      out += CHAR_MAP[ch]
    } else {
      const code = ch.codePointAt(0)!
      // Keep ASCII + common Western European chars (Win-1252 range)
      if (code <= 0xFF) {
        out += ch
      }
      // Skip everything else (Arabic, Farsi, CJK, etc.)
    }
  }
  return out
}

/** Combined: convert to string + sanitize for PDF. */
function str(raw: unknown): string {
  return sanitize(toStr(raw))
}

// ── PDF Setup ──────────────────────────────────────────────

async function initPDF() {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  return { doc, autoTable }
}

const MARGIN = 15
const PAGE_WIDTH = 210
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

function ensureSpace(ctx: PdfCtx, needed: number) {
  const doc = ctx.doc
  if (ctx.y + needed > doc.internal.pageSize.getHeight() - MARGIN - 8) {
    doc.addPage()
    ctx.y = MARGIN
  }
}

function addCoverPage(ctx: PdfCtx, title: string, subtitle: string) {
  const doc = ctx.doc
  doc.setFillColor(88, 28, 135)
  doc.rect(0, 0, PAGE_WIDTH, 55, 'F')
  doc.addImage(hdmLogoBase64, 'JPEG', PAGE_WIDTH - MARGIN - 20, 12, 16, 16)
  doc.setTextColor(200, 180, 220)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('HDM Ad Creator', PAGE_WIDTH - MARGIN - 12, 32, { align: 'center' })
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text(title, MARGIN, 28)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'normal')
  doc.text(subtitle, MARGIN, 38)
  doc.setFontSize(9)
  doc.text(
    new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    MARGIN,
    48,
  )
  doc.setTextColor(0, 0, 0)
  ctx.y = 65
}

function addFooter(ctx: PdfCtx) {
  const doc = ctx.doc
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const ph = doc.internal.pageSize.getHeight()
    const footerY = ph - 10
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, ph - 14, PAGE_WIDTH - MARGIN, ph - 14)
    const txt = `HDM Ad Creator  •  Page ${i} of ${totalPages}`
    doc.setFontSize(7.5)
    doc.setTextColor(130, 130, 130)
    const tw = doc.getTextWidth(txt)
    const logoSize = 5
    const cx = PAGE_WIDTH / 2
    const totalW = logoSize + 2 + tw
    const sx = cx - totalW / 2
    doc.addImage(hdmLogoBase64, 'JPEG', sx, footerY - 3.5, logoSize, logoSize)
    doc.text(txt, sx + logoSize + 2, footerY)
  }
}

// ── Visual Helpers ─────────────────────────────────────────

function addSectionHeader(ctx: PdfCtx, title: string) {
  const doc = ctx.doc
  ensureSpace(ctx, 20)
  doc.setFillColor(88, 28, 135)
  doc.roundedRect(MARGIN, ctx.y, CONTENT_WIDTH, 10, 1.5, 1.5, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(title, MARGIN + 5, ctx.y + 6.5)
  doc.setTextColor(0, 0, 0)
  ctx.y += 16
}

function addSubHeader(ctx: PdfCtx, title: string) {
  const doc = ctx.doc
  ensureSpace(ctx, 14)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(88, 28, 135)
  doc.text(title, MARGIN, ctx.y)
  const tw = doc.getTextWidth(title)
  doc.setDrawColor(88, 28, 135)
  doc.setLineWidth(0.5)
  doc.line(MARGIN, ctx.y + 1, MARGIN + tw, ctx.y + 1)
  doc.setTextColor(0, 0, 0)
  ctx.y += 7
}

function addKeyValueTable(
  ctx: PdfCtx,
  rows: string[][],
  colWidths: number[] = [50, CONTENT_WIDTH - 50],
) {
  const { doc, autoTable } = ctx
  ensureSpace(ctx, 10 + rows.length * 6)
  autoTable(doc, {
    startY: ctx.y,
    margin: { left: MARGIN, right: MARGIN },
    head: [],
    body: rows,
    styles: { fontSize: 8.5, cellPadding: 2.5, overflow: 'linebreak' },
    columnStyles: colWidths.map((w, i) => ({
      cellWidth: w,
      fontStyle: i === 0 ? 'bold' : 'normal',
      textColor: i === 0 ? [50, 50, 50] : [80, 80, 80],
    })),
    theme: 'plain',
    alternateRowStyles: { fillColor: [248, 245, 255] },
  })
  ctx.y = (doc as any).lastAutoTable.finalY + 4
}

function addBulletList(
  ctx: PdfCtx,
  items: string[],
  color: [number, number, number] = [88, 28, 135],
  indent = 0,
) {
  const doc = ctx.doc
  const startX = MARGIN + 4 + indent
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  for (const item of items) {
    ensureSpace(ctx, 6)
    doc.setFillColor(color[0], color[1], color[2])
    doc.circle(startX, ctx.y - 1.2, 1, 'F')
    const lines = doc.splitTextToSize(item, CONTENT_WIDTH - 10 - indent)
    doc.setTextColor(60, 60, 60)
    for (const line of lines) {
      ensureSpace(ctx, 5)
      doc.text(line, startX + 4, ctx.y)
      ctx.y += 4.2
    }
  }
  doc.setTextColor(0, 0, 0)
  ctx.y += 2
}

function addScoreBar(ctx: PdfCtx, label: string, score: number, max: number, grade?: string) {
  const doc = ctx.doc
  ensureSpace(ctx, 12)
  const barX = MARGIN
  const barWidth = CONTENT_WIDTH
  const barHeight = 3
  const filledWidth = Math.max(0, Math.min(score / max, 1)) * barWidth

  let color: [number, number, number]
  if (grade) {
    const g = grade.toUpperCase()
    if (g.startsWith('A')) color = [34, 197, 94]
    else if (g.startsWith('B')) color = [59, 130, 246]
    else if (g.startsWith('C')) color = [245, 158, 11]
    else if (g.startsWith('D')) color = [249, 115, 22]
    else color = [239, 68, 68]
  } else {
    const pct = score / max
    if (pct >= 0.8) color = [34, 197, 94]
    else if (pct >= 0.6) color = [59, 130, 246]
    else if (pct >= 0.4) color = [245, 158, 11]
    else if (pct >= 0.2) color = [249, 115, 22]
    else color = [239, 68, 68]
  }

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(50, 50, 50)
  doc.text(label, barX, ctx.y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  const scoreText = grade ? `${grade} (${score}/${max})` : `${score}/${max}`
  doc.text(scoreText, barX + barWidth, ctx.y, { align: 'right' })
  ctx.y += 2
  doc.setFillColor(230, 230, 230)
  doc.roundedRect(barX, ctx.y, barWidth, barHeight, 1, 1, 'F')
  if (filledWidth > 0) {
    doc.setFillColor(color[0], color[1], color[2])
    doc.roundedRect(barX, ctx.y, filledWidth, barHeight, 1, 1, 'F')
  }
  ctx.y += barHeight + 4
}

// ── Section Renderers ──────────────────────────────────────

function renderOverviewSection(ctx: PdfCtx, data: AnalysisRun) {
  const brandProfile = obj(data.brand_profile)
  if (brandProfile) {
    addSubHeader(ctx, 'Brand Profile')
    const rows: string[][] = []
    if (brandProfile.company_name) rows.push(['Company', str(brandProfile.company_name)])
    if (brandProfile.industry) rows.push(['Industry', str(brandProfile.industry)])
    const uspList = parse<string>(brandProfile.usp_list)
    if (uspList.length) rows.push(['Unique Selling Points', uspList.map(str).join('\n')])
    const competitiveAdv = parse(brandProfile.competitive_advantages)
    if (competitiveAdv.length) rows.push(['Competitive Advantages', competitiveAdv.map(v => str(v)).join('\n')])
    const brandVoice = obj(brandProfile.brand_voice)
    if (brandVoice) {
      if (brandVoice.tone) rows.push(['Voice Tone', str(brandVoice.tone)])
      if (brandVoice.style) rows.push(['Voice Style', str(brandVoice.style)])
      if (brandVoice.persona) rows.push(['Persona', str(brandVoice.persona)])
      const kw = parse<string>(brandVoice.keywords)
      if (kw.length) rows.push(['Keywords', kw.join(', ')])
    }
    const personality = obj(brandProfile.brand_personality)
    if (personality) {
      if (personality.archetype) rows.push(['Archetype', str(personality.archetype)])
      if (personality.tone) rows.push(['Personality Tone', str(personality.tone)])
    }
    const keyMessages = parse<string>(brandProfile.key_messages)
    if (keyMessages.length) rows.push(['Key Messages', keyMessages.map(str).join('\n')])
    if (rows.length) addKeyValueTable(ctx, rows)
  }

  const socialPresence = obj(data.social_presence)
  if (socialPresence) {
    ensureSpace(ctx, 16)
    addSubHeader(ctx, 'Social Presence')
    const platformsActive = parse<string>(socialPresence.platforms_active)
    const platformsMissing = parse<string>(socialPresence.platforms_missing)
    if (platformsActive.length || platformsMissing.length) {
      const doc = ctx.doc
      ensureSpace(ctx, 10)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(50, 50, 50)
      doc.text('Platforms:', MARGIN, ctx.y)
      ctx.y += 5
      let badgeX = MARGIN
      for (const p of platformsActive) {
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'bold')
        const label = p.charAt(0).toUpperCase() + p.slice(1)
        const tw = doc.getTextWidth(label) + 6
        if (badgeX + tw > PAGE_WIDTH - MARGIN) { badgeX = MARGIN; ctx.y += 7; ensureSpace(ctx, 7) }
        doc.setFillColor(34, 197, 94)
        doc.roundedRect(badgeX, ctx.y - 3.5, tw, 5, 1, 1, 'F')
        doc.setTextColor(255, 255, 255)
        doc.text(label, badgeX + 3, ctx.y - 0.3)
        badgeX += tw + 3
      }
      for (const p of platformsMissing) {
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        const label = p.charAt(0).toUpperCase() + p.slice(1) + ' (missing)'
        const tw = doc.getTextWidth(label) + 6
        if (badgeX + tw > PAGE_WIDTH - MARGIN) { badgeX = MARGIN; ctx.y += 7; ensureSpace(ctx, 7) }
        doc.setFillColor(220, 220, 220)
        doc.roundedRect(badgeX, ctx.y - 3.5, tw, 5, 1, 1, 'F')
        doc.setTextColor(140, 140, 140)
        doc.text(label, badgeX + 3, ctx.y - 0.3)
        badgeX += tw + 3
      }
      ctx.y += 7
      doc.setTextColor(0, 0, 0)
    }
    const recs = parse<string>(socialPresence.recommendations)
    if (recs.length) {
      ensureSpace(ctx, 10)
      ctx.doc.setFontSize(8.5)
      ctx.doc.setFont('helvetica', 'bold')
      ctx.doc.setTextColor(50, 50, 50)
      ctx.doc.text('Recommendations:', MARGIN, ctx.y)
      ctx.y += 5
      addBulletList(ctx, recs.map(str), [245, 158, 11])
    }
    const contentAnalysis = obj(socialPresence.content_analysis)
    if (contentAnalysis) {
      const platRows: string[][] = []
      for (const [key, val] of Object.entries(contentAnalysis)) {
        const pData = obj(val)
        if (!pData) continue
        const rawThemes = parse(pData.content_themes)
        const themeLabels = rawThemes.map(v => str(v)).filter(Boolean)
        platRows.push([
          key.charAt(0).toUpperCase() + key.slice(1),
          str(pData.status),
          String(themeLabels.length),
          themeLabels.slice(0, 3).join(', '),
        ])
      }
      if (platRows.length) {
        ensureSpace(ctx, 15)
        const { doc, autoTable } = ctx
        autoTable(doc, {
          startY: ctx.y,
          margin: { left: MARGIN, right: MARGIN },
          head: [['Platform', 'Status', 'Themes', 'Sample Themes']],
          body: platRows,
          styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
          headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
          columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 20 }, 2: { cellWidth: 15 }, 3: { cellWidth: 'auto' } },
        })
        ctx.y = (doc as any).lastAutoTable.finalY + 6
      }
    }
  }

  const emotionProfile = obj(data.emotion_profile)
  if (emotionProfile) {
    ensureSpace(ctx, 16)
    addSubHeader(ctx, 'Emotion Profile')
    const painEmotions = parse<string>(emotionProfile.pain_emotions)
    if (painEmotions.length) {
      ctx.doc.setFontSize(8.5)
      ctx.doc.setFont('helvetica', 'bold')
      ctx.doc.text('Pain Emotions:', MARGIN, ctx.y)
      ctx.y += 5
      addBulletList(ctx, painEmotions.map(str), [239, 68, 68])
    }
    const desiredEmotions = parse<string>(emotionProfile.desired_emotions)
    if (desiredEmotions.length) {
      ensureSpace(ctx, 10)
      ctx.doc.setFontSize(8.5)
      ctx.doc.setFont('helvetica', 'bold')
      ctx.doc.text('Desired Emotions:', MARGIN, ctx.y)
      ctx.y += 5
      addBulletList(ctx, desiredEmotions.map(str), [34, 197, 94])
    }
    const industryEmotions = obj(emotionProfile.industry_emotions)
    if (industryEmotions) {
      const primary = parse<string>(industryEmotions.primary_emotions)
      if (primary.length) {
        ensureSpace(ctx, 10)
        ctx.doc.setFontSize(8.5)
        ctx.doc.setFont('helvetica', 'bold')
        ctx.doc.text('Industry Primary Emotions:', MARGIN, ctx.y)
        ctx.y += 5
        addBulletList(ctx, primary.map(str), [59, 130, 246])
      }
    }
    if (emotionProfile.messaging_strategy) {
      ensureSpace(ctx, 10)
      addKeyValueTable(ctx, [['Messaging Strategy', str(emotionProfile.messaging_strategy)]])
    }
  }

  const qualityReport = obj(data.quality_report)
  if (qualityReport) {
    ensureSpace(ctx, 16)
    addSubHeader(ctx, 'Quality Report')
    const overallScore = typeof qualityReport.overall_score === 'number' ? qualityReport.overall_score : null
    const qualityTier = str(qualityReport.quality_tier)
    if (overallScore !== null) {
      addScoreBar(ctx, 'Overall Score', overallScore, 100, qualityTier || undefined)
    }
    if (qualityTier) {
      ctx.doc.setFontSize(8.5)
      ctx.doc.setFont('helvetica', 'normal')
      ctx.doc.setTextColor(100, 100, 100)
      ctx.doc.text('Quality Tier: ' + qualityTier, MARGIN, ctx.y)
      ctx.y += 6
    }
    const componentScores = obj(qualityReport.component_scores)
    if (componentScores) {
      const compRows: string[][] = []
      for (const [key, val] of Object.entries(componentScores)) {
        if (typeof val === 'number') compRows.push([formatLabel(key), String(val)])
      }
      if (compRows.length) {
        const { doc, autoTable } = ctx
        ensureSpace(ctx, 10 + compRows.length * 6)
        autoTable(doc, {
          startY: ctx.y,
          margin: { left: MARGIN, right: MARGIN },
          head: [['Component', 'Score']],
          body: compRows,
          styles: { fontSize: 8.5, cellPadding: 2 },
          headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
          columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 30 } },
        })
        ctx.y = (doc as any).lastAutoTable.finalY + 6
      }
    }
    const qRecs = parse<string>(qualityReport.recommendations)
    if (qRecs.length) {
      ensureSpace(ctx, 10)
      ctx.doc.setFontSize(8.5)
      ctx.doc.setFont('helvetica', 'bold')
      ctx.doc.text('Quality Recommendations:', MARGIN, ctx.y)
      ctx.y += 5
      addBulletList(ctx, qRecs.map(str), [245, 158, 11])
    }
  }
}

function renderAudienceSection(ctx: PdfCtx, data: AnalysisRun) {
  const audienceInsights = obj(data.audience_insights)
  if (!audienceInsights) return
  addSectionHeader(ctx, 'Audience')
  const primary = obj(audienceInsights.primary)
  if (primary) {
    addSubHeader(ctx, 'Primary Audience')
    const demographics = obj(primary.demographics)
    if (demographics) {
      const demoRows: string[][] = []
      for (const [key, val] of Object.entries(demographics)) {
        if (val != null && val !== '') demoRows.push([formatLabel(key), str(val)])
      }
      if (demoRows.length) {
        ensureSpace(ctx, 10)
        ctx.doc.setFontSize(8)
        ctx.doc.setFont('helvetica', 'bold')
        ctx.doc.text('Demographics', MARGIN, ctx.y)
        ctx.y += 4
        addKeyValueTable(ctx, demoRows)
      }
    }
    const psychographics = obj(primary.psychographics)
    if (psychographics) {
      ensureSpace(ctx, 10)
      ctx.doc.setFontSize(8)
      ctx.doc.setFont('helvetica', 'bold')
      ctx.doc.text('Psychographics', MARGIN, ctx.y)
      ctx.y += 5
      const psychoRows: string[][] = []
      for (const [key, val] of Object.entries(psychographics)) {
        if (typeof val === 'string' && val) psychoRows.push([formatLabel(key), val])
        else if (Array.isArray(val)) psychoRows.push([formatLabel(key), val.map(v => str(v)).join(', ')])
      }
      if (psychoRows.length) addKeyValueTable(ctx, psychoRows)
    }
    const motivations = parse(primary.motivations)
    if (motivations.length) {
      ensureSpace(ctx, 10)
      ctx.doc.setFontSize(8)
      ctx.doc.setFont('helvetica', 'bold')
      ctx.doc.text('Motivations', MARGIN, ctx.y)
      ctx.y += 5
      addBulletList(ctx, motivations.map(v => str(v)), [34, 197, 94])
    }
    const painPoints = parse(primary.pain_points)
    if (painPoints.length) {
      ensureSpace(ctx, 10)
      ctx.doc.setFontSize(8)
      ctx.doc.setFont('helvetica', 'bold')
      ctx.doc.text('Pain Points', MARGIN, ctx.y)
      ctx.y += 5
      addBulletList(ctx, painPoints.map(v => str(v)), [239, 68, 68])
    }
  }
  const secondary = obj(audienceInsights.secondary)
  if (secondary) {
    ensureSpace(ctx, 16)
    addSubHeader(ctx, 'Secondary Audience')
    if (secondary.description) addKeyValueTable(ctx, [['Description', str(secondary.description)]])
    const secDemo = obj(secondary.demographics)
    if (secDemo) {
      const demoRows: string[][] = []
      for (const [key, val] of Object.entries(secDemo)) {
        if (val != null && val !== '') demoRows.push([formatLabel(key), str(val)])
      }
      if (demoRows.length) addKeyValueTable(ctx, demoRows)
    }
    const secPsycho = obj(secondary.psychographics)
    if (secPsycho) {
      const psychoRows: string[][] = []
      for (const [key, val] of Object.entries(secPsycho)) {
        if (typeof val === 'string' && val) psychoRows.push([formatLabel(key), val])
        else if (Array.isArray(val)) psychoRows.push([formatLabel(key), val.map(v => str(v)).join(', ')])
      }
      if (psychoRows.length) addKeyValueTable(ctx, psychoRows)
    }
    const secMotivations = parse(secondary.motivations)
    if (secMotivations.length) { ensureSpace(ctx, 10); addBulletList(ctx, secMotivations.map(v => str(v)), [59, 130, 246]) }
    const secPainPoints = parse(secondary.pain_points)
    if (secPainPoints.length) { ensureSpace(ctx, 10); addBulletList(ctx, secPainPoints.map(v => str(v)), [239, 68, 68]) }
  }
}

function renderCompetitorsSection(ctx: PdfCtx, data: AnalysisRun) {
  const compAnalysis = obj(data.competitive_analysis)
  if (!compAnalysis) return
  addSectionHeader(ctx, 'Competitors')

  const identified = obj(compAnalysis.identified_competitors)
  if (identified) {
    const allComps: string[][] = []
    for (const c of parse<Record<string, unknown>>(identified.direct_competitors))
      allComps.push(['Direct', str(c.name), str(c.website)])
    for (const c of parse<Record<string, unknown>>(identified.indirect_competitors))
      allComps.push(['Indirect', str(c.name), str(c.website)])
    if (allComps.length) {
      addSubHeader(ctx, 'Identified Competitors')
      const { doc, autoTable } = ctx
      ensureSpace(ctx, 10 + allComps.length * 6)
      autoTable(doc, {
        startY: ctx.y, margin: { left: MARGIN, right: MARGIN },
        head: [['Type', 'Name', 'Website']], body: allComps,
        styles: { fontSize: 8.5, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 45 }, 2: { cellWidth: 'auto' } },
      })
      ctx.y = (doc as any).lastAutoTable.finalY + 8
    }
  }

  const insights = obj(compAnalysis.competitive_insights)
  if (insights) {
    ensureSpace(ctx, 16)
    addSubHeader(ctx, 'Competitive Insights')

    const quickWins = parse<Record<string, unknown>>(insights.quick_wins)
    if (quickWins.length) {
      ensureSpace(ctx, 12)
      ctx.doc.setFontSize(9); ctx.doc.setFont('helvetica', 'bold'); ctx.doc.setTextColor(50, 50, 50)
      ctx.doc.text('Quick Wins', MARGIN, ctx.y); ctx.y += 4
      const { doc, autoTable } = ctx
      autoTable(doc, {
        startY: ctx.y, margin: { left: MARGIN, right: MARGIN },
        head: [['Action', 'Effort', 'Impact']],
        body: quickWins.map(q => [str(q.action), str(q.effort), str(q.impact)]),
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 25 }, 2: { cellWidth: 25 } },
      })
      ctx.y = (doc as any).lastAutoTable.finalY + 6
    }

    const marketGaps = parse<Record<string, unknown>>(insights.market_gaps)
    if (marketGaps.length) {
      ensureSpace(ctx, 12)
      ctx.doc.setFontSize(9); ctx.doc.setFont('helvetica', 'bold'); ctx.doc.setTextColor(50, 50, 50)
      ctx.doc.text('Market Gaps', MARGIN, ctx.y); ctx.y += 4
      const { doc, autoTable } = ctx
      autoTable(doc, {
        startY: ctx.y, margin: { left: MARGIN, right: MARGIN },
        head: [['Gap', 'Priority', 'Opportunity']],
        body: marketGaps.map(g => [str(g.gap), str(g.priority), str(g.opportunity)]),
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 20 }, 2: { cellWidth: 'auto' } },
      })
      ctx.y = (doc as any).lastAutoTable.finalY + 6
    }

    const improvementAreas = parse<Record<string, unknown>>(insights.improvement_areas)
    if (improvementAreas.length) {
      ensureSpace(ctx, 12)
      ctx.doc.setFontSize(9); ctx.doc.setFont('helvetica', 'bold'); ctx.doc.setTextColor(50, 50, 50)
      ctx.doc.text('Improvement Areas', MARGIN, ctx.y); ctx.y += 4
      const { doc, autoTable } = ctx
      autoTable(doc, {
        startY: ctx.y, margin: { left: MARGIN, right: MARGIN },
        head: [['Area', 'Impact', 'Current State', 'Recommendation']],
        body: improvementAreas.map(a => [str(a.area), str(a.impact), str(a.current_state), str(a.recommended_action)]),
        styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 18 }, 2: { cellWidth: 40 }, 3: { cellWidth: 'auto' } },
      })
      ctx.y = (doc as any).lastAutoTable.finalY + 6
    }

    const contentOpps = parse<Record<string, unknown>>(insights.content_opportunities)
    if (contentOpps.length) {
      ensureSpace(ctx, 12)
      ctx.doc.setFontSize(9); ctx.doc.setFont('helvetica', 'bold'); ctx.doc.setTextColor(50, 50, 50)
      ctx.doc.text('Content Opportunities', MARGIN, ctx.y); ctx.y += 4
      const { doc, autoTable } = ctx
      autoTable(doc, {
        startY: ctx.y, margin: { left: MARGIN, right: MARGIN },
        head: [['Topic', 'Type', 'Why']],
        body: contentOpps.map(c => [str(c.topic), str(c.type), str(c.why)]),
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 25 }, 2: { cellWidth: 'auto' } },
      })
      ctx.y = (doc as any).lastAutoTable.finalY + 6
    }

    const compAdv = parse(insights.competitive_advantages)
    if (compAdv.length) {
      ensureSpace(ctx, 10)
      ctx.doc.setFontSize(9); ctx.doc.setFont('helvetica', 'bold'); ctx.doc.setTextColor(50, 50, 50)
      ctx.doc.text('Competitive Advantages', MARGIN, ctx.y); ctx.y += 5
      addBulletList(ctx, compAdv.map(v => str(v)), [34, 197, 94])
    }

    const msgStrategy = obj(insights.messaging_strategy)
    if (msgStrategy) {
      ensureSpace(ctx, 14)
      ctx.doc.setFontSize(9); ctx.doc.setFont('helvetica', 'bold'); ctx.doc.setTextColor(50, 50, 50)
      ctx.doc.text('Messaging Strategy', MARGIN, ctx.y); ctx.y += 5
      const msgRows: string[][] = []
      if (msgStrategy.tone) msgRows.push(['Tone', str(msgStrategy.tone)])
      if (msgStrategy.primary_message) msgRows.push(['Primary Message', str(msgStrategy.primary_message)])
      const supporting = parse<string>(msgStrategy.supporting_messages)
      if (supporting.length) msgRows.push(['Supporting Messages', supporting.map(str).join('\n')])
      if (msgRows.length) addKeyValueTable(ctx, msgRows)
    }

    const posRecs = obj(insights.positioning_recommendations)
    if (posRecs) {
      ensureSpace(ctx, 14)
      ctx.doc.setFontSize(9); ctx.doc.setFont('helvetica', 'bold'); ctx.doc.setTextColor(50, 50, 50)
      ctx.doc.text('Positioning Recommendations', MARGIN, ctx.y); ctx.y += 5
      if (posRecs.recommended_position) addKeyValueTable(ctx, [['Recommended Position', str(posRecs.recommended_position)]])
      const keyDiffs = parse(posRecs.key_differentiators)
      if (keyDiffs.length) {
        ensureSpace(ctx, 8)
        ctx.doc.setFontSize(8); ctx.doc.setFont('helvetica', 'bold')
        ctx.doc.text('Key Differentiators:', MARGIN, ctx.y); ctx.y += 5
        addBulletList(ctx, keyDiffs.map(v => str(v)), [59, 130, 246])
      }
      const avoid = parse(posRecs.avoid)
      if (avoid.length) {
        ensureSpace(ctx, 8)
        ctx.doc.setFontSize(8); ctx.doc.setFont('helvetica', 'bold')
        ctx.doc.text('Avoid:', MARGIN, ctx.y); ctx.y += 5
        addBulletList(ctx, avoid.map(v => str(v)), [239, 68, 68])
      }
    }

    const pricing = obj(insights.pricing_recommendation)
    if (pricing) {
      ensureSpace(ctx, 10)
      ctx.doc.setFontSize(9); ctx.doc.setFont('helvetica', 'bold'); ctx.doc.setTextColor(50, 50, 50)
      ctx.doc.text('Pricing Recommendation', MARGIN, ctx.y); ctx.y += 5
      const pricingRows: string[][] = []
      if (pricing.strategy) pricingRows.push(['Strategy', str(pricing.strategy)])
      if (pricing.rationale) pricingRows.push(['Rationale', str(pricing.rationale)])
      if (pricingRows.length) addKeyValueTable(ctx, pricingRows)
    }
  }

  if (compAnalysis.positioning_idea) {
    ensureSpace(ctx, 10)
    ctx.doc.setFontSize(9); ctx.doc.setFont('helvetica', 'bold'); ctx.doc.setTextColor(88, 28, 135)
    ctx.doc.text('Positioning Idea', MARGIN, ctx.y); ctx.y += 5
    addKeyValueTable(ctx, [['Idea', str(compAnalysis.positioning_idea)]])
  }

  const competitorAnalyses = parse<Record<string, unknown>>(compAnalysis.competitor_analyses)
  for (const comp of competitorAnalyses) {
    ensureSpace(ctx, 20)
    const doc = ctx.doc
    const name = str(comp.competitor_name ?? 'Unknown Competitor')
    const website = str(comp.website_url ?? '')
    doc.setFillColor(88, 28, 135)
    doc.rect(MARGIN, ctx.y, 3, 8, 'F')
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(40, 40, 40)
    doc.text(name, MARGIN + 6, ctx.y + 5.5)

    // Grade badge — right-aligned like UI
    const hybridScore = obj(comp.hybrid_quality_score)
    const grade = hybridScore?.grade ? str(hybridScore.grade) : ''
    if (grade) {
      const g = grade.toUpperCase()
      const badgeColor = g.startsWith('A') ? [34, 197, 94]
        : g.startsWith('B') ? [59, 130, 246]
        : g.startsWith('C') ? [245, 158, 11]
        : g.startsWith('D') ? [249, 115, 22]
        : [239, 68, 68]
      const badgeText = '  ' + grade + '  '
      doc.setFontSize(8)
      const badgeW = doc.getTextWidth(badgeText) + 4
      const badgeX = PAGE_WIDTH - MARGIN - badgeW
      doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2])
      doc.roundedRect(badgeX, ctx.y + 1, badgeW, 6, 1, 1, 'F')
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold')
      doc.text(badgeText, badgeX + 2, ctx.y + 5)
    }
    ctx.y += 12
    if (website) {
      doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100)
      doc.text(website, MARGIN + 6, ctx.y); ctx.y += 5
    }
    doc.setTextColor(0, 0, 0)

    const basicInfo = obj(comp.basic_info)
    if (basicInfo) {
      const biRows: string[][] = []
      for (const [key, val] of Object.entries(basicInfo)) {
        if (val != null && val !== '' && key !== 'name') biRows.push([formatLabel(key), str(val)])
      }
      if (biRows.length) addKeyValueTable(ctx, biRows)
    }

    const strengths = parse<string>(comp.strengths)
    if (strengths.length) {
      ensureSpace(ctx, 10)
      ctx.doc.setFontSize(8.5); ctx.doc.setFont('helvetica', 'bold'); ctx.doc.setTextColor(34, 197, 94)
      ctx.doc.text('Strengths', MARGIN + 4, ctx.y); ctx.y += 5
      addBulletList(ctx, strengths.map(str), [34, 197, 94], 4)
    }

    const weaknesses = parse<string>(comp.weaknesses)
    if (weaknesses.length) {
      ensureSpace(ctx, 10)
      ctx.doc.setFontSize(8.5); ctx.doc.setFont('helvetica', 'bold'); ctx.doc.setTextColor(239, 68, 68)
      ctx.doc.text('Weaknesses', MARGIN + 4, ctx.y); ctx.y += 5
      addBulletList(ctx, weaknesses.map(str), [239, 68, 68], 4)
    }

    const uspList = parse(comp.usp_list)
    if (uspList.length) {
      ensureSpace(ctx, 10)
      ctx.doc.setFontSize(8.5); ctx.doc.setFont('helvetica', 'bold'); ctx.doc.setTextColor(50, 50, 50)
      ctx.doc.text('Unique Selling Points', MARGIN + 4, ctx.y); ctx.y += 5
      addBulletList(ctx, uspList.map(v => str(v)), [59, 130, 246], 4)
    }

    const messaging = obj(comp.messaging)
    if (messaging) {
      ensureSpace(ctx, 10)
      ctx.doc.setFontSize(8.5); ctx.doc.setFont('helvetica', 'bold'); ctx.doc.setTextColor(50, 50, 50)
      ctx.doc.text('Messaging', MARGIN + 4, ctx.y); ctx.y += 5
      const msgRows: string[][] = []
      if (messaging.tone) msgRows.push(['Tone', str(messaging.tone)])
      if (messaging.primary_message) msgRows.push(['Primary Message', str(messaging.primary_message)])
      if (messaging.consistency_level) msgRows.push(['Consistency', str(messaging.consistency_level)])
      const themes = parse<string>(messaging.key_themes)
      if (themes.length) msgRows.push(['Key Themes', themes.join(', ')])
      if (msgRows.length) addKeyValueTable(ctx, msgRows)
    }

    const positioning = obj(comp.positioning)
    if (positioning) {
      ensureSpace(ctx, 10)
      ctx.doc.setFontSize(8.5); ctx.doc.setFont('helvetica', 'bold'); ctx.doc.setTextColor(50, 50, 50)
      ctx.doc.text('Positioning', MARGIN + 4, ctx.y); ctx.y += 5
      const posRows: string[][] = []
      if (positioning.market_position) posRows.push(['Market Position', str(positioning.market_position)])
      if (positioning.positioning_strategy) posRows.push(['Strategy', str(positioning.positioning_strategy)])
      if (positioning.vs_your_brand) posRows.push(['vs Your Brand', str(positioning.vs_your_brand)])
      if (positioning.primary_value_driver) posRows.push(['Value Driver', str(positioning.primary_value_driver)])
      if (posRows.length) addKeyValueTable(ctx, posRows)
    }

    const hybridQS = obj(comp.hybrid_quality_score)
    if (hybridQS) {
      const totalScore = typeof hybridQS.total_score === 'number' ? hybridQS.total_score : null
      const maxScore = typeof hybridQS.max_score === 'number' ? hybridQS.max_score : 100
      const gradeLabel = str(hybridQS.grade ?? hybridQS.grade_label)
      if (totalScore !== null) {
        ensureSpace(ctx, 12)
        ctx.doc.setFontSize(8.5); ctx.doc.setFont('helvetica', 'bold')
        ctx.doc.text('Hybrid Quality Score', MARGIN + 4, ctx.y); ctx.y += 5
        addScoreBar(ctx, '', totalScore, maxScore, gradeLabel || undefined)
      }
    }

    const websiteQS = obj(comp.website_quality_score)
    if (websiteQS) {
      const overallScore = typeof websiteQS.overall_score === 'number' ? websiteQS.overall_score : null
      const pct = typeof websiteQS.percentage === 'number' ? websiteQS.percentage : null
      const scoreOf = typeof websiteQS.score_out_of === 'number' ? websiteQS.score_out_of : 100
      if (overallScore !== null) {
        ensureSpace(ctx, 12)
        ctx.doc.setFontSize(8.5); ctx.doc.setFont('helvetica', 'bold')
        ctx.doc.text('Website Quality Score', MARGIN + 4, ctx.y); ctx.y += 5
        addScoreBar(ctx, '', pct ?? overallScore, scoreOf)
      }
    }

    const credibility = obj(comp.credibility)
    if (credibility) {
      ensureSpace(ctx, 10)
      const credRows: string[][] = []
      if (credibility.credibility_score != null) credRows.push(['Credibility Score', str(credibility.credibility_score)])
      if (credibility.trust_summary) credRows.push(['Trust Summary', str(credibility.trust_summary)])
      if (credibility.years_in_business) credRows.push(['Years in Business', str(credibility.years_in_business)])
      if (credibility.client_count) credRows.push(['Client Count', str(credibility.client_count)])
      if (credibility.review_rating) credRows.push(['Review Rating', str(credibility.review_rating)])
      if (credRows.length) {
        ctx.doc.setFontSize(8.5); ctx.doc.setFont('helvetica', 'bold'); ctx.doc.setTextColor(50, 50, 50)
        ctx.doc.text('Credibility', MARGIN + 4, ctx.y); ctx.y += 5
        addKeyValueTable(ctx, credRows)
      }
    }

    const impAreas = parse<Record<string, unknown>>(comp.improvement_areas)
    if (impAreas.length) {
      ensureSpace(ctx, 10)
      ctx.doc.setFontSize(8.5); ctx.doc.setFont('helvetica', 'bold'); ctx.doc.setTextColor(245, 158, 11)
      ctx.doc.text('Improvement Areas', MARGIN + 4, ctx.y); ctx.y += 5
      const areaRows = impAreas.map(a => [str(a.area ?? a), str(a.priority ?? '')])
      const { doc: d2, autoTable: at2 } = ctx
      ensureSpace(ctx, 10)
      at2(d2, {
        startY: ctx.y, margin: { left: MARGIN + 4, right: MARGIN },
        head: [['Area', 'Priority']], body: areaRows,
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 25 } },
      })
      ctx.y = (d2 as any).lastAutoTable.finalY + 4
    }

    const growthOpps = parse<Record<string, unknown>>(comp.growth_opportunities)
    if (growthOpps.length) {
      ensureSpace(ctx, 10)
      ctx.doc.setFontSize(8.5); ctx.doc.setFont('helvetica', 'bold'); ctx.doc.setTextColor(34, 197, 94)
      ctx.doc.text('Growth Opportunities', MARGIN + 4, ctx.y); ctx.y += 5
      addBulletList(ctx, growthOpps.map(g => str(g)), [34, 197, 94], 4)
    }

    const diffOpps = parse<Record<string, unknown>>(comp.differentiation_opportunities)
    if (diffOpps.length) {
      ensureSpace(ctx, 10)
      ctx.doc.setFontSize(8.5); ctx.doc.setFont('helvetica', 'bold'); ctx.doc.setTextColor(59, 130, 246)
      ctx.doc.text('Differentiation Opportunities', MARGIN + 4, ctx.y); ctx.y += 5
      addBulletList(ctx, diffOpps.map(d => str(d)), [59, 130, 246], 4)
    }

    ctx.y += 8
  }
}

function renderInsightsSection(ctx: PdfCtx, data: AnalysisRun) {
  const recommendations = obj(data.recommendations)
  if (!recommendations) return
  addSectionHeader(ctx, 'Insights & Recommendations')
  const sections: [string, unknown[], [number, number, number]][] = [
    ['Strategic Focus', parse(recommendations.strategic_focus), [88, 28, 135]],
    ['Content Strategy', parse(recommendations.content_strategy), [34, 197, 94]],
    ['Messaging Priorities', parse(recommendations.messaging_priorities), [245, 158, 11]],
    ['Channel Recommendations', parse(recommendations.channel_recommendations), [59, 130, 246]],
  ]
  for (const [title, rawItems, color] of sections) {
    const items = rawItems.map(v => str(v))
    if (!items.length || !items.some(i => i)) continue
    ensureSpace(ctx, 12)
    ctx.doc.setFontSize(10); ctx.doc.setFont('helvetica', 'bold'); ctx.doc.setTextColor(50, 50, 50)
    ctx.doc.text(title, MARGIN, ctx.y)
    const tw = ctx.doc.getTextWidth(title)
    ctx.doc.setDrawColor(color[0], color[1], color[2])
    ctx.doc.setLineWidth(0.6)
    ctx.doc.line(MARGIN, ctx.y + 1, MARGIN + tw, ctx.y + 1)
    ctx.y += 6
    addBulletList(ctx, items, color)
  }
}

// ── Main Export ────────────────────────────────────────────

export async function exportBrandAnalysisPDF(
  data: AnalysisRun,
  brandName: string,
): Promise<void> {
  const { doc, autoTable } = await initPDF()
  const ctx: PdfCtx = { doc, autoTable, y: 0 }
  addCoverPage(ctx, 'Brand Analysis Report', brandName)
  addSectionHeader(ctx, 'Overview')
  renderOverviewSection(ctx, data)
  if (data.audience_insights) renderAudienceSection(ctx, data)
  if (data.competitive_analysis) renderCompetitorsSection(ctx, data)
  if (data.recommendations) renderInsightsSection(ctx, data)
  addFooter(ctx)
  const filename = `${brandName.replace(/[^a-zA-Z0-9]/g, '_')}-analysis-report.pdf`
  triggerDownload(doc.output('blob'), filename)
}
