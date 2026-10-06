import { useCallback, useEffect, useRef, useState } from 'react'
import { useAdventureGamePlayerStore } from '../../stores/adventure-game-player'
import { readBoundInstances } from '../product/runtime-instances'
import { builtinAdventureSessions, openBuiltinAdventurePlayer, selectBuiltinAdventureSession } from '../builtin-adventure/player'
import { createBuiltinAdventurePreferences } from '../builtin-adventure/preferences'
import { findInstalledAphelion, installAphelion } from './production'
import { ALL_SCENES, APHELION_ID, CAST, CLUES, ENDINGS, PLACES, PUZZLES, SCENES, STORY_REQUIREMENTS, type PlaceKey } from './definition'
import { puzzleStepKey } from './compiler'
import type { AphelionScene } from './scene'

const preferences=createBuiltinAdventurePreferences('aphelion')
export type Panel='map'|'journal'|'saves'|'settings'|null
export function useAphelionPlayer() {
  const store=useAdventureGamePlayerStore(),api=useRef<AphelionScene|null>(null),inFlight=useRef(false)
  const [playing,setPlaying]=useState(false),[loading,setLoading]=useState(true),[installing,setInstalling]=useState(false),[hasSave,setHasSave]=useState(false),[releaseId,setReleaseId]=useState<number|null>(null)
  const [error,setError]=useState(''),[progress,setProgress]=useState(''),[toast,setToast]=useState(''),[performing,setPerforming]=useState(false)
  const [display,setDisplay]=useState(preferences.read),[panel,setPanel]=useState<Panel>(null),[story,setStory]=useState(false),[reading,setReading]=useState(0)
  const [nearby,setNearby]=useState<PlaceKey|null>(null),[puzzle,setPuzzle]=useState<string|null>(null),[sequence,setSequence]=useState<number[]>([]),[puzzleMessage,setPuzzleMessage]=useState('')
  const own=store.selectedManifest?.definition.productKey===APHELION_ID
  const manifest=own?store.selectedManifest:null,narrative=own?store.runtimeState.narrative:null,adventure=own?store.runtimeState.adventure:null
  const finished=Boolean(narrative?.completed),ending=ENDINGS.find(item=>item.key===narrative?.endingKey)
  const scene=ALL_SCENES.find(item=>item.key===narrative?.currentNodeKey)??SCENES[finished?39:0]
  const place=PLACES.find(item=>item.key===adventure?.currentLocationKey)??PLACES[0]
  const inventory=adventure?.inventory.filter(item=>item.ownerKey==='player'&&item.quantity>0)??[]
  const hasItem=(key:string)=>inventory.some(item=>item.itemKey===key)
  const required=CLUES.find(item=>item.key===STORY_REQUIREMENTS[scene.key]&&!hasItem(item.key))
  const objective=PLACES.find(item=>item.key===(required?.place??scene.place))!
  const atPlace=display.fallback||nearby===place.key
  const atQuest=place.key===scene.place&&atPlace&&!required
  const beats=manifest?.narrative.beats.filter(beat=>beat.nodeKey===narrative?.currentNodeKey).sort((a,b)=>a.order-b.order)??[]
  const choices=manifest?.narrative.choices.filter(choice=>choice.sourceNodeKey===narrative?.currentNodeKey)??[]
  const busy=loading||installing||performing||store.loading||store.busy
  useEffect(()=>{let active=true;void(async()=>{const installed=await findInstalledAphelion();if(installed){const sessions=await readBoundInstances(installed.scope);if(active)setHasSave(builtinAdventureSessions(sessions,installed.releaseId).length>0)}})().catch(problem=>{if(active)setError(String(problem instanceof Error?problem.message:problem))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[])
  useEffect(()=>{preferences.save(display)},[display])
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),4500);return()=>clearTimeout(timer)},[toast])
  const run=async(operation:()=>Promise<unknown>)=>{const current=useAdventureGamePlayerStore.getState();if(inFlight.current||current.busy||current.loading)return;inFlight.current=true;setPerforming(true);setError('');try{await operation()}catch(problem){setError(problem instanceof Error?problem.message:String(problem))}finally{inFlight.current=false;setPerforming(false)}}
  const start=async(fresh:boolean)=>{if(inFlight.current||loading)return;inFlight.current=true;setInstalling(true);setError('');try{const installed=await installAphelion(setProgress);setProgress('正在载入值班记录…');await openBuiltinAdventurePlayer(installed,fresh,'远日点 · 我的航程');setReleaseId(installed.releaseId);setPlaying(true);setHasSave(true);setStory(false);setReading(0);setNearby(null)}catch(problem){setError(problem instanceof Error?problem.message:String(problem))}finally{inFlight.current=false;setInstalling(false)}}
  const interact=useCallback(()=>{if(playing&&!busy&&(atQuest||finished))setStory(true)},[playing,busy,atQuest,finished])
  const go=(key:PlaceKey)=>{setPanel(null);setStory(false);if(key===place.key&&atQuest){interact();return}if(key===place.key&&display.fallback)return;if(display.fallback)void run(()=>store.act(`move.${place.key}.${key}`));else{api.current?.travel(key);setToast(`航路已标记：${PLACES.find(item=>item.key===key)?.title}`)}}
  const choose=(key:string)=>void run(async()=>{await store.choose(key);const next=useAdventureGamePlayerStore.getState().runtimeState.narrative;setReading(0);const nextScene=ALL_SCENES.find(item=>item.key===next?.currentNodeKey);const nextRequired=nextScene?STORY_REQUIREMENTS[nextScene.key]:null;const nextState=useAdventureGamePlayerStore.getState().runtimeState.adventure;const needsClue=nextRequired&&!nextState?.inventory.some(item=>item.itemKey===nextRequired&&item.quantity>0);setStory(Boolean(next?.completed)||Boolean(nextScene?.place===place.key&&!needsClue))})
  const inspect=(key:string)=>{
    const definition=PUZZLES.find(item=>item.clue===key)
    if(definition){const completed=definition.steps.filter((_,index)=>hasItem(puzzleStepKey(key,index))).length;if(completed<3){setPuzzle(key);setSequence(Array.from({length:completed},(_,index)=>index));setPuzzleMessage(completed?'已恢复之前完成的设备步骤。':'');return}}
    void run(async()=>{await store.act(`inspect.${key}`);setToast('原始证据已收录')})
  }
  const solve=(index:number)=>{
    const definition=PUZZLES.find(item=>item.clue===puzzle);if(!definition||busy)return
    const current=useAdventureGamePlayerStore.getState().runtimeState.adventure
    const completed=definition.steps.filter((_,step)=>current?.inventory.some(item=>item.itemKey===puzzleStepKey(definition.clue,step)&&item.quantity>0)).length
    if(index!==completed){setPuzzleMessage('顺序没有通过设备联锁。未改变设备，请从下一项未完成步骤继续。');return}
    void run(async()=>{await store.act(puzzleStepKey(definition.clue,index));setSequence(Array.from({length:index+1},(_,step)=>step));setPuzzleMessage('这一步已保存。');if(index===2){await store.act(`inspect.${definition.clue}`);setPuzzle(null);setSequence([]);setToast('设备操作与核验记录已保存')}})
  }
  const select=(id:number)=>void run(async()=>{await selectBuiltinAdventureSession(id,releaseId!);setStory(false);setPanel(null);setReading(0);setNearby(null)})
  const fork=(id:number)=>void run(async()=>{await store.forkCheckpoint(id);setStory(false);setPanel(null);setReading(0);setNearby(null)})
  const failure=useCallback((message:string)=>{setError(message);setDisplay(value=>({...value,fallback:true}))},[])
  useEffect(()=>{const handler=(event:KeyboardEvent)=>{if(event.defaultPrevented||busy)return;if(event.key==='Escape'){event.preventDefault();if(puzzle)setPuzzle(null);else if(panel)setPanel(null);else if(story)setStory(false);else if(playing)setPanel('settings');return}if(panel||puzzle||(event.target as HTMLElement)?.closest('input,textarea,select,[contenteditable=true]'))return;if(playing&&!story&&event.key.toLowerCase()==='m'){event.preventDefault();setPanel('map')}if(story&&!display.fullText&&!event.repeat&&[' ','Enter'].includes(event.key)&&!(event.target as HTMLElement)?.closest('button')){event.preventDefault();setReading(value=>Math.min(beats.length-1,value+1))}};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler)},[busy,puzzle,panel,story,playing,display.fullText,beats.length])
  return {store,api,playing,setPlaying,loading,installing,hasSave,releaseId,error,setError,progress,toast,display,setDisplay,panel,setPanel,story,setStory,reading,setReading,nearby,setNearby,puzzle,setPuzzle,sequence,puzzleMessage,manifest,narrative,adventure,finished,ending,scene,place,inventory,hasItem,required,objective,atPlace,atQuest,beats,choices,busy,run,start,interact,go,choose,inspect,solve,select,fork,failure,cast:CAST}
}
