export function Mark({ slug, className }: { slug: string; className?: string }) {
  const common = {
    viewBox: "0 0 64 64",
    className,
    fill: "none",
    "aria-hidden": true as const,
  }
  if (slug === "slide") {
    return (
      <svg {...common}>
        <rect x="6" y="6" width="24" height="24" stroke="currentColor" strokeWidth="1.5" />
        <rect x="34" y="6" width="24" height="24" stroke="currentColor" strokeWidth="1.5" />
        <rect x="6" y="34" width="24" height="24" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    )
  }
  if (slug === "reversi") {
    return (
      <svg {...common}>
        <circle cx="24" cy="32" r="14" fill="currentColor" />
        <circle cx="40" cy="32" r="14" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    )
  }
  if (slug === "arcana") {
    return (
      <svg {...common}>
        <rect x="18" y="8" width="28" height="40" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="10" y="14" width="28" height="40" rx="2" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    )
  }
  if (slug === "lot") {
    return (
      <svg {...common}>
        <rect x="8" y="16" width="48" height="32" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="44" cy="32" r="7" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    )
  }
  if (slug === "chroma") {
    return (
      <svg {...common}>
        <circle cx="32" cy="32" r="16" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="32" cy="32" r="6" fill="currentColor" />
      </svg>
    )
  }
  if (slug === "type") {
    return (
      <svg {...common}>
        <path d="M12 20 H52 M32 20 V48" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    )
  }
  if (slug === "jump") {
    return (
      <svg {...common}>
        <path d="M18 46 H52" stroke="currentColor" strokeWidth="1.5" />
        <path d="M28 40 L38 22 L48 40 Z" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    )
  }
  if (slug === "guess") {
    return (
      <svg {...common}>
        <path d="M16 22 H28 M16 32 H36 M16 42 H24" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    )
  }
  if (slug === "tarot") {
    return (
      <svg {...common}>
        <rect x="20" y="8" width="24" height="40" stroke="currentColor" strokeWidth="1.5" />
        <path d="M32 20 L34 26 H40 L35 30 L37 36 L32 32 L27 36 L29 30 L24 26 H30 Z" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    )
  }
  if (slug === "triad") {
    return (
      <svg {...common}>
        <circle cx="18" cy="42" r="6" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="46" cy="42" r="6" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="32" cy="16" r="6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M22 38 L30 20 M42 38 L34 20 M24 42 H40" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    )
  }
  if (slug === "chess") {
    return (
      <svg {...common}>
        <rect x="10" y="10" width="44" height="44" stroke="currentColor" strokeWidth="1.5" />
        <path d="M32 18 V46 M20 32 H44" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    )
  }
  if (slug === "solitaire") {
    return (
      <svg {...common}>
        <rect x="14" y="8" width="26" height="38" stroke="currentColor" strokeWidth="1.5" />
        <rect x="24" y="18" width="26" height="38" stroke="currentColor" strokeWidth="1.5" />
        <path d="M37 28 L43 34 L37 40 L31 34 Z" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    )
  }
  if (slug === "capsule") {
    return (
      <svg {...common}>
        <circle cx="32" cy="32" r="16" stroke="currentColor" strokeWidth="1.5" />
        <path d="M16 32 H48" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <circle cx="32" cy="32" r="18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M32 14v36M14 32h36" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
