export const TYPE_SECONDS = 60

const BASIC: Record<string, string> = {
  あ: "a", い: "i", う: "u", え: "e", お: "o",
  か: "ka", き: "ki", く: "ku", け: "ke", こ: "ko",
  さ: "sa", し: "shi", す: "su", せ: "se", そ: "so",
  た: "ta", ち: "chi", つ: "tsu", て: "te", と: "to",
  な: "na", に: "ni", ぬ: "nu", ね: "ne", の: "no",
  は: "ha", ひ: "hi", ふ: "fu", へ: "he", ほ: "ho",
  ま: "ma", み: "mi", む: "mu", め: "me", も: "mo",
  や: "ya", ゆ: "yu", よ: "yo",
  ら: "ra", り: "ri", る: "ru", れ: "re", ろ: "ro",
  わ: "wa", を: "o", ん: "n",
  が: "ga", ぎ: "gi", ぐ: "gu", げ: "ge", ご: "go",
  ざ: "za", じ: "ji", ず: "zu", ぜ: "ze", ぞ: "zo",
  だ: "da", ぢ: "ji", づ: "zu", で: "de", ど: "do",
  ば: "ba", び: "bi", ぶ: "bu", べ: "be", ぼ: "bo",
  ぱ: "pa", ぴ: "pi", ぷ: "pu", ぺ: "pe", ぽ: "po",
}

const YOUON: Record<string, string> = {
  きゃ: "kya", きゅ: "kyu", きょ: "kyo",
  しゃ: "sha", しゅ: "shu", しょ: "sho",
  ちゃ: "cha", ちゅ: "chu", ちょ: "cho",
  にゃ: "nya", にゅ: "nyu", にょ: "nyo",
  ひゃ: "hya", ひゅ: "hyu", ひょ: "hyo",
  みゃ: "mya", みゅ: "myu", みょ: "myo",
  りゃ: "rya", りゅ: "ryu", りょ: "ryo",
  ぎゃ: "gya", ぎゅ: "gyu", ぎょ: "gyo",
  じゃ: "ja", じゅ: "ju", じょ: "jo",
  びゃ: "bya", びゅ: "byu", びょ: "byo",
  ぴゃ: "pya", ぴゅ: "pyu", ぴょ: "pyo",
  でぃ: "di", てぃ: "ti",
}

export const WORDS = [
  "うさぎ", "ねこ", "いぬ", "とり", "さかな", "うま", "かえる", "きつね", "たぬき", "あひる",
  "さくら", "うみ", "やま", "かわ", "そら", "くも", "あめ", "ゆき", "かぜ", "ほし",
  "ごはん", "みそしる", "やきそば", "おちゃ", "りんご", "みかん", "ぱん", "たまご", "ぎゅうにゅう", "しゃけ",
  "こーひー", "けーき", "らーめん", "すーぷ", "きっぷ", "きって", "まっちゃ", "ざっし", "きょう", "りょこう",
] as const

export type TypeWord = (typeof WORDS)[number]

const PAIRS: [string, string][] = [
  ["sha", "sya"], ["shu", "syu"], ["sho", "syo"], ["shi", "si"],
  ["cha", "tya"], ["chu", "tyu"], ["cho", "tyo"], ["chi", "ti"],
  ["tsu", "tu"], ["fu", "hu"],
  ["ja", "zya"], ["ju", "zyu"], ["jo", "zyo"], ["ji", "zi"],
]

export function kanaToRomaji(kana: string): string {
  let index = 0
  let out = ""
  while (index < kana.length) {
    const char = kana[index] ?? ""
    if (char === "ー") {
      out += out.match(/[aeiou](?=[^aeiou]*$)/)?.[0] ?? ""
      index += 1
      continue
    }
    if (char === "っ") {
      const rest = kanaToRomaji(kana.slice(index + 1))
      const consonant = rest[0] ?? ""
      if (/[b-df-hj-np-tv-z]/.test(consonant)) out += consonant
      out += rest
      break
    }
    const pair = YOUON[kana.slice(index, index + 2)]
    if (pair) {
      out += pair
      index += 2
      continue
    }
    const syllable = BASIC[char]
    if (!syllable) return ""
    out += syllable
    index += 1
  }
  return out
}

export function spellings(reading: string): string[] {
  const base = reading.toLowerCase()
  let kunrei = base
  for (const [hepburn, form] of PAIRS) kunrei = kunrei.replaceAll(hepburn, form)
  return [...new Set([base, kunrei])]
}

export function readingOf(word: string): string {
  return kanaToRomaji(word)
}

export function isReadingPrefix(input: string, reading: string): boolean {
  const value = input.toLowerCase()
  return spellings(reading).some((spelling) => spelling.startsWith(value))
}

export function matchesReading(input: string, reading: string): boolean {
  const value = input.toLowerCase()
  return spellings(reading).some((spelling) => spelling === value)
}

export function resultBand(chars: number): "上" | "中" | "下" {
  if (chars >= 360) return "上"
  if (chars >= 240) return "中"
  return "下"
}

export function pickWord(rand: () => number, pool: readonly string[] = WORDS): string {
  return pool[Math.floor(rand() * pool.length)] ?? pool[0] ?? ""
}
