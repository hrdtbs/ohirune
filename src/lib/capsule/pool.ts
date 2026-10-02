export type Rarity = "common" | "uncommon" | "rare" | "legend"

export type Figure = {
  id: string
  name: string
  rarity: Rarity
  weight: number
}

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "並",
  uncommon: "良",
  rare: "稀",
  legend: "極",
}

export const FIGURES: Figure[] = [
  { id: "en", name: "円", rarity: "common", weight: 40 },
  { id: "kata", name: "方", rarity: "common", weight: 40 },
  { id: "san", name: "三角", rarity: "common", weight: 40 },
  { id: "hishi", name: "菱", rarity: "common", weight: 40 },
  { id: "bou", name: "棒", rarity: "common", weight: 36 },
  { id: "ten", name: "点", rarity: "common", weight: 36 },
  { id: "kan", name: "環", rarity: "uncommon", weight: 16 },
  { id: "koushi", name: "格子", rarity: "uncommon", weight: 16 },
  { id: "nami", name: "波", rarity: "uncommon", weight: 14 },
  { id: "ko", name: "弧", rarity: "uncommon", weight: 14 },
  { id: "juuji", name: "十字", rarity: "rare", weight: 6 },
  { id: "hoshi", name: "星", rarity: "rare", weight: 6 },
  { id: "roku", name: "六角", rarity: "rare", weight: 5 },
  { id: "uzu", name: "渦", rarity: "rare", weight: 5 },
  { id: "nichirin", name: "日輪", rarity: "legend", weight: 2 },
  { id: "gatsurin", name: "月輪", rarity: "legend", weight: 2 },
]

export type CapsuleSave = {
  day: string
  tickets: number
  owned: string[]
}

export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

export const ROUND_PULLS = 5

export const RARITY_POINTS: Record<Rarity, number> = {
  common: 1,
  uncommon: 3,
  rare: 8,
  legend: 20,
}

export function pullPoints(rarity: Rarity, seenInRound: boolean): number {
  const base = RARITY_POINTS[rarity]
  return seenInRound ? Math.ceil(base / 2) : base
}

export function recordOwned(owned: readonly string[], id: string): string[] {
  return owned.includes(id) ? [...owned] : [...owned, id]
}

export function drawFigure(rand: () => number, pool: Figure[] = FIGURES): Figure {
  const total = pool.reduce((sum, figure) => sum + figure.weight, 0)
  let roll = rand() * total
  for (const figure of pool) {
    roll -= figure.weight
    if (roll < 0) return figure
  }
  return pool[pool.length - 1]
}

export function decodeCapsule(raw: string, today: string): CapsuleSave {
  let owned: string[] = []
  let day = ""
  let tickets = 0
  let valid = false
  if (raw) {
    try {
      const data = JSON.parse(raw) as Partial<CapsuleSave>
      if (
        data &&
        typeof data.day === "string" &&
        typeof data.tickets === "number" &&
        Array.isArray(data.owned)
      ) {
        day = data.day
        tickets = data.tickets
        owned = data.owned.filter((id): id is string => typeof id === "string")
        valid = true
      }
    } catch {
      valid = false
    }
  }
  if (!valid || day !== today) return { day: today, tickets: 1, owned }
  return { day, tickets, owned }
}

export function applyPull(state: CapsuleSave, figure: Figure): { save: CapsuleSave; known: boolean } {
  const known = state.owned.includes(figure.id)
  return {
    known,
    save: {
      day: state.day,
      tickets: Math.max(0, state.tickets - 1),
      owned: known ? state.owned : [...state.owned, figure.id],
    },
  }
}
