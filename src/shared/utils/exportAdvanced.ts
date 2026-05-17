import { triggerDownload } from './download'

function escapeHtml(val: unknown): string {
  const str = String(val ?? '')
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * CSV Export (existing utility preserved — this is the enhanced version)
 */
export function exportToCsv<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; header?: string }[],
): void {
  if (!data.length) return
  const keys = columns?.map(c => c.key) ?? (Object.keys(data[0]) as (keyof T)[])
  const headers = columns?.map(c => c.header ?? String(c.key)) ?? keys.map(String)

  const escapeField = (val: unknown): string => {
    const str = String(val ?? '')
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const rows = [headers.map(escapeField).join(',')]
  for (const item of data) {
    rows.push(keys.map(k => escapeField(item[k])).join(','))
  }

  const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`)
}

/**
 * Excel-compatible HTML table export (.xls)
 * No external libraries needed — Excel reads HTML tables natively.
 */
export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; header?: string }[],
): void {
  if (!data.length) return
  const keys = columns?.map(c => c.key) ?? (Object.keys(data[0]) as (keyof T)[])
  const headers = columns?.map(c => c.header ?? String(c.key)) ?? keys.map(String)

  let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">'
  html += '<head><meta charset="utf-8"></head><body><table>'
  html += '<tr>' + headers.map(h => `<th style="font-weight:bold;background:#f0f0f0;padding:6px;border:1px solid #ddd">${escapeHtml(h)}</th>`).join('') + '</tr>'

  for (const item of data) {
    html += '<tr>' + keys.map(k => `<td style="padding:4px;border:1px solid #ddd">${escapeHtml(item[k])}</td>`).join('') + '</tr>'
  }

  html += '</table></body></html>'
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
  triggerDownload(blob, filename.endsWith('.xls') ? filename : `${filename}.xls`)
}

/**
 * PDF-like text report export.
 * Full PDF requires jspdf — this generates a clean text report.
 */
export function exportToTextReport(
  title: string,
  sections: { heading: string; content: string }[],
  filename: string,
): void {
  let text = `${'═'.repeat(60)}\n${title}\n${'═'.repeat(60)}\n\n`
  for (const section of sections) {
    text += `${'─'.repeat(40)}\n${section.heading}\n${'─'.repeat(40)}\n${section.content}\n\n`
  }
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  triggerDownload(blob, filename.endsWith('.txt') ? filename : `${filename}.txt`)
}

/**
 * JSON export
 */
export function exportToJson(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  triggerDownload(blob, filename.endsWith('.json') ? filename : `${filename}.json`)
}

/**
 * Build a campaign export payload combining campaign + ads data.
 */
export function buildCampaignExportPayload(
  campaign: Record<string, unknown>,
  ads: Record<string, unknown>[],
): Record<string, unknown> {
  return {
    campaign: {
      name: campaign.name,
      status: campaign.status,
      brand: campaign.brand,
      created_at: campaign.created_at,
    },
    ads: ads.map(ad => ({
      platform: ad.platform,
      funnel_stage: ad.funnel_stage,
      persona: ad.persona,
      data: ad.data,
    })),
    exported_at: new Date().toISOString(),
    exported_by: 'HDM Platform',
  }
}
