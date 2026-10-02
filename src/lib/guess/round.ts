export const NUMBERS = Array.from({ length: 20 }, (_, index) => index + 1)

export function pickAnswer(rand: () => number): number {
  return NUMBERS[Math.floor(rand() * NUMBERS.length)] ?? 1
}

export function missEnds(previousMisses: number): boolean {
  return previousMisses > 2
}

export function hintFor(guess: number, answer: number): "small" | "large" {
  return guess < answer ? "small" : "large"
}

export function timeRank(seconds: number): "速" | "良" | "可" | "遅" {
  if (seconds < 5) return "速"
  if (seconds < 8) return "良"
  if (seconds < 20) return "可"
  return "遅"
}
