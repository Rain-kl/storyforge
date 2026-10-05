import { gridWalkingPath, type Point } from '../builtin-adventure/navigation'
import { PLACES } from './definition'
export const OBSTACLES = PLACES.flatMap(place=>[
  {x:place.x+5,z:place.z-3,width:3,depth:3},
  ...(['med','habitat'].includes(place.key)?Array.from({length:4},(_,i)=>({x:place.x-6+(i%2)*4,z:place.z-4+Math.floor(i/2)*7,width:2,depth:3.8})):[]),
  ...(place.key==='garden'?Array.from({length:6},(_,i)=>({x:place.x-6+(i%3)*4,z:place.z-3+Math.floor(i/3)*6,width:2.7,depth:2})):[]),
  ...(['core','reactor'].includes(place.key)?[{x:place.x-5,z:place.z-3,width:4.6,depth:4.6}]:[]),
])
export function walkable(point:Point) {
  const room=PLACES.some(place=>Math.abs(point.x-place.x)<=9.3&&Math.abs(point.z-place.z)<=7.3)
  const crossHall=[-20,0,20].some(z=>Math.abs(point.z-z)<=2.3)&&Math.abs(point.x)<=24
  const longHall=[-24,0,24].some(x=>Math.abs(point.x-x)<=2.3)&&point.z>=-20&&point.z<=20
  const observatoryHall=Math.abs(point.x)<=2.3&&point.z>=-40&&point.z<=-20
  return (room||crossHall||longHall||observatoryHall)&&!OBSTACLES.some(box=>Math.abs(point.x-box.x)<box.width/2+.5&&Math.abs(point.z-box.z)<box.depth/2+.5)
}
export const walkingPath=(from:Point,to:Point)=>gridWalkingPath(from,to,walkable)
