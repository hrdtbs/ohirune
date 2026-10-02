import Link from "next/link"
import type { ReactNode } from "react"

export function Frame({
  index,
  name,
  children,
}: {
  index: string
  name: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 pb-12 sm:px-6">
      <header className="flex items-center justify-between gap-4 py-4">
        <Link
          href="/"
          className="font-mono text-[11px] tracking-[0.32em] text-muted-foreground transition-colors hover:text-foreground"
        >
          OHIRUNE
        </Link>
        <p className="font-mono text-[11px] tracking-[0.22em] text-muted-foreground">
          {index}
          <span className="ml-3 tracking-[0.18em] text-foreground">{name}</span>
        </p>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  )
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[4.5rem]">
      <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="font-mono text-lg tabular-nums leading-none">{value}</div>
    </div>
  )
}
