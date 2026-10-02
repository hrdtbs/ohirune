export const PALETTE = ["#efe4cf", "#c4a15a", "#c46b4a", "#7d9a78", "#8aa0b4", "#d7d2c8"] as const

export const LABELS = ["好き", "嫌い", "ライバル", "信頼", "気になる"] as const

export const STYLES = [
  { id: "forward", label: "一方" },
  { id: "both", label: "双方" },
  { id: "heart", label: "心" },
  { id: "crack", label: "亀裂" },
  { id: "dash", label: "点" },
  { id: "wave", label: "波" },
] as const

export const STAMPS = [
  { id: "", label: "無" },
  { id: "heart", label: "♡" },
  { id: "cross", label: "✕" },
  { id: "star", label: "★" },
] as const

export type EdgeStyle = (typeof STYLES)[number]["id"]
export type Stamp = (typeof STAMPS)[number]["id"]
export type NodeShape = "circle" | "square" | "balloon"

export type Person = {
  id: string
  name: string
  comment: string
  x: number
  y: number
  shape: NodeShape
  color: string
  emoji: string
  image: string | null
}

export type Bond = {
  id: string
  from: string
  to: string
  label: string
  style: EdgeStyle
  color: string
  stamp: Stamp
  bend: number
}

export type Cluster = {
  id: string
  name: string
  color: string
  members: string[]
  labelX: number
  labelY: number
  showName: boolean
}

export type Margin = {
  id: string
  text: string
  x: number
  y: number
  size: number
  angle: number
  color: string
  links: { kind: "person" | "bond"; id: string }[]
}

export type Diagram = {
  seq: number
  people: Person[]
  bonds: Bond[]
  clusters: Cluster[]
  margins: Margin[]
}

export type Pt = { x: number; y: number }

export const EMPTY: Diagram = { seq: 1, people: [], bonds: [], clusters: [], margins: [] }

const RIM = 46

export function parseDiagram(raw: string): Diagram | null {
  try {
    const data = JSON.parse(raw) as Diagram
    if (!data || !Array.isArray(data.people) || !Array.isArray(data.bonds)) return null
    return {
      seq: Number(data.seq) || 1,
      people: data.people.filter((person) => person && typeof person.id === "string"),
      bonds: (data.bonds ?? []).filter((bond) => bond && typeof bond.id === "string"),
      clusters: Array.isArray(data.clusters) ? data.clusters : [],
      margins: Array.isArray(data.margins) ? data.margins : [],
    }
  } catch {
    return null
  }
}

function nid(diagram: Diagram, prefix: string): [Diagram, string] {
  const seq = diagram.seq + 1
  return [{ ...diagram, seq }, `${prefix}${diagram.seq}`]
}

export function addPerson(diagram: Diagram, at: Pt): Diagram {
  const [next, id] = nid(diagram, "p")
  const person: Person = {
    id,
    name: "無題",
    comment: "",
    x: at.x,
    y: at.y,
    shape: "circle",
    color: PALETTE[0],
    emoji: "",
    image: null,
  }
  return { ...next, people: [...next.people, person] }
}

export function patchPerson(diagram: Diagram, id: string, patch: Partial<Person>): Diagram {
  return { ...diagram, people: diagram.people.map((person) => (person.id === id ? { ...person, ...patch, id } : person)) }
}

export function removePerson(diagram: Diagram, id: string): Diagram {
  return {
    ...diagram,
    people: diagram.people.filter((person) => person.id !== id),
    bonds: diagram.bonds.filter((bond) => bond.from !== id && bond.to !== id),
    clusters: diagram.clusters.map((cluster) => ({ ...cluster, members: cluster.members.filter((member) => member !== id) })),
    margins: diagram.margins.map((margin) => ({
      ...margin,
      links: margin.links.filter((link) => !(link.kind === "person" && link.id === id)),
    })),
  }
}

export function addBond(diagram: Diagram, from: string, to: string): Diagram | null {
  if (from === to) return null
  if (diagram.bonds.some((bond) => bond.from === from && bond.to === to)) return null
  const [next, id] = nid(diagram, "b")
  const bond: Bond = { id, from, to, label: "好き", style: "forward", color: PALETTE[1], stamp: "", bend: 0.35 }
  return { ...next, bonds: [...next.bonds, bond] }
}

export function patchBond(diagram: Diagram, id: string, patch: Partial<Bond>): Diagram {
  return { ...diagram, bonds: diagram.bonds.map((bond) => (bond.id === id ? { ...bond, ...patch, id } : bond)) }
}

export function removeBond(diagram: Diagram, id: string): Diagram {
  return {
    ...diagram,
    bonds: diagram.bonds.filter((bond) => bond.id !== id),
    margins: diagram.margins.map((margin) => ({
      ...margin,
      links: margin.links.filter((link) => !(link.kind === "bond" && link.id === id)),
    })),
  }
}

export function swapBonds(diagram: Diagram, left: string, right: string): Diagram {
  const bonds = diagram.bonds.slice()
  const i = bonds.findIndex((bond) => bond.id === left)
  const j = bonds.findIndex((bond) => bond.id === right)
  if (i < 0 || j < 0 || i === j) return diagram
  const swap = bonds[i]
  bonds[i] = bonds[j]
  bonds[j] = swap
  return { ...diagram, bonds }
}

export function addCluster(diagram: Diagram, memberId: string): Diagram | null {
  const person = diagram.people.find((item) => item.id === memberId)
  if (!person) return null
  const [next, id] = nid(diagram, "c")
  const cluster: Cluster = {
    id,
    name: "囲み",
    color: PALETTE[2],
    members: [memberId],
    labelX: person.x,
    labelY: person.y - 78,
    showName: true,
  }
  return { ...next, clusters: [...next.clusters, cluster] }
}

export function toggleMember(diagram: Diagram, clusterId: string, personId: string): Diagram {
  return {
    ...diagram,
    clusters: diagram.clusters.map((cluster) => {
      if (cluster.id !== clusterId) return cluster
      const has = cluster.members.includes(personId)
      return { ...cluster, members: has ? cluster.members.filter((id) => id !== personId) : [...cluster.members, personId] }
    }),
  }
}

export function patchCluster(diagram: Diagram, id: string, patch: Partial<Cluster>): Diagram {
  return { ...diagram, clusters: diagram.clusters.map((cluster) => (cluster.id === id ? { ...cluster, ...patch, id } : cluster)) }
}

export function removeCluster(diagram: Diagram, id: string): Diagram {
  return { ...diagram, clusters: diagram.clusters.filter((cluster) => cluster.id !== id) }
}

export function addMargin(diagram: Diagram, at: Pt): Diagram {
  const [next, id] = nid(diagram, "m")
  const margin: Margin = { id, text: "注", x: at.x, y: at.y, size: 16, angle: -6, color: PALETTE[1], links: [] }
  return { ...next, margins: [...next.margins, margin] }
}

export function patchMargin(diagram: Diagram, id: string, patch: Partial<Margin>): Diagram {
  return { ...diagram, margins: diagram.margins.map((margin) => (margin.id === id ? { ...margin, ...patch, id } : margin)) }
}

export function toggleMarginLink(diagram: Diagram, marginId: string, link: { kind: "person" | "bond"; id: string }): Diagram {
  return {
    ...diagram,
    margins: diagram.margins.map((margin) => {
      if (margin.id !== marginId) return margin
      const has = margin.links.some((item) => item.kind === link.kind && item.id === link.id)
      return {
        ...margin,
        links: has ? margin.links.filter((item) => !(item.kind === link.kind && item.id === link.id)) : [...margin.links, link],
      }
    }),
  }
}

export function removeMargin(diagram: Diagram, id: string): Diagram {
  return { ...diagram, margins: diagram.margins.filter((margin) => margin.id !== id) }
}

export function personAt(diagram: Diagram, pt: Pt): Person | null {
  let found: Person | null = null
  for (const person of diagram.people) {
    if (Math.hypot(person.x - pt.x, person.y - pt.y) <= 58) found = person
  }
  return found
}

export function quad(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const u = 1 - t
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  }
}

export function control(a: Pt, b: Pt, bend: number): Pt {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  return { x: (a.x + b.x) / 2 + (-dy / len) * bend * 110, y: (a.y + b.y) / 2 + (dx / len) * bend * 110 }
}

function trim(a: Pt, b: Pt, bend: number): { a: Pt; b: Pt; c: Pt } {
  const c = control(a, b, bend)
  let start = a
  let end = b
  for (let i = 0; i <= 24; i += 1) {
    const t = i / 24
    if (Math.hypot(quad(a, c, b, t).x - a.x, quad(a, c, b, t).y - a.y) >= RIM) {
      start = quad(a, c, b, t)
      break
    }
  }
  for (let i = 24; i >= 0; i -= 1) {
    const t = i / 24
    if (Math.hypot(quad(a, c, b, t).x - b.x, quad(a, c, b, t).y - b.y) >= RIM) {
      end = quad(a, c, b, t)
      break
    }
  }
  return { a: start, b: end, c }
}

export type BondDraw = {
  d: string
  mid: Pt
  start: Pt & { angle: number }
  end: Pt & { angle: number }
}

export function bondDraw(a: Pt, b: Pt, bend: number, style: EdgeStyle): BondDraw {
  const trimmed = trim(a, b, bend)
  const c = control(trimmed.a, trimmed.b, bend * 0.65)
  const mid = quad(trimmed.a, c, trimmed.b, 0.5)
  const before = quad(trimmed.a, c, trimmed.b, 0.86)
  const after = quad(trimmed.a, c, trimmed.b, 0.14)
  const end = { ...trimmed.b, angle: Math.atan2(trimmed.b.y - before.y, trimmed.b.x - before.x) }
  const start = { ...trimmed.a, angle: Math.atan2(trimmed.a.y - after.y, trimmed.a.x - after.x) }
  if (style === "wave") {
    let d = ""
    for (let i = 0; i <= 28; i += 1) {
      const t = i / 28
      const p = quad(trimmed.a, c, trimmed.b, t)
      const n = i === 28 ? quad(trimmed.a, c, trimmed.b, 0.96) : quad(trimmed.a, c, trimmed.b, Math.min(1, t + 0.04))
      const len = Math.hypot(n.x - p.x, n.y - p.y) || 1
      const ox = (-(n.y - p.y) / len) * Math.sin(t * Math.PI * 4) * 7
      const oy = ((n.x - p.x) / len) * Math.sin(t * Math.PI * 4) * 7
      d += `${i === 0 ? "M" : "L"}${p.x + ox} ${p.y + oy}`
    }
    return { d, mid, start, end }
  }
  return { d: `M${trimmed.a.x} ${trimmed.a.y} Q${c.x} ${c.y} ${trimmed.b.x} ${trimmed.b.y}`, mid, start, end }
}

export function nearBond(pt: Pt, a: Pt, b: Pt, bend: number): boolean {
  const c = control(a, b, bend)
  for (let i = 0; i <= 24; i += 1) {
    const p = quad(a, c, b, i / 24)
    if (Math.hypot(p.x - pt.x, p.y - pt.y) <= 14) return true
  }
  return false
}

export function bendFrom(a: Pt, b: Pt, pt: Pt): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const ox = pt.x - (a.x + b.x) / 2
  const oy = pt.y - (a.y + b.y) / 2
  const signed = (ox * -dy + oy * dx) / len
  return Math.max(-1.4, Math.min(1.4, signed / 110))
}

export function clusterFrame(people: Person[], members: string[]): { x: number; y: number; w: number; h: number } | null {
  const pts = people.filter((person) => members.includes(person.id))
  if (pts.length === 0) return null
  const minX = Math.min(...pts.map((person) => person.x)) - 70
  const minY = Math.min(...pts.map((person) => person.y)) - 70
  const maxX = Math.max(...pts.map((person) => person.x)) + 70
  const maxY = Math.max(...pts.map((person) => person.y)) + 86
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

export function sampleDiagram(): Diagram {
  return {
    seq: 10,
    people: [
      { id: "p1", name: "甲", comment: "先輩", x: 220, y: 180, shape: "circle", color: PALETTE[0], emoji: "", image: null },
      { id: "p2", name: "乙", comment: "同期", x: 520, y: 170, shape: "square", color: PALETTE[0], emoji: "", image: null },
      { id: "p3", name: "丙", comment: "後輩", x: 370, y: 420, shape: "balloon", color: PALETTE[0], emoji: "", image: null },
    ],
    bonds: [
      { id: "b1", from: "p1", to: "p2", label: "好き", style: "heart", color: PALETTE[1], stamp: "heart", bend: 0.2 },
      { id: "b2", from: "p2", to: "p3", label: "ライバル", style: "both", color: PALETTE[2], stamp: "", bend: -0.25 },
      { id: "b3", from: "p3", to: "p1", label: "気になる", style: "dash", color: PALETTE[4], stamp: "", bend: 0.15 },
    ],
    clusters: [{ id: "c1", name: "同じ席", color: PALETTE[3], members: ["p1", "p2"], labelX: 300, labelY: 90, showName: true }],
    margins: [{ id: "m1", text: "まだ言っていない", x: 250, y: 300, size: 15, angle: -8, color: PALETTE[1], links: [{ kind: "bond", id: "b1" }] }],
  }
}

export type Hist = { past: Diagram[]; present: Diagram; future: Diagram[] }

export function history(present: Diagram): Hist {
  return { past: [], present, future: [] }
}

export function commit(hist: Hist, next: Diagram): Hist {
  if (JSON.stringify(hist.present) === JSON.stringify(next)) return { ...hist, present: next }
  return { past: [...hist.past, hist.present].slice(-60), present: next, future: [] }
}

export function undo(hist: Hist): Hist {
  const prev = hist.past[hist.past.length - 1]
  if (!prev) return hist
  return { past: hist.past.slice(0, -1), present: prev, future: [hist.present, ...hist.future] }
}

export function redo(hist: Hist): Hist {
  const next = hist.future[0]
  if (!next) return hist
  return { past: [...hist.past, hist.present], present: next, future: hist.future.slice(1) }
}

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export function diagramSvg(diagram: Diagram, background: string | null): { svg: string; width: number; height: number; minX: number; minY: number } {
  const xs = [80]
  const ys = [60]
  for (const person of diagram.people) {
    xs.push(person.x - 80, person.x + 80)
    ys.push(person.y - 70, person.y + 90)
  }
  for (const margin of diagram.margins) {
    xs.push(margin.x - 20, margin.x + margin.text.length * margin.size)
    ys.push(margin.y - 20, margin.y + margin.size + 16)
  }
  for (const cluster of diagram.clusters) {
    const frame = clusterFrame(diagram.people, cluster.members)
    if (!frame) continue
    xs.push(frame.x, frame.x + frame.w, cluster.labelX, cluster.labelX + 80)
    ys.push(frame.y, frame.y + frame.h, cluster.labelY)
  }
  const minX = Math.min(...xs) - 36
  const minY = Math.min(...ys) - 36
  const width = Math.max(...xs) - minX + 36
  const height = Math.max(...ys) - minY + 36
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}">`,
  ]
  if (background) parts.push(`<rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="${background}"/>`)
  for (const cluster of diagram.clusters) {
    const frame = clusterFrame(diagram.people, cluster.members)
    if (!frame) continue
    parts.push(
      `<rect x="${frame.x}" y="${frame.y}" width="${frame.w}" height="${frame.h}" rx="28" fill="${cluster.color}" fill-opacity="0.16" stroke="${cluster.color}" stroke-opacity="0.8"/>`,
    )
    if (cluster.showName) {
      parts.push(
        `<text x="${cluster.labelX}" y="${cluster.labelY}" fill="${cluster.color}" font-family="sans-serif" font-size="13">${esc(cluster.name)}</text>`,
      )
    }
  }
  for (const margin of diagram.margins) {
    for (const link of margin.links) {
      const target =
        link.kind === "person"
          ? diagram.people.find((person) => person.id === link.id)
          : bondAnchor(diagram, link.id)
      if (!target) continue
      parts.push(
        `<path d="M${margin.x} ${margin.y} L${target.x} ${target.y}" fill="none" stroke="${margin.color}" stroke-dasharray="4 4" stroke-opacity="0.8"/>`,
      )
    }
    parts.push(
      `<text x="${margin.x}" y="${margin.y}" fill="${margin.color}" font-family="sans-serif" font-size="${margin.size}" transform="rotate(${margin.angle} ${margin.x} ${margin.y})">${esc(margin.text)}</text>`,
    )
  }
  for (const bond of diagram.bonds) {
    const from = diagram.people.find((person) => person.id === bond.from)
    const to = diagram.people.find((person) => person.id === bond.to)
    if (!from || !to) continue
    const draw = bondDraw(from, to, bond.bend, bond.style)
    const dash = bond.style === "dash" || bond.style === "crack" ? ' stroke-dasharray="7 6"' : ""
    parts.push(`<path d="${draw.d}" fill="none" stroke="${bond.color}" stroke-width="1.6"${dash}/>`)
    parts.push(arrow(draw.end.x, draw.end.y, draw.end.angle, bond.color, bond.style === "heart"))
    if (bond.style === "both") parts.push(arrow(draw.start.x, draw.start.y, draw.start.angle, bond.color, false))
    const stamp = STAMPS.find((item) => item.id === bond.stamp)?.label ?? ""
    const text = `${bond.label}${stamp && stamp !== "無" ? stamp : ""}`
    parts.push(
      `<text x="${draw.mid.x}" y="${draw.mid.y - 8}" text-anchor="middle" fill="${bond.color}" font-family="sans-serif" font-size="12">${esc(text)}</text>`,
    )
  }
  for (const person of diagram.people) {
    const x = person.x - 28
    const y = person.y - 28
    if (person.shape === "circle") parts.push(`<circle cx="${person.x}" cy="${person.y}" r="28" fill="${person.color}"/>`)
    else if (person.shape === "square") parts.push(`<rect x="${x}" y="${y}" width="56" height="56" rx="4" fill="${person.color}"/>`)
    else parts.push(`<rect x="${x}" y="${y - 4}" width="56" height="52" rx="16" fill="${person.color}"/>`)
    if (person.image) {
      parts.push(`<image href="${person.image}" x="${x + 4}" y="${y + 4}" width="48" height="48" preserveAspectRatio="xMidYMid slice"/>`)
    } else if (person.emoji) {
      parts.push(
        `<text x="${person.x}" y="${person.y + 8}" text-anchor="middle" font-size="26">${esc(person.emoji)}</text>`,
      )
    }
    parts.push(
      `<text x="${person.x}" y="${person.y + 48}" text-anchor="middle" fill="#efe4cf" font-family="sans-serif" font-size="13">${esc(person.name)}</text>`,
    )
    if (person.comment) {
      parts.push(
        `<text x="${person.x}" y="${person.y + 64}" text-anchor="middle" fill="#efe4cf" fill-opacity="0.7" font-family="sans-serif" font-size="11">${esc(person.comment)}</text>`,
      )
    }
  }
  parts.push("</svg>")
  return { svg: parts.join(""), width, height, minX, minY }
}

function bondAnchor(diagram: Diagram, id: string): Pt | null {
  const bond = diagram.bonds.find((item) => item.id === id)
  if (!bond) return null
  const from = diagram.people.find((person) => person.id === bond.from)
  const to = diagram.people.find((person) => person.id === bond.to)
  if (!from || !to) return null
  return bondDraw(from, to, bond.bend, bond.style).mid
}

function arrow(x: number, y: number, angle: number, color: string, heart: boolean): string {
  if (heart) {
    return `<path d="M${x} ${y} l-6 -4 a4 4 0 0 1 6 -5 a4 4 0 0 1 6 5 z" fill="${color}" transform="rotate(${(angle * 180) / Math.PI} ${x} ${y})"/>`
  }
  const size = 9
  const p2x = x - Math.cos(angle - 0.45) * size
  const p2y = y - Math.sin(angle - 0.45) * size
  const p3x = x - Math.cos(angle + 0.45) * size
  const p3y = y - Math.sin(angle + 0.45) * size
  return `<polygon points="${x},${y} ${p2x},${p2y} ${p3x},${p3y}" fill="${color}"/>`
}
