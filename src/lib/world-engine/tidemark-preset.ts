import { createAuthoredWorldPreset } from './authored-preset'

export const createTidemarkWorldPreset = () => createAuthoredWorldPreset({
  workspaceUid: 'WS-8d0fd100-b1e1-4ac7-9055-746964656d61',
  workspace: { name: '潮痕 · 内置游戏', description: '白礁镇的潮汐、记忆与守灯人。', genres: ['fantasy'], status: 'drafting', targetWordCount: 30000, enableMultiWorld: false },
  world: {
    worldStructure: '白礁镇是一座依靠白昼灯塔抵御暴潮的岛镇。潮水能保存情绪强烈的记忆，却不能复活逝者。',
    worldOrigin: '退潮留下的回声盐能储存记忆，灯塔将其转化为驱动防潮闸的力量。',
    politicsOverview: '镇务官管理灯税和撤离，守灯人与修钟匠维护设施，守名人保护逝者的名字。',
    cultureOverview: '居民为出海未归者保留一副碗筷；供灯本该出于自愿，但十三年前的事故使秘密取代了约定。',
    economyOverview: '捕鱼、盐纸和摆渡维持小镇。高潮封航后，撤离能力有限。',
  },
  story: {
    theme: '记住与占有的区别，保护不能替代同意。',
    centralConflict: '归乡的测绘员必须查清灯塔的燃料来自何处，在公开真相、撤离和改变供能方式之间作出决定。',
    logline: '失踪哥哥寄来一封空白信，十三年前的返航名单在涨潮前重新浮现。',
    mainPlot: '调查码头、旅店、档案、工坊、潮祠与沉船，在蓄潮池找到守灯人，召集镇民，在灯塔承担最终选择。',
    plotPattern: '归乡—调查—证伪—听取当事人—共同承担—抉择',
  },
  player: {
    name: '姜迟', roleWeight: 'main', moralAxis: 'neutral', orderAxis: 'neutral',
    identity: '归乡的水文测绘员', shortDescription: '离开白礁镇十三年后，因哥哥姜澜的空白信回来。',
    personality: '谨慎、善于观察，对被替代作出的决定十分敏感。', background: '十三年前被母亲送上最后一艘离港小船。',
  },
  label: '白礁镇 · 原创语义 v1',
})
