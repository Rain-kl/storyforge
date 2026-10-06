import * as THREE from 'three'
import { PLACES, type PlaceKey } from './definition'
import { echoWalkable, echoWalkingPath } from './navigation'
import { advanceWalkingPath, walkingFrameSeconds, type Point } from '../builtin-adventure/navigation'

export interface EchoVisualState {
  inlet: boolean; pressure: boolean; gate: boolean; harness: boolean
  counterweight: boolean; paper: boolean; rescued: boolean; ending: boolean; fast: boolean
}
export interface EchoScene {
  travel(place: PlaceKey): void
  reset(place: PlaceKey): void
  update(state: EchoVisualState): void
  pause(value: boolean): void
  quality(low: boolean): void
  input(x: number, z: number): void
  dispose(): void
}

/** Transient 3D presentation; only the public runtime commands own story changes. */
export function createEchoScene(host: HTMLDivElement, options: {
  initialPlace: PlaceKey; reducedMotion: boolean
  onArrive(place: PlaceKey): void; onBlocked(message: string): void
  onLabels(labels: Array<{ key: PlaceKey; x: number; y: number }>): void
  onFailure(): void
}): EchoScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.4))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.shadowMap.autoUpdate = false
  renderer.shadowMap.needsUpdate = true
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.25
  renderer.domElement.tabIndex = 0
  renderer.domElement.setAttribute('aria-label', '旧码头三维场景，方向键移动，E 键查看最近地点')
  host.appendChild(renderer.domElement)
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#132c39')
  scene.fog = new THREE.FogExp2('#294755', 0.012)
  const camera = new THREE.OrthographicCamera(-20, 20, 14, -14, 0.1, 180)
  camera.position.set(19, 26, 32); camera.lookAt(0, 0, 0)
  scene.add(new THREE.HemisphereLight('#b2d1d5', '#283646', 2))
  const moonlight = new THREE.DirectionalLight('#e9d8ba', 3)
  moonlight.position.set(-12, 30, -18); moonlight.castShadow = true
  Object.assign(moonlight.shadow.camera, { left: -28, right: 28, top: 20, bottom: -20, near: 1, far: 90 })
  moonlight.shadow.mapSize.set(1024, 1024); moonlight.shadow.bias = -0.001
  scene.add(moonlight)
  const materials = new Map<string, THREE.MeshStandardMaterial>()
  function mat(color: string, glow = false) {
    const key = `${color}.${glow}`
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: .78, flatShading: true, ...(glow ? { emissive: color, emissiveIntensity: 1.4 } : {}) }))
    return materials.get(key)!
  }
  function box(parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, color: string, glow = false) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, glow))
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh
  }
  function cylinder(parent: THREE.Object3D, x: number, y: number, z: number, r: number, h: number, color: string, sides = 10) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, sides), mat(color))
    mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh
  }
  function rope(parent: THREE.Object3D, points: number[][], radius = .04, color = '#b34c40') {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p as [number, number, number])))
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, radius, 6, false), mat(color)); parent.add(mesh); return mesh
  }
  function lamp(x: number, z: number) {
    cylinder(scene, x, 1.4, z, .06, 2.8, '#454b48')
    box(scene, x, 2.75, z, .3, .5, .3, '#f8bf67', true)
    box(scene, x, 3.04, z, .48, .09, .48, '#383d3e')
    const light = new THREE.PointLight('#ffc378', 7, 9, 2); light.position.set(x, 2.5, z); scene.add(light)
  }
  const waterGeometry = new THREE.PlaneGeometry(120, 100, 70, 60)
  waterGeometry.rotateX(-Math.PI / 2)
  const water = new THREE.Mesh(waterGeometry, new THREE.MeshStandardMaterial({ color: '#326271', roughness: .38, metalness: .38, transparent: true, opacity: .92 }))
  water.position.y = -.12; scene.add(water)
  const foam = new THREE.Group(); scene.add(foam)
  for (let i = 0; i < 35; i++) {
    const wave = box(foam, Math.sin(i * 9.7) * 29, -.02, Math.cos(i * 3.1) * 22, .6 + (i % 5) * .4, .012, .06, '#91b5b9')
    wave.rotation.y = .2
  }
  box(scene, -4, -.65, 0, 16.5, 1.1, 12.5, '#535f5b')
  for (let i = 0; i < 31; i++) box(scene, -4, -.02, -6 + i * .4, 16, .14, .36, i % 3 === 0 ? '#8a8170' : '#756e61')
  for (const x of [-12, -8, -4, 0, 4]) for (const z of [-6, 6]) {
    cylinder(scene, x, -.8, z, .17, 3.5, '#464b46')
    cylinder(scene, x, .35, z, .2, .17, '#b4a58d')
  }
  rope(scene, [[-12,.7,6],[-8,.55,6],[-4,.7,6],[0,.55,6],[4,.7,6]], .045, '#b9a58a')
  // The tool shed sits outside the navigable strip, with an open workbench.
  box(scene, -9, 1.2, -3.5, 4.6, 2.4, 3.8, '#506766')
  for (let i = 0; i < 9; i++) box(scene, -11 + i*.5, 1.2, -1.56, .05, 2.35, .05, '#a3a697')
  const roof = box(scene, -9, 2.65, -3.5, 5.4, .22, 4.4, '#3b5360'); roof.rotation.z = .07
  box(scene, -9, 1.1, -1.48, 1.1, 1.95, .08, '#22363b')
  box(scene, -10.5, 1.6, -1.4, .65, .7, .1, '#e9b26a', true)
  box(scene, -8, .75, -.9, 1.8, .13, .7, '#b49a71')
  for (const x of [-8.7, -7.3]) box(scene, x, .34, -.9, .1, .7, .5, '#665546')
  cylinder(scene, -8.3, .88, -.9, .09, .16, '#d6b376')
  box(scene, -7.6, .87, -.9, .65, .06, .14, '#bdc7c7')
  lamp(-6.2, -2); lamp(2.9, 4.8); lamp(-11.5, 3.5)
  // Gauge, sluice and visible stepped machinery.
  box(scene, -2, .9, -5, .25, 3.2, .25, '#dac9a3')
  for (let i = 0; i < 11; i++) box(scene, -1.85, -.45 + i*.25, -4.85, i % 2 ? .12 : .22, .045, .04, '#4c5550')
  box(scene, -.3, .35, -4.7, 1.5, .7, .65, '#617675')
  const sluice = new THREE.Group(); sluice.position.set(2.2, 0, -1.6); scene.add(sluice)
  for (const x of [-.8, .8]) box(sluice, x, .7, 0, .22, 2.8, .3, '#647c7b')
  const gatePanel = box(sluice, 0, .1, 0, 1.45, 1.45, .2, '#667577')
  box(sluice, 0, 2.1, 0, 2, .2, .35, '#a4a68e')
  const wheel = new THREE.Group(); wheel.position.set(0, 1.45, .45); sluice.add(wheel)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.48, .065, 8, 20), mat('#cdb17b')); wheel.add(ring)
  for (let i = 0; i < 4; i++) { const spoke = box(wheel, 0, 0, 0, .07, .85, .07, '#cdb17b'); spoke.rotation.z = i * Math.PI / 4 }
  const pressureLamp = box(sluice, .73, 1.5, .25, .16, .16, .12, '#c0e4d5', true)
  const bridge = new THREE.Group(); scene.add(bridge)
  for (let i = 0; i < 22; i++) box(bridge, 4.2 + i*.35, -.36, 1, .32, .16, 2.5, i % 3 ? '#716d5e' : '#a39878')
  for (const x of [4.2, 7.6, 11.5]) {
    cylinder(bridge, x, .4, 2.35, .08, 1.4, '#777865')
    cylinder(bridge, x, -.8, -.3, .12, 2, '#465453')
  }
  rope(bridge, [[4.2,1.05,2.35],[7.6,.85,2.35],[11.5,1.05,2.35]], .035, '#c8b798')
  // Grounded fishing boat, copper bell and salt-paper box.
  const boat = new THREE.Group(); boat.position.set(9.2, -.35, -1.5); boat.rotation.y = -.06; scene.add(boat)
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.15, 1.2, 8), mat('#49696b')); hull.scale.x = 2; hull.position.y = -.2; boat.add(hull)
  box(boat, 0, .42, 0, 5.2, .12, 2.4, '#9a9178')
  box(boat, -1.5, 1.05, -.35, 1.5, 1.2, 1.6, '#889381')
  box(boat, -1.5, 1.74, -.35, 1.85, .18, 1.85, '#3b535b')
  box(boat, -1.5, 1.24, .5, .65, .45, .08, '#e6bb76', true)
  cylinder(boat, .2, 2.5, -.5, .08, 5, '#857d64')
  rope(boat, [[-2.5,.6,0],[.2,4.6,-.5],[2.3,.6,0]], .024, '#c4b795')
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(.12, .25, .3, 10), mat('#d4b374')); bell.position.set(.2, 3.8, -.5); boat.add(bell)
  const basket = new THREE.Group(); basket.position.set(10.2, -.12, -.35); scene.add(basket)
  box(basket, 0, .06, 0, 1.9, .13, 1.3, '#a58d64')
  for (const x of [-.9, .9]) for (const z of [-.6, .6]) box(basket, x, .6, z, .1, 1.1, .1, '#968765')
  for (const z of [-.6,.6]) box(basket, 0, .75, z, 1.85, .09, .09, '#bb9e70')
  const letter = box(basket, .62, .35, .2, .55, .35, .45, '#a3d8d5', true)
  box(letter, 0, .2, 0, .55, .05, .45, '#517c7d')
  const redRope = rope(scene, [[-5,1.1,3],[0,.45,2.7],[6,.7,1],[10.2,.9,-.35]], .06)
  function person(color: string, x: number, z: number) {
    const group = new THREE.Group(); scene.add(group); group.position.set(x, .05, z)
    const coat = new THREE.Mesh(new THREE.CylinderGeometry(.22, .37, .68, 7), mat(color)); coat.position.y = .95; group.add(coat)
    cylinder(group, 0, 1.52, 0, .2, .34, '#d5b49b')
    const hat = new THREE.Mesh(new THREE.SphereGeometry(.24, 10, 8, 0, Math.PI*2, 0, Math.PI/2), mat(color)); hat.position.y = 1.67; group.add(hat)
    box(group, 0, 1.67, .14, .5, .07, .35, color)
    const legs = [-1,1].map(side => box(group, side*.14, .31, 0, .17, .58, .2, '#30424b'))
    for (const side of [-1,1]) { const arm = box(group, side*.32, 1, 0, .14, .57, .16, color); arm.rotation.z = side*.12 }
    return { group, legs }
  }
  const player = person('#d18b4c', -6, 4)
  person('#9e6351', -5, 3)
  const zhao = person('#739096', 10, -.35)
  const harness = box(zhao.group, 0, 1, .25, .48, .12, .06, '#d04f44')
  box(scene, -3.8, .45, 3, 1.3, .9, 1, '#8b8069')
  box(scene, -3.8, .95, 3, 1.36, .1, 1.07, '#b09c76')
  // A distant, deliberately unlit lighthouse keeps the short in Tidemark's world.
  cylinder(scene, 13, -1.5, -15, 3.4, 2, '#415653', 7)
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(.65, 1, 7, 10), mat('#b5b6a0')); tower.position.set(13, 2, -15); scene.add(tower)
  cylinder(scene, 13, 5.7, -15, .9, .25, '#384e54')
  box(scene, 13, 6.1, -15, .85, .65, .85, '#435d63')
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1.8, 20, 12), new THREE.MeshBasicMaterial({ color: '#e7dac0' })); moon.position.set(-15, 17, -32); scene.add(moon)
  const sparkles = new THREE.Group(); scene.add(sparkles)
  for (let i = 0; i < 16; i++) box(sparkles, 6 + Math.sin(i*5)*13, .15 + i*.1, -8+Math.cos(i*3)*6, .035, .035, .035, '#d1e2c1', true)

  let flags: EchoVisualState = { inlet:false, pressure:false, gate:false, harness:false, counterweight:false, paper:false, rescued:false, ending:false, fast:false }
  let paused = true; let disposed = false; let low = false; let path: Point[] = []; let target: PlaceKey | null = null
  let input = { x:0, z:0 }; const keys = new Set<string>(); let frame = 0; let lastLabels = 0; let lastRender = 0; let animateUntil = performance.now() + 1200
  const center = new THREE.Vector3(); const raycaster = new THREE.Raycaster(); const mouse = new THREE.Vector2()
  function reset(place: PlaceKey) { const p = PLACES.find(row => row.key === place)!; player.group.position.set(p.x,.05,p.z); path=[]; target=null }
  reset(options.initialPlace)
  function travel(place: PlaceKey) {
    if (paused) return
    const p = PLACES.find(row => row.key === place)!
    const candidate = echoWalkingPath(player.group.position, p, flags.gate)
    if (!candidate.length) { options.onBlocked('回流还没退去。先让旧栈桥露出水面。'); return }
    path = candidate; target = place
  }
  function resize() {
    const w = host.clientWidth, h = host.clientHeight
    renderer.setSize(w,h); const halfHeight = w < 700 ? 13 : 14
    camera.left=-halfHeight*w/h; camera.right=halfHeight*w/h; camera.top=halfHeight; camera.bottom=-halfHeight; camera.updateProjectionMatrix()
    animateUntil=performance.now()+300
  }
  const observer = new ResizeObserver(resize); observer.observe(host); resize()
  const keydown = (event: KeyboardEvent) => {
    if (paused || /INPUT|TEXTAREA|BUTTON|SELECT/.test((event.target as HTMLElement)?.tagName)) return
    const key = event.key.toLowerCase()
    if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','e'].includes(key)) { event.preventDefault(); keys.add(key) }
    if (key === 'e' && !event.repeat) {
      const nearest = [...PLACES].sort((a,b) => Math.hypot(a.x-player.group.position.x,a.z-player.group.position.z)-Math.hypot(b.x-player.group.position.x,b.z-player.group.position.z))[0]
      travel(nearest.key)
    }
  }
  const keyup = (event: KeyboardEvent) => { keys.delete(event.key.toLowerCase()) }
  const blur = () => { keys.clear(); input={x:0,z:0} }
  window.addEventListener('keydown',keydown); window.addEventListener('keyup',keyup); window.addEventListener('blur',blur)
  const click = (event: PointerEvent) => {
    if (paused || event.button !== 0) return
    renderer.domElement.focus()
    const rect = renderer.domElement.getBoundingClientRect()
    mouse.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2)
    raycaster.setFromCamera(mouse,camera)
    const point = new THREE.Vector3()
    if (!raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),point)) return
    const nearest = [...PLACES].sort((a,b) => Math.hypot(a.x-point.x,a.z-point.z)-Math.hypot(b.x-point.x,b.z-point.z))[0]
    if (Math.hypot(nearest.x-point.x,nearest.z-point.z)<3) { travel(nearest.key); return }
    path=echoWalkingPath(player.group.position,point,flags.gate); target=null
  }
  renderer.domElement.addEventListener('pointerup',click)
  const lost = (event: Event) => { event.preventDefault(); options.onFailure() }
  renderer.domElement.addEventListener('webglcontextlost',lost)
  const animate = (now: number) => {
    if (disposed) return
    frame=requestAnimationFrame(animate)
    if (document.hidden) { lastRender=now; return }
    if ((paused && now>animateUntil) || now-lastRender < (low ? 1000/20 : 1000/30)) return
    const elapsed=(now-lastRender)/1000; lastRender=now
    let moving=false
    if (!paused) {
      let dx=input.x+(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)
      let dz=input.z+(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)
      const position=player.group.position
      const distance=5.6*walkingFrameSeconds(elapsed*1000)
      let next: Point
      if (dx||dz) {
        path=[];target=null
        const length=Math.hypot(dx,dz)
        next=advanceWalkingPath(position,[{x:position.x+dx/length*distance,z:position.z+dz/length*distance}],distance,point=>echoWalkable(point,flags.gate))
      } else next=advanceWalkingPath(position,path,distance,point=>echoWalkable(point,flags.gate))
      dx=next.x-position.x;dz=next.z-position.z
      position.x=next.x;position.z=next.z
      if(Math.hypot(dx,dz)>.001){player.group.rotation.y=Math.atan2(dx,dz);moving=true}
      if (!path.length && target) { const arrived=target;target=null;options.onArrive(arrived) }
    }
    player.legs.forEach((leg,i)=>{leg.rotation.x=moving&&!options.reducedMotion?Math.sin(now*.014+i*Math.PI)*.4:0})
    player.group.position.y=player.group.position.x>4?-.25:.05
    const approach=options.reducedMotion?1:1-Math.exp(-Math.min(elapsed,.2)*7)
    water.position.y += ((flags.gate?-.88:-.12)-water.position.y)*approach
    foam.position.y=water.position.y+.12
    gatePanel.position.y += ((flags.gate?1.25:flags.inlet?-.2:.1)-gatePanel.position.y)*approach
    wheel.rotation.z += ((flags.gate?Math.PI*1.25:0)-wheel.rotation.z)*approach
    pressureLamp.visible=flags.pressure
    basket.position.y += ((flags.counterweight?.42:-.12)-basket.position.y)*approach
    letter.visible=!flags.paper&&!(flags.rescued&&flags.fast)
    harness.visible=flags.harness; redRope.visible=!flags.ending
    zhao.group.position.x += ((flags.rescued?-3.7:10)-zhao.group.position.x)*approach
    zhao.group.position.z += ((flags.rescued?2: -.35)-zhao.group.position.z)*approach
    if (!options.reducedMotion && !low && !paused) {
      const positions=waterGeometry.attributes.position
      for (let i=0;i<positions.count;i++) positions.setY(i, Math.sin(positions.getX(i)*.55+now*.0008)*Math.cos(positions.getZ(i)*.4+now*.00045)*.055)
      positions.needsUpdate=true
      sparkles.rotation.y=now*.000015
      bell.rotation.z=!flags.paper&&!flags.rescued?Math.sin(now*.004)*.12:0
    }
    const narrow=host.clientWidth<700
    center.lerp(new THREE.Vector3(narrow?player.group.position.x:0,0,narrow?player.group.position.z:0),options.reducedMotion?1:.08)
    camera.position.set(center.x+19,26,center.z+32);camera.lookAt(center)
    renderer.render(scene,camera)
    if (now-lastLabels>150) {
      lastLabels=now
      options.onLabels(PLACES.map(place=>{const projected=new THREE.Vector3(place.x,2.4,place.z).project(camera);return{key:place.key,x:(projected.x+1)*host.clientWidth/2,y:(1-projected.y)*host.clientHeight/2}}))
    }
  }
  frame=requestAnimationFrame(animate)
  return {
    travel, reset, update(value){flags=value;animateUntil=performance.now()+1500;renderer.shadowMap.needsUpdate=true},
    pause(value){if(paused!==value)lastRender=performance.now();paused=value;blur();if(value){path=[];target=null}},
    quality(value){low=value;renderer.setPixelRatio(value?1:Math.min(devicePixelRatio,1.4));renderer.shadowMap.enabled=!value;renderer.shadowMap.needsUpdate=true;animateUntil=performance.now()+300},
    input(x,z){input={x,z}},
    dispose(){
      disposed=true;cancelAnimationFrame(frame);observer.disconnect()
      window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur)
      renderer.domElement.removeEventListener('pointerup',click);renderer.domElement.removeEventListener('webglcontextlost',lost)
      const geometries=new Set<THREE.BufferGeometry>();const ownedMaterials=new Set<THREE.Material>()
      scene.traverse(object=>{if(object instanceof THREE.Mesh){geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])ownedMaterials.add(material)}})
      geometries.forEach(geometry=>geometry.dispose());ownedMaterials.forEach(material=>material.dispose());renderer.dispose();renderer.domElement.remove()
    },
  }
}
