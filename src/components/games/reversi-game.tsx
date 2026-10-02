"use client"

import { Fragment, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Frame, Stat } from "@/components/frame"
import {
  BLACK,
  WHITE,
  afterMove,
  cellAt,
  enemyOf,
  isGameOver,
  legalMoves,
  mineOf,
  passTurn,
  popcnt,
  squaresOf,
  startPosition,
  type Color,
} from "@/lib/reversi/board"
import { REVERSI_LEVELS, type ReversiLevelId } from "@/lib/reversi/levels"
import { squareName } from "@/lib/reversi/notation"
import { analyze } from "@/lib/reversi/search"
import { formatScore, type Analysis } from "@/lib/reversi/types"
import { startLink, takeSeat, type MatchLink } from "@/lib/match/link"

type Pos = {
  black: bigint
  white: bigint
  side: Color
  last: number | null
}

type Mode = "cpu" | "read" | "match"

type Reading = {
  key: string
  analysis: Analysis
  busy: boolean
}

type WorkerNote = {
  type: "progress" | "done"
  id: number
  analysis: Analysis
}

const READ_LEVELS = [
  { id: "short", label: "短", timeMs: 600, maxDepth: 5 },
  { id: "mid", label: "中", timeMs: 1400, maxDepth: 8 },
  { id: "deep", label: "深", timeMs: 2400, maxDepth: 12 },
] as const

const FILES = "ABCDEFGH"

function fresh(): Pos {
  const start = startPosition()
  return { ...start, last: null }
}

function hasMove(pos: Pos): boolean {
  return legalMoves(mineOf(pos.black, pos.white, pos.side), enemyOf(pos.black, pos.white, pos.side)) !== 0n
}

export function ReversiGame() {
  const [mode, setMode] = useState<Mode>("cpu")
  const [human, setHuman] = useState<Color>(BLACK)
  const [level, setLevel] = useState<ReversiLevelId>("mid")
  const [stack, setStack] = useState<Pos[]>(() => [fresh()])
  const [thinking, setThinking] = useState(false)
  const [evalText, setEvalText] = useState("—")
  const [reading, setReading] = useState<Reading | null>(null)
  const [seat, setSeat] = useState<Color | null>(null)
  const [code, setCode] = useState("")
  const [draft, setDraft] = useState("")
  const [note, setNote] = useState("")
  const [live, setLive] = useState(false)
  const linkRef = useRef<MatchLink | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const passSent = useRef("")
  const pos = stack[stack.length - 1] ?? fresh()
  const over = isGameOver(pos.black, pos.white)
  const preset = REVERSI_LEVELS.find((item) => item.id === level) ?? REVERSI_LEVELS[1]
  const readPreset = READ_LEVELS.find((item) => item.id === level) ?? READ_LEVELS[1]
  const blackCount = popcnt(pos.black)
  const whiteCount = popcnt(pos.white)
  const mine = mode === "match" ? seat : human
  const readKey = `${pos.black}:${pos.white}:${pos.side}:${level}`
  const analysis = mode === "read" && reading?.key === readKey ? reading.analysis : null
  const busy = mode === "read" && (reading?.key !== readKey || reading.busy)
  const turnMoves = squaresOf(legalMoves(mineOf(pos.black, pos.white, pos.side), enemyOf(pos.black, pos.white, pos.side)))
  const legal = over
    ? []
    : mode === "read"
      ? turnMoves
      : mine === null || pos.side !== mine || (mode === "match" && !live)
        ? []
        : turnMoves

  function dropLink() {
    abortRef.current?.abort()
    abortRef.current = null
    linkRef.current?.close()
    linkRef.current = null
    setLive(false)
  }

  function restart(nextHuman = human, nextLevel = level) {
    setHuman(nextHuman)
    setLevel(nextLevel)
    setStack([fresh()])
    setEvalText("—")
    setThinking(false)
  }

  function push(next: Pos) {
    setStack((prev) => [...prev, next])
  }

  function undo() {
    if (thinking || mode === "match") return
    setStack((prev) => {
      if (prev.length <= 1) return prev
      if (mode === "read") return prev.slice(0, -1)
      let next = prev.slice(0, -1)
      while (next.length > 1 && next[next.length - 1]?.side !== human) next = next.slice(0, -1)
      return next
    })
    setEvalText("—")
  }

  function leaveMatch() {
    dropLink()
    setSeat(null)
    setCode("")
    setNote("")
  }

  function useCpu() {
    if (mode === "cpu") return
    if (mode === "match") {
      leaveMatch()
      setStack([fresh()])
      setEvalText("—")
    }
    setThinking(false)
    setMode("cpu")
  }

  function useRead() {
    if (mode === "read") return
    if (mode === "match") {
      leaveMatch()
      setStack([fresh()])
      setEvalText("—")
    }
    setThinking(false)
    setMode("read")
  }

  function useMatch() {
    if (mode === "match") return
    dropLink()
    setMode("match")
    setSeat(null)
    setCode("")
    setNote("")
    setStack([fresh()])
    setThinking(false)
    setEvalText("—")
  }

  function pass() {
    if (mode !== "read" || over || legal.length > 0) return
    push({ ...passTurn(pos.black, pos.white, pos.side), last: pos.last })
  }

  function applyRemote(text: string) {
    const msg = JSON.parse(text) as { t?: string; sq?: number }
    if (msg.t === "n") {
      passSent.current = ""
      setStack([fresh()])
      return
    }
    if (msg.t === "p") {
      setStack((prev) => {
        const current = prev[prev.length - 1]
        if (!current || isGameOver(current.black, current.white) || hasMove(current)) return prev
        return [...prev, { ...passTurn(current.black, current.white, current.side), last: current.last }]
      })
      return
    }
    if (msg.t !== "m" || typeof msg.sq !== "number") return
    setStack((prev) => {
      const current = prev[prev.length - 1]
      if (!current) return prev
      const next = afterMove(current.black, current.white, current.side, msg.sq as number)
      if (!next) return prev
      return [...prev, { ...next, last: msg.sq as number }]
    })
  }

  async function begin(op: "create" | "join" | "wait") {
    dropLink()
    const ac = new AbortController()
    abortRef.current = ac
    setStack([fresh()])
    setLive(false)
    setSeat(null)
    setCode("")
    passSent.current = ""
    setNote(op === "join" ? "接続" : "待機")
    try {
      const taken = await takeSeat({ game: "reversi", op, code: draft }, ac.signal)
      if (ac.signal.aborted) return
      setSeat(taken.color)
      setCode(taken.code)
      setNote(op === "join" ? "接続" : "待機")
      const link = startLink(
        taken,
        {
          onMessage: applyRemote,
          onDown: () => {
            setLive(false)
            setNote("切断")
          },
        },
        ac.signal,
      )
      linkRef.current = link
      await link.ready
      if (ac.signal.aborted) return
      setLive(true)
      setNote("")
    } catch (error) {
      if (ac.signal.aborted) return
      setNote(error instanceof Error ? error.message : "失敗")
    }
  }

  function cut() {
    dropLink()
    setSeat(null)
    setCode("")
    setNote("")
    setStack([fresh()])
  }

  function rematch() {
    if (!linkRef.current) return
    passSent.current = ""
    linkRef.current.send(JSON.stringify({ t: "n" }))
    setStack([fresh()])
  }

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      linkRef.current?.close()
    }
  }, [])

  useEffect(() => {
    if (mode !== "cpu" || over || pos.side === human) return
    let cancel = false
    const levelNow = preset
    const snapshot = pos
    const timer = window.setTimeout(() => {
      if (cancel) return
      const mineBits = mineOf(snapshot.black, snapshot.white, snapshot.side)
      const enemyBits = enemyOf(snapshot.black, snapshot.white, snapshot.side)
      if (legalMoves(mineBits, enemyBits) === 0n) {
        setStack((prev) => {
          const current = prev[prev.length - 1]
          if (!current || current.side !== snapshot.side) return prev
          return [...prev, { ...passTurn(current.black, current.white, current.side), last: current.last }]
        })
        return
      }
      setThinking(true)
      const result = analyze({
        black: snapshot.black,
        white: snapshot.white,
        side: snapshot.side,
        timeMs: levelNow.timeMs,
        maxDepth: levelNow.maxDepth,
      })
      if (cancel) return
      const move = result.bestMove
      if (move === null) {
        setThinking(false)
        return
      }
      const played = afterMove(snapshot.black, snapshot.white, snapshot.side, move)
      if (!played) {
        setThinking(false)
        return
      }
      setEvalText(formatScore(result.score, result.exact))
      setStack((prev) => {
        const current = prev[prev.length - 1]
        if (!current || current.black !== snapshot.black || current.white !== snapshot.white || current.side !== snapshot.side) {
          return prev
        }
        return [...prev, { ...played, last: move }]
      })
      setThinking(false)
    }, 40)
    return () => {
      cancel = true
      window.clearTimeout(timer)
    }
  }, [mode, over, pos, human, preset])

  useEffect(() => {
    if (mode !== "cpu" || over || pos.side !== human || thinking) return
    const mineBits = mineOf(pos.black, pos.white, pos.side)
    const enemyBits = enemyOf(pos.black, pos.white, pos.side)
    if (legalMoves(mineBits, enemyBits) !== 0n) return
    const timer = window.setTimeout(() => {
      setStack((prev) => {
        const current = prev[prev.length - 1]
        if (!current || current.side !== human) return prev
        if (hasMove(current)) return prev
        return [...prev, { ...passTurn(current.black, current.white, current.side), last: current.last }]
      })
    }, 450)
    return () => window.clearTimeout(timer)
  }, [mode, over, pos, human, thinking])

  useEffect(() => {
    if (mode !== "match" || !live || seat === null || over || pos.side !== seat || hasMove(pos)) return
    const key = `${pos.black}:${pos.white}:${pos.side}`
    if (passSent.current === key) return
    passSent.current = key
    linkRef.current?.send(JSON.stringify({ t: "p" }))
    setStack((prev) => {
      const current = prev[prev.length - 1]
      if (!current || current.side !== seat || hasMove(current) || isGameOver(current.black, current.white)) return prev
      return [...prev, { ...passTurn(current.black, current.white, current.side), last: current.last }]
    })
  }, [mode, live, seat, over, pos])

  useEffect(() => {
    if (mode !== "read" || over) return
    const worker = new Worker(new URL("../../lib/reversi/worker.ts", import.meta.url), { type: "module" })
    const id = stack.length
    let alive = true
    worker.onmessage = (event: MessageEvent<WorkerNote>) => {
      if (!alive || event.data?.id !== id) return
      setReading({ key: readKey, analysis: event.data.analysis, busy: event.data.type !== "done" })
    }
    worker.postMessage({
      type: "analyze",
      id,
      black: pos.black.toString(),
      white: pos.white.toString(),
      side: pos.side,
      timeMs: readPreset.timeMs,
      maxDepth: readPreset.maxDepth,
    })
    return () => {
      alive = false
      worker.terminate()
    }
  }, [mode, over, readKey, pos.black, pos.white, pos.side, readPreset.timeMs, readPreset.maxDepth, stack.length])

  function play(sq: number) {
    if (mode === "read") {
      if (over) return
      const next = afterMove(pos.black, pos.white, pos.side, sq)
      if (!next) return
      push({ ...next, last: sq })
      return
    }
    if (over || pos.side !== mine) return
    if (mode === "match") {
      if (!live || thinking) return
      const next = afterMove(pos.black, pos.white, pos.side, sq)
      if (!next) return
      push({ ...next, last: sq })
      linkRef.current?.send(JSON.stringify({ t: "m", sq }))
      return
    }
    if (thinking) return
    const next = afterMove(pos.black, pos.white, pos.side, sq)
    if (!next) return
    push({ ...next, last: sq })
  }

  const result =
    blackCount === whiteCount ? "引分" : (blackCount > whiteCount ? BLACK : WHITE) === mine ? "勝" : "敗"
  const readResult = blackCount === whiteCount ? "引分" : blackCount > whiteCount ? "黒" : "白"
  const ranked = new Map((analysis?.candidates ?? []).map((item, index) => [item.move, { ...item, rank: index + 1 }]))
  const footer =
    mode === "read"
      ? analysis && analysis.pv.length > 0
        ? analysis.pv.join(" ")
        : over
          ? readResult
          : ""
      : mode === "cpu" || (live && over)
        ? over
          ? result
          : ""
        : note

  return (
    <Frame index="02" name="REVERSI">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-5">
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <Stat label="黒" value={String(blackCount)} />
          <Stat label="白" value={String(whiteCount)} />
          {mode === "read" ? <Stat label="手番" value={pos.side === BLACK ? "黒" : "白"} /> : null}
          {mode === "read" ? (
            <Stat label="最善" value={over ? "—" : analysis?.mustPass ? "パス" : (analysis?.bestName ?? "…")} />
          ) : null}
          {mode === "cpu" ? <Stat label="評価" value={thinking ? "…" : evalText} /> : null}
          {mode === "read" ? <Stat label="評価" value={analysis ? formatScore(analysis.score, analysis.exact) : "…"} /> : null}
          {mode === "read" ? <Stat label="深さ" value={analysis ? `${analysis.depth}${busy ? "…" : ""}` : "…"} /> : null}
          {mode === "match" && seat !== null ? <Stat label="席" value={seat === BLACK ? "黒" : "白"} /> : null}
          {mode === "match" && code ? (
            <div className="min-w-[4.5rem]">
              <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">部屋</div>
              <div aria-label="部屋コード" className="font-mono text-lg tabular-nums leading-none">
                {code}
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant={mode === "cpu" ? "default" : "outline"} className="h-10 px-3" onClick={useCpu}>
            CPU
          </Button>
          <Button type="button" variant={mode === "read" ? "default" : "outline"} className="h-10 px-3" onClick={useRead}>
            読む
          </Button>
          <Button variant="outline" className="h-10 px-3" asChild>
            <Link href="/play/reversi/guide">解説</Link>
          </Button>
          <Button type="button" variant={mode === "match" ? "default" : "outline"} className="h-10 px-3" onClick={useMatch}>
            対戦
          </Button>
          {mode === "cpu" ? (
            <>
              <Button type="button" variant={human === BLACK ? "default" : "outline"} className="h-10 px-3" onClick={() => restart(BLACK)}>
                黒
              </Button>
              <Button type="button" variant={human === WHITE ? "default" : "outline"} className="h-10 px-3" onClick={() => restart(WHITE)}>
                白
              </Button>
              {REVERSI_LEVELS.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant={item.id === level ? "default" : "outline"}
                  className="h-10 px-3"
                  onClick={() => restart(human, item.id)}
                >
                  {item.label}
                </Button>
              ))}
              <Button type="button" variant="outline" className="h-10 px-3" onClick={undo} disabled={stack.length <= 1 || thinking}>
                戻す
              </Button>
            </>
          ) : mode === "read" ? (
            <>
              {READ_LEVELS.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant={item.id === level ? "default" : "outline"}
                  className="h-10 px-3"
                  onClick={() => setLevel(item.id)}
                >
                  {item.label}
                </Button>
              ))}
              <Button type="button" variant="outline" className="h-10 px-3" onClick={undo} disabled={stack.length <= 1}>
                戻す
              </Button>
              <Button type="button" variant="outline" className="h-10 px-3" onClick={() => setStack([fresh()])}>
                初め
              </Button>
              {analysis?.mustPass ? (
                <Button type="button" variant="outline" className="h-10 px-3" onClick={pass}>
                  パス
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <Button type="button" variant="outline" className="h-10 px-3" onClick={() => void begin("wait")}>
                待つ
              </Button>
              <Button type="button" variant="outline" className="h-10 px-3" onClick={() => void begin("create")}>
                部屋を作る
              </Button>
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4))}
                aria-label="部屋"
                className="h-10 w-20 px-2 font-mono tracking-[0.14em] uppercase"
                maxLength={4}
              />
              <Button type="button" variant="outline" className="h-10 px-3" onClick={() => void begin("join")} disabled={draft.length !== 4}>
                参加
              </Button>
              {code ? (
                <Button type="button" variant="outline" className="h-10 px-3" onClick={cut}>
                  切る
                </Button>
              ) : null}
              {live && over ? (
                <Button type="button" variant="outline" className="h-10 px-3" onClick={rematch}>
                  もう一局
                </Button>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className={mode === "read" ? "grid items-start gap-6 lg:grid-cols-[minmax(0,540px)_14rem] lg:justify-center" : ""}>
      <div className="mx-auto w-full max-w-[540px]">
        <div className="grid grid-cols-[1.25rem_repeat(8,minmax(0,1fr))] gap-1 pl-0">
          <span />
          {FILES.split("").map((file) => (
            <span key={file} className="pb-1 text-center font-mono text-[10px] text-muted-foreground">
              {file}
            </span>
          ))}
          {Array.from({ length: 64 }, (_, index) => {
            const rowFromTop = Math.floor(index / 8)
            const file = index % 8
            const rank = 8 - rowFromTop
            const sq = (rank - 1) * 8 + file
            const cell = cellAt(pos.black, pos.white, sq)
            const can = legal.includes(sq)
            const candidate = mode === "read" ? ranked.get(sq) : undefined
            const scoreText = candidate ? formatScore(candidate.score, candidate.exact) : ""
            const best = mode === "read" && analysis?.bestMove === sq
            return (
              <Fragment key={sq}>
                {file === 0 ? (
                  <span className="flex items-center justify-center font-mono text-[10px] text-muted-foreground">{rank}</span>
                ) : null}
                <button
                  type="button"
                  aria-label={candidate ? `${squareName(sq)} 優先${candidate.rank} ${scoreText}` : squareName(sq)}
                  disabled={!can}
                  onClick={() => play(sq)}
                  className="relative aspect-square rounded-[2px] bg-[#1d3a2c] disabled:cursor-default"
                >
                  {cell !== 0 ? (
                    <span
                      className={`absolute inset-[12%] rounded-full shadow-inner ${
                        cell === 1 ? "bg-[#12110e]" : "bg-[#f4f0e6]"
                      } ${pos.last === sq ? "ring-2 ring-primary ring-offset-2 ring-offset-[#1d3a2c]" : ""}`}
                    />
                  ) : null}
                  {can && !candidate ? <span className="absolute inset-[38%] rounded-full bg-primary/80" /> : null}
                  {best ? <span className="absolute inset-[16%] rounded-[2px] border-2 border-primary" /> : null}
                  {candidate ? (
                    <>
                      <span className="absolute top-0.5 left-0.5 font-mono text-[9px] leading-none text-primary sm:text-[11px]">
                        {candidate.rank}
                      </span>
                      <span className="absolute inset-x-0 bottom-0.5 text-center font-mono text-[8px] leading-none tabular-nums text-[#efe4cf] sm:text-[10px]">
                        {scoreText}
                      </span>
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
            <li key={candidate.name}>
              <button
                type="button"
                onClick={() => play(candidate.move)}
                className={`flex h-10 w-full items-center gap-3 px-3 font-mono text-sm tabular-nums ${
                  index === 0 ? "bg-primary/15 text-primary" : "hover:bg-white/5"
                }`}
              >
                <span className="w-4 text-muted-foreground">{index + 1}</span>
                <span>{candidate.name}</span>
                <span className="ml-auto">{formatScore(candidate.score, candidate.exact)}</span>
              </button>
            </li>
          ))}
        </ol>
      ) : null}
      </div>
      <p className={`pt-4 text-center font-mono text-xs ${mode === "read" && analysis && analysis.pv.length > 0 ? "tracking-[0.18em] text-muted-foreground" : "tracking-[0.28em] text-primary"}`}>
        {footer}
      </p>
    </Frame>
  )
}
