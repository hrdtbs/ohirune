export type ObstacleKind = "small" | "medium" | "large"

export type Obstacle = {
  id: number
  x: number
  kind: ObstacleKind
  scored: boolean
}

export const OBSTACLE_SIZE: Record<ObstacleKind, { width: number; height: number }> = {
  small: { width: 20, height: 30 },
  medium: { width: 30, height: 50 },
  large: { width: 40, height: 70 },
}

export const PLAYER = { x: 56, width: 50, height: 50 }
export const GRAVITY = 3200
export const JUMP_VELOCITY = 900
export const BASE_SPEED = 260
export const SPEED_STEP = 18
export const MAX_SPEED = 560
export const KINDS: ObstacleKind[] = ["small", "medium", "large"]

export type Body = { y: number; vy: number }

export function speedFor(score: number): number {
  return Math.min(MAX_SPEED, BASE_SPEED + Math.max(0, score) * SPEED_STEP)
}

export function apex(): number {
  return (JUMP_VELOCITY * JUMP_VELOCITY) / (2 * GRAVITY)
}

export function stepBody(body: Body, dt: number, jump: boolean): Body {
  const grounded = body.y <= 0 && body.vy <= 0
  let vy = jump && grounded ? JUMP_VELOCITY : body.vy
  vy -= GRAVITY * dt
  let y = body.y + vy * dt
  if (y <= 0) {
    y = 0
    vy = 0
  }
  return { y, vy }
}

export function nextGap(score: number, rand: () => number): number {
  const room = Math.max(80, 420 - score * 12)
  return 240 + rand() * room
}

export function advance(obstacles: Obstacle[], dt: number, speed: number): Obstacle[] {
  const dx = speed * dt
  return obstacles
    .map((obstacle) => ({ ...obstacle, x: obstacle.x - dx }))
    .filter((obstacle) => obstacle.x + OBSTACLE_SIZE[obstacle.kind].width > 0)
}

export function takePassed(
  obstacles: Obstacle[],
  playerX: number,
): { obstacles: Obstacle[]; gained: number } {
  let gained = 0
  const next = obstacles.map((obstacle) => {
    const width = OBSTACLE_SIZE[obstacle.kind].width
    if (!obstacle.scored && obstacle.x + width <= playerX) {
      gained += 1
      return { ...obstacle, scored: true }
    }
    return obstacle
  })
  return { obstacles: next, gained }
}

export function playerBox(fieldHeight: number, lift: number) {
  const top = fieldHeight - PLAYER.height - lift
  return {
    left: PLAYER.x,
    right: PLAYER.x + PLAYER.width,
    top,
    bottom: top + PLAYER.height,
  }
}

export function overlaps(
  player: { left: number; right: number; top: number; bottom: number },
  obstacle: Obstacle,
  fieldHeight: number,
): boolean {
  const size = OBSTACLE_SIZE[obstacle.kind]
  const left = obstacle.x
  const right = obstacle.x + size.width
  const bottom = fieldHeight
  const top = fieldHeight - size.height
  return player.left < right && player.right > left && player.bottom > top && player.top < bottom
}

export function collides(fieldHeight: number, lift: number, obstacles: Obstacle[]): boolean {
  const player = playerBox(fieldHeight, lift)
  return obstacles.some((obstacle) => overlaps(player, obstacle, fieldHeight))
}
