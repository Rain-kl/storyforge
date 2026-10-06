/** Product-owned authored content. No world records or runtime state live here. */
export const TIDEMARK_ID = 'storyforge.tidemark.v1'
export const TIDEMARK_TITLE = '潮痕：最后一盏灯'
export const TIDEMARK_VERSION = 1

export const CAST = {
  player: { name: '姜迟', role: '归乡的水文测绘员', color: '#d28a4c', description: '离开白礁镇十三年，因哥哥的一封空白信回来。善于测量，不擅长告别。' },
  wudi: { name: '乌荻', role: '摆渡船长', color: '#aa654d', description: '坚持先救活人再谈航线，右手总缠着一段红色缆绳。' },
  mei: { name: '梅婶', role: '旅店主人', color: '#ae8e5c', description: '记得每个人的口味，却拒绝提起十三年前那一桌空碗。' },
  lu: { name: '许芦', role: '档案员', color: '#729ca0', description: '在被删改的账册空白里寻找真相，也害怕证据伤害还活着的人。' },
  he: { name: '赫生', role: '修钟匠', color: '#bda46a', description: '事故后失去听力，用手语、铜片和振动与小镇交谈。' },
  su: { name: '素琴', role: '守名人', color: '#9186a9', description: '照看潮祠的名字木牌，相信记忆首先属于被记住的人。' },
  wen: { name: '闻川', role: '镇务官', color: '#718594', description: '十三年来守住堤坝，也守住一份不肯公布的名单。' },
  ahe: { name: '阿禾', role: '拾潮的孩子', color: '#d5a357', description: '以为收集足够多的玻璃，就能替海底的人修一扇窗。' },
  lan: { name: '姜澜', role: '失踪的守灯人', color: '#7d9d8c', description: '姜迟的哥哥，发现灯塔燃烧的东西并不是油，选择停下它。' },
} as const
export type CastKey = keyof typeof CAST
export const PLACES = [
  { key: 'quay', title: '回声码头', description: '系船柱上留着三道旧潮痕。风从沉船的方向吹来。', x: -28, z: 22, npc: 'wudi' },
  { key: 'square', title: '白礁广场', description: '广场中央的潮钟少了一只指针，钟声却从未迟到。', x: 0, z: 8, npc: 'wen' },
  { key: 'inn', title: '候潮旅店', description: '炉火、陈皮茶和没有收走的餐具。有人替离开的人留着座位。', x: -21, z: 0, npc: 'mei' },
  { key: 'archive', title: '盐纸档案馆', description: '百叶窗后的蓝色灯光照着一本被海水泡过的名册。', x: 22, z: 5, npc: 'lu' },
  { key: 'workshop', title: '无声工坊', description: '齿轮悬在屋檐下。修钟匠用指尖倾听金属。', x: -19, z: -21, npc: 'he' },
  { key: 'shrine', title: '听潮祠', description: '白色枝条系着写了名字的木牌，最低的一块没有字。', x: 22, z: -22, npc: 'su' },
  { key: 'wreck', title: '断帆滩', description: '退潮露出一艘竖着桅杆的沉船，甲板上长满白花。', x: -42, z: -15, npc: 'wudi' },
  { key: 'cistern', title: '旧蓄潮池', description: '埋在小镇下面的石室。水面映出本应熄灭的灯光。', x: 2, z: -33, npc: 'lan' },
  { key: 'lighthouse', title: '白昼灯塔', description: '黑色礁岩上的白塔。今晚，它第一次没有准时亮起。', x: 2, z: -58, npc: 'lan' },
] as const
export type PlaceKey = typeof PLACES[number]['key']
export const CHAPTERS = ['归来的潮水', '没有收走的碗', '纸上的缺口', '无声的齿轮', '名字的重量', '沉船仍在呼吸', '灯下之人', '无人可以代答', '登塔', '最后一盏灯']

/** Forty required story scenes; branches alter facts and ending availability. */
const STOPS: Array<[PlaceKey, CastKey, string]> = [
  ['quay','wudi','迟到十三年的渡船'], ['quay','wudi','一封没有字的信'], ['square','wen','公告上的空白'], ['quay','ahe','第三道潮痕'],
  ['inn','mei','第十四副碗筷'], ['inn','mei','欠下的一夜'], ['square','ahe','玻璃做的窗'], ['inn','mei','替谁保守秘密'],
  ['archive','lu','盐结晶里的名字'], ['archive','lu','两份不一样的航单'], ['archive','wen','签名的人'], ['archive','lu','把纸交给谁'],
  ['workshop','he','听不见的警报'], ['workshop','he','三枚铜舌'], ['workshop','he','第二套线路'], ['workshop','he','修好什么，留下什么'],
  ['shrine','su','不愿归来的声音'], ['shrine','su','守名人的规矩'], ['shrine','ahe','母亲的雨衣'], ['shrine','su','允许忘记'],
  ['wreck','wudi','白花下的船名'], ['wreck','wudi','舱底的一口气'], ['wreck','lu','第十三次返航'], ['wreck','wudi','两条绳索'],
  ['cistern','lan','在灯的背面'], ['cistern','lan','哥哥的空白'], ['cistern','lan','不是一个人的牺牲'], ['cistern','he','最后的旁路'],
  ['square','wen','把人叫到一起'], ['square','mei','被保护的人'], ['square','lu','公开的十三个名字'], ['square','wen','怎样承担责任'],
  ['lighthouse','lan','一级一级向上'], ['lighthouse','su','未寄出的信'], ['lighthouse','he','让灯不再吃人'], ['lighthouse','lan','留下还是离开'],
  ['lighthouse','wen','潮水没有投票权'], ['lighthouse','ahe','给海底的一扇窗'], ['lighthouse','lu','所有人的回答'], ['lighthouse','lan','你的手在开关上'],
]
export const SCENES = STOPS.map(([place, speaker, title], index) => ({ key: `s${String(index + 1).padStart(2, '0')}`, place, speaker, title, chapter: Math.floor(index / 4), order: index }))
export const ENDINGS = [
  { key: 'ending.dawn', title: '共守黎明', subtitle: '灯火不再索取名字', color: '#e5bd75' },
  { key: 'ending.truth', title: '向海公开', subtitle: '让所有人知道潮水的代价', color: '#8bb2b9' },
  { key: 'ending.depart', title: '带着名字离开', subtitle: '家可以重新建在别处', color: '#b8afcf' },
  { key: 'ending.keeper', title: '最后的守灯人', subtitle: '这一次，由你承担', color: '#c08b69' },
] as const

export const CLUES = [
  { key: 'gauge', place: 'quay', title: '逆向潮痕', description: '新刻度在旧刻度下面：昨夜灯塔停转之后，水位反而降了半寸。' },
  { key: 'bowl', place: 'inn', title: '第十四只碗', description: '碗底写着“平安”，十三个人之外，还有一个没有上船的孩子。' },
  { key: 'ledger', place: 'archive', title: '双份航单', description: '公开名单记载十三人，原始航单却有十四个铺位。最后一个名字被剪走了。' },
  { key: 'circuit', place: 'workshop', title: '旁路线路图', description: '赫生设计了分散供能的旁路，必须让镇民自愿提供真实记忆，不能再强行抽取。' },
  { key: 'consent', place: 'shrine', title: '守名人的约定', description: '愿意被记住，与愿意供灯，是两件不同的事。沉默不能当作同意。' },
  { key: 'blackbox', place: 'wreck', title: '返航铜匣', description: '船曾抵达港外。警报是人为改过的，船上的人当时仍然活着。' },
  { key: 'reservoir', place: 'cistern', title: '蓄潮池水尺', description: '真正的暴潮仍会到来。停止供灯只能缓解人为叠加的涌浪，不能让海永远温顺。' },
] as const

export const STORY_REQUIREMENTS: Record<string, string> = { s04: 'gauge', s07: 'bowl', s11: 'ledger', s15: 'circuit', s19: 'consent', s23: 'blackbox', s27: 'reservoir' }
