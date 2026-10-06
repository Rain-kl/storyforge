/** Original short-form Tidemark episode. All progression belongs to its release. */
export const ECHO_ID = 'storyforge.tidemark-echo.v1'
export const ECHO_TITLE = '潮痕：两声之间'
export const CAST = {
  player: { name: '姜迟', role: '归乡的测绘员', color: '#dda879' },
  wudi: { name: '乌荻', role: '摆渡船长', color: '#be775b' },
  zhao: { name: '阿照', role: '被困的船工', color: '#9bb5bd' },
} as const
export type Speaker = keyof typeof CAST
export const PLACES = [
  { key: 'quay', title: '接应岸', x: -6, z: 4, description: '乌荻把红绳绕在掌心，另一头一直伸进潮水里。' },
  { key: 'shed', title: '工具棚', x: -9, z: 0, description: '干燥的手柄、锋利的割缆刀。每一样都在等一双手。' },
  { key: 'gauge', title: '旧水尺', x: -2, z: -4, description: '尺上有新旧两道水线，退潮却正在往内湾倒灌。' },
  { key: 'sluice', title: '回流闸', x: 2, z: 0, description: '三处磨亮的机关。工匠刻下的字，被盐填成了白色。' },
  { key: 'boat', title: '搁浅的小船', x: 10, z: 1, description: '船身压住了旧吊篮，船工和一只信匣困在一起。' },
] as const
export type PlaceKey = typeof PLACES[number]['key']
export const ITEMS = [
  { key: 'gauge', title: '回流刻度', description: '先断进水，再松泄压，最后转动手柄。先开出水口会让回流更急。', tag: 'clue' },
  { key: 'letter', title: '两声铃的来处', description: '盐纸每次遇水，都重放完全相同的两声铃。它能保存声音，不能回答新的问题。', tag: 'clue' },
  { key: 'crank', title: '黄铜手柄', description: '装进回流闸的方孔；也能带动小船上的备用绞盘。', tag: 'tool' },
  { key: 'knife', title: '割缆刀', description: '切开受力旧绳前，必须先把人扣进救生吊带。', tag: 'tool' },
  { key: 'paper', title: '封好的盐纸信', description: '阿照母亲留下的旧录音，搭扣一直没被打开。什么时候听，由阿照自己决定。', tag: 'keepsake' },
  { key: 'bell', title: '一枚新铜铃', description: '阿照托你带给修钟匠。它没有保存任何声音，等下一次有人亲手敲响。', tag: 'keepsake' },
  ...['inlet','pressure','gate','harness','counterweight','locker','rescued'].map(key => ({ key: `state_${key}`, title: key, description: '已验证的关卡操作。', tag: 'state' })),
] as const
export const SCENES: Array<{ key: string; title: string; place: PlaceKey; speaker: Speaker; objective: string }> = [
  { key: 'intro', title: '灯没亮，铃先响了', place: 'quay', speaker: 'wudi', objective: '听乌荻说完，接下码头救援' },
  { key: 'survey', title: '先把水退下去', place: 'quay', speaker: 'wudi', objective: '查看水尺、取得工具，打开回流闸' },
  { key: 'signal', title: '谁在回答', place: 'boat', speaker: 'zhao', objective: '走到小船边，辨认两声铃' },
  { key: 'answer', title: '第三声以后', place: 'boat', speaker: 'zhao', objective: '听见眼前这个人的回答' },
  { key: 'echo', title: '一模一样的两声', place: 'boat', speaker: 'wudi', objective: '重新向船工确认' },
  { key: 'plan', title: '一封还没拆的信', place: 'boat', speaker: 'zhao', objective: '和阿照一起选择救援方式' },
  { key: 'fast', title: '先把人接回来', place: 'boat', speaker: 'wudi', objective: '扣紧吊带，再用割缆刀释放吊篮' },
  { key: 'careful', title: '给旧绳卸下重量', place: 'boat', speaker: 'wudi', objective: '扣紧吊带，操作备用绞盘并取出信匣' },
  { key: 'shore.fast', title: '空出来的手', place: 'quay', speaker: 'zhao', objective: '回接应岸，把这一程交还给阿照' },
  { key: 'shore.careful', title: '信到了，先别打开', place: 'quay', speaker: 'zhao', objective: '回接应岸，亲手交还盐纸信' },
]
export const ENDINGS = [
  { key: 'ending.fast', title: '人会带着声音回来', subtitle: '盐纸散了，阿照的回答还在。' },
  { key: 'ending.careful', title: '留到想听的那一天', subtitle: '你保住了一封信，也保住了不拆开它的权利。' },
] as const
export const SCRIPT = `
@@ intro
_|灯塔还没亮。码头下面却传来两声铜铃——停一停，又是两声。
wudi|别急着拉绳。阿照被吊篮压住了，水还在往里灌。
player|他在敲铃？
wudi|我叫过他的名字。铃响了，可我没听见他回答。
@@ survey
wudi|先看水尺，再去棚里拿工具。闸旁那条旧栈桥，退了水才能走。
player|你守住这头绳，我去让水换个方向。
wudi|好。我等你招手，不替你猜。
@@ signal
_|吊篮里露出一只手。旁边的信匣漏着银光，每次水涌进去，便响起完全相同的两声铃。
zhao|别……先别碰绳。
player|阿照？我在桥上。能听见我吗？
@@ answer
player|铃声我听见了。第三下以后，告诉我你现在看见什么。
zhao|一件……很难看的橙雨衣。还有你。姜迟，是你回来了？
_|你没有敲第三下。他却先回答了。乌荻在岸上把绳松开半寸。
@@ echo
player|两声收到了。乌荻，准备拉——
wudi|等一下。你听，这两声连尾音都一样。活人不会每回都喘在同一个地方。
player|阿照，先别敲铃。告诉我，你现在看见什么？
zhao|橙雨衣。姜迟，我看见你了。别拉，绳子缠着我的腿。
@@ plan
zhao|那两声，是我娘喊我回家时敲的。她留下的盐纸，今天我才从档案馆领回来，还没敢听完。
wudi|吊带先扣好。割断旧缆，人能直接上来，信匣会落水。用备用绞盘托住吊篮，就能把信一起带走，多做几步。
zhao|先让我活着回岸上。如果还能带走它……别替我打开。
_|没有人在催你。乌荻一手压住绳，一手等着你的手势。
@@ fast
player|先接人。信匣的事，回岸上再说。
zhao|好。你割吧——等我把脚收进去。
wudi|先把红色吊带扣到他身上，再拿刀。绳断以后，我来接。
@@ careful
player|我试备用绞盘。你进吊带，信匣我只拿，不打开。
zhao|好。那只匣子的搭扣朝里，别把手伸进绳结。
wudi|我稳住这头。你托起吊篮，再取信，最后把人送上来。
@@ shore.fast
_|旧缆绳断开的声音很轻。信匣落进水里，银色的一句“回来了啊”在船边散开。乌荻已经把阿照抱上岸。
zhao|我原来怕，听过一遍就会把她忘了。
player|现在呢？
zhao|现在先借我一件干衣服。别让我娘第一句话就说中——她总说我不会照顾自己。
@@ shore.careful
_|阿照坐在木箱上，先看自己的两只脚，又看你怀里的信匣。盐水沿你的袖口滴下来，搭扣一直没有打开。
zhao|你没听？
player|我只负责送到。
zhao|那就先放在我这里。今天我想先听活人说话。
@@ ending.fast
wudi|阿照，把新铜铃给姜迟。修钟匠还等着它。
zhao|替我告诉他：这只别存声音。谁想叫人，就亲手敲。
_|你敲了一下。乌荻应了一声，阿照又应了一声。两声之间，没有潮水。
@@ ending.careful
zhao|这枚新铜铃，替我带给修钟匠。信我自己收着，等哪天想听了再听。
wudi|回来了？
zhao|回来了。
_|匣子没有响。那句话终于有了一个今天的回答。你把新铜铃放进口袋，朝灯塔还没亮的方向走去。
`

export function hasItem(inventory: Array<{ itemKey: string; quantity: number; ownerKey: string }> | undefined, key: string) {
  return Boolean(inventory?.some(item => item.itemKey === key && item.ownerKey === 'player' && item.quantity > 0))
}
