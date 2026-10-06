import { gridWalkingPath, type Point } from '../builtin-adventure/navigation'

export function echoWalkable(point: Point, gate: boolean): boolean {
  const shed = point.x > -11.5 && point.x < -6.5 && point.z < -1.5
  const shore = point.x >= -12 && point.x <= 4 && point.z >= -6 && point.z <= 6 && !shed
  const bridge = gate && point.x >= 4 && point.x <= 12 && point.z >= 0 && point.z <= 2
  return shore || bridge
}
function clearSegment(from: Point, to: Point, gate: boolean) {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/.08))
  return Array.from({length:steps+1},(_,i)=>({x:from.x+(to.x-from.x)*i/steps,z:from.z+(to.z-from.z)*i/steps})).every(point=>echoWalkable(point,gate))
}
export function echoWalkingPath(from: Point, to: Point, gate: boolean): Point[] {
  if (!echoWalkable(from,gate) || !echoWalkable(to,gate)) return []
  // Join arbitrary pointer/keyboard positions to safe grid centers before A*.
  // Rounding alone can put a diagonal segment across the shed or bridge corner.
  const anchor = (point: Point) => [-2,0,2].flatMap(dx=>[-2,0,2].map(dz=>({x:Math.round(point.x/2)*2+dx,z:Math.round(point.z/2)*2+dz})))
    .sort((a,b)=>Math.hypot(a.x-point.x,a.z-point.z)-Math.hypot(b.x-point.x,b.z-point.z)).find(candidate=>echoWalkable(candidate,gate)&&clearSegment(point,candidate,gate))
  const start=anchor(from), end=anchor(to)
  if (!start || !end) return []
  const path=gridWalkingPath(start,end,point=>echoWalkable(point,gate))
  return path.length ? [start,...path,to] : []
}
