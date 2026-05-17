import { triggerDownload } from './download'

function escapeCsvField(value: unknown): string {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function objectsToCsv<T extends Record<string, unknown>>(
  data: T[],
  columns?: { key: keyof T; header?: string }[],
): string {
  if (data.length === 0) return ''

  const keys = columns?.map((c) => c.key) ?? (Object.keys(data[0]) as (keyof T)[])
  const headers = columns?.map((c) => c.header ?? String(c.key)) ?? keys.map(String)

  const headerRow = headers.map(escapeCsvField).join(',')
  const rows = data.map((item) =>
    keys.map((key) => escapeCsvField(item[key])).join(','),
  )

  return [headerRow, ...rows].join('\n')
}

export function exportCsv<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; header?: string }[],
): void {
  const csv = objectsToCsv(data, columns)
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`)
}
