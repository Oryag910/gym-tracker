// Shared display formatters — keep dates and numbers consistent across pages.

// "2026-09-16" → "Sep 16, 2026". Parsed as local date parts so it never shifts by timezone.
export function formatDate(iso: string, opts: { year?: boolean } = {}): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', ...(opts.year === false ? {} : { year: 'numeric' }),
  })
}

// "2026-09-16" → "Wednesday, September 16, 2026"
export function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

// Display weight without floating-point noise: 1388.91 → "1,389", 82.5 → "82.5"
export function formatWeight(n: number): string {
  const rounded = Math.round(n * 2) / 2
  return rounded.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

// Large totals (volume): 6640765.3 → "6,640,765"
export function formatInt(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

// Compact labels for tight spaces: 32000 → "32k", 6525575 → "6.5M"
export function formatCompact(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`
  if (abs >= 1000) return `${+(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
  return String(Math.round(n))
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}
