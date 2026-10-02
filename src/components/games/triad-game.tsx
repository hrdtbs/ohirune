"use client"

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Frame } from "@/components/frame"
import {
  EMPTY,
  LABELS,
  PALETTE,
  STAMPS,
  STYLES,
  addBond,
  addCluster,
  addMargin,
  addPerson,
  bendFrom,
  bondDraw,
  clusterFrame,
  commit,
  diagramSvg,
  history,
  nearBond,
  parseDiagram,
  patchBond,
  patchCluster,
  patchMargin,
  patchPerson,
  personAt,
  redo,
  removeBond,
  removeCluster,
  removeMargin,
  removePerson,
  sampleDiagram,
  swapBonds,
  toggleMarginLink,
  toggleMember,
  undo,
  type Diagram,
  type EdgeStyle,
  type Hist,
  type NodeShape,
  type Person,
  type Stamp,
} from "@/lib/triad/model"

const KEY = "ohirune.triad"
const STORE = "ohirune-triad"

function subscribeStore(onStoreChange: () => void) {
  window.addEventListener(STORE, onStoreChange)
  window.addEventListener("storage", onStoreChange)
  return () => {
    window.removeEventListener(STORE, onStoreChange)
    window.removeEventListener("storage", onStoreChange)
  }
}

function readStore() {
  return window.localStorage.getItem(KEY) ?? ""
}

type Sel = { kind: "person" | "bond" | "cluster" | "margin"; id: string } | null

type Drag =
  | { kind: "pan"; px: number; py: number; vx: number; vy: number }
  | { kind: "person"; id: string; dx: number; dy: number; origin: Diagram }
  | { kind: "bend"; id: string; origin: Diagram }
  | { kind: "margin"; id: string; dx: number; dy: number; origin: Diagram }
  | { kind: "label"; id: string; dx: number; dy: number; origin: Diagram }
  | { kind: "connect"; from: string; x: number; y: number }

type View = { x: number; y: number; k: number }

function same(a: Diagram, b: Diagram) {
  return JSON.stringify(a) === JSON.stringify(b)
}

async function fileText(file: File) {
  return file.text()
}

async function shrinkImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 240 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const ctx = canvas.getContext("2d")
  if (!ctx) return ""
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL("image/jpeg", 0.84)
}

export function TriadGame() {
  const savedRaw = useSyncExternalStore(subscribeStore, readStore, () => "")
  const saved = parseDiagram(savedRaw)
  const [local, setLocal] = useState<Diagram | null>(null)
  const diagram = local ?? saved ?? EMPTY
  const [sel, setSel] = useState<Sel>(null)
  const [view, setView] = useState<View>({ x: 24, y: 28, k: 1 })
  const [bare, setBare] = useState(false)
  const [clearBg, setClearBg] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [linking, setLinking] = useState(false)
  const [draft, setDraft] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  const hist = useRef<Hist>(history(EMPTY))
  const histReady = useRef(false)
  const diagramRef = useRef(diagram)
  const viewRef = useRef(view)
  const drag = useRef<Drag | null>(null)
  const board = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLInputElement>(null)
  if (saved && !histReady.current) {
    histReady.current = true
    hist.current = history(saved)
  }
  diagramRef.current = diagram
  viewRef.current = view

  function publish(next: Diagram) {
    setLocal(next)
    window.localStorage.setItem(KEY, JSON.stringify(next))
    window.dispatchEvent(new Event(STORE))
  }

  useEffect(() => {
    const node = board.current
    if (!node) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const current = viewRef.current
      const nextK = Math.min(2.4, Math.max(0.35, current.k * (event.deltaY < 0 ? 1.08 : 1 / 1.08)))
      const rect = node.getBoundingClientRect()
      const px = event.clientX - rect.left
      const py = event.clientY - rect.top
      const wx = (px - current.x) / current.k
      const wy = (py - current.y) / current.k
      setView({ k: nextK, x: px - wx * nextK, y: py - wy * nextK })
    }
    node.addEventListener("wheel", onWheel, { passive: false })
    return () => node.removeEventListener("wheel", onWheel)
  }, [])

  function world(event: { clientX: number; clientY: number }) {
    const rect = board.current?.getBoundingClientRect()
    const current = viewRef.current
    return {
      x: ((event.clientX - (rect?.left ?? 0)) - current.x) / current.k,
      y: ((event.clientY - (rect?.top ?? 0)) - current.y) / current.k,
    }
  }

  function apply(next: Diagram, keep: boolean) {
    if (keep) hist.current = commit(hist.current, next)
    publish(next)
  }

  function selectedPerson() {
    return sel?.kind === "person" ? diagram.people.find((person) => person.id === sel.id) ?? null : null
  }
  function selectedBond() {
    return sel?.kind === "bond" ? diagram.bonds.find((bond) => bond.id === sel.id) ?? null : null
  }
  function selectedCluster() {
    return sel?.kind === "cluster" ? diagram.clusters.find((cluster) => cluster.id === sel.id) ?? null : null
  }
  function selectedMargin() {
    return sel?.kind === "margin" ? diagram.margins.find((margin) => margin.id === sel.id) ?? null : null
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const target = (event.target as HTMLElement).closest("[data-kind]") as HTMLElement | null
    const kind = target?.dataset.kind
    const id = target?.dataset.id ?? ""
    const pt = world(event)
    event.currentTarget.setPointerCapture(event.pointerId)
    if (kind === "handle" && id) {
      drag.current = { kind: "connect", from: id, x: pt.x, y: pt.y }
      const person = diagramRef.current.people.find((item) => item.id === id)
      setDraft(person ? { x1: person.x, y1: person.y, x2: pt.x, y2: pt.y } : null)
      return
    }
    if (kind === "person" && id) {
      if (editing) {
        apply(toggleMember(diagramRef.current, editing, id), true)
        return
      }
      if (linking && sel?.kind === "margin") {
        apply(toggleMarginLink(diagramRef.current, sel.id, { kind: "person", id }), true)
        return
      }
      const person = diagramRef.current.people.find((item) => item.id === id)
      if (!person) return
      setSel({ kind: "person", id })
      drag.current = { kind: "person", id, dx: pt.x - person.x, dy: pt.y - person.y, origin: diagramRef.current }
      return
    }
    if (kind === "margin" && id) {
      const margin = diagramRef.current.margins.find((item) => item.id === id)
      if (!margin) return
      setSel({ kind: "margin", id })
      drag.current = { kind: "margin", id, dx: pt.x - margin.x, dy: pt.y - margin.y, origin: diagramRef.current }
      return
    }
    if (kind === "label" && id) {
      const cluster = diagramRef.current.clusters.find((item) => item.id === id)
      if (!cluster) return
      setSel({ kind: "cluster", id })
      drag.current = { kind: "label", id, dx: pt.x - cluster.labelX, dy: pt.y - cluster.labelY, origin: diagramRef.current }
      return
    }
    if (kind === "bond" && id) {
      if (event.shiftKey && sel?.kind === "bond" && sel.id !== id) apply(swapBonds(diagramRef.current, sel.id, id), true)
      if (linking && sel?.kind === "margin") {
        apply(toggleMarginLink(diagramRef.current, sel.id, { kind: "bond", id }), true)
        return
      }
      setSel({ kind: "bond", id })
      drag.current = { kind: "bend", id, origin: diagramRef.current }
      return
    }
    if (kind === "cluster" && id) {
      setSel({ kind: "cluster", id })
      return
    }
    const hit = [...diagramRef.current.bonds].reverse().find((bond) => {
      const from = diagramRef.current.people.find((person) => person.id === bond.from)
      const to = diagramRef.current.people.find((person) => person.id === bond.to)
      return from && to && nearBond(pt, from, to, bond.bend)
    })
    if (hit) {
      setSel({ kind: "bond", id: hit.id })
      drag.current = { kind: "bend", id: hit.id, origin: diagramRef.current }
      return
    }
    setSel(null)
    drag.current = { kind: "pan", px: event.clientX, py: event.clientY, vx: viewRef.current.x, vy: viewRef.current.y }
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const current = drag.current
    if (!current) return
    const pt = world(event)
    if (current.kind === "pan") {
      setView({ ...viewRef.current, x: current.vx + event.clientX - current.px, y: current.vy + event.clientY - current.py })
      return
    }
    if (current.kind === "person") {
      publish(patchPerson(diagramRef.current, current.id, { x: pt.x - current.dx, y: pt.y - current.dy }))
      return
    }
    if (current.kind === "margin") {
      publish(patchMargin(diagramRef.current, current.id, { x: pt.x - current.dx, y: pt.y - current.dy }))
      return
    }
    if (current.kind === "label") {
      publish(patchCluster(diagramRef.current, current.id, { labelX: pt.x - current.dx, labelY: pt.y - current.dy }))
      return
    }
    if (current.kind === "bend") {
      const bond = diagramRef.current.bonds.find((item) => item.id === current.id)
      const from = diagramRef.current.people.find((person) => person.id === bond?.from)
      const to = diagramRef.current.people.find((person) => person.id === bond?.to)
      if (!bond || !from || !to) return
      publish(patchBond(diagramRef.current, bond.id, { bend: bendFrom(from, to, pt) }))
      return
    }
    if (current.kind === "connect") {
      const from = diagramRef.current.people.find((person) => person.id === current.from)
      if (!from) return
      setDraft({ x1: from.x, y1: from.y, x2: pt.x, y2: pt.y })
    }
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const current = drag.current
    drag.current = null
    setDraft(null)
    if (!current || current.kind === "pan") return
    if (current.kind === "connect") {
      const hit = personAt(diagramRef.current, world(event))
      if (hit) {
        const next = addBond(diagramRef.current, current.from, hit.id)
        if (next) {
          apply(next, true)
          const created = next.bonds[next.bonds.length - 1]
          if (created) setSel({ kind: "bond", id: created.id })
        }
      }
      return
    }
    if (!same(current.origin, diagramRef.current)) hist.current = commit({ ...hist.current, present: current.origin }, diagramRef.current)
  }

  function step(direction: "undo" | "redo") {
    const next = direction === "undo" ? undo(hist.current) : redo(hist.current)
    hist.current = next
    publish(next.present)
    setSel(null)
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault()
        step(event.shiftKey ? "redo" : "undo")
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault()
        step("redo")
      } else if (event.key === "Escape") {
        setEditing(null)
        setLinking(false)
        setBare(false)
      } else if (!typing && (event.key === "Backspace" || event.key === "Delete") && sel) {
        event.preventDefault()
        erase()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  function erase() {
    if (!sel) return
    const current = diagramRef.current
    const next =
      sel.kind === "person"
        ? removePerson(current, sel.id)
        : sel.kind === "bond"
          ? removeBond(current, sel.id)
          : sel.kind === "cluster"
            ? removeCluster(current, sel.id)
            : removeMargin(current, sel.id)
    apply(next, true)
    setSel(null)
    if (editing === sel.id) setEditing(null)
  }

  function fit(next: Diagram) {
    const drawn = diagramSvg(next, null)
    const rect = board.current?.getBoundingClientRect()
    const w = rect?.width ?? 800
    const h = rect?.height ?? 560
    const k = Math.min(1.15, Math.max(0.4, Math.min((w - 28) / drawn.width, (h - 28) / drawn.height)))
    setView({ k, x: (w - drawn.width * k) / 2 - drawn.minX * k, y: (h - drawn.height * k) / 2 - drawn.minY * k })
  }

  function center(): { x: number; y: number } {
    const rect = board.current?.getBoundingClientRect()
    const current = viewRef.current
    return {
      x: (((rect?.width ?? 640) / 2) - current.x) / current.k,
      y: (((rect?.height ?? 480) / 2) - current.y) / current.k,
    }
  }

  async function writePng() {
    const drawn = diagramSvg(diagramRef.current, clearBg ? null : "#1c1a16")
    const url = URL.createObjectURL(new Blob([drawn.svg], { type: "image/svg+xml;charset=utf-8" }))
    try {
      const image = new Image()
      image.src = url
      await image.decode()
      const canvas = document.createElement("canvas")
      canvas.width = Math.ceil(drawn.width * 2)
      canvas.height = Math.ceil(drawn.height * 2)
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
      if (!blob) return
      const href = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = href
      link.download = "triad.png"
      link.click()
      URL.revokeObjectURL(href)
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  const person = selectedPerson()
  const bond = selectedBond()
  const cluster = selectedCluster()
  const margin = selectedMargin()

  return (
    <Frame index="12" name="TRIAD">
      {bare ? (
        <div className="fixed top-3 right-3 z-20">
          <Button type="button" variant="outline" className="h-10 px-3" onClick={() => setBare(false)}>
            戻る
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pb-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="h-10 px-3" onClick={() => {
              const next = addPerson(diagram, center())
              apply(next, true)
              const created = next.people[next.people.length - 1]
              if (created) setSel({ kind: "person", id: created.id })
            }}>
              加える
            </Button>
            <Button type="button" variant="outline" className="h-10 px-3" disabled={!person} onClick={() => {
              if (!person) return
              const next = addCluster(diagram, person.id)
              if (!next) return
              apply(next, true)
              const created = next.clusters[next.clusters.length - 1]
              if (created) {
                setEditing(created.id)
                setSel({ kind: "cluster", id: created.id })
              }
            }}>
              囲む
            </Button>
            <Button type="button" variant="outline" className="h-10 px-3" onClick={() => {
              const next = addMargin(diagram, center())
              apply(next, true)
              const created = next.margins[next.margins.length - 1]
              if (created) setSel({ kind: "margin", id: created.id })
            }}>
              注
            </Button>
            <Button type="button" variant="outline" className="h-10 px-3" onClick={() => step("undo")}>
              戻す
            </Button>
            <Button type="button" variant="outline" className="h-10 px-3" onClick={() => step("redo")}>
              進む
            </Button>
            <Button type="button" variant="outline" className="h-10 px-3" onClick={() => {
              const next = sampleDiagram()
              apply(next, true)
              setSel(null)
              fit(next)
            }}>
              見本
            </Button>
            <Button type="button" variant="outline" className="h-10 px-3" onClick={() => {
              const blob = new Blob([JSON.stringify(diagram)], { type: "application/json" })
              const href = URL.createObjectURL(blob)
              const link = document.createElement("a")
              link.href = href
              link.download = "triad.json"
              link.click()
              URL.revokeObjectURL(href)
            }}>
              保存
            </Button>
            <Button type="button" variant="outline" className="h-10 px-3" onClick={() => fileRef.current?.click()}>
              開く
            </Button>
            <Button type="button" variant="outline" className="h-10 px-3" onClick={() => void writePng()}>
              書き出す
            </Button>
            <Button type="button" variant={clearBg ? "default" : "outline"} className="h-10 px-3" onClick={() => setClearBg((value) => !value)}>
              透過
            </Button>
            <Button type="button" variant="outline" className="h-10 px-3" onClick={() => setBare(true)}>
              隠す
            </Button>
            <Button type="button" variant="outline" className="h-10 px-3" disabled={!sel} onClick={erase}>
              消す
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ""
                if (!file) return
                void fileText(file).then((text) => {
                  const parsed = parseDiagram(text)
                  if (!parsed) return
                  apply(parsed, true)
                  setSel(null)
                  fit(parsed)
                })
              }}
            />
          </div>
          {editing ? (
            <div className="flex items-center gap-3 font-mono text-[10px] tracking-[0.18em] text-muted-foreground">
              <span>囲み</span>
              <Button type="button" variant="outline" className="h-8 px-3" onClick={() => setEditing(null)}>
                完了
              </Button>
            </div>
          ) : null}
          {person ? (
            <Inspector>
              <Field label="名前">
                <Input aria-label="名前" value={person.name} className="h-10 w-28" onChange={(event) => apply(patchPerson(diagram, person.id, { name: event.target.value }), true)} />
              </Field>
              <Field label="一言">
                <Input aria-label="一言" value={person.comment} className="h-10 w-36" onChange={(event) => apply(patchPerson(diagram, person.id, { comment: event.target.value }), true)} />
              </Field>
              <Choice
                value={person.shape}
                options={[
                  ["circle", "円"],
                  ["square", "角"],
                  ["balloon", "吹"],
                ]}
                onChange={(shape) => apply(patchPerson(diagram, person.id, { shape: shape as NodeShape }), true)}
              />
              <Field label="印">
                <Input aria-label="印" value={person.emoji} className="h-10 w-16 text-center" onChange={(event) => apply(patchPerson(diagram, person.id, { emoji: event.target.value }), true)} />
              </Field>
              <Button type="button" variant="outline" className="h-10 px-3" onClick={() => imageRef.current?.click()}>
                画像
              </Button>
              {person.image ? (
                <Button type="button" variant="outline" className="h-10 px-3" onClick={() => apply(patchPerson(diagram, person.id, { image: null }), true)}>
                  画像を外す
                </Button>
              ) : null}
              <Swatches value={person.color} onChange={(color) => apply(patchPerson(diagram, person.id, { color }), true)} />
              <input
                ref={imageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ""
                  if (!file || !person) return
                  void shrinkImage(file).then((image) => {
                    if (image) apply(patchPerson(diagramRef.current, person.id, { image }), true)
                  })
                }}
              />
            </Inspector>
          ) : null}
          {bond ? (
            <Inspector>
              <div className="flex flex-wrap gap-1">
                {LABELS.map((label) => (
                  <Button key={label} type="button" variant={bond.label === label ? "default" : "outline"} className="h-10 px-3" onClick={() => apply(patchBond(diagram, bond.id, { label }), true)}>
                    {label}
                  </Button>
                ))}
              </div>
              <Input aria-label="関係" value={bond.label} className="h-10 w-28" onChange={(event) => apply(patchBond(diagram, bond.id, { label: event.target.value }), true)} />
              <Choice value={bond.style} options={STYLES.map((style) => [style.id, style.label])} onChange={(style) => apply(patchBond(diagram, bond.id, { style: style as EdgeStyle }), true)} />
              <Choice value={bond.stamp} options={STAMPS.map((stamp) => [stamp.id, stamp.label])} onChange={(stamp) => apply(patchBond(diagram, bond.id, { stamp: stamp as Stamp }), true)} />
              <Swatches value={bond.color} onChange={(color) => apply(patchBond(diagram, bond.id, { color }), true)} />
            </Inspector>
          ) : null}
          {cluster ? (
            <Inspector>
              <Field label="囲み">
                <Input aria-label="囲み名" value={cluster.name} className="h-10 w-28" onChange={(event) => apply(patchCluster(diagram, cluster.id, { name: event.target.value }), true)} />
              </Field>
              <Button type="button" variant={cluster.showName ? "default" : "outline"} className="h-10 px-3" onClick={() => apply(patchCluster(diagram, cluster.id, { showName: !cluster.showName }), true)}>
                名
              </Button>
              <Swatches value={cluster.color} onChange={(color) => apply(patchCluster(diagram, cluster.id, { color }), true)} />
            </Inspector>
          ) : null}
          {margin ? (
            <Inspector>
              <Field label="注">
                <Input aria-label="注" value={margin.text} className="h-10 w-44" onChange={(event) => apply(patchMargin(diagram, margin.id, { text: event.target.value }), true)} />
              </Field>
              <Field label="大">
                <Input aria-label="大きさ" type="number" min={12} max={42} value={margin.size} className="h-10 w-16" onChange={(event) => apply(patchMargin(diagram, margin.id, { size: Number(event.target.value) || 16 }), true)} />
              </Field>
              <Field label="角">
                <Input aria-label="角度" type="number" min={-80} max={80} value={margin.angle} className="h-10 w-16" onChange={(event) => apply(patchMargin(diagram, margin.id, { angle: Number(event.target.value) || 0 }), true)} />
              </Field>
              <Button type="button" variant={linking ? "default" : "outline"} className="h-10 px-3" onClick={() => setLinking((value) => !value)}>
                結ぶ
              </Button>
              <Swatches value={margin.color} onChange={(color) => apply(patchMargin(diagram, margin.id, { color }), true)} />
            </Inspector>
          ) : null}
        </div>
      )}

      <div
        ref={board}
        className="relative min-h-[68dvh] flex-1 touch-none overflow-hidden border border-white/10 bg-card"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          className="absolute top-0 left-0"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, transformOrigin: "0 0" }}
        >
          <svg className="overflow-visible" width="1" height="1">
            {diagram.clusters.map((item) => {
              const frame = clusterFrame(diagram.people, item.members)
              if (!frame) return null
              return (
                <g key={item.id}>
                  <rect data-kind="cluster" data-id={item.id} x={frame.x} y={frame.y} width={frame.w} height={frame.h} rx="28" fill={item.color} fillOpacity={sel?.id === item.id ? 0.22 : 0.13} stroke={item.color} strokeOpacity={0.85} />
                  {item.showName ? (
                    <text data-kind="label" data-id={item.id} x={item.labelX} y={item.labelY} fill={item.color} fontSize="13" className="cursor-grab">
                      {item.name}
                    </text>
                  ) : null}
                </g>
              )
            })}
            {diagram.margins.flatMap((item) =>
              item.links.map((link, index) => {
                const target = linkTarget(diagram, link)
                if (!target) return null
                return <path key={`${item.id}-${index}`} d={`M${item.x} ${item.y} L${target.x} ${target.y}`} fill="none" stroke={item.color} strokeDasharray="4 4" strokeOpacity={0.75} />
              }),
            )}
            {diagram.bonds.map((item) => {
              const from = diagram.people.find((person) => person.id === item.from)
              const to = diagram.people.find((person) => person.id === item.to)
              if (!from || !to) return null
              const draw = bondDraw(from, to, item.bend, item.style)
              const stamp = STAMPS.find((entry) => entry.id === item.stamp)?.label
              return (
                <g key={item.id} data-kind="bond" data-id={item.id} className="cursor-pointer">
                  <path d={draw.d} fill="none" stroke="transparent" strokeWidth={16} />
                  <path d={draw.d} fill="none" stroke={item.color} strokeWidth={sel?.id === item.id ? 2.4 : 1.5} strokeDasharray={item.style === "dash" || item.style === "crack" ? "7 6" : undefined} />
                  <Head x={draw.end.x} y={draw.end.y} angle={draw.end.angle} color={item.color} heart={item.style === "heart"} />
                  {item.style === "both" ? <Head x={draw.start.x} y={draw.start.y} angle={draw.start.angle} color={item.color} heart={false} /> : null}
                  {item.style === "crack" ? <path d={`M${draw.mid.x - 5} ${draw.mid.y - 6} l10 12 M${draw.mid.x + 5} ${draw.mid.y - 6} l-10 12`} stroke={item.color} fill="none" /> : null}
                  <text x={draw.mid.x} y={draw.mid.y - 8} textAnchor="middle" fill={item.color} fontSize="12">
                    {item.label}
                    {stamp && stamp !== "無" ? stamp : ""}
                  </text>
                </g>
              )
            })}
            {draft ? <path d={`M${draft.x1} ${draft.y1} L${draft.x2} ${draft.y2}`} stroke="#c4a15a" fill="none" /> : null}
          </svg>
          {diagram.margins.map((item) => (
            <div
              key={item.id}
              data-kind="margin"
              data-id={item.id}
              className="absolute cursor-grab whitespace-nowrap"
              style={{ left: item.x, top: item.y, color: item.color, fontSize: item.size, transform: `rotate(${item.angle}deg)` }}
            >
              {item.text}
            </div>
          ))}
          {diagram.people.map((item) => (
            <PersonNode key={item.id} person={item} active={sel?.id === item.id} grouped={editing ? diagram.clusters.find((cluster) => cluster.id === editing)?.members.includes(item.id) ?? false : false} />
          ))}
        </div>
      </div>
    </Frame>
  )
}

function linkTarget(diagram: Diagram, link: { kind: "person" | "bond"; id: string }) {
  if (link.kind === "person") return diagram.people.find((person) => person.id === link.id) ?? null
  const bond = diagram.bonds.find((item) => item.id === link.id)
  if (!bond) return null
  const from = diagram.people.find((person) => person.id === bond.from)
  const to = diagram.people.find((person) => person.id === bond.to)
  if (!from || !to) return null
  return bondDraw(from, to, bond.bend, bond.style).mid
}

function PersonNode({ person, active, grouped }: { person: Person; active: boolean; grouped: boolean }) {
  const radius = person.shape === "circle" ? "999px" : person.shape === "square" ? "2px" : "18px"
  return (
    <div data-kind="person" data-id={person.id} className="absolute w-28 -translate-x-1/2 cursor-grab text-center" style={{ left: person.x, top: person.y - 28 }}>
      <div className="relative mx-auto grid size-14 place-items-center text-2xl" style={{ background: person.color, borderRadius: radius, outline: active || grouped ? "2px solid #c4a15a" : "none", color: "#1a1814" }}>
        {person.image ? (
          // User images stay local; next/image cannot optimize data URLs here.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.image} alt="" className="size-12 object-cover" style={{ borderRadius: radius }} />
        ) : (
          <span>{person.emoji}</span>
        )}
        {person.shape === "balloon" ? <span className="absolute -bottom-1.5 left-4 size-3 rotate-45" style={{ background: person.color }} /> : null}
        <span
          data-kind="handle"
          data-id={person.id}
          className="absolute -top-1 -right-1 grid size-5 cursor-crosshair place-items-center rounded-full border border-[#c4a15a] bg-[#1c1a16] font-mono text-[10px] text-[#c4a15a]"
        >
          +
        </span>
      </div>
      <div className="pt-1 text-sm leading-none">{person.name}</div>
      {person.comment ? <div className="pt-1 text-[11px] text-muted-foreground">{person.comment}</div> : null}
    </div>
  )
}

function Head({ x, y, angle, color, heart }: { x: number; y: number; angle: number; color: string; heart: boolean }) {
  if (heart) {
    return <path d={`M${x} ${y} l-6 -4 a4 4 0 0 1 6 -5 a4 4 0 0 1 6 5 z`} fill={color} transform={`rotate(${(angle * 180) / Math.PI} ${x} ${y})`} />
  }
  const size = 9
  const p2x = x - Math.cos(angle - 0.45) * size
  const p2y = y - Math.sin(angle - 0.45) * size
  const p3x = x - Math.cos(angle + 0.45) * size
  const p3y = y - Math.sin(angle + 0.45) * size
  return <polygon points={`${x},${y} ${p2x},${p2y} ${p3x},${p3y}`} fill={color} />
}

function Inspector({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-end gap-2">{children}</div>
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function Choice({ value, options, onChange }: { value: string; options: [string, string][]; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map(([id, label]) => (
        <Button key={id || "none"} type="button" variant={value === id ? "default" : "outline"} className="h-10 px-2.5" onClick={() => onChange(id)}>
          {label}
        </Button>
      ))}
    </div>
  )
}

function Swatches({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex gap-1 pb-1">
      {PALETTE.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={color}
          onClick={() => onChange(color)}
          className="size-7 rounded-full border"
          style={{ background: color, borderColor: value === color ? "#c4a15a" : "transparent" }}
        />
      ))}
    </div>
  )
}
