"use client"

import { Fragment, useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Frame, Stat } from "@/components/frame"
import {
  legalMoves,
  outcome,
  playMove,
  sqName,
  startPub,
  toPos,
  type Move,
  type Pub,
} from "@/lib/chess/game"
import { formatChessScore, type ChessAnalysis } from "@/lib/chess/search"

type Mode = "play" | "read"
type LevelId = "short" | "mid" | "deep"
type Spot = { pub: Pub; last: Move | null }
type Note = { type: "progress" | "done"; id: number; analysis: ChessAnalysis }

const LEVELS = [
  { id: "short", label: "短", timeMs: 280, maxDepth: 3 },
  { id: "mid", label: "中", timeMs: 800, maxDepth: 4 },
  { id: "deep", label: "深", timeMs: 1700, maxDepth: 5 },
] as const

const FILES = "abcdefgh"
const PROMO = [
  [5, "后"],
  [4, "飛"],
  [3, "角"],
  [2, "桂"],
] as const

function fresh(): Spot {
  return { pub: startPub(), last: null }
}

function Glyph({ piece }: { piece: number }) {
  const fill = piece < 9 ? "#f4f0e6" : "#12110e"
  const type = piece & 7
  const common = { viewBox: "0 0 40 40", className: "h-[68%] w-[68%]", "aria-hidden": true as const }
  if (type === 1) return <svg {...common}><circle cx="20" cy="24" r="8" fill={fill} /></svg>
  if (type === 2) return <svg {...common}><path d="M14 31 H28 L24 18 L31 14 L20 7 L14 16 L9 20 Z" fill={fill} /></svg>
  if (type === 3) return <svg {...common}><path d="M20 6 L33 31 H7 Z" fill={fill} /></svg>
  if (type === 4) return <svg {...common}><path d="M9 31 H31 V17 H26 V10 H22 V17 H18 V10 H14 V17 H9 Z" fill={fill} /></svg>
  if (type === 5) {
    return (
      <svg {...common}>
        <circle cx="20" cy="23" r="8" fill={fill} />
        <circle cx="11" cy="13" r="3" fill={fill} />
        <circle cx="20" cy="8" r="3" fill={fill} />
        <circle cx="29" cy="13" r="3" fill={fill} />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M17 33 H23 V23 H32 V17 H23 V7 H17 V17 H8 V23 H17 Z" fill={fill} />
    </svg>
  )
}

export function ChessGame() {
  const [mode, setMode] = useState<Mode>("play")
  const [human, setHuman] = useState(0)
  const [level, setLevel] = useState<LevelId>("mid")
  const [stack, setStack] = useState<Spot[]>(() => [fresh()])
  const [picked, setPicked] = useState<number | null>(null)
  const [promos, setPromos] = useState<Move[]>([])
  const [reading, setReading] = useState<{ key: string; analysis: ChessAnalysis; busy: boolean } | null>(null)
  const spot = stack[stack.length - 1] ?? fresh()
  const pos = toPos(spot.pub)
  const over = outcome(pos)
  const preset = LEVELS.find((item) => item.id === level) ?? LEVELS[1]
  const legal = over === "play" ? legalMoves(pos) : []
  const key = `${spot.pub.sq.join(",")}:${spot.pub.side}:${spot.pub.castle}:${spot.pub.ep}:${level}:${mode}`
  const analysis = mode === "read" && reading?.key === key ? reading.analysis : null
  const busy = mode === "read" && (reading?.key !== key || reading.busy)
  const cpuTurn = mode === "play" && over === "play" && spot.pub.side !== human

  useEffect(() => {
    if (over !== "play") return
    if (mode === "play" && !cpuTurn) return
    const worker = new Worker(new URL("../../lib/chess/worker.ts", import.meta.url), { type: "module" })
    const id = stack.length
    let alive = true
    worker.onmessage = (event: MessageEvent<Note>) => {
      if (!alive || event.data?.id !== id) return
      if (mode === "read") {
        setReading({ key, analysis: event.data.analysis, busy: event.data.type !== "done" })
      }
      const best = event.data.analysis.best
      if (event.data.type === "done" && mode === "play" && best) {
        setStack((prev) => {
          if (prev.length !== id) return prev
          const current = prev[prev.length - 1]
          if (!current || current.pub.side === human) return prev
          return [...prev, { pub: playMove(current.pub, best), last: best }]
        })
        setPicked(null)
      }
    }
    worker.postMessage({
      type: "analyze",
      id,
      pub: spot.pub,
      timeMs: preset.timeMs,
      maxDepth: preset.maxDepth,
    })
    return () => {
      alive = false
      worker.terminate()
    }
  }, [cpuTurn, human, key, mode, over, preset.maxDepth, preset.timeMs, spot.pub, stack.length])

  function choose(move: Move) {
    setStack((prev) => [...prev, { pub: playMove(spot.pub, move), last: move }])
    setPicked(null)
    setPromos([])
  }

  function onSquare(sq: number) {
    if (over !== "play" || cpuTurn) return
    const hits = picked === null ? [] : legal.filter((move) => move.from === picked && move.to === sq)
    if (hits.length > 1 || (hits[0]?.promo ?? 0) > 0) {
      setPromos(hits)
      return
    }
    if (hits[0]) {
      choose(hits[0])
      return
    }
    const piece = spot.pub.sq[sq] ?? 0
    if (piece !== 0 && (piece < 9 ? 0 : 1) === spot.pub.side) setPicked(sq)
    else setPicked(null)
  }

  const ranked = new Map<number, { rank: number; score: number }>()
  analysis?.candidates.forEach((candidate, index) => {
    if (!ranked.has(candidate.to)) ranked.set(candidate.to, { rank: index + 1, score: candidate.score })
  })
  const footer =
    over === "mate" ? (mode === "play" ? (spot.pub.side === human ? "敗" : "勝") : "詰") : over === "draw" ? "引分" : ""

  return (
    <Frame index="13" name="CHESS">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-5">
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <Stat label="手番" value={spot.pub.side === 0 ? "白" : "黒"} />
          {mode === "read" ? <Stat label="最善" value={analysis?.candidates[0]?.name || (busy ? "…" : "—")} /> : null}
          {mode === "read" ? <Stat label="評価" value={analysis ? formatChessScore(analysis.score) : "…"} /> : null}
          {mode === "read" ? <Stat label="深さ" value={analysis ? `${analysis.depth}${busy ? "…" : ""}` : "…"} /> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant={mode === "play" ? "default" : "outline"} className="h-10 px-3" onClick={() => setMode("play")}>
            対局
          </Button>
          <Button type="button" variant={mode === "read" ? "default" : "outline"} className="h-10 px-3" onClick={() => setMode("read")}>
            読む
          </Button>
          <Button variant="outline" className="h-10 px-3" asChild>
            <Link href="/play/chess/guide">解説</Link>
          </Button>
          {mode === "play" ? (
            <>
              <Button type="button" variant={human === 0 ? "default" : "outline"} className="h-10 px-3" onClick={() => { setHuman(0); if (human !== 0) { setStack([fresh()]); setPicked(null) } }}>
                白
              </Button>
              <Button type="button" variant={human === 1 ? "default" : "outline"} className="h-10 px-3" onClick={() => { setHuman(1); if (human !== 1) { setStack([fresh()]); setPicked(null) } }}>
                黒
              </Button>
            </>
          ) : null}
          {LEVELS.map((item) => (
            <Button key={item.id} type="button" variant={item.id === level ? "default" : "outline"} className="h-10 px-3" onClick={() => setLevel(item.id)}>
              {item.label}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            className="h-10 px-3"
            disabled={stack.length <= 1 || cpuTurn}
            onClick={() => {
              setStack((prev) => {
                if (prev.length <= 1) return prev
                const cut = mode === "play" ? Math.max(1, prev.length - (prev[prev.length - 1]?.pub.side === human ? 2 : 1)) : prev.length - 1
                return prev.slice(0, cut)
              })
              setPicked(null)
            }}
          >
            戻す
          </Button>
          <Button type="button" variant="outline" className="h-10 px-3" onClick={() => { setStack([fresh()]); setPicked(null) }}>
            初め
          </Button>
        </div>
      </div>
      {promos.length > 0 ? (
        <div className="flex justify-center gap-2 pb-4">
          {PROMO.map(([promo, label]) => {
            const move = promos.find((item) => item.promo === promo)
            if (!move) return null
            return (
              <Button key={promo} type="button" variant="outline" className="h-10 px-3" onClick={() => choose(move)}>
                {label}
              </Button>
            )
          })}
        </div>
      ) : null}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,540px)_16rem] lg:justify-center">
        <div className="mx-auto w-full max-w-[540px]">
          <div className="grid grid-cols-[1.25rem_repeat(8,minmax(0,1fr))] gap-1">
            <span />
            {FILES.split("").map((file) => (
              <span key={file} className="pb-1 text-center font-mono text-[10px] text-muted-foreground">{file}</span>
            ))}
            {Array.from({ length: 64 }, (_, index) => {
              const row = Math.floor(index / 8)
              const file = index % 8
              const sq = (7 - row) * 8 + file
              const piece = spot.pub.sq[sq] ?? 0
              const mark = ranked.get(sq)
              const can = picked !== null && legal.some((move) => move.from === picked && move.to === sq)
              const last = spot.last?.to === sq || spot.last?.from === sq
              return (
                <Fragment key={sq}>
                  {file === 0 ? <span className="flex items-center justify-center font-mono text-[10px] text-muted-foreground">{8 - row}</span> : null}
                  <button
                    type="button"
                    aria-label={mark ? `${sqName(sq)} 優先${mark.rank} ${formatChessScore(mark.score)}` : sqName(sq)}
                    onClick={() => onSquare(sq)}
                    className={`relative flex aspect-square items-center justify-center ${(file + (7 - row)) % 2 === 0 ? "bg-[#173528]" : "bg-[#24523a]"}`}
                  >
                    {piece ? <Glyph piece={piece} /> : null}
                    {picked === sq ? <span className="absolute inset-1 border-2 border-primary" /> : null}
                    {last && picked !== sq ? <span className="absolute inset-0 ring-2 ring-primary/70 ring-inset" /> : null}
                    {can && !mark ? <span className="absolute inset-[38%] rounded-full bg-primary/80" /> : null}
                    {mark ? (
                      <>
                        <span className="absolute top-0.5 left-0.5 font-mono text-[9px] leading-none text-primary sm:text-[11px]">{mark.rank}</span>
                        <span className="absolute inset-x-0 bottom-0.5 text-center font-mono text-[8px] leading-none tabular-nums text-[#efe4cf] sm:text-[10px]">{formatChessScore(mark.score)}</span>
                      </>
                    ) : null}
                  </button>
                </Fragment>
              )
            })}
          </div>
        </div>
        {mode === "read" ? (
          <ol className="flex max-h-[540px] flex-col gap-1 overflow-auto" aria-label="候補">
            {(analysis?.candidates ?? []).map((candidate, index) => (
              <li key={`${candidate.from}-${candidate.to}-${candidate.promo}-${index}`}>
                <button
                  type="button"
                  onClick={() => choose(candidate)}
                  className={`flex h-10 w-full items-center gap-3 px-3 font-mono text-sm tabular-nums ${index === 0 ? "bg-primary/15 text-primary" : "hover:bg-white/5"}`}
                >
                  <span className="w-4 text-muted-foreground">{index + 1}</span>
                  <span>{candidate.name}</span>
                  <span className="ml-auto">{formatChessScore(candidate.score)}</span>
                </button>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
      <p className="pt-4 text-center font-mono text-xs tracking-[0.28em] text-primary">{footer}</p>
    </Frame>
  )
}
