export type Hsl = { h: number; s: number; l: number }

export function randomTarget(rng: () => number = Math.random): Hsl {
  return {
    h: Math.floor(rng() * 360),
    s: 42 + Math.floor(rng() * 48),
    l: 32 + Math.floor(rng() * 36),
  }
}

export function matchScore(target: Hsl, guess: Hsl): number {
  const hueDelta = Math.abs(target.h - guess.h)
  const dh = Math.min(hueDelta, 360 - hueDelta) / 180
  const ds = Math.abs(target.s - guess.s) / 100
  const dl = Math.abs(target.l - guess.l) / 100
  const distance = Math.sqrt(dh * dh * 1.35 + ds * ds + dl * dl * 1.15)
  return Math.max(0, Math.round(100 * (1 - Math.min(1, distance / 0.62))))
}

export function hslCss({ h, s, l }: Hsl): string {
  return `hsl(${h} ${s}% ${l}%)`
}
