"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Frame, Stat } from "@/components/frame"
import { hintFor, missEnds, NUMBERS, pickAnswer, timeRank } from "@/lib/guess/round"
import { saveIfBetter, useRecord } from "@/lib/storage"

type Phase = "idle" | "play" | "clear" | "fail"

export function GuessGame() {
  const [phase, setPhase] = useState<Phase>("idle")
  const [answer, setAnswer] = useState(1)
  const [misses, setMisses] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [note, setNote] = useState("")
  const best = useRecord("ohirune.guess")
  const started = useRef(0)
  const secondsRef = useRef(0)

  useEffect(() => {
    if (phase !== "play") return
    const id = window.setInterval(() => {
      secondsRef.current = (performance.now() - started.current) / 1000
      setSeconds(secondsRef.current)
    }, 100)
    return () => window.clearInterval(id)
  }, [phase])

  function begin() {
    started.current = performance.now()
    setAnswer(pickAnswer(Math.random))
    setMisses(0)
    secondsRef.current = 0
    setSeconds(0)
    setNote("")
    setPhase("play")
  }

  function choose(value: number) {
    if (phase !== "play") return
    if (value === answer) {
      const elapsed = secondsRef.current
      setSeconds(elapsed)
      setNote(timeRank(elapsed))
      setPhase("clear")
      saveIfBetter("ohirune.guess", elapsed, (next, prev) => next < prev)
      return
    }
    if (missEnds(misses)) {
      setMisses(misses + 1)
      setNote("失敗")
      setPhase("fail")
      return
    }
    setMisses((count) => count + 1)
    setNote(hintFor(value, answer) === "small" ? "小さい" : "大きい")
  }

  const done = phase === "clear" || phase === "fail"

  return (
    <Frame index="10" name="GUESS">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
        <div className="flex gap-6">
          <Stat label="時間" value={seconds.toFixed(1)} />
          <Stat label="外れ" value={String(misses)} />
          <Stat label="最短" value={best === null ? "—" : best.toFixed(1)} />
        </div>
        <Button type="button" variant="outline" className="h-10 px-4" onClick={begin}>
          {phase === "idle" ? "開始" : "新規"}
        </Button>
      </div>

      <div className="mx-auto grid w-full max-w-md flex-1 grid-cols-5 content-center gap-2">
        {NUMBERS.map((value) => {
          const revealed = done && value === answer
          return (
            <button
              key={value}
              type="button"
              disabled={phase !== "play"}
              onClick={() => choose(value)}
              className={`h-14 border font-mono text-lg tabular-nums transition-colors disabled:cursor-default ${
                revealed ? "border-primary text-primary" : "border-white/15 bg-card text-foreground"
              }`}
            >
              {value}
            </button>
          )
        })}
      </div>
      <p className="h-8 pt-4 text-center font-mono text-xs tracking-[0.28em] text-primary">{note}</p>
    </Frame>
  )
}
