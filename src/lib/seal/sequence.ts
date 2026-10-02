export const SEAL_PADS = [
  { id: 0, name: "円" },
  { id: 1, name: "方" },
  { id: 2, name: "三角" },
  { id: 3, name: "菱" },
  { id: 4, name: "六角" },
  { id: 5, name: "十字" },
] as const

export function extendSequence(
  sequence: readonly number[],
  rng: () => number = Math.random,
): number[] {
  const next = Math.floor(rng() * SEAL_PADS.length)
  return [...sequence, next]
}

export function prefixMatches(input: readonly number[], sequence: readonly number[]): boolean {
  return input.every((value, index) => value === sequence[index])
}

export function certificateSvg(length: number): string {
  const marks = Array.from({ length: Math.min(length, 12) }, (_, index) => {
    const x = 48 + (index % 6) * 36
    const y = 168 + Math.floor(index / 6) * 36
    return `<circle cx="${x}" cy="${y}" r="${8 + (index % 3) * 2}" fill="none" stroke="#e4b15a" stroke-width="1.5"/>`
  }).join("")
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="420" viewBox="0 0 320 420">
  <rect width="320" height="420" fill="#12110e"/>
  <rect x="16" y="16" width="288" height="388" fill="none" stroke="#e4b15a" stroke-width="1"/>
  <rect x="24" y="24" width="272" height="372" fill="none" stroke="#f3f1ea" stroke-width="0.5"/>
  <text x="160" y="78" text-anchor="middle" fill="#f3f1ea" font-family="ui-sans-serif,sans-serif" font-size="14" letter-spacing="6">OHIRUNE</text>
  <text x="160" y="112" text-anchor="middle" fill="#e4b15a" font-family="ui-sans-serif,sans-serif" font-size="28" letter-spacing="8">SEAL</text>
  <text x="160" y="148" text-anchor="middle" fill="#f3f1ea" font-family="ui-monospace,monospace" font-size="12" letter-spacing="3">LENGTH ${String(length).padStart(2, "0")}</text>
  ${marks}
</svg>`
}
