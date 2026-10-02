"use client"

import { useSyncExternalStore } from "react"

const EVENT = "ohirune-record"

export function readRecord(key: string): number | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(key)
  if (raw === null || raw === "") return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

export function writeRecord(key: string, value: number): void {
  window.localStorage.setItem(key, String(value))
  window.dispatchEvent(new Event(EVENT))
}

export function saveIfBetter(
  key: string,
  value: number,
  better: (next: number, prev: number) => boolean,
): void {
  const prev = readRecord(key)
  if (prev === null || better(value, prev)) writeRecord(key, value)
}

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener(EVENT, onStoreChange)
  window.addEventListener("storage", onStoreChange)
  return () => {
    window.removeEventListener(EVENT, onStoreChange)
    window.removeEventListener("storage", onStoreChange)
  }
}

export function useRecord(key: string): number | null {
  return useSyncExternalStore(
    subscribe,
    () => readRecord(key),
    () => null,
  )
}
