import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight, BookOpen, Check, ChevronRight, Compass, Flag, Package, RotateCcw, Save, Settings2, X } from 'lucide-react'
import { useAdventureGamePlayerStore } from '../stores/adventure-game-player'
import { availableAdventureActions } from '../lib/adventure/runtime'
import { readBoundInstances } from '../lib/product/runtime-instances'
import { builtinAdventureSessions, selectBuiltinAdventureSession } from '../lib/builtin-adventure/player'
import { createBuiltinAdventurePreferences } from '../lib/builtin-adventure/preferences'
import { installEcho, findInstalledEcho, openEchoPlayer } from '../lib/tidemark-echo/production'
import { CAST, ECHO_ID, ENDINGS, ITEMS, PLACES, SCENES, hasItem, type PlaceKey, type Speaker } from '../lib/tidemark-echo/definition'
import { createEchoScene, type EchoScene } from '../lib/tidemark-echo/scene'
import '../components/text-game/tidemark-echo.css'

type Panel = 'dialogue' | 'place' | 'bag' | 'journal' | 'saves' | 'settings' | null
const preferences = createBuiltinAdventurePreferences('tidemark-echo')
const checkpointName = '救援方式决定前'

function Sheet({ title, children, onClose, kind = '' }: { title: string; children: ReactNode; onClose(): void; kind?: string }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { ref.current?.showModal(); const node = ref.current; return () => node?.close() }, [])
  return <dialog ref={ref} className={`echo-sheet ${kind}`} aria-label={title} onCancel={event => { event.preventDefault(); onClose() }}>
    <header><span>{title}</span><button aria-label="返回码头" onClick={onClose}><X size={18}/></button></header>
    {children}
  </dialog>
}

export default function TidemarkEchoPage() {
  const store = useAdventureGamePlayerStore()
  const [prefs, setPrefs] = useState(preferences.read)
  const [playing, setPlaying] = useState(false)
  const [working, setWorking] = useState(false)
  const [hasSave, setHasSave] = useState(false)
  const [installed, setInstalled] = useState<Awaited<ReturnType<typeof installEcho>> | null>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const [beat, setBeat] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [traveling, setTraveling] = useState<PlaceKey | null>(null)
  const [endingRead, setEndingRead] = useState(false)
  const [labels, setLabels] = useState<Array<{ key: PlaceKey; x: number; y: number }>>([])
  const host = useRef<HTMLDivElement>(null)
  const scene = useRef<EchoScene | null>(null)
  const operation = useRef(false)
  const shown = useRef(new Set<string>())
  const arrival = useRef<(place: PlaceKey) => void>(() => {})
  const isOwn = store.selectedManifest?.definition.productKey === ECHO_ID
  const state = isOwn ? store.runtimeState : null
  const pkg = isOwn ? store.selectedManifest : null
  const adventure = state?.adventure
  const narrative = state?.narrative
  const nodeKey = narrative?.currentNodeKey ?? 'intro'
  const story = SCENES.find(row => row.key === nodeKey)
  const ending = ENDINGS.find(row => row.key === nodeKey)
  const currentPlace = (adventure?.currentLocationKey ?? 'quay') as PlaceKey
  const place = PLACES.find(row => row.key === currentPlace) ?? PLACES[0]
  const has = (key: string) => hasItem(adventure?.inventory, key)
  const busy = working || store.busy
  const beats = pkg?.narrative.beats.filter(row => row.nodeKey === nodeKey).sort((a,b) => a.order-b.order) ?? []
  const choices = pkg?.narrative.choices.filter(row => row.sourceNodeKey === nodeKey) ?? []
  const actions = pkg && adventure ? availableAdventureActions(pkg.adventure, adventure, narrative?.variables ?? {}) : []
  const visibleActions = actions.filter(row => !['move','talk'].includes(row.action.kind) && !row.action.key.startsWith('look.') && row.action.requirements.every(requirement => !requirement.narrativePath || requirement.narrativeEquals === nodeKey))
  const completed = adventure?.completedActionKeys ?? []
  const route = narrative?.variables.route
  const ownSessions = installed ? builtinAdventureSessions(store.sessions, installed.releaseId) : []

  const run = useCallback(async (fn: () => Promise<void>) => {
    if (operation.current) return
    operation.current = true; setWorking(true); setError(''); setMessage('')
    try { await fn() } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
    finally { operation.current = false; setWorking(false) }
  }, [])

  useEffect(() => {
    let active = true
    void findInstalledEcho().then(async found => {
      if (!found) return
      const saves = builtinAdventureSessions(await readBoundInstances(found.scope), found.releaseId)
      if (active) { setInstalled(found); setHasSave(saves.length > 0) }
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : String(cause)) })
    return () => { active = false }
  }, [])
  useEffect(() => { preferences.save(prefs) }, [prefs])

  useEffect(() => {
    if (!host.current || prefs.fallback) return
    try {
      scene.current = createEchoScene(host.current, {
        initialPlace: 'quay', reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        onArrive: destination => arrival.current(destination), onBlocked: text => { setError(text); setTraveling(null) },
        onLabels: setLabels, onFailure: () => { setPrefs(previous => ({ ...previous, fallback: true })); setMessage('画面已切换为文字探索，进度仍在。') },
      })
    } catch { setPrefs(previous => ({ ...previous, fallback: true })); setMessage('使用文字探索继续这次接应。') }
    return () => { scene.current?.dispose(); scene.current = null }
  }, [prefs.fallback])

  useEffect(() => {
    scene.current?.update({ inlet:hasItem(adventure?.inventory,'state_inlet'), pressure:hasItem(adventure?.inventory,'state_pressure'), gate:hasItem(adventure?.inventory,'state_gate'), harness:hasItem(adventure?.inventory,'state_harness'), counterweight:hasItem(adventure?.inventory,'state_counterweight'), paper:hasItem(adventure?.inventory,'state_locker'), rescued:hasItem(adventure?.inventory,'state_rescued'), ending:Boolean(ending), fast:route==='fast' })
  }, [adventure?.inventory, ending, route, prefs.fallback])
  useEffect(() => { scene.current?.pause(!playing || Boolean(panel) || busy || endingRead); if (panel || busy) setTraveling(null) }, [playing, panel, busy, endingRead, prefs.fallback])
  useEffect(() => { scene.current?.quality(prefs.low) }, [prefs.low, prefs.fallback])
  useEffect(() => { scene.current?.reset(currentPlace) }, [store.selectedSessionId, currentPlace, prefs.fallback])
  useEffect(() => {
    if (!playing || !state || !pkg) return
    const key = `${store.selectedSessionId}:${nodeKey}`
    if ((!story || story.place === currentPlace) && !shown.current.has(key)) {
      shown.current.add(key); setBeat(0); setEndingRead(false); setPanel('dialogue')
    }
  }, [playing, state, pkg, store.selectedSessionId, nodeKey, story, currentPlace])

  const restoreReading = () => {
    const latest = useAdventureGamePlayerStore.getState()
    const node = latest.runtimeState.narrative?.currentNodeKey
    const location = latest.runtimeState.adventure?.currentLocationKey
    shown.current.clear(); shown.current.add(`${latest.selectedSessionId}:${node}`)
    setBeat(0); setEndingRead(false)
    setPanel(SCENES.find(row=>row.key===node)?.place===location || ENDINGS.some(row=>row.key===node) ? 'dialogue' : null)
  }
  const start = (fresh: boolean) => void run(async () => {
    setPanel(null); setEndingRead(false)
    const game = await installEcho(setMessage)
    await openEchoPlayer(game, fresh)
    setInstalled(game); setHasSave(true); restoreReading(); setPlaying(true); setMessage('')
  })
  const choose = (key: string) => void run(async () => {
    setPanel(null); setBeat(0)
    await useAdventureGamePlayerStore.getState().choose(key)
    const latest = useAdventureGamePlayerStore.getState()
    if (latest.runtimeState.narrative?.currentNodeKey === 'plan' && !latest.checkpoints.some(row => row.name === checkpointName)) await latest.saveCheckpoint(checkpointName)
  })
  const act = (key: string) => void run(async () => {
    const latest = useAdventureGamePlayerStore.getState()
    await latest.act(key)
    const after = useAdventureGamePlayerStore.getState().runtimeState.adventure
    setMessage(after?.actionHistory[after.actionHistory.length - 1]?.narrative ?? '已完成。')
  })
  const arrive = useCallback((destination: PlaceKey) => void run(async () => {
    const latest = useAdventureGamePlayerStore.getState()
    if (latest.selectedManifest?.definition.productKey !== ECHO_ID) throw new Error('当前存档不属于两声之间。')
    const from = latest.runtimeState.adventure!.currentLocationKey
    const node = latest.runtimeState.narrative?.currentNodeKey
    const showStory = SCENES.find(row=>row.key===node)?.place===destination && !shown.current.has(`${latest.selectedSessionId}:${node}`)
    try {
      if (from !== destination) await latest.act(`move.${from}.${destination}`)
      if (showStory) { shown.current.add(`${latest.selectedSessionId}:${node}`); setBeat(0) }
      setPanel(showStory ? 'dialogue' : 'place')
    } catch (cause) { scene.current?.reset(from as PlaceKey); throw cause }
    finally { setTraveling(null) }
  }), [run])
  arrival.current = arrive
  const travel = (destination: PlaceKey) => {
    if (busy) return
    setError(''); setMessage(''); setPanel(null)
    if (destination === 'boat' && !has('state_gate')) { setError('回流还没退去。先打开回流闸，让栈桥露出来。'); return }
    if (prefs.fallback || destination === currentPlace) { arrive(destination); return }
    setTraveling(destination)
    // Resume before issuing a path: React's modal cleanup runs after this click.
    scene.current?.pause(false); scene.current?.travel(destination)
  }
  const close = () => { setPanel(null); setError(''); setMessage('') }
  const openPanel = (next: Panel) => { setTraveling(null); setError(''); setMessage(''); setPanel(next) }
  const nextPlace: PlaceKey = nodeKey === 'survey' ? !has('gauge') ? 'gauge' : !has('crank') ? 'shed' : !has('state_gate') ? 'sluice' : 'quay' : story?.place ?? 'quay'
  const targetText = nodeKey === 'survey' ? !has('gauge') ? '查看旧水尺' : !has('crank') ? '去工具棚取救援工具' : !has('state_gate') ? '操作回流闸' : '告诉乌荻：栈桥露出来了' : story?.objective ?? ending?.title ?? '接回眼前的人'
  const permittedChoices = choices.filter(choice => narrative?.availableChoiceKeys.includes(choice.choiceKey))
  const showEnd = Boolean(ending && endingRead)
  const dialogueDone = prefs.fullText || beat >= beats.length - 1
  const nextBeat = () => setBeat(index => Math.min(index + 1, beats.length - 1))
  const selectSave = (id: number) => void run(async () => {
    await selectBuiltinAdventureSession(id, installed!.releaseId)
    restoreReading()
  })
  const fork = (id: number) => void run(async () => {
    await useAdventureGamePlayerStore.getState().forkCheckpoint(id, '两声之间 · 另一种接应')
    restoreReading()
  })

  return <main className={`echo-game ${prefs.fallback ? 'echo-text-mode' : ''}`} aria-label="潮痕：两声之间" aria-busy={busy} data-gate={has('state_gate') ? 'open' : 'closed'} data-rescued={has('state_rescued')}>
    <div ref={host} className="echo-canvas"/>
    <div className="echo-vignette" aria-hidden="true"/>
    {!playing ? <section className="echo-title">
      <Link to="/openworld" className="echo-back">← 返回内置游戏</Link>
      <div className="echo-title-copy"><span className="echo-kicker">白礁镇 · 暴潮前夜</span><h1>潮痕</h1><h2>两声之间</h2><div className="echo-title-line"/>
        <p>码头下面，传来两声一模一样的铃。<br/>这一次，先等一个不同的回答。</p>
        <div className="echo-facts"><span>约 5 分钟</span><span>调查 · 机关 · 抉择</span><span>2 种结尾</span></div>
        <button className="echo-primary" disabled={busy} onClick={() => start(false)}>{busy ? '正在准备码头…' : hasSave ? '继续这次接应' : '走进码头'}<ArrowRight size={18}/></button>
        {hasSave && <button className="echo-subtle" disabled={busy} onClick={() => start(true)}>重新开始一程</button>}
        <Link className="echo-original" to="/play/tidemark">也可以游玩长篇《最后一盏灯》 ↗</Link>
      </div><span className="echo-title-foot">一个关于倾听、接应，与一封未拆来信的故事。</span>
      <button className="echo-title-settings" aria-label="画面与阅读设置" onClick={() => openPanel('settings')}><Settings2 size={18}/></button>
    </section> : <>
      <header className="echo-hud"><Link to="/openworld" className="echo-brand">潮痕<span>两声之间</span></Link><nav aria-label="旅程工具">
        <button onClick={() => openPanel('journal')} aria-label="手记与任务"><BookOpen size={18}/><span>手记</span></button>
        <button onClick={() => openPanel('bag')} aria-label="打开背包"><Package size={18}/><span>背包 {ITEMS.filter(item => item.tag !== 'state' && has(item.key)).length}</span></button>
        <button onClick={() => openPanel('saves')} aria-label="存档与分支"><Save size={18}/><span>存档</span></button>
        <button onClick={() => openPanel('settings')} aria-label="画面与阅读设置"><Settings2 size={18}/><span>设置</span></button>
      </nav></header>
      {!showEnd && <aside className="echo-mission" aria-label="当前任务"><div className="echo-progress">{['让水退下去','接回眼前的人','把这一程交还'].map((title,index)=><span key={title} className={adventure?.quests[index]?.status === 'completed' ? 'done' : adventure?.quests[index]?.status === 'active' ? 'active' : ''}>{adventure?.quests[index]?.status === 'completed' ? <Check size={12}/> : <i>{index+1}</i>}<b>{title}</b></span>)}</div><button onClick={() => travel(nextPlace)} disabled={busy}><Flag size={15}/><span>{targetText}</span><ChevronRight size={16}/></button>
        {has('state_gate') && <small>水位已退 · 旧栈桥可通行{has('state_rescued') ? ' · 阿照已上岸' : ''}</small>}
      </aside>}
      {!panel && !showEnd && <>
        {!prefs.fallback && <div className="echo-labels">{labels.map(label => <button key={label.key} style={{left:label.x,top:label.y}} className={label.key === nextPlace ? 'is-target' : ''} onClick={() => travel(label.key)} aria-label={`前往${PLACES.find(row=>row.key===label.key)!.title}`}><i/>{PLACES.find(row=>row.key===label.key)!.title}{label.key === nextPlace && <span>目标</span>}</button>)}</div>}
        {prefs.fallback && <section className="echo-text-scene"><span className="echo-kicker">白礁镇 · 旧码头</span><h2>{place.title}</h2><p>{place.description}</p><p>{has('state_rescued') ? '阿照已经在岸上。他在等你回来。' : has('state_gate') ? '潮水退去，通往小船的栈桥已经露出来。' : '水在往内湾倒灌，旧栈桥还没露出来。'}</p><button className="echo-primary" onClick={() => arrive(currentPlace)}>查看这里<Compass size={18}/></button></section>}
        <div className="echo-location"><Compass size={15}/><span>{traveling ? `正在走向${PLACES.find(row=>row.key===traveling)!.title}…` : place.title}</span><button onClick={()=>arrive(currentPlace)} disabled={busy}>查看 / 交谈 <kbd>E</kbd></button></div>
        <nav className="echo-dock-nav" aria-label="码头地点">{PLACES.map(point=><button key={point.key} onClick={()=>travel(point.key)} disabled={busy} aria-current={point.key===currentPlace?'location':undefined} aria-label={`去${point.title}`}><span>{point.title}</span>{point.key==='boat'&&!has('state_gate')?<small>需退水</small>:point.key===nextPlace?<small>当前目标</small>:null}</button>)}</nav>
        {!prefs.fallback && <div className="echo-controls"><span>点击地点前往 · WASD 移动 · E 查看</span><div className="echo-dpad">{[{name:'向前',x:0,z:-1,symbol:'↑'},{name:'向左',x:-1,z:0,symbol:'←'},{name:'向后',x:0,z:1,symbol:'↓'},{name:'向右',x:1,z:0,symbol:'→'}].map(direction=><button key={direction.name} aria-label={direction.name} onPointerDown={event=>{event.currentTarget.setPointerCapture(event.pointerId);scene.current?.input(direction.x,direction.z)}} onPointerUp={()=>scene.current?.input(0,0)} onPointerCancel={()=>scene.current?.input(0,0)} onLostPointerCapture={()=>scene.current?.input(0,0)}>{direction.symbol}</button>)}</div></div>}
      </>}
      {showEnd && <section className="echo-ending"><span className="echo-kicker">这一程，已抵岸</span><h2>{ending?.title}</h2><p>{ending?.subtitle}</p><div className="echo-ending-record"><p><Check size={16}/>阿照平安上岸</p><p><Check size={16}/>{route==='careful'?'盐纸信已交还阿照，搭扣没有打开':'你优先接回了人，旧信留在潮水里'}</p><p><Check size={16}/>{narrative?.variables.listened ? '你先等到了一个活人的回答' : '你收回了过早的手势，重新听他回答'}</p><p><Package size={16}/>获得一枚新铜铃</p></div><button className="echo-primary" onClick={()=>openPanel('saves')}><RotateCcw size={16}/>从决定前，走另一条路</button><button className="echo-subtle" onClick={()=>start(true)}>再走进码头</button><Link to="/play/tidemark">继续探索长篇《最后一盏灯》 →</Link></section>}
    </>}
    {panel === 'dialogue' && <Sheet title={story?.title ?? ending?.title ?? '两声之间'} onClose={close} kind="echo-dialogue">
      <div className="echo-beats" aria-label="剧情对话">{(prefs.fullText ? beats : beats.slice(beat,beat+1)).map(line=><article key={line.beatKey} className={line.kind==='narration'?'echo-narration':''}><span>{line.speakerKey ? CAST[line.speakerKey as Speaker]?.name : '潮声'}</span><p>{line.text}</p></article>)}</div>
      {!dialogueDone ? <footer><span>{beat+1} / {beats.length}</span><button className="echo-primary" onClick={nextBeat} autoFocus>继续听<ChevronRight size={17}/></button></footer> : <div className="echo-choices">
        {ending ? <button className="echo-primary" onClick={()=>{setEndingRead(true);setPanel(null)}}>收好铜铃，走回岸上<ArrowRight size={17}/></button> : permittedChoices.map(choice=><button key={choice.choiceKey} disabled={busy} onClick={()=>choose(choice.choiceKey)}><span>{choice.text}</span><small>{choice.description}</small><ArrowRight size={16}/></button>)}
        {!ending && !permittedChoices.length && <button className="echo-primary" onClick={()=>{setPanel(nodeKey==='fast'||nodeKey==='careful'?'place':null)}}>{nodeKey==='survey'?'去查看水尺':'开始救援操作'}<ArrowRight size={17}/></button>}
      </div>}
    </Sheet>}
    {panel === 'place' && <Sheet title={place.title} onClose={close} kind={`echo-interaction ${currentPlace==='boat'?'echo-boat-interaction':''}`}>
      <p className="echo-place-description">{place.description}</p>
      {currentPlace==='sluice' && has('gauge') && <div className="echo-note"><BookOpen size={16}/><span>水尺手记：断进水 → 松泄压 → 转手柄</span></div>}
      {currentPlace==='boat' && has('state_counterweight') && <div className="echo-note">吊篮已被绞盘托住{has('state_locker')?' · 信匣已经扣紧':''}</div>}
      <div className="echo-actions">{visibleActions.map(({action,available,reason})=><button key={action.key} disabled={busy||completed.includes(action.key)} className={!available&&!completed.includes(action.key)?'echo-unready':''} onClick={()=>{if(!available){setError(reason || action.unavailableText);setMessage('')}else act(action.key)}}><span>{completed.includes(action.key)?<Check size={16}/>:<ChevronRight size={16}/>} {action.label}</span><small>{completed.includes(action.key)?'已完成':action.kind==='inspect'?'查看并记入手记':action.kind==='take'?'收进背包':available?'可以操作':'检查前置条件'}</small></button>)}</div>
      {story?.place===currentPlace && <div className="echo-choices">{permittedChoices.map(choice=><button key={choice.choiceKey} disabled={busy} onClick={()=>choose(choice.choiceKey)}><span>{choice.text}</span><small>{choice.description}</small><ArrowRight size={16}/></button>)}</div>}
      {story?.place===currentPlace && !['survey','fast','careful'].includes(nodeKey) && <button className="echo-subtle" onClick={()=>{setBeat(0);setPanel('dialogue')}}>与{CAST[story.speaker].name}交谈</button>}
      {error && <p className="echo-feedback error" role="alert">{error}</p>}{message && <p className="echo-feedback" role="status">{message}</p>}
      {nodeKey==='survey' && ((currentPlace==='gauge'&&has('gauge'))||(currentPlace==='shed'&&has('crank'))||(currentPlace==='sluice'&&has('state_gate'))) && <button className="echo-primary" onClick={()=>travel(nextPlace)}>{targetText}<ArrowRight size={16}/></button>}
      {!visibleActions.length && !permittedChoices.length && <button className="echo-subtle" onClick={()=>act(`look.${currentPlace}`)}>观察四周</button>}
    </Sheet>}
    {panel === 'bag' && <Sheet title="随身物品" onClose={close}><div className="echo-items">{ITEMS.filter(item=>item.tag!=='state'&&has(item.key)).map(item=><article key={item.key}><span>{item.tag==='clue'?'调查记录':item.tag==='tool'?'工具':'信物'}</span><h3>{item.title}</h3><p>{item.description}</p>{item.tag==='tool' && <button onClick={()=>travel(nodeKey==='survey'?'sluice':'boat')}>带到{nodeKey==='survey'?'回流闸':'小船边'}使用 →</button>}</article>)}{!ITEMS.some(item=>item.tag!=='state'&&has(item.key))&&<p className="echo-empty">背包还是空的。先看看水尺，再去棚里拿工具。</p>}{adventure?.inventory.some(item=>item.itemKey==='paper'&&item.ownerKey==='zhao')&&<p className="echo-note">盐纸信已经亲手交还阿照。</p>}</div></Sheet>}
    {panel === 'journal' && <Sheet title="接应手记" onClose={close}><div className="echo-journal">
      {adventure?.quests.filter(quest=>quest.status!=='locked').map(quest=><section key={quest.questKey}><h3>{pkg?.adventure.quests.find(row=>row.key===quest.questKey)?.title} <small>{quest.status==='completed'?'已完成':'进行中'}</small></h3>{quest.objectives.map(objective=><p key={objective.objectiveKey}>{objective.completed?'✓':'○'} {pkg?.adventure.quests.find(row=>row.key===quest.questKey)?.objectives.find(row=>row.key===objective.objectiveKey)?.title}</p>)}</section>)}
      <section><h3>已经确认的线索</h3>{ITEMS.filter(item=>item.tag==='clue'&&has(item.key)).map(item=><p key={item.key}><strong>{item.title}</strong> · {item.description}</p>)}{!has('gauge')&&!has('letter')&&<p>只有亲手查看过的事，才记在这里。</p>}</section>
      <section><h3>这一程的对话</h3>{pkg?.narrative.nodes.filter(node=>narrative?.visitedNodeKeys.includes(node.key)).map(node=><details key={node.key}><summary>{node.title}</summary>{pkg.narrative.beats.filter(line=>line.nodeKey===node.key).map(line=><p key={line.beatKey}>{line.speakerKey?`${CAST[line.speakerKey as Speaker].name}：`:''}{line.text}</p>)}</details>)}</section>
    </div></Sheet>}
    {panel === 'saves' && <Sheet title="存档与另一种接应" onClose={close}><p className="echo-place-description">每次操作都会自动保存。从检查点另开一程，原来的选择会保留。</p><button className="echo-primary" disabled={busy} onClick={()=>void run(async()=>{await store.saveCheckpoint(`手动留存 · ${story?.title??ending?.title}`);setMessage('已留下当前检查点。')})}>留下当前检查点<Save size={16}/></button>
      <div className="echo-save-list">{[...store.checkpoints].sort((a,b)=>Number(b.name===checkpointName)-Number(a.name===checkpointName)||b.createdAt-a.createdAt).filter(row=>row.name===checkpointName||!row.name.startsWith('自动')).slice(0,8).map(row=><article key={row.id}><span>{row.name}</span><button disabled={busy} onClick={()=>fork(row.id!)}>从这里另开一程</button></article>)}</div>
      <h3>已有旅程</h3><div className="echo-save-list">{ownSessions.map(session=><article key={session.id}><span>{session.title}{session.id===store.selectedSessionId?' · 当前':''}</span><button disabled={busy||session.id===store.selectedSessionId} onClick={()=>selectSave(session.id!)}>继续这份存档</button></article>)}</div>
      {message&&<p role="status" className="echo-feedback">{message}</p>}{error&&<p role="alert" className="echo-feedback error">{error}</p>}
    </Sheet>}
    {panel === 'settings' && <Sheet title="画面与阅读" onClose={close}><div className="echo-settings">{[{key:'low' as const,title:'轻量画面',description:'降低阴影与水面效果。'},{key:'fallback' as const,title:'文字探索',description:'通过地点按钮完成同一段故事与机关。'},{key:'fullText' as const,title:'整幕阅读',description:'一次显示当前场景的几句对白。'}].map(option=><label key={option.key}><input type="checkbox" checked={prefs[option.key]} onChange={event=>setPrefs(previous=>({...previous,[option.key]:event.target.checked}))}/><span><strong>{option.title}</strong><small>{option.description}</small></span></label>)}<p>没有倒计时。慢慢看，乌荻会等你的手势。</p></div></Sheet>}
    {!panel && (error||message) && <div className={`echo-toast ${error?'error':''}`} role={error?'alert':'status'}>{error||message}<button aria-label="收起提示" onClick={()=>{setError('');setMessage('')}}><X size={16}/></button></div>}
  </main>
}
