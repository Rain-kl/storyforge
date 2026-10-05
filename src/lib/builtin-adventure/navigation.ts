export type Point = { x: number; z: number }

/** Spend the movement budget across waypoints, including a turn in a slow
 * render frame. Never skip corners or spend an entire frame discarding a
 * reached waypoint; collision checks remain bounded to short segments. */
export function advanceWalkingPath(from: Point, path: Point[], distance: number, allowed: (point: Point) => boolean): Point {
  let position = { x: from.x, z: from.z }
  let remaining = Math.max(0, Math.min(distance, 10))
  while (path.length && remaining > 0.00001) {
    const target = path[0]
    const dx = target.x - position.x, dz = target.z - position.z
    const length = Math.hypot(dx, dz)
    if (length < 0.00001) { path.shift(); continue }
    const step = Math.min(length, remaining, 0.2)
    const next = { x: position.x + dx / length * step, z: position.z + dz / length * step }
    if (!allowed(next)) break
    position = next
    remaining -= step
    if (step >= length - 0.00001) path.shift()
  }
  return position
}

/** Bounded grid search keeps click navigation within the authored playable area. */
export function gridWalkingPath(from: Point, to: Point, allowed: (point: Point) => boolean): Point[] {
  if (!allowed(to)) return []
  const step = 2; const cell = (p: Point) => ({ x: Math.round(p.x / step), z: Math.round(p.z / step) })
  const start = cell(from); const end = cell(to); const key = (p: Point) => `${p.x},${p.z}`
  const open = [start]; const previous = new Map<string, Point | null>([[key(start), null]])
  const scores = new Map<string, number>([[key(start), 0]])
  for (let examined = 0; open.length && examined < 5000; examined++) {
    open.sort((a, b) => (scores.get(key(a))! + Math.hypot(a.x - end.x, a.z - end.z)) - (scores.get(key(b))! + Math.hypot(b.x - end.x, b.z - end.z)))
    const current = open.shift()!
    if (key(current) === key(end)) {
      const path: Point[] = [to]; let cursor: Point | null = current
      while (cursor && key(cursor) !== key(start)) { path.push({ x: cursor.x * step, z: cursor.z * step }); cursor = previous.get(key(cursor)) ?? null }
      return path.reverse()
    }
    for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const next = { x: current.x + dx, z: current.z + dz }; const nextKey = key(next)
      if (!allowed({ x: next.x * step, z: next.z * step })) continue
      const score = scores.get(key(current))! + 1
      if (score >= (scores.get(nextKey) ?? Infinity)) continue
      scores.set(nextKey, score); previous.set(nextKey, current)
      if (!open.some(point => key(point) === nextKey)) open.push(next)
    }
  }
  return []
}
