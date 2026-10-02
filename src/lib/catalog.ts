export const GAMES = [
  { slug: "slide", index: "01", name: "SLIDE", kicker: "絵を揃える" },
  { slug: "reversi", index: "02", name: "REVERSI", kicker: "石を返す" },
  { slug: "arcana", index: "03", name: "ARCANA", kicker: "札を残す" },
  { slug: "lot", index: "04", name: "LOT", kicker: "籤を引く" },
  { slug: "chroma", index: "05", name: "CHROMA", kicker: "色を合わせる" },
  { slug: "seal", index: "06", name: "SEAL", kicker: "印を辿る" },
  { slug: "type", index: "07", name: "TYPE", kicker: "字を打つ" },
  { slug: "jump", index: "08", name: "JUMP", kicker: "跳び越す" },
  { slug: "capsule", index: "09", name: "CAPSULE", kicker: "図形を集める" },
  { slug: "guess", index: "10", name: "GUESS", kicker: "数を当てる" },
  { slug: "tarot", index: "11", name: "TAROT", kicker: "3枚引く" },
  { slug: "triad", index: "12", name: "TRIAD", kicker: "関係を描く" },
  { slug: "chess", index: "13", name: "CHESS", kicker: "駒を進める" },
  { slug: "solitaire", index: "14", name: "SOLITAIRE", kicker: "札を出す" },
] as const

export type GameSlug = (typeof GAMES)[number]["slug"]

export function findGame(slug: string) {
  return GAMES.find((game) => game.slug === slug)
}
