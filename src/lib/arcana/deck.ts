export type ArcanaCard = {
  id: number
  name: string
  reversed: boolean
}

export const ARCANA: { id: number; name: string }[] = [
  { id: 0, name: "愚者" },
  { id: 1, name: "魔術師" },
  { id: 2, name: "女教皇" },
  { id: 3, name: "女帝" },
  { id: 4, name: "皇帝" },
  { id: 5, name: "教皇" },
  { id: 6, name: "恋人" },
  { id: 7, name: "戦車" },
  { id: 8, name: "力" },
  { id: 9, name: "隠者" },
  { id: 10, name: "車輪" },
  { id: 11, name: "正義" },
  { id: 12, name: "吊人" },
  { id: 13, name: "死神" },
  { id: 14, name: "節制" },
  { id: 15, name: "悪魔" },
  { id: 16, name: "塔" },
  { id: 17, name: "星" },
  { id: 18, name: "月" },
  { id: 19, name: "太陽" },
  { id: 20, name: "審判" },
  { id: 21, name: "世界" },
]

/** Upright keeps the number. Reversed reads from the other end of the major arcana. */
export function arcanaScore(id: number, reversed: boolean): number {
  return reversed ? 21 - id : id
}

export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const next = items.slice()
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const current = next[i]
    next[i] = next[j] as T
    next[j] = current as T
  }
  return next
}

export function dealSeven(rng: () => number = Math.random): ArcanaCard[] {
  return shuffle(ARCANA, rng)
    .slice(0, 7)
    .map((card) => ({
      ...card,
      reversed: rng() < 0.5,
    }))
}

export function flashMs(round: number): number {
  return Math.max(900, 2200 - (round - 1) * 280)
}
