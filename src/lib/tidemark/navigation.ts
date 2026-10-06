import { gridWalkingPath } from '../builtin-adventure/navigation'
export type Point = { x: number; z: number }
export type Obstacle = Point & { width: number; depth: number }
export function groundHeight(z: number) { return Math.max(0, (-z - 35) * 0.13) }
export function walkable(point: Point, obstacles: readonly Obstacle[]): boolean {
  if ((point.x / 56) ** 2 + ((point.z + 17) / 64) ** 2 > 1) return false
  return !obstacles.some(box => Math.abs(point.x - box.x) < box.width / 2 + 0.7 && Math.abs(point.z - box.z) < box.depth / 2 + 0.7)
}
export const walkingPath = (from: Point, to: Point, obstacles: readonly Obstacle[]) => gridWalkingPath(from, to, point => walkable(point, obstacles))
