export type LotEntry = {
  name: string
  weight: number
  group: string
}

export function parseGroups(
  groups: { name: string; weight: number; text: string }[],
): LotEntry[] {
  const entries: LotEntry[] = []
  const seen = new Set<string>()
  for (const group of groups) {
    const weight = Number.isFinite(group.weight) ? Math.max(0, group.weight) : 0
    for (const line of group.text.split(/\r?\n/)) {
      const name = line.trim()
      if (!name || seen.has(name)) continue
      seen.add(name)
      entries.push({ name, weight, group: group.name })
    }
  }
  return entries
}

export const LOT_DRAWS = 8

export function callPoints(weight: number): number {
  if (!(weight > 0)) return 0
  return Math.max(1, Math.round(12 / weight))
}

export function drawWeighted(
  entries: readonly LotEntry[],
  excluded: ReadonlySet<string>,
  rng: () => number = Math.random,
): LotEntry | null {
  const pool = entries.filter((entry) => entry.weight > 0 && !excluded.has(entry.name))
  const total = pool.reduce((sum, entry) => sum + entry.weight, 0)
  if (total <= 0 || pool.length === 0) return null
  let cursor = rng() * total
  for (const entry of pool) {
    cursor -= entry.weight
    if (cursor <= 0) return entry
  }
  return pool[pool.length - 1] ?? null
}
