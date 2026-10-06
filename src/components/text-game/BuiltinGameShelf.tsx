import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import './builtin-games.css'
import tidemarkCover from './builtin-game-tidemark.svg'
import aphelionCover from './builtin-game-aphelion.svg'

export function BuiltinGameShelf() {
  return <section className="builtin-game-shelf mb-7" aria-label="内置叙事游戏"><div className="mb-3 flex items-center justify-between"><div className="text-[10px] tracking-[.2em] text-text-muted">STORYFORGE ORIGINALS</div><span className="text-xs text-text-muted">从五分钟的故事开始</span></div><Link to="/play/tidemark-echo" aria-label="游玩内置短篇：潮痕，两声之间" className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-200/30 bg-slate-900 px-6 py-5 text-stone-100 hover:border-amber-200/60 focus-visible:outline-2 focus-visible:outline-amber-200"><div><span className="text-[9px] tracking-[.2em] text-amber-200/75">五分钟叙事短篇 · 新的接应</span><h2 className="mt-2 font-serif text-2xl tracking-[.12em]">潮痕：两声之间</h2><p className="mt-2 text-xs leading-6 text-stone-300">两声一模一样的铃，一位等待接应的人。调查、开闸，再亲手选择救援方式。</p></div><span className="flex items-center gap-2 text-xs text-amber-100">走进码头<ArrowRight size={15}/></span></Link><div className="grid gap-4 lg:grid-cols-2">
    <Link to="/play/tidemark" aria-label="游玩内置游戏：潮痕，最后一盏灯" className="group relative isolate overflow-hidden rounded-xl border border-amber-200/20 bg-slate-900 px-6 py-6 text-stone-100 shadow-lg transition-colors hover:border-amber-200/50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200">
      <img src={tidemarkCover} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-60 object-cover" />
      <div className="mb-4 flex items-center gap-3 text-[9px] tracking-[.2em] text-amber-200/75"><span>01</span><span>海边奇幻 / 调查与归乡</span></div><h2 className="font-serif text-3xl tracking-[.16em]">潮痕</h2><p className="mt-2 text-xs tracking-[.22em] text-stone-300">最后一盏灯</p><p className="mt-5 max-w-[280px] text-xs leading-6 text-stone-300">寻找失踪的守灯人，查明灯火的代价。<br/>把记忆交还给它真正属于的人。</p><div className="mt-6 flex items-center justify-between gap-4 text-[10px] text-stone-300"><span>10 章剧情 · 4 种结局 · 3D 探索</span><span className="flex items-center gap-2 text-amber-100">开始游玩<ArrowRight size={14}/></span></div>
    </Link>
    <Link to="/play/aphelion" aria-label="游玩内置游戏：远日点，第七码头" className="group relative isolate overflow-hidden rounded-xl border border-cyan-200/20 bg-slate-950 px-6 py-6 text-slate-100 shadow-lg transition-colors hover:border-cyan-200/50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200">
      <img src={aphelionCover} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-75 object-cover" />
      <div className="mb-4 flex items-center gap-3 text-[9px] tracking-[.2em] text-cyan-200/75"><span>02</span><span>深空科幻 / 预测与返航</span></div><h2 className="font-serif text-3xl tracking-[.16em]">远日点</h2><p className="mt-2 text-xs tracking-[.22em] text-slate-300">第七码头</p><p className="mt-5 max-w-[290px] text-xs leading-6 text-slate-300">在未来的事故录音里，听见自己的声音。<br/>为二百二十八个人，决定返航方式。</p><div className="mt-6 flex items-center justify-between gap-4 text-[10px] text-slate-300"><span>10 章剧情 · 3 组谜题 · 4 种结局</span><span className="flex items-center gap-2 text-cyan-100">开始游玩<ArrowRight size={14}/></span></div>
    </Link>
  </div></section>
}
