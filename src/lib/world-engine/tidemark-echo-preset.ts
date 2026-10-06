import { createAuthoredWorldPreset } from './authored-preset'

export const createEchoWorldPreset = () => createAuthoredWorldPreset({
  workspaceUid: 'WS-8d0fd100-b1e1-4ac7-9055-6563686f0001',
  workspace: { name: '两声之间 · 内置短篇', description: '在白礁镇接回一个人，和他尚未拆开的信。', genres: ['fantasy'], status: 'drafting', targetWordCount: 1500, enableMultiWorld: false },
  world: {
    worldStructure: '白礁镇是潮水环绕的岛镇。暴潮前夜，旧码头的回流闸需要人工操作。',
    worldOrigin: '回声盐制成的盐纸能重放旧声音，却不是说话的人，也不能回答新的问题。',
    politicsOverview: '摆渡人接应岸边船只；档案馆按本人意愿归还家庭寄存的盐纸。',
    cultureOverview: '居民用铜铃呼唤返航的人。已故亲人留下的盐纸由收信人决定何时打开。',
    economyOverview: '捕鱼、盐纸和摆渡维持小镇。退潮时，旧码头仍可能受到内湾倒灌。',
  },
  story: {
    theme: '先听见活人的回答，再替他搭一条回来的路。',
    centralConflict: '船工被困在搁浅船边的吊篮里，旧信的回声被误当成求救信号。',
    logline: '归乡的测绘员听见两声一模一样的铜铃，必须辨别记录与回应，和船工一起决定救援方法。',
    mainPlot: '观察水尺，取工具，开闸露桥，确认活人，选择割缆或绞盘救援，回岸交还物品。',
    plotPattern: '误认—观察—操作—确认—合作—交还',
  },
  player: { name: '姜迟', roleWeight: 'main', moralAxis: 'neutral', orderAxis: 'neutral', identity: '归乡的水文测绘员', shortDescription: '穿着橙色雨衣回到白礁镇。', personality: '谨慎，善于观察，愿意听完当事人的回答。', background: '离开岛镇多年，仍记得码头工匠的操作口诀。' },
  label: '两声之间 · 原创语义 v1',
})
