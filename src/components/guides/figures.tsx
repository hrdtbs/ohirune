function tone(value: number, scale: "board" | "piece"): string {
  if (scale === "board") {
    if (value >= 100) return "bg-primary text-primary-foreground"
    if (value >= 15) return "bg-primary/55 text-primary-foreground"
    if (value > 0) return "bg-primary/20 text-foreground"
    if (value <= -20) return "bg-black/55 text-muted-foreground"
    if (value < 0) return "bg-black/30 text-muted-foreground"
    return "bg-[#1d3a2c] text-foreground/70"
  }
  if (value >= 6) return "bg-primary text-primary-foreground"
  if (value >= 2) return "bg-primary/50 text-foreground"
  if (value > 0) return "bg-primary/20 text-foreground"
  if (value === 0) return "bg-[#1d3a2c] text-foreground/55"
  if (value <= -8) return "bg-black/60 text-muted-foreground"
  return "bg-black/35 text-muted-foreground"
}

export function ScoreGrid({
  values,
  files,
  marks,
  scale,
}: {
  values: readonly number[]
  files: string
  marks?: ReadonlySet<number>
  scale: "board" | "piece"
}) {
  return (
    <div className="mx-auto w-full max-w-[340px]">
      <div className="grid grid-cols-[1rem_repeat(8,minmax(0,1fr))] gap-px">
        <span />
        {files.split("").map((file) => (
          <span key={file} className="pb-1 text-center font-mono text-[9px] text-muted-foreground sm:text-[10px]">
            {file}
          </span>
        ))}
        {Array.from({ length: 8 }, (_, row) => {
          const rank = 8 - row
          return (
            <div key={rank} className="col-span-9 grid grid-cols-subgrid">
              <span className="flex items-center justify-center font-mono text-[9px] text-muted-foreground sm:text-[10px]">{rank}</span>
              {Array.from({ length: 8 }, (_, file) => {
                const index = (rank - 1) * 8 + file
                const value = values[index] ?? 0
                const marked = marks?.has(index)
                return (
                  <span
                    key={index}
                    className={`flex aspect-square items-center justify-center font-mono text-[8px] tabular-nums sm:text-[10px] ${tone(value, scale)} ${marked ? "ring-1 ring-primary ring-inset" : ""}`}
                  >
                    {value}
                  </span>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function PlaceScores({ rows }: { rows: readonly { label: string; value: number }[] }) {
  return (
    <div className="flex flex-col">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-4 border-b border-white/10 py-2">
          <span className="text-sm">{row.label}</span>
          <span className="font-mono text-2xl tabular-nums text-primary">{row.value}</span>
        </div>
      ))}
    </div>
  )
}
