"use client"

import { useRef, useState, useSyncExternalStore } from "react"
import { Button } from "@/components/ui/button"
import { Frame, Stat } from "@/components/frame"
import {
  dayKey,
  decodeCapsule,
  drawFigure,
  FIGURES,
  pullPoints,
  RARITY_LABEL,
  recordOwned,
  ROUND_PULLS,
  type Figure,
  type Rarity,
} from "@/lib/capsule/pool"
import { saveIfBetter, useRecord } from "@/lib/storage"

const KEY = "ohirune.capsule"
const EVENT = "ohirune-capsule"

function readRaw(): string {
  if (typeof window === "undefined") return ""
  return window.localStorage.getItem(KEY) ?? ""
}

function writeRaw(raw: string): void {
  window.localStorage.setItem(KEY, raw)
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener(EVENT, onStoreChange)
  window.addEventListener("storage", onStoreChange)
  return () => {
    window.removeEventListener(EVENT, onStoreChange)
    window.removeEventListener("storage", onStoreChange)
  }
}

function Glyph({ id, className }: { id: string; className?: string }) {
  const common = {
    viewBox: "0 0 64 64",
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    "aria-hidden": true as const,
  }
  if (id === "en") return <svg {...common}><circle cx="32" cy="32" r="16" /></svg>
  if (id === "kata") return <svg {...common}><rect x="16" y="16" width="32" height="32" /></svg>
  if (id === "san") return <svg {...common}><path d="M32 14 L52 50 H12 Z" /></svg>
  if (id === "hishi") return <svg {...common}><path d="M32 10 L54 32 L32 54 L10 32 Z" /></svg>
  if (id === "bou") return <svg {...common}><path d="M14 32 H50" /></svg>
  if (id === "ten") return <svg {...common}><circle cx="32" cy="32" r="4" fill="currentColor" stroke="none" /></svg>
  if (id === "kan") return <svg {...common}><circle cx="32" cy="32" r="18" /><circle cx="32" cy="32" r="8" /></svg>
  if (id === "koushi") {
    return (
      <svg {...common}>
        <path d="M16 16 H48 V48 H16 Z M16 32 H48 M32 16 V48" />
      </svg>
    )
  }
  if (id === "nami") return <svg {...common}><path d="M8 36 Q20 20 32 36 T56 36" /></svg>
  if (id === "ko") return <svg {...common}><path d="M16 44 A20 20 0 0 1 48 44" /></svg>
  if (id === "juuji") return <svg {...common}><path d="M32 12 V52 M12 32 H52" /></svg>
  if (id === "hoshi") return <svg {...common}><path d="M32 10 L37 26 H54 L40 36 L46 52 L32 42 L18 52 L24 36 L10 26 H27 Z" /></svg>
  if (id === "roku") return <svg {...common}><polygon points="32,10 50,20 50,44 32,54 14,44 14,20" /></svg>
  if (id === "uzu") {
    return (
      <svg {...common}>
        <path d="M32 34c6 0 8-8 14-6 6 2 6 12 0 16-8 5-18 0-20-8-2-10 8-16 16-12" />
      </svg>
    )
  }
  if (id === "nichirin") {
    return (
      <svg {...common}>
        <circle cx="32" cy="32" r="10" />
        <path d="M32 8 V16 M32 48 V56 M8 32 H16 M48 32 H56 M14 14 L20 20 M44 44 L50 50 M50 14 L44 20 M20 44 L14 50" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M40 14 A18 18 0 1 0 40 50 A12 12 0 1 1 40 14" fill="currentColor" stroke="none" />
    </svg>
  )
}

const TONE: Record<Rarity, string> = {
  common: "text-foreground",
  uncommon: "text-primary",
  rare: "text-primary",
  legend: "text-primary",
}

export function CapsuleGame() {
  const [today] = useState(() => dayKey(new Date()))
  const raw = useSyncExternalStore(subscribe, readRaw, () => "")
  const save = decodeCapsule(raw, today)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<{ figure: Figure; points: number } | null>(null)
  const [roundScore, setRoundScore] = useState(0)
  const [pulls, setPulls] = useState(0)
  const [seen, setSeen] = useState<string[]>([])
  const best = useRecord("ohirune.capsule.score")
  const lock = useRef(false)
  const owned = new Set(save.owned)
  const done = pulls >= ROUND_PULLS

  function resetRound() {
    setRoundScore(0)
    setPulls(0)
    setSeen([])
    setResult(null)
  }

  function pull() {
    if (lock.current || done) return
    lock.current = true
    const figure = drawFigure(Math.random)
    const points = pullPoints(figure.rarity, seen.includes(figure.id))
    const nextOwned = recordOwned(save.owned, figure.id)
    const nextScore = roundScore + points
    const nextPulls = pulls + 1
    writeRaw(JSON.stringify({ ...save, owned: nextOwned }))
    setSeen((current) => (current.includes(figure.id) ? current : [...current, figure.id]))
    setRoundScore(nextScore)
    setPulls(nextPulls)
    if (nextPulls >= ROUND_PULLS) saveIfBetter("ohirune.capsule.score", nextScore, (value, prev) => value > prev)
    setSpinning(true)
    setResult(null)
    window.setTimeout(() => {
      setResult({ figure, points })
      setSpinning(false)
      lock.current = false
    }, 700)
  }

  return (
    <Frame index="09" name="CAPSULE">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
        <div className="flex gap-6">
          <Stat label="得点" value={String(roundScore)} />
          <Stat label="回数" value={`${pulls}/${ROUND_PULLS}`} />
          <Stat label="図鑑" value={`${owned.size}/${FIGURES.length}`} />
          <Stat label="最高" value={best === null ? "—" : String(best)} />
        </div>
        <Button type="button" className="h-10 px-4" onClick={done ? resetRound : pull} disabled={spinning}>
          {done ? "新規" : "引く"}
        </Button>
      </div>

      <div className="mx-auto grid min-h-36 w-full max-w-md place-items-center border border-white/15 bg-card">
        {spinning ? (
          <span className="size-10 animate-spin rounded-full border border-primary border-t-transparent" />
        ) : result ? (
          <div className={`flex flex-col items-center gap-2 py-4 ${TONE[result.figure.rarity]}`}>
            <Glyph id={result.figure.id} className="size-16" />
            <p className="font-mono text-xs tracking-[0.22em]">
              {RARITY_LABEL[result.figure.rarity]} {result.figure.name} +{result.points}
            </p>
          </div>
        ) : (
          <p className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground">
            {done ? "終了" : `${ROUND_PULLS}回`}
          </p>
        )}
      </div>

      <ul className="mx-auto mt-6 grid w-full max-w-3xl grid-cols-4 gap-2 sm:grid-cols-8">
        {FIGURES.map((figure) => {
          const has = owned.has(figure.id)
          return (
            <li
              key={figure.id}
              className={`flex aspect-square flex-col items-center justify-center gap-1 border border-white/10 ${
                has ? TONE[figure.rarity] : "text-muted-foreground/30"
              }`}
            >
              <Glyph id={figure.id} className="size-7" />
              <span className="font-mono text-[9px] tracking-[0.12em]">{has ? figure.name : "—"}</span>
            </li>
          )
        })}
      </ul>
    </Frame>
  )
}
