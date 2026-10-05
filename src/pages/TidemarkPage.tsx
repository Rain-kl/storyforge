import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Compass, Eye, Flag, Headphones, Map, MessageCircle, Pause, Play, RotateCcw, Save, Settings2, VolumeX, X } from 'lucide-react'
import { useAdventureGamePlayerStore } from '../stores/adventure-game-player'
import { readBoundInstances } from '../lib/product/runtime-instances'
import { findInstalledTidemark, installTidemark } from '../lib/tidemark/production'
import { CAST, CHAPTERS, CLUES, ENDINGS, PLACES, SCENES, type PlaceKey } from '../lib/tidemark/definition'
import { openTidemarkPlayer, tidemarkSessions } from '../lib/tidemark/player'
import { readTidemarkPreferences, saveTidemarkPreferences } from '../lib/tidemark/preferences'
import { speakerName } from '../lib/tidemark/compiler'
import { createTidemarkScene, type TidemarkScene } from '../lib/tidemark/scene'
import '../components/text-game/tidemark.css'

function Modal({ title, onClose, children }: { title: string; onClose(): void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const element=ref.current; element?.showModal(); return () => element?.close() }, [])
  return <dialog ref={ref} className="tm-modal" aria-label={title} onCancel={event => { event.preventDefault(); onClose() }}>
    <header><div><small>白礁镇 · 旅行手记</small><h2>{title}</h2></div><button className="tm-icon" aria-label="关闭面板" onClick={onClose}><X /></button></header>{children}
  </dialog>
}

function TidemarkCanvas({ playing, initialPlace, paused, low, quest, speaker, ending, onNearby, onFailure, apiRef, onInteract }: {
  playing: boolean; initialPlace: PlaceKey; paused: boolean; low: boolean; quest: PlaceKey; speaker: keyof typeof CAST; ending: boolean;
  onNearby(place: PlaceKey|null): void; onFailure(message: string): void; onInteract(): void; apiRef: React.MutableRefObject<TidemarkScene|null>;
}) {
  const host=useRef<HTMLDivElement>(null)
  const callbacks=useRef({onNearby,onFailure,onInteract});callbacks.current={onNearby,onFailure,onInteract}
  useEffect(()=>{
    if(!host.current)return
    let arrival=Promise.resolve();let active=true
    try {
      const api=createTidemarkScene(host.current,{initialPlace, preview:!playing,reducedMotion:window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        onNearby:place=>callbacks.current.onNearby(place),onFailure:message=>callbacks.current.onFailure(message),onInteract:()=>callbacks.current.onInteract(),
        onArrive:place=>{const sessionId=useAdventureGamePlayerStore.getState().selectedSessionId;arrival=arrival.then(async()=>{const store=useAdventureGamePlayerStore.getState();if(!active||store.selectedSessionId!==sessionId)return;const current=store.runtimeState.adventure?.currentLocationKey;if(current&&current!==place)await store.act(`move.${current}.${place}`)}).catch(error=>{if(active)callbacks.current.onFailure(error instanceof Error?error.message:'地点保存失败')})},
      });apiRef.current=api
      return()=>{active=false;api.dispose();apiRef.current=null}
    }catch(error){callbacks.current.onFailure(error instanceof Error?error.message:'此设备无法创建三维场景。')}
    // A mounted view owns a single scene. Navigation is sent through its API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])
  useEffect(()=>apiRef.current?.setPaused(paused),[paused,apiRef])
  useEffect(()=>apiRef.current?.setQuality(low),[low,apiRef])
  useEffect(()=>apiRef.current?.setQuest(quest,speaker),[quest,speaker,apiRef])
  useEffect(()=>apiRef.current?.setEnding(ending),[ending,apiRef])
  return <div ref={host} className="tm-canvas" />
}

function useSeaSound() {
  const [enabled,setEnabled]=useState(false);const audio=useRef<AudioContext|null>(null)
  useEffect(()=>()=>{void audio.current?.close()},[])
  const toggle=()=>{
    if(audio.current){void audio.current.close();audio.current=null;setEnabled(false);return}
    const context=new AudioContext();audio.current=context
    const master=context.createGain();master.gain.value=.045;master.connect(context.destination)
    ;[130.81,196,261.63,293.66].forEach((frequency,index)=>{const oscillator=context.createOscillator();oscillator.type='sine';oscillator.frequency.value=frequency;const gain=context.createGain();gain.gain.value=.17;oscillator.connect(gain);gain.connect(master);const lfo=context.createOscillator();lfo.frequency.value=.035+index*.008;const depth=context.createGain();depth.gain.value=.1;lfo.connect(depth);depth.connect(gain.gain);oscillator.start();lfo.start()})
    const length=context.sampleRate*4,buffer=context.createBuffer(1,length,context.sampleRate);const data=buffer.getChannelData(0);let brown=0
    for(let i=0;i<length;i++){brown=(brown+(Math.random()*2-1)*.02)/1.02;data[i]=brown*3.5}
    const noise=context.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=450;noise.connect(filter);filter.connect(master);noise.start();setEnabled(true)
  }
  useEffect(()=>{const visibility=()=>{if(document.hidden)void audio.current?.suspend();else if(enabled)void audio.current?.resume()};document.addEventListener('visibilitychange',visibility);return()=>document.removeEventListener('visibilitychange',visibility)},[enabled])
  return {enabled,toggle}
}

export default function TidemarkPage() {
  const store=useAdventureGamePlayerStore();const api=useRef<TidemarkScene|null>(null);const dialogueRef=useRef<HTMLElement|null>(null)
  const [playing,setPlaying]=useState(false),[installing,setInstalling]=useState(false),[progress,setProgress]=useState(''),[error,setError]=useState('')
  const [checkingSave,setCheckingSave]=useState(true)
  const [preferences] = useState(readTidemarkPreferences)
  const [releaseId,setReleaseId] = useState<number|null>(null)
  const operationInFlight = useRef(false)
  const [hasSave,setHasSave]=useState(false),[nearby,setNearby]=useState<PlaceKey|null>(null),[fallback,setFallback]=useState(preferences.fallback),[low,setLow]=useState(preferences.low)
  const [panel,setPanel]=useState<'map'|'journal'|'saves'|'settings'|null>(null),[story,setStory]=useState(false),[reading,setReading]=useState(0),[fullText,setFullText]=useState(preferences.fullText)
  const [showAutomatic,setShowAutomatic]=useState(false),[performing,setPerforming]=useState(false)
  const [toast,setToast]=useState(''),[puzzle,setPuzzle]=useState(false),[notes,setNotes]=useState<number[]>([]),[puzzleMessage,setPuzzleMessage]=useState('')
  const sound=useSeaSound()
  const narrative=store.runtimeState.narrative,adventure=store.runtimeState.adventure,manifest=store.selectedManifest
  const currentScene=SCENES.find(scene=>scene.key===narrative?.currentNodeKey)??SCENES[narrative?.completed?SCENES.length-1:0]
  const finished=Boolean(narrative?.completed),ending=ENDINGS.find(item=>item.key===narrative?.endingKey)
  const currentPlace=PLACES.find(place=>place.key===adventure?.currentLocationKey)??PLACES[0]
  const beats=manifest?.narrative.beats.filter(beat=>beat.nodeKey===narrative?.currentNodeKey).sort((a,b)=>a.order-b.order)??[]
  const beat=beats[reading],readAll=fullText||reading>=beats.length-1
  const choices=manifest?.narrative.choices.filter(choice=>choice.sourceNodeKey===narrative?.currentNodeKey)??[]
  const inventory=adventure?.inventory.filter(item=>item.ownerKey==='player'&&item.quantity>0)??[]
  const atQuest=fallback?currentPlace.key===currentScene.place:nearby===currentScene.place&&currentPlace.key===nearby
  const busy=store.busy||store.loading||performing
  const run=async(operation:()=>Promise<unknown>)=>{if(operationInFlight.current||useAdventureGamePlayerStore.getState().busy)return;operationInFlight.current=true;setPerforming(true);setError('');try{await operation()}catch(problem){setError(problem instanceof Error?problem.message:String(problem))}finally{operationInFlight.current=false;setPerforming(false)}}
  const interact=useCallback(()=>{if(!playing)return;if(finished||atQuest){setStory(true)}else if(nearby){setToast(PLACES.find(place=>place.key===nearby)?.description??'')}},[playing,finished,atQuest,nearby])
  useEffect(() => {
    let active = true
    void (async () => {
      const installed = await findInstalledTidemark()
      if (!installed || !active) return
      // The title only needs a save index. Replay and integrity verification of
      // the selected session belong to the explicit Continue action.
      const sessions = await readBoundInstances(installed.scope)
      if (active) setHasSave(tidemarkSessions(sessions, installed.releaseId).length > 0)
    })().catch(problem => { if (active) setError(problem instanceof Error ? problem.message : String(problem)) })
      .finally(() => { if (active) setCheckingSave(false) })
    return () => { active = false }
  }, [])
  useEffect(()=>{if(!toast)return;const timer=window.setTimeout(()=>setToast(''),5000);return()=>window.clearTimeout(timer)},[toast])
  useEffect(() => { saveTidemarkPreferences({ low, fallback, fullText }) }, [low, fallback, fullText])
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented || busy || installing || checkingSave) return
      if (event.key === 'Escape') {
        event.preventDefault()
        // Close only the top layer; a puzzle must not reopen Settings, and
        // closing Settings over a conversation must preserve that conversation.
        if (puzzle) setPuzzle(false)
        else if (panel) setPanel(null)
        else if (story) setStory(false)
        else if (playing) setPanel('settings')
        return
      }
      if (panel || puzzle || (event.target as HTMLElement)?.closest('input,textarea,select,[contenteditable=true]')) return
      if (playing && !story && event.key.toLowerCase() === 'm') { event.preventDefault(); setPanel('map') }
      if (story && !event.repeat && [' ', 'Enter'].includes(event.key) && !(event.target as HTMLElement)?.closest('button')) {
        event.preventDefault(); setReading(index => Math.min(beats.length - 1, index + 1))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [story, panel, puzzle, beats.length, playing, busy, installing, checkingSave])
  const start = async (fresh: boolean) => {
    if (operationInFlight.current) return
    operationInFlight.current = true; setInstalling(true); setError('')
    try {
      const installed = await installTidemark(setProgress)
      setProgress('正在载入旅程与存档…')
      await openTidemarkPlayer(installed, fresh)
      setReleaseId(installed.releaseId); setPlaying(true); setHasSave(true); setStory(false); setReading(0)
    } catch (problem) { setError(problem instanceof Error ? problem.message : String(problem)) }
    finally { operationInFlight.current = false; setInstalling(false) }
  }
  const go=(place:PlaceKey)=>{if(finished){setPanel('journal');return}setPanel(null);if(place===currentPlace.key&&atQuest){interact();return}setStory(false);if(fallback)void run(()=>store.act(`move.${currentPlace.key}.${place}`));else{api.current?.travel(place);setToast(`正在前往${PLACES.find(item=>item.key===place)?.title}`)}}
  const collect=async(key:string)=>{await run(async()=>{await store.act(`inspect.${key}`);setToast(`已收录：${CLUES.find(clue=>clue.key===key)?.title}`)})}
  const choose=(choiceKey:string)=>void run(async()=>{await store.choose(choiceKey);const next=useAdventureGamePlayerStore.getState().runtimeState.narrative;setReading(0);const nextScene=SCENES.find(scene=>scene.key===next?.currentNodeKey);setStory(Boolean(next?.completed)||nextScene?.place===currentPlace.key)})
  useEffect(()=>{if(dialogueRef.current){dialogueRef.current.scrollTop=0;const script=dialogueRef.current.querySelector('.tm-script');if(script)script.scrollTop=0}},[narrative?.currentNodeKey])
  const sceneFailure=useCallback((message:string)=>{setError(message);setFallback(true)},[])
  return <main aria-busy={busy||installing||checkingSave} className={`tm-game ${playing?'tm-playing':'tm-title-screen'}`}>
    {!fallback&&<TidemarkCanvas key={playing?`play-${store.selectedSessionId}`:'preview'} playing={playing} initialPlace={currentPlace.key} paused={Boolean(panel||story||puzzle||installing||busy||checkingSave)} low={low} quest={currentScene.place} speaker={currentScene.speaker} ending={finished} onNearby={setNearby} onFailure={sceneFailure} apiRef={api} onInteract={interact}/>}
    <div className="tm-vignette"/>
    <header className="tm-topbar"><Link to="/openworld" className="tm-back"><ArrowLeft size={15}/><span>文字开放世界</span></Link><span className="tm-edition">TIDEMARK <i/> AN ORIGINAL STORY</span><div><button className="tm-icon" title={sound.enabled?'关闭环境音乐':'开启环境音乐'} aria-label={sound.enabled?'关闭环境音乐':'开启环境音乐'} onClick={sound.toggle}>{sound.enabled?<Headphones/>:<VolumeX/>}</button><button className="tm-icon" aria-label="游戏设置" disabled={busy||installing} onClick={()=>setPanel('settings')}><Settings2/></button></div></header>
    {!playing?<section className="tm-title-content"><div className="tm-overline"><span/> STORYFORGE · 内置叙事作品</div><h1>潮<span>痕</span></h1><h2>最后一盏灯</h2><p className="tm-title-copy">有人用一生守住灯火。<br/>有人必须问，灯里燃烧的是什么。</p><div className="tm-title-actions">{hasSave&&<button className="tm-primary" disabled={installing||checkingSave} onClick={()=>void start(false)}><Play size={16}/>继续旅程<ArrowRight size={17}/></button>}<button className={hasSave?'tm-secondary':'tm-primary'} disabled={installing||checkingSave} onClick={()=>void start(true)}>{installing?'正在准备旅程…':'踏上白礁镇'}<ArrowRight size={17}/></button></div><div className="tm-title-facts"><span>10 章主线</span><i/><span>4 种结局</span><i/><span>可离线游玩</span></div>{(installing||checkingSave)&&<p role="status" className="tm-progress">{checkingSave?'正在查找旅程…':progress}</p>}<Link to="/play/tidemark-echo" className="tm-content-note" style={{display:'block',marginTop:18,color:'#e4c797'}}>新短篇《两声之间》 · 五分钟，亲手完成一次接应 →</Link><p className="tm-content-note">一场关于记忆、同意与归乡的海边奇幻冒险。<br/>包含失亲与灾后创伤主题 · 无战斗与血腥画面</p></section>:<>
      <section className="tm-objective"><div className="tm-overline">第 {currentScene.chapter+1} 章 / 共 10 章</div><h2>{finished?ending?.title:CHAPTERS[currentScene.chapter]}</h2><button disabled={busy} onClick={()=>go(currentScene.place)}><span className="tm-diamond"/><span>{finished?'这条时间线已经留下。':currentScene.title}<small>{finished?'打开手记，回望你的选择':`前往${PLACES.find(place=>place.key===currentScene.place)?.title} · 与${CAST[currentScene.speaker].name}交谈`}</small></span><ChevronRight size={15}/></button><div className="tm-chapter-track">{CHAPTERS.map((title,index)=><i key={title} className={index<=currentScene.chapter?'active':''}/>)}</div></section>
      <nav className="tm-toolbar" aria-label="旅行工具"><button disabled={busy} onClick={()=>setPanel('map')}><Map/><span>地图</span><kbd>M</kbd></button><button disabled={busy} onClick={()=>setPanel('journal')}><BookOpen/><span>手记</span><small>{inventory.length}</small></button><button disabled={busy} onClick={()=>setPanel('saves')}><Save/><span>存档</span></button></nav>
      <div className="tm-place-name"><small>白礁岛</small><span>{currentPlace.title}</span><i/></div>
      {!story&&!panel&&<div className="tm-bottom-hud"><div className="tm-control-help"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 移动</span><span>点击地面行走 · 按住右键转动视角</span></div><div className="tm-interaction">{(atQuest||finished)&&<button className="tm-primary" disabled={busy} onClick={interact}><MessageCircle size={18}/>{finished?'阅读结局':`与${CAST[currentScene.speaker].name}交谈`}<kbd>E</kbd></button>}{CLUES.filter(clue=>clue.place===currentPlace.key&&(fallback||nearby===currentPlace.key)&&!inventory.some(item=>item.itemKey===clue.key)).map(clue=><button key={clue.key} className="tm-secondary" disabled={busy} onClick={()=>clue.key==='circuit'?(setPuzzle(true),setNotes([]),setPuzzleMessage('')):void collect(clue.key)}><Eye size={15}/>{clue.title}</button>)}</div><small className="tm-saved"><span/>剧情决定与调查自动保存</small></div>}
      {!story&&!panel&&!fallback&&<div className="tm-touch-controls" aria-label="触屏方向控制">{[{label:'向前',x:0,z:-1,s:'↑'},{label:'向左',x:-1,z:0,s:'←'},{label:'向后',x:0,z:1,s:'↓'},{label:'向右',x:1,z:0,s:'→'}].map(direction=><button key={direction.label} aria-label={direction.label} onPointerDown={event=>{event.currentTarget.setPointerCapture(event.pointerId);api.current?.setInput(direction.x,direction.z)}} onPointerUp={()=>api.current?.setInput(0,0)} onPointerCancel={()=>api.current?.setInput(0,0)}>{direction.s}</button>)}</div>}
      {fallback&&!story&&<section className="tm-fallback"><Compass/><h2>{currentPlace.title}</h2><p>{currentPlace.description}</p><button className="tm-secondary" onClick={()=>setPanel('map')}>选择要去的地点</button></section>}
      {story&&<section ref={dialogueRef} className={`tm-dialogue ${fullText?'tm-reading-all':''}`} aria-label="剧情对话"><header><div><small>{finished?'终章':`${CHAPTERS[currentScene.chapter]} · ${currentScene.order+1}/40`}</small><span>{finished?ending?.title:currentScene.title}</span></div><div><button onClick={()=>setFullText(value=>!value)}>{fullText?'逐句阅读':'展开本幕'}</button><button aria-label="暂时结束交谈" disabled={busy} onClick={()=>setStory(false)}><X size={17}/></button></div></header>{fullText?<div className="tm-script">{beats.map(line=><p key={line.beatKey} className={line.kind==='dialogue'?'is-dialogue':''}>{line.speakerKey&&<b>{speakerName(line.speakerKey)}</b>}{line.text}</p>)}</div>:<div className="tm-beat" key={beat?.beatKey}>{beat?.speakerKey&&<span className="tm-speaker">{speakerName(beat.speakerKey)}<small>{CAST[beat.speakerKey as keyof typeof CAST]?.role}</small></span>}<p>{beat?.text}</p></div>}<footer><small>{fullText?`${beats.length} 段剧情`:String(reading+1).padStart(2,'0')+` / ${beats.length}`}</small>{!readAll?<button className="tm-next" onClick={()=>setReading(index=>index+1)}>继续<ArrowRight size={17}/><kbd>空格</kbd></button>:finished?<button className="tm-next" onClick={()=>{setStory(false);setPanel('journal')}}>回望这段旅程<ArrowRight size={17}/></button>:null}</footer>{readAll&&!finished&&<div className="tm-choices">{choices.map(choice=>{const available=narrative?.availableChoiceKeys?.includes(choice.choiceKey);return <button key={choice.choiceKey} disabled={busy||!available} onClick={()=>choose(choice.choiceKey)}><span>{choice.text}<small>{available?choice.description:choice.unavailableReason}</small></span><ArrowRight size={17}/></button>})}{choices.some(choice=>!narrative?.availableChoiceKeys?.includes(choice.choiceKey))&&<button className="tm-leave" disabled={busy} onClick={()=>setStory(false)}>先去调查周围</button>}</div>}</section>}
    </>}
    {busy&&!toast&&<div className="tm-toast" role="status">正在保存这一步…</div>}
    {toast&&<div className="tm-toast" role="status"><Check size={16}/>{toast}</div>}
    {(error||store.error)&&<div className="tm-error" role="alert"><span>{error||store.error}</span><button aria-label="收起错误" onClick={()=>{setError('');useAdventureGamePlayerStore.setState({error:''})}}><X size={15}/></button></div>}
    {panel&&<Modal title={{map:'白礁镇地图',journal:'旅行手记',saves:'存档与时间线',settings:'稍作停留'}[panel]} onClose={()=>setPanel(null)}>
      {panel==='map'&&<><div className="tm-map-art"><svg viewBox="0 0 280 310" role="img" aria-label="白礁镇九个地点的方位图"><ellipse cx="140" cy="155" rx="110" ry="142" fill="#263e44" stroke="#72847a" strokeWidth="1"/>{PLACES.map(place=><g key={place.key}><line x1="140" y1="170" x2={140+place.x*2} y2={205+place.z*2.5} stroke="#716e59" strokeWidth="1"/><circle cx={140+place.x*2} cy={205+place.z*2.5} r={place.key===currentScene.place?5:3} fill={place.key===currentScene.place?'#ecc786':'#a4b7b5'}/><text x={140+place.x*2} y={195+place.z*2.5} fill="#d7dacf" fontSize="9" textAnchor="middle">{place.title}</text></g>)}</svg><span>N ↑</span></div><div className="tm-place-list">{PLACES.map(place=><button key={place.key} disabled={!playing||busy||place.key===currentPlace.key} onClick={()=>go(place.key)}><span>{place.title}<small>{place.key===currentScene.place?'当前主线目的地':place.description}</small></span>{place.key===currentPlace.key?<Check size={16}/>:<ArrowRight size={16}/>}</button>)}</div></>}
      {panel==='journal'&&<><div className="tm-journal-summary"><Flag/><p>{finished?`${ending?.title} · ${ending?.subtitle}`:'事实会留下痕迹，选择会留下回声。'}<small>已发现 {inventory.length}/{CLUES.length} 条证据 · 完成 {adventure?.quests.filter(quest=>quest.status==='completed').length??0}/10 章</small></p></div><h3>调查所得</h3>{CLUES.map(clue=>{const found=inventory.some(item=>item.itemKey===clue.key);return <article className={`tm-evidence ${found?'found':''}`} key={clue.key}><small>{PLACES.find(place=>place.key===clue.place)?.title}</small><h4>{found?clue.title:'尚未核验的线索'}</h4><p>{found?clue.description:'靠近地点，留意可以调查的物件。'}</p></article>})}<h3>已经发生的选择</h3>{(adventure?.actionHistory??[]).filter(action=>action.actionKey.startsWith('answer.')).map(action=><article className="tm-history" key={action.eventSequence}><span>{manifest?.adventure.actions.find(definition=>definition.key===action.actionKey)?.label}</span><p>{action.narrative}</p></article>)}<h3>故事回顾</h3>{SCENES.filter(scene=>scene.order<=currentScene.order&&manifest).map(scene=><details key={scene.key}><summary>{scene.title}</summary>{manifest?.narrative.beats.filter(line=>line.nodeKey===scene.key).map(line=><p key={line.beatKey}>{line.speakerKey&&<b>{speakerName(line.speakerKey)}：</b>}{line.text}</p>)}</details>)}</>}
      {panel==='saves'&&<><p className="tm-panel-intro">每次调查和剧情选择都会保存。检查点可开启另一条时间线，原来的旅程会保留。</p><button className="tm-primary" disabled={!playing||busy} onClick={()=>void run(async()=>{await store.saveCheckpoint(`${currentScene.title} · ${new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}`);setToast('检查点已保存')})}><Save size={16}/>保存检查点</button><button className="tm-setting-button" onClick={()=>setShowAutomatic(value=>!value)}>{showAutomatic?'收起':'查看'}自动恢复点（{store.checkpoints.filter(item=>item.name.startsWith('自动 · ')).length}）</button>{store.checkpoints.filter(checkpoint=>showAutomatic||!checkpoint.name.startsWith('自动 · ')).map(checkpoint=><article className="tm-save-row" key={checkpoint.id}><div><strong>{PLACES.reduce((name,place)=>name.replace(` · ${place.key} · `,` · ${place.title} · `),checkpoint.name)}</strong><small>{new Date(checkpoint.createdAt).toLocaleString('zh-CN')}</small></div><button disabled={busy} onClick={()=>void run(async()=>{await store.forkCheckpoint(checkpoint.id!);setPanel(null);setStory(false);setReading(0);setNearby(null)})}><RotateCcw size={15}/>从这里重走</button></article>)}<h3>我的旅程</h3>{tidemarkSessions(store.sessions,releaseId??-1).map(session=><button className="tm-session-row" key={session.id} disabled={busy||session.id===store.selectedSessionId} onClick={()=>void run(async()=>{await store.select(session.id!);setPlaying(true);setStory(false);setPanel(null);setReading(0)})}><span>{session.title}<small>{new Date(session.updatedAt).toLocaleString('zh-CN')}</small></span>{session.id===store.selectedSessionId?<Check size={16}/>:<Play size={16}/>}</button>)}</>}
      {panel==='settings'&&<><p className="tm-panel-intro">这段旅程没有倒计时。你可以慢慢读，也可以随时停下。</p><label className="tm-toggle"><span>轻量画面<small>降低分辨率，关闭实时阴影</small></span><input type="checkbox" checked={low} onChange={event=>setLow(event.target.checked)}/></label><label className="tm-toggle"><span>文字探索<small>以地点列表和完整对话继续游玩</small></span><input type="checkbox" checked={fallback} onChange={event=>{setFallback(event.target.checked);setNearby(null)}}/></label><label className="tm-toggle"><span>展开本幕对话<small>一次阅读整幕，关闭后逐句前进</small></span><input type="checkbox" checked={fullText} onChange={event=>setFullText(event.target.checked)}/></label><button className="tm-setting-button" onClick={sound.toggle}>{sound.enabled?<VolumeX size={18}/>:<Headphones size={18}/>} {sound.enabled?'关闭':'开启'}环境音乐</button><p className="tm-panel-intro">WASD / 方向键移动，Shift 快走，E 交谈。点击地面行走；右键拖动转动视角，滚轮调整距离。地图可引导你走到目的地。</p>{playing&&<button className="tm-secondary" onClick={()=>{setPlaying(false);setStory(false);setPanel(null)}}><Pause size={16}/>回到标题画面</button>}<p className="tm-credits">原创剧本与程序化场景 · StoryForge<br/>3D 显示：Three.js（MIT）<br/>主线无需 API，不包含配音。游戏进度存于本浏览器，可通过项目备份导出。</p></>}
    </Modal>}
    {puzzle&&<Modal title="三枚铜舌" onClose={()=>setPuzzle(false)}><p className="tm-panel-intro">赫生在齿轮盒上刻了三行小字：先让船底听见，再让塔顶回答，最后把声音交还岸上的人。</p><p className="tm-puzzle-hint">船底 · 低音 / 塔顶 · 高音 / 岸上 · 中音</p><div className="tm-bells">{[1,2,3].map(note=><button key={note} onClick={()=>{const next=[...notes,note];setNotes(next);if(next.length===3){if(next.join(',')==='1,3,2'){setPuzzle(false);void collect('circuit')}else{setPuzzleMessage('铜舌没有咬合。循着刻字的顺序，再试一次。');setNotes([])}}}}>{['低','中','高'][note-1]}<small>{note}</small></button>)}</div><div className="tm-note-sequence">{[0,1,2].map(index=><i key={index}>{notes[index]?['低','中','高'][notes[index]-1]:'·'}</i>)}</div><p role="status">{puzzleMessage}</p></Modal>}
    {!playing&&<footer className="tm-title-footer"><span>献给那些终于可以说“不”的人</span><span>白礁镇 · 暴潮前夜</span></footer>}
  </main>
}
