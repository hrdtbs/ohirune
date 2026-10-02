export type TarotCard = {
  id: string
  name: string
  upright: string
  reversed: string
  src: string
}

export type DrawnCard = {
  card: TarotCard
  reversed: boolean
}

export const POSITIONS = [
  { id: "past", label: "過去" },
  { id: "present", label: "現在" },
  { id: "future", label: "未来" },
] as const

const MAJORS: [string, string, string][] = [
  ["愚者", "出だし", "ふらふらしている"],
  ["魔術師", "手を付ける", "中身がない"],
  ["女教皇", "様子を見る", "隠している"],
  ["女帝", "実る", "枯れている"],
  ["皇帝", "決まりどおり", "かたくなっている"],
  ["教皇", "受けつぐ", "古いしきたり"],
  ["恋人", "選ぶ", "迷っている"],
  ["戦車", "前へ出る", "空回りしている"],
  ["力", "こらえる", "焦っている"],
  ["隠者", "一人で考える", "ひとり"],
  ["運命の輪", "回りだす", "止まったまま"],
  ["正義", "釣り合う", "片寄っている"],
  ["吊るされた男", "見方が変わる", "時間が過ぎる"],
  ["死神", "終わる", "まだ残っている"],
  ["節制", "ほどよく混ぜる", "やりすぎ"],
  ["悪魔", "縛られている", "離れていく"],
  ["塔", "崩れる", "後回し"],
  ["星", "光が見える", "不安が残る"],
  ["月", "ぼんやりしている", "はっきりする"],
  ["太陽", "よく見える", "曇っている"],
  ["審判", "目が覚める", "まだ決まらない"],
  ["世界", "ひと区切り", "まだ途中"],
]

const SUITS = [
  { id: "w", name: "杖" },
  { id: "c", name: "杯" },
  { id: "s", name: "剣" },
  { id: "p", name: "貨" },
] as const

const RANKS = ["エース", "2", "3", "4", "5", "6", "7", "8", "9", "10", "小姓", "騎士", "女王", "王"]

const MINORS: Record<(typeof SUITS)[number]["id"], [string, string][]> = {
  w: [
    ["火が付く", "空振る"],
    ["見通す", "まだ決まらない"],
    ["先が見える", "足が止まる"],
    ["落ち着く", "落ち着かない"],
    ["ぶつかり合う", "避けている"],
    ["押し進む", "遅れている"],
    ["守り切る", "押されている"],
    ["すぐ届く", "手間取っている"],
    ["耐え続ける", "疲れている"],
    ["荷が重い", "荷を下ろす"],
    ["知らせが来る", "知らせが遅い"],
    ["突っ走る", "空回りする"],
    ["自分を信じる", "縮こまっている"],
    ["まとめる", "一人で決める"],
  ],
  c: [
    ["満たされる", "空になる"],
    ["結び付く", "うまくいかない"],
    ["お祝い", "飲みすぎ"],
    ["飽きている", "考え直す"],
    ["失う", "戻ってくる"],
    ["昔を思い出す", "昔にこだわる"],
    ["夢を見る", "どれか選ぶ"],
    ["立ち去る", "残ってしまう"],
    ["満足する", "まだ足りない"],
    ["うまく収まる", "ひびが入る"],
    ["感じ取る", "まだ幼い"],
    ["申し入れる", "期待が外れる"],
    ["気持ちが分かる", "頼りきり"],
    ["落ち着いて見る", "押し殺す"],
  ],
  s: [
    ["決める", "頭が混乱する"],
    ["動けない", "縁が切れる"],
    ["痛む", "痛みが引く"],
    ["休む", "眠れない"],
    ["勝つ", "負ける"],
    ["場所を変える", "同じ場所にいる"],
    ["うまくやる", "ばれる"],
    ["身動きできない", "抜け出す"],
    ["夜中に悩む", "少し楽になる"],
    ["いったん終わる", "また始まる"],
    ["様子をうかがう", "うわさが回る"],
    ["急ぐ", "無茶をする"],
    ["見抜く", "冷たい"],
    ["裁く", "決めつける"],
  ],
  p: [
    ["話が来る", "逃す"],
    ["やりくりする", "ごちゃごちゃ"],
    ["一緒にやる", "手を抜く"],
    ["持っておく", "離せない"],
    ["足りない", "助けが来る"],
    ["分ける", "偏っている"],
    ["見極める", "焦って動く"],
    ["腕が上がる", "サボる"],
    ["余裕がある", "誰かに頼る"],
    ["受けつぐ", "使い果たす"],
    ["習い始める", "気が散る"],
    ["コツコツ進む", "進まない"],
    ["育てる", "手を出しすぎ"],
    ["実が入る", "動きが固い"],
  ],
}

function majors(): TarotCard[] {
  return MAJORS.map(([name, upright, reversed], index) => ({
    id: `m${String(index).padStart(2, "0")}`,
    name,
    upright,
    reversed,
    src: `/tarot/m${String(index).padStart(2, "0")}.webp`,
  }))
}

function minors(): TarotCard[] {
  return SUITS.flatMap((suit) =>
    MINORS[suit.id].map(([upright, reversed], index) => {
      const file = `${suit.id}${String(index + 1).padStart(2, "0")}`
      return {
        id: file,
        name: `${suit.name}の${RANKS[index]}`,
        upright,
        reversed,
        src: `/tarot/${file}.webp`,
      }
    }),
  )
}

export const DECK: TarotCard[] = [...majors(), ...minors()]

export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const next = items.slice()
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const swap = next[i]
    next[i] = next[j]
    next[j] = swap
  }
  return next
}

export function drawThree(rng: () => number = Math.random): DrawnCard[] {
  const order = shuffle(DECK, rng)
  return POSITIONS.map((_, index) => ({
    card: order[index],
    reversed: rng() < 0.5,
  }))
}
