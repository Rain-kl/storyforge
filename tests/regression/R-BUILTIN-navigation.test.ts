import { describe, expect, it } from 'vitest'
import { advanceWalkingPath, gridWalkingPath } from '../../src/lib/builtin-adventure/navigation'
import { PLACES } from '../../src/lib/aphelion/definition'
import { walkable, walkingPath } from '../../src/lib/aphelion/navigation'

describe('内置 3D 导航在慢帧中的位移与碰撞', () => {
  it.each([1 / 60, 1 / 5])('以 %f 秒步长穿过全部空间站区域，不在路径拐点停顿', dt => {
    let position = { x: PLACES[0].x, z: PLACES[0].z + 2 }
    for (const destination of [...PLACES.slice(1), PLACES[0]]) {
      const path = walkingPath(position, destination)
      expect(path.length).toBeGreaterThan(0)
      for (let elapsed = 0; path.length && elapsed < 30; elapsed += dt) {
        position = advanceWalkingPath(position, path, 6.5 * dt, walkable)
        expect(walkable(position)).toBe(true)
      }
      expect(path, `到达 ${destination.title}`).toHaveLength(0)
      expect(Math.hypot(position.x - destination.x, position.z - destination.z)).toBeLessThan(0.001)
    }
  })

  it('路径能绕过障碍，长帧也不能穿墙或越过目标', () => {
    const allowed = (p: { x: number; z: number }) => Math.abs(p.x) <= 12 && Math.abs(p.z) <= 12
      && !(Math.abs(p.x) < 3 && Math.abs(p.z) < 4)
    let position = { x: -8, z: 0 }
    const target = { x: 8, z: 0 }
    const path = gridWalkingPath(position, target, allowed)
    for (let frame = 0; path.length && frame < 100; frame++) {
      position = advanceWalkingPath(position, path, 8, allowed)
      expect(allowed(position)).toBe(true)
    }
    expect(path).toHaveLength(0)
    expect(position.x).toBeCloseTo(target.x, 6)
    expect(position.z).toBeCloseTo(target.z, 6)
    const direct = [target]
    const blocked = advanceWalkingPath({ x: -4, z: 0 }, direct, 10, allowed)
    expect(blocked.x).toBeLessThanOrEqual(-3)
    expect(direct).toHaveLength(1)
  })
})
