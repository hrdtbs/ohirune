"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Frame, Stat } from "@/components/frame"
import { saveIfBetter, useRecord } from "@/lib/storage"
import {
  isSolved,
  moveByDirection,
  moveTile,
  shuffledBoard,
  sourceCell,
  type SlideDir,
} from "@/lib/slide/board"

const SIZES = [3, 4, 5] as const
const LEVEL: Record<(typeof SIZES)[number], string> = { 3: "初級", 4: "中級", 5: "上級" }

function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`
}

function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let x = Math.imul(t ^ (t >>> 15), 1 | t)
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

function renderMosaic(seed: number): string {
  const canvas = document.createElement("canvas")
  canvas.width = 900
  canvas.height = 900
  const ctx = canvas.getContext("2d")
  if (!ctx) return ""
  const rng = mulberry32(seed)
  const gold = "#e4b15a"
  const paper = "#f4f0e6"
  const moss = "#7d9a78"
  const clay = "#c4492c"

  ctx.fillStyle = "#14120e"
  ctx.fillRect(0, 0, 900, 900)

  ctx.strokeStyle = gold
  ctx.lineWidth = 12
  ctx.beginPath()
  ctx.arc(220 + rng() * 90, 250, 170 + rng() * 50, 0.15, Math.PI * 1.65)
  ctx.stroke()

  ctx.lineWidth = 3
  for (let i = 0; i < 7; i += 1) {
    ctx.beginPath()
    ctx.arc(650, 620, 28 + i * 44, 0, Math.PI * 2)
    ctx.strokeStyle = i % 2 === 0 ? paper : moss
    ctx.stroke()
  }

  ctx.save()
  ctx.translate(450, 450)
  ctx.rotate((rng() - 0.5) * 0.9)
  for (let i = -8; i <= 8; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? "rgba(228,177,90,0.92)" : "rgba(244,240,230,0.14)"
    ctx.fillRect(-580, i * 28 - 5, 1160, 8)
  }
  ctx.restore()

  ctx.strokeStyle = paper
  ctx.lineWidth = 4
  ctx.strokeRect(62, 62, 196, 196)
  ctx.beginPath()
  ctx.arc(160, 160, 52, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = clay
  ctx.beginPath()
  ctx.moveTo(130, 690)
  ctx.lineTo(270, 870)
  ctx.lineTo(36, 870)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = moss
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.moveTo(690, 70)
  ctx.lineTo(840, 230)
  ctx.lineTo(680, 230)
  ctx.closePath()
  ctx.stroke()

  if (rng() > 0.45) {
    ctx.fillStyle = paper
    for (let i = 0; i < 6; i += 1) ctx.fillRect(490 + i * 30, 78, 8, 150)
  } else {
    ctx.strokeStyle = gold
    ctx.lineWidth = 4
    ctx.strokeRect(500, 86, 230, 150)
    ctx.beginPath()
    ctx.moveTo(500, 86)
    ctx.lineTo(730, 236)
    ctx.moveTo(730, 86)
    ctx.lineTo(500, 236)
    ctx.stroke()
  }

  return canvas.toDataURL("image/png")
}

const mosaicCache = new Map<number, string>()

function mosaicSnapshot(seed: number): string {
  if (typeof document === "undefined") return ""
  const cached = mosaicCache.get(seed)
  if (cached) return cached
  const url = renderMosaic(seed)
  mosaicCache.set(seed, url)
  return url
}

function useMosaic(seed: number): string {
  const [image, setImage] = useState("")
  useEffect(() => {
    const id = requestAnimationFrame(() => setImage(mosaicSnapshot(seed)))
    return () => cancelAnimationFrame(id)
  }, [seed])
  return image
}

export function SlideGame() {
  const [size, setSize] = useState<(typeof SIZES)[number]>(4)
  const [seed, setSeed] = useState(11)
  const [tiles, setTiles] = useState<number[]>(() => shuffledBoard(4, mulberry32(11)))
  const [moves, setMoves] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const best = useRecord(`ohirune.slide.${size}`)
  const image = useMosaic(seed)
  const solved = isSolved(tiles)

  useEffect(() => {
    if (!running || solved) return
    const id = window.setInterval(() => setElapsed((value) => value + 200), 200)
    return () => window.clearInterval(id)
  }, [running, solved])

  function reset(nextSize: (typeof SIZES)[number] = size) {
    const nextSeed = seed + 1 + nextSize
    setSize(nextSize)
    setSeed(nextSeed)
    setTiles(shuffledBoard(nextSize, mulberry32(nextSeed)))
    setMoves(0)
    setElapsed(0)
    setRunning(false)
  }

  function apply(next: number[] | null) {
    if (!next || solved) return
    if (!running) setRunning(true)
    const movesNext = moves + 1
    setTiles(next)
    setMoves(movesNext)
    if (isSolved(next)) saveIfBetter(`ohirune.slide.${size}`, movesNext, (value, prev) => value < prev)
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target
      if (target instanceof HTMLElement && target.closest("input, textarea")) return
      const dir = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
      }[event.key] as SlideDir | undefined
      if (!dir || solved) return
      event.preventDefault()
      const next = moveByDirection(size, tiles, dir)
      if (!next) return
      if (!running) setRunning(true)
      const movesNext = moves + 1
      setTiles(next)
      setMoves(movesNext)
      if (isSolved(next)) saveIfBetter(`ohirune.slide.${size}`, movesNext, (value, prev) => value < prev)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [moves, running, size, solved, tiles])

  const missing = size * size - 1

  return (
    <Frame index="01" name="SLIDE">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-5">
        <div className="flex gap-6">
          <Stat label="手数" value={String(moves)} />
          <Stat label="時間" value={formatTime(elapsed)} />
          <Stat label="最少" value={best === null ? "—" : String(best)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((value) => (
            <Button
              key={value}
              type="button"
              variant={value === size ? "default" : "outline"}
              className="h-10 px-3"
              onClick={() => reset(value)}
            >
              {LEVEL[value]}
            </Button>
          ))}
          <Button type="button" variant="outline" className="h-10 px-4" onClick={() => reset()}>
            新規
          </Button>
        </div>
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-[520px] touch-none">
        {tiles.map((tile, index) => {
          const show = tile >= 0 || (solved && index === tiles.length - 1)
          if (!show) return null
          const id = tile >= 0 ? tile : missing
          const row = Math.floor(index / size)
          const col = index % size
          const src = sourceCell(size, id)
          return (
            <button
              key={id}
              type="button"
              aria-label={`駒 ${id + 1}`}
              disabled={solved || tile < 0}
              onClick={() => apply(moveTile(size, tiles, index))}
              className="absolute top-0 left-0 border border-white/10 bg-cover transition-transform duration-150 ease-out disabled:cursor-default"
              style={{
                width: `calc((100% - ${(size - 1) * 6}px) / ${size})`,
                height: `calc((100% - ${(size - 1) * 6}px) / ${size})`,
                transform: `translate(calc(${col} * (100% + 6px)), calc(${row} * (100% + 6px)))`,
                backgroundImage: image ? `url(${image})` : undefined,
                backgroundSize: `${size * 100}% ${size * 100}%`,
                backgroundPosition: `${(src.col * 100) / (size - 1)}% ${(src.row * 100) / (size - 1)}%`,
                backgroundColor: "#1c1a16",
              }}
            />
          )
        })}
      </div>
      <p className="pt-4 text-center font-mono text-xs tracking-[0.28em] text-primary">
        {solved ? "CLEAR" : ""}
      </p>
    </Frame>
  )
}
