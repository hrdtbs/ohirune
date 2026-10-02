"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Frame, Stat } from "@/components/frame"
import { callPoints, drawWeighted, LOT_DRAWS, parseGroups, type LotEntry } from "@/lib/lot/draw"
import { saveIfBetter, useRecord } from "@/lib/storage"

type GroupDraft = { name: string; weight: number; text: string }

const INITIAL: GroupDraft[] = [
  { name: "甲", weight: 2, text: "青\n朱\n白\n黒\n金\n銀" },
  { name: "乙", weight: 1, text: "灰\n藍\n萌\n橙" },
]

function Ticket({
  entry,
  index,
  win,
  compact = false,
}: {
  entry: LotEntry
  index: number
  win?: boolean
  compact?: boolean
}) {
  return (
    <div className={`border border-white/15 bg-card ${compact ? "w-36 p-3" : "w-full max-w-sm p-5"}`}>
      <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.16em] text-muted-foreground">
        <span>NO.{String(index + 1).padStart(3, "0")}</span>
        <span>{entry.group}</span>
      </div>
      <p className={compact ? "pt-2 text-xl" : "pt-6 text-4xl tracking-widest"}>{entry.name}</p>
      <div className="mt-4 flex justify-end">
        <span
          className={`grid size-12 place-items-center rounded-full border font-mono text-[10px] tracking-widest ${
            win ? "border-primary text-primary" : "border-white/15 text-transparent"
          }`}
        >
          {win ? "的中" : "WIN"}
        </span>
      </div>
    </div>
  )
}

export function LotGame() {
  const [groups, setGroups] = useState<GroupDraft[]>(INITIAL)
  const [current, setCurrent] = useState<LotEntry | null>(null)
  const [winners, setWinners] = useState<LotEntry[]>([])
  const [spinning, setSpinning] = useState(false)
  const [call, setCall] = useState(INITIAL[0].name)
  const [score, setScore] = useState(0)
  const [draws, setDraws] = useState(0)
  const [gain, setGain] = useState<number | null>(null)
  const best = useRecord("ohirune.lot")
  const spinTimer = useRef<number | null>(null)
  const entries = useMemo(() => parseGroups(groups), [groups])
  const calls = groups.map((group) => group.name).filter((name) => name.trim() !== "")
  const finished = draws >= LOT_DRAWS

  useEffect(() => {
    return () => {
      if (spinTimer.current !== null) window.clearInterval(spinTimer.current)
    }
  }, [])

  function spin() {
    if (spinning || finished || !calls.includes(call)) return
    const winner = drawWeighted(entries, new Set(winners.map((item) => item.name)))
    if (!winner) return
    const pool = entries.filter((entry) => !winners.some((item) => item.name === entry.name))
    const points = winner.group === call ? callPoints(winner.weight) : 0
    setSpinning(true)
    setGain(null)
    let step = 0
    spinTimer.current = window.setInterval(() => {
      const shown = pool[Math.floor(Math.random() * pool.length)] ?? winner
      setCurrent(step > 16 ? winner : shown)
      step += 1
      if (step > 18 && spinTimer.current !== null) {
        window.clearInterval(spinTimer.current)
        spinTimer.current = null
        setCurrent(winner)
        setWinners((prev) => [...prev, winner])
        setGain(points)
        setScore((value) => {
          const next = value + points
          if (draws + 1 >= LOT_DRAWS) saveIfBetter("ohirune.lot", next, (a, b) => a > b)
          return next
        })
        setDraws((value) => value + 1)
        setSpinning(false)
      }
    }, 70)
  }

  function resetRound() {
    setWinners([])
    setCurrent(null)
    setScore(0)
    setDraws(0)
    setGain(null)
  }

  function update(index: number, patch: Partial<GroupDraft>) {
    setGroups((prev) => prev.map((group, i) => (i === index ? { ...group, ...patch } : group)))
  }

  const exhausted = entries.filter((entry) => entry.weight > 0 && !winners.some((item) => item.name === entry.name)).length === 0

  return (
    <Frame index="04" name="LOT">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4">
        <div className="flex gap-6">
          <Stat label="得点" value={String(score)} />
          <Stat label="残り" value={String(LOT_DRAWS - draws)} />
          <Stat label="最高" value={best === null ? "—" : String(best)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {calls.map((name) => (
            <Button
              key={name}
              type="button"
              variant={name === call ? "default" : "outline"}
              className="h-10 px-3"
              onClick={() => setCall(name)}
              disabled={spinning}
            >
              {name}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid flex-1 gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div>
          <div className="flex min-h-64 items-center justify-center">
            {current ? (
              <Ticket entry={current} index={winners.length - (spinning ? 0 : 1)} win={!spinning && winners.some((item) => item.name === current.name)} />
            ) : (
              <div className="grid h-40 w-full max-w-sm place-items-center border border-dashed border-white/20 font-mono text-xs tracking-[0.2em] text-muted-foreground">
                {entries.length === 0 ? "名簿が空" : "READY"}
              </div>
            )}
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <Button type="button" className="h-10 px-5" onClick={spin} disabled={spinning || exhausted || finished || !calls.includes(call)}>
              回す
            </Button>
            <Button type="button" variant="outline" className="h-10 px-4" onClick={resetRound} disabled={spinning}>
              新規
            </Button>
          </div>
          <p className="pt-3 text-center font-mono text-xs tracking-[0.28em] text-primary">
            {finished ? "終了" : gain === null ? "" : gain > 0 ? `+${gain}` : "外れ"}
          </p>
          {winners.length > 0 ? (
            <ul className="flex flex-wrap justify-center gap-3 pt-8">
              {winners.map((entry, index) => (
                <li key={entry.name}>
                  <Ticket entry={entry} index={index} win compact />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            spin()
          }}
        >
          {groups.map((group, index) => (
            <fieldset key={index} className="space-y-2 border border-white/10 p-3">
              <div className="grid grid-cols-[1fr_5rem] gap-2">
                <div className="space-y-1">
                  <Label htmlFor={`group-${index}`}>組</Label>
                  <Input
                    id={`group-${index}`}
                    value={group.name}
                    onChange={(event) => update(index, { name: event.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`weight-${index}`}>重み</Label>
                  <Input
                    id={`weight-${index}`}
                    type="number"
                    min={0}
                    step={0.1}
                    value={group.weight}
                    onChange={(event) => update(index, { weight: Number(event.target.value) })}
                  />
                </div>
              </div>
              <Textarea
                aria-label={`${group.name} の名簿`}
                rows={5}
                value={group.text}
                onChange={(event) => update(index, { text: event.target.value })}
              />
            </fieldset>
          ))}
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full"
            onClick={() => setGroups((prev) => [...prev, { name: "丙", weight: 1, text: "" }])}
          >
            組を追加
          </Button>
        </form>
      </div>
    </Frame>
  )
}
