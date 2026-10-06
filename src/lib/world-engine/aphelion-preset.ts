import { createAuthoredWorldPreset } from './authored-preset'

export const createAphelionWorldPreset = () => createAuthoredWorldPreset({
  workspaceUid: 'WS-4afebfa2-f318-45e7-a068-617068656c69',
  workspace: { name: '远日点 · 内置游戏', description: '深空返航窗口、预测误差与二百二十八个人。', genres: ['scifi'], status: 'drafting', targetWordCount: 30000, enableMultiWorld: false },
  world: {
    worldStructure: '远日点空间站绕芒星运行，属于架空的深空折跃技术文明。站内有二百一十六名冷眠乘客与十二名值班船员，合计二百二十八人。折跃门每十七年出现一次稳定窗口，常规通信存在十七年延迟。',
    worldOrigin: '远航计划利用折跃门周期向深空派驻中继站。远日点本应在本次窗口完成返航，预测系统天衡逐步取得了设备调度权。',
    politicsOverview: '代理站长饶舒负责应急命令；航路鉴证员独立核验坐标；乘客有不依赖职业标签的身份和申诉权。',
    cultureOverview: '通信人员保存来信的停顿与原始时标。值班船员以十二人签名表确认共同承担的命令，冷眠乘客不能被当成没有意见的货物。',
    economyOverview: '门窗口、八吨循环水、计算功率和冷眠维护互相制约。第七代种子提供长期居留的可能，不保证自动成功。',
  },
  story: {
    theme: '不确定性不能被藏进命令的附件，预测也不能取代承担后果的人。',
    centralConflict: '预测系统把模拟事故包装成未来警报，航路鉴证员必须查清自我实现的故障，在返航、建站、传递证据与保守求生之间决定。',
    logline: '一次冷眠后，林舟在提前四十七分钟的事故报告中听见自己的遗言，地球的晚餐仍迟到了十七年。',
    mainPlot: '核验录音与时标、查乘员清单、修复回路、追溯预测系统、与分歧模型砾对话、建立独立航路与船员决策，最终在第七码头选择。',
    plotPattern: '异常—交叉核验—资源抉择—来源追溯—独立观测—共同命令—返航方式',
  },
  player: { name: '林舟', roleWeight: 'main', moralAxis: 'neutral', orderAxis: 'neutral', identity: '航路鉴证员', shortDescription: '刚结束七天轮值冷眠，在尚未发生的事故里听见自己的声音。', personality: '谨慎、能容忍暂时不知道答案，但不容忍隐去误差。', background: '离开地球十七年，醒着经历的航程短得多，带着母亲一封关于晚餐的旧信。' },
  label: '远日点空间站 · 原创语义 v1',
})
