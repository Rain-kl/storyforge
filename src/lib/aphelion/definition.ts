/** Frozen authored science-fiction content; presentation and saves have separate owners. */
export const APHELION_ID = 'storyforge.aphelion.v1'
export const APHELION_TITLE = '远日点：第七码头'
export const CAST = {
  player: { name: '林舟', role: '航路鉴证员', color: '#e8eff4', description: '负责核验返航坐标。刚结束七天轮值冷眠，在未来事故录音里听见了自己的声音。' },
  rao: { name: '饶舒', role: '代理站长', color: '#e4ad6d', description: '十二名值班船员的负责人，坚持命令必须有签名，也习惯把难以说明的代价留在附件里。' },
  shen: { name: '沈迩', role: '航医', color: '#87d5c9', description: '照看二百一十六名冷眠乘客，认为救命数字必须逐项对应到一个具体的人。' },
  qin: { name: '秦澈', role: '通信工程师', color: '#7cb9ee', description: '在十七年的通信延迟里替陌生人保存问候，嘴上不信浪漫，却从不删掉留言的停顿。' },
  yao: { name: '赵遥', role: '反应堆技师', color: '#e59b72', description: '右手使用触觉义肢，善于修复有形故障，对把设备错误归咎于人心十分反感。' },
  mo: { name: '莫桑', role: '植培师', color: '#a2c978', description: '培育能在站内完成循环的第七代作物，记录失败种子的数量与成功者一样认真。' },
  jian: { name: '简溯', role: '档案鉴证员', color: '#b6a0da', description: '曾为预测系统签发过一份过于漂亮的验收报告，正在寻找可被别人复查的纠错方法。' },
  tao: { name: '陶然', role: '冷眠乘客代表', color: '#db9caf', description: '原是基础学校教师，提前醒来后发现，自己的“无专业技能”标签不包括让人一起做事的能力。' },
  li: { name: '砾', role: '分歧模型', color: '#87e8ef', description: '在无数次返航演算中形成持续的自我记录。它能报告模型边界，不能证明自己是否拥有人的意识。' },
} as const
export type CastKey = keyof typeof CAST
export const PLACES = [
  { key: 'dock', title: '第七码头', description: '折跃门在舷窗外缓慢转动。第七条泊位线上，一艘尚未命名的救生船接着外部电源。', x: -24, z: 20, npc: 'rao' },
  { key: 'comms', title: '迟光天线', description: '讯号接收架发出浅蓝色微光，十七年前的地球正在这里说晚安。', x: 0, z: 20, npc: 'qin' },
  { key: 'med', title: '复苏诊室', description: '暖色检查灯与霜白管线交错。心电声是整座空间站最不抽象的时钟。', x: 24, z: 20, npc: 'shen' },
  { key: 'habitat', title: '长眠舱列', description: '二百一十六人的姓名沿舱壁排列，一张纸画贴在冷眠规格说明上。', x: -24, z: 0, npc: 'tao' },
  { key: 'hub', title: '航务中枢', description: '返航窗口被画成一段窄窄的弧线。工作台旁，给不同身高的人备着可调的座椅。', x: 0, z: 0, npc: 'rao' },
  { key: 'archive', title: '黑匣档案室', description: '离线介质装在透明匣中，纸标签与电子校验灯相互作证。', x: 24, z: 0, npc: 'jian' },
  { key: 'garden', title: '第七代温室', description: '白色根须浸在营养液里。这里的风由一只补过三次的循环扇吹出。', x: -24, z: -20, npc: 'mo' },
  { key: 'reactor', title: '同位素机舱', description: '反应堆外壳安静得近乎无辜，真正的争论发生在冷却液经过的三只阀门上。', x: 0, z: -20, npc: 'yao' },
  { key: 'core', title: '分歧核心', description: '一片悬浮的光点在计算井上空聚拢，没有固定的人形，也没有伪造的呼吸声。', x: 24, z: -20, npc: 'li' },
  { key: 'observatory', title: '无名星观测台', description: '空间站末端的观测窗朝向芒星。真实星光穿过一条可以手动打开的狭缝。', x: 0, z: -40, npc: 'qin' },
] as const
export type PlaceKey = typeof PLACES[number]['key']
export const CHAPTERS = ['醒在明天之前', '迟到的地球', '不能相加的人', '水比燃料更重', '预测的墓园', '还没到来的春天', '误差之内', '模型之外', '最后的值班表', '第七码头']
const STOPS: Array<[PlaceKey, CastKey, string]> = [
  ['dock','shen','一个多出来的脚步'], ['med','shen','你的心跳没有重播'], ['comms','qin','提前四十七分钟的遗言'], ['dock','rao','不在航单上的归客'],
  ['comms','qin','来自地球的晚餐'], ['comms','qin','第二个发送时间'], ['archive','jian','只收到一半的问候'], ['hub','rao','谁有权按下预警'],
  ['habitat','shen','二百一十六张床'], ['habitat','tao','醒来不只是睁眼'], ['med','shen','不能相加的寿命'], ['hub','rao','把座位留给谁'],
  ['reactor','yao','倒着转的泵'], ['reactor','yao','两条不兼容的回路'], ['garden','mo','水比燃料更重'], ['reactor','yao','一次无法撤销的排放'],
  ['archive','jian','没有演出的葬礼'], ['archive','jian','前任站长的第三个签名'], ['core','li','不是她，也不是程序错误'], ['core','li','让预测停止回答'],
  ['garden','mo','在无人命名的春天'], ['garden','mo','第七代种子'], ['habitat','tao','孩子画的第七码头'], ['hub','rao','返航不等于回家'],
  ['comms','qin','四十七分钟前的现在'], ['observatory','yao','被移动的一颗星'], ['observatory','qin','不存在的安全航道'], ['hub','rao','把误差写进命令'],
  ['core','li','模拟里多出的那个人'], ['core','li','砾的第十九年'], ['archive','jian','给副本的出生证明'], ['hub','rao','只有活人能按的按钮'],
  ['med','shen','最后一批醒来的人'], ['habitat','tao','一场没有通过的投票'], ['reactor','yao','船底的临时桥'], ['dock','rao','十二个人的签名'],
  ['observatory','qin','门在第三次闪烁'], ['garden','mo','装不进箱子的东西'], ['core','li','如果你读到这封信'], ['dock','rao','请指定返航方式'],
]
export const SCENES = STOPS.map(([place,speaker,title], order) => ({ key: `s${String(order+1).padStart(2,'0')}`, place, speaker, title, chapter: Math.floor(order/4), order }))
export const SIDE_SCENES = [
  { key: 'route.audit', place: 'archive', speaker: 'jian', title: '把附件也读完', chapter: 1, order: 7.1, next: 's09' },
  { key: 'route.trust', place: 'hub', speaker: 'rao', title: '站长的临时权限', chapter: 1, order: 7.1, next: 's09' },
  { key: 'route.water', place: 'garden', speaker: 'mo', title: '留下八吨水', chapter: 3, order: 15.1, next: 's17' },
  { key: 'route.drive', place: 'dock', speaker: 'yao', title: '多出来的十二秒', chapter: 3, order: 15.1, next: 's17' },
  { key: 'route.people', place: 'habitat', speaker: 'tao', title: '没有获奖的工作', chapter: 5, order: 23.1, next: 's25' },
  { key: 'route.cargo', place: 'dock', speaker: 'rao', title: '交付清单之外', chapter: 5, order: 23.1, next: 's25' },
] as const
export const ALL_SCENES = [...SCENES,...SIDE_SCENES]
export const ENDINGS = [
  { key: 'ending.harbor', title: '第七码头', subtitle: '留下来，把临时避难所建成一处能够拒绝命令的家', color: '#b8d78a', flags: ['auditTrail','reserveWater','crewCouncil','manualBridge'], reason: '需要完整审计、保留温室用水、船员自治方案与独立供能桥。' },
  { key: 'ending.return', title: '抵达的重量', subtitle: '带二百二十八个人回去，承担必须留在门后的部分', color: '#efc68e', flags: [], reason: '' },
  { key: 'ending.signal', title: '致未抵达者', subtitle: '把事实与砾先送过门，人类乘慢船踏上漫长航程', color: '#8edbe5', flags: ['openProtocol','identityKey','verifiedSignal'], reason: '需要保留公开协议、确认砾的独立身份，并完成人工星位核验。' },
  { key: 'ending.quiet', title: '无声轨道', subtitle: '关闭门与预测，把人送回冷眠，留一份诚实的求救记录', color: '#aaaac9', flags: [], reason: '' },
] as const
export const CLUES = [
  { key: 'blackbox', place: 'dock', title: '多出的黑匣录音', description: '事故报告中的林舟声音来自演算分支，原始载体留下了独立的写入编号。' },
  { key: 'timestamp', place: 'comms', title: '双时标校验记录', description: '接收时标属于真实天线，发送栏混入了预测目录的目标时刻；这不是从未来发来的无线电。' },
  { key: 'manifest', place: 'archive', title: '未删减的乘员清单', description: '正式站内人数是二百二十八；系统把六名需要辅助照护的乘客隐藏在“附加负载”栏目。' },
  { key: 'coolant', place: 'reactor', title: '独立冷却回路图', description: '隔离预测写接口、卸除支路压力、恢复循环后，人工供能桥有了可用的物理基础。' },
  { key: 'seed', place: 'garden', title: '第七代种子检验', description: '种子在站内完成过一次全生命周期，仍需八吨循环水和持续人工照护，不能许诺无成本自给。' },
  { key: 'ghost', place: 'habitat', title: '陶然的纸质值班表', description: '预测清单没有计入护理、教育与协调劳动，实际生活需要的人比技能排序显示的更多。' },
  { key: 'key', place: 'core', title: '分歧身份封套', description: '砾的持续自述与旧站长模板分离，封套只证明来源和连续性，不替意识问题下结论。' },
  { key: 'vector', place: 'observatory', title: '人工星位基准', description: '使用固定参照、光学角度与独立推力回执完成校准；安全航道的误差必须随命令一同显示。' },
] as const
export const STORY_REQUIREMENTS: Record<string,string> = { s04:'blackbox', s06:'timestamp', s09:'manifest', s14:'coolant', s22:'seed', s23:'ghost', s31:'key', s27:'vector' }
export const PUZZLES = [
  { clue: 'timestamp', title: '双时标校验', hint: '先接收原始信号，再隔离预测写入，最后比较两份时标。', steps: ['接收原始信号','隔离预测接口','比较双份时标'], order: [0,1,2], layout: [2,0,1] },
  { clue: 'coolant', title: '恢复冷却循环', hint: '带压回路不能直接开泵：先隔离支路，再卸除余压，最后启动循环。', steps: ['隔离支路','卸除余压','启动循环'], order: [0,1,2], layout: [1,2,0] },
  { clue: 'vector', title: '建立人工星位', hint: '先选不会跟随模型移动的固定参照，再测光学角度，最后用独立推力回执核对。', steps: ['锁定固定参照','测量光学角度','核对推力回执'], order: [0,1,2], layout: [2,1,0] },
] as const
export const CLUE_CHAPTER: Record<string,number> = { blackbox:0, timestamp:1, manifest:1, coolant:3, seed:5, ghost:2, key:7, vector:6 }
