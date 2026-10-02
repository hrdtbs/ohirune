"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Frame, Stat } from "@/components/frame"
import { saveIfBetter, useRecord } from "@/lib/storage"
import {
  advance,
  collides,
  KINDS,
  nextGap,
  OBSTACLE_SIZE,
  PLAYER,
  speedFor,
  stepBody,
  takePassed,
  type Body,
  type Obstacle,
  type ObstacleKind,
} from "@/lib/jump/world"

type Phase = "idle" | "run" | "over"

function ObstacleShape({ kind }: { kind: ObstacleKind }) {
  const size = OBSTACLE_SIZE[kind]
  if (kind === "medium") {
    return (
      <span
        className="block rounded-full border border-primary"
        style={{ width: size.width, height: size.height }}
      />
    )
  }
  if (kind === "large") {
    return (
      <svg width={size.width} height={size.height} viewBox="0 0 40 70" aria-hidden>
        <path d="M20 2 L38 68 H2 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    )
  }
  return (
    <span className="block border border-primary" style={{ width: size.width, height: size.height }} />
  )
}

export function JumpGame() {
  const [phase, setPhase] = useState<Phase>("idle")
  const [score, setScore] = useState(0)
  const [obstacles, setObstacles] = useState<Obstacle[]>([])
  const [lift, setLift] = useState(0)
  const best = useRecord("ohirune.jump")
  const phaseRef = useRef<Phase>("idle")
  const scoreRef = useRef(0)
  const obsRef = useRef<Obstacle[]>([])
  const bodyRef = useRef<Body>({ y: 0, vy: 0 })
  const jumpRef = useRef(false)
  const gapRef = useRef(360)
  const travelRef = useRef(0)
  const idRef = useRef(1)
  const fieldRef = useRef<HTMLDivElement>(null)

  const act = useCallback(() => {
    if (phaseRef.current !== "run") {
      scoreRef.current = 0
      obsRef.current = []
      bodyRef.current = { y: 0, vy: 0 }
      jumpRef.current = false
      gapRef.current = 360
      travelRef.current = 0
      setScore(0)
      setObstacles([])
      setLift(0)
      phaseRef.current = "run"
      setPhase("run")
      return
    }
    jumpRef.current = true
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.code !== "Space") return
      const target = event.target
      if (target instanceof HTMLElement && target.closest("input, textarea, a")) return
      event.preventDefault()
      act()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [act])

  useEffect(() => {
    if (phase !== "run") return
    let raf = 0
    let last = 0
    const tick = (now: number) => {
      if (phaseRef.current !== "run") return
      const dt = last === 0 ? 0 : Math.min(0.032, (now - last) / 1000)
      last = now
      bodyRef.current = stepBody(bodyRef.current, dt, jumpRef.current)
      jumpRef.current = false
      const speed = speedFor(scoreRef.current)
      const width = fieldRef.current?.clientWidth || 640
      const height = fieldRef.current?.clientHeight || 240
      obsRef.current = advance(obsRef.current, dt, speed)
      const passed = takePassed(obsRef.current, PLAYER.x)
      obsRef.current = passed.obstacles
      if (passed.gained > 0) scoreRef.current += passed.gained
      travelRef.current += speed * dt
      if (travelRef.current >= gapRef.current) {
        travelRef.current = 0
        gapRef.current = nextGap(scoreRef.current, Math.random)
        const kind = KINDS[Math.floor(Math.random() * KINDS.length)] ?? "small"
        obsRef.current = [...obsRef.current, { id: idRef.current++, x: width, kind, scored: false }]
      }
      if (dt > 0 && collides(height, bodyRef.current.y, obsRef.current)) {
        if (scoreRef.current > 0) saveIfBetter("ohirune.jump", scoreRef.current, (value, prev) => value > prev)
        setScore(scoreRef.current)
        setLift(bodyRef.current.y)
        setObstacles([...obsRef.current])
        phaseRef.current = "over"
        setPhase("over")
        return
      }
      setScore(scoreRef.current)
      setLift(bodyRef.current.y)
      setObstacles([...obsRef.current])
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  const message = phase === "over" ? "終了" : phase === "idle" ? "スペースで開始" : ""

  return (
    <Frame index="08" name="JUMP">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
        <div className="flex gap-6">
          <Stat label="得点" value={String(score)} />
          <Stat label="最高" value={best === null ? "—" : String(best)} />
        </div>
        <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">スペース / タップ</p>
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <div
          ref={fieldRef}
          role="application"
          aria-label="ジャンプ"
          tabIndex={0}
          onPointerDown={(event) => {
            event.preventDefault()
            act()
          }}
          className="relative mx-auto h-60 w-full max-w-3xl touch-none overflow-hidden border border-white/15 bg-card outline-none select-none sm:h-72"
        >
          <div className="absolute inset-x-0 bottom-0 h-px bg-primary/70" />
          <div
            className="absolute text-primary"
            style={{
              left: PLAYER.x,
              bottom: lift,
              width: PLAYER.width,
              height: PLAYER.height,
            }}
          >
            <svg viewBox="0 0 50 50" width="50" height="50" aria-hidden>
              <path d="M25 4 L46 25 L25 46 L4 25 Z" fill="currentColor" />
            </svg>
          </div>
          {obstacles.map((obstacle) => (
            <div key={obstacle.id} className="absolute bottom-0 text-primary" style={{ left: obstacle.x }}>
              <ObstacleShape kind={obstacle.kind} />
            </div>
          ))}
          {message ? (
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-background/55">
              <p className="font-mono text-xs tracking-[0.28em]">{message}</p>
            </div>
          ) : null}
        </div>
      </div>
    </Frame>
  )
}
