import { test, expect, type Page } from '@playwright/test'

test.use({ actionTimeout: 15000 })

const settled = (page: Page) => expect(page.getByRole('main')).toHaveAttribute('aria-busy','false',{timeout:30000})
async function close(page: Page) { const button=page.getByRole('button',{name:'返回码头',exact:true}); if(await button.isVisible())await button.click() }
async function read(page: Page) {
  await expect(page.getByRole('dialog')).toBeVisible()
  for(let i=0;i<8;i++) { const next=page.getByRole('button',{name:'继续听',exact:true}); if(!(await next.isVisible()))break;await next.click() }
}
async function travel(page: Page, title: string) {
  await settled(page);await close(page)
  await page.getByRole('button',{name:`去${title}`,exact:true}).click()
  await expect(page.getByRole('dialog')).toBeVisible({timeout:30000});await settled(page)
}
async function action(page: Page, name: string) {
  console.info(`两声之间：${name}`)
  await page.getByRole('dialog').getByRole('button',{name:new RegExp(name)}).click();await settled(page)
}
async function opening(page: Page) {
  await page.getByRole('button',{name:'走进码头',exact:true}).click()
  await expect(page.getByRole('dialog')).toBeVisible({timeout:90000});await settled(page)
  await read(page);await action(page,'我去看水尺')
  await read(page);await action(page,'去查看水尺')
}
async function drain(page: Page) {
  await travel(page,'旧水尺');await action(page,'查看新旧水线')
  await travel(page,'工具棚');await action(page,'取走手柄与割缆刀')
  await travel(page,'回流闸')
  await action(page,'松开泄压锁');await expect(page.getByRole('dialog')).toContainText('先断进水')
  await expect(page.getByRole('main')).toHaveAttribute('data-gate','closed')
  await action(page,'合上进水挡板');await action(page,'松开泄压锁');await action(page,'装上手柄，转开回流闸')
  await expect(page.getByRole('main')).toHaveAttribute('data-gate','open')
}
async function decision(page: Page, voice: 'ask'|'echo') {
  await travel(page,'接应岸');await action(page,'栈桥露出来了，去接应阿照')
  await travel(page,'搁浅的小船')
  await close(page);await page.getByRole('button',{name:'查看 / 交谈',exact:false}).click()
  await action(page,'查看发声的信匣')
  await expect(page.getByRole('dialog')).toContainText('每一轮铃声')
  await action(page,'与阿照交谈');await read(page)
  await action(page,voice==='ask'?'让他回答一个新的问题':'把两声铃当作接应信号')
  await read(page);await action(page,voice==='ask'?'听见了。现在说说怎么接你':'收回手势，先听阿照说')
  await read(page)
}
async function rescue(page: Page, route: 'fast'|'careful', capture?: () => Promise<unknown>) {
  await action(page,route==='careful'?'人和信一起 · 使用备用绞盘':'先接人 · 割断旧缆')
  await read(page);await action(page,'开始救援操作')
  await action(page,route==='careful'?'使用黄铜手柄 · 托起吊篮':'使用割缆刀 · 切断旧缆')
  await expect(page.getByRole('main')).toHaveAttribute('data-rescued','false')
  await action(page,'把红色吊带扣到阿照身上')
  if(route==='careful') {
    await action(page,'使用黄铜手柄 · 托起吊篮');await capture?.();await action(page,'取出信匣，扣紧搭扣');await action(page,'向乌荻招手 · 收紧接应绳')
  } else await action(page,'使用割缆刀 · 切断旧缆')
  await expect(page.getByRole('main')).toHaveAttribute('data-rescued','true')
  await action(page,route==='careful'?'带着信匣回接应岸':'救援完成，回接应岸')
  await travel(page,'接应岸')
  // Returning to a previously visited point still opens the new shore scene.
  if(await page.getByRole('button',{name:'与阿照交谈',exact:true}).isVisible())await action(page,'与阿照交谈')
  await read(page);await action(page,route==='careful'?'把封好的信交还阿照':'递上干衣服，接过新铜铃')
  await read(page);await action(page,'收好铜铃，走回岸上')
  await expect(page.locator('.echo-ending')).toBeVisible()
}

test('短篇真实 3D 通关：机关步骤恢复、物品查看、双路线回溯与离线游玩', async({page},testInfo)=>{
  test.setTimeout(240000)
  const errors:string[]=[],external:string[]=[]
  page.on('pageerror',error=>errors.push(error.message))
  page.on('request',request=>{if(/^https?:/.test(request.url())&&!['localhost','127.0.0.1','fonts.googleapis.com','fonts.gstatic.com'].includes(new URL(request.url()).hostname))external.push(request.url())})
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,route=>route.abort())
  await page.goto('play/tidemark-echo')
  await expect(page.getByRole('heading',{name:'潮痕',exact:true})).toBeVisible()
  await expect(page.locator('.echo-canvas canvas')).toBeVisible()
  await page.screenshot({path:testInfo.outputPath('echo-title.png')})
  await opening(page)
  await travel(page,'旧水尺');await action(page,'查看新旧水线')
  await travel(page,'工具棚');await action(page,'取走手柄与割缆刀')
  await close(page);await page.getByRole('button',{name:'打开背包',exact:true}).click()
  await expect(page.getByRole('dialog')).toContainText('黄铜手柄');await expect(page.getByRole('dialog')).toContainText('割缆刀')
  await travel(page,'回流闸')
  await action(page,'松开泄压锁');await expect(page.getByRole('dialog')).toContainText('先断进水')
  await action(page,'合上进水挡板')
  await page.reload();await page.getByRole('button',{name:'继续这次接应',exact:true}).click();await settled(page)
  await travel(page,'回流闸')
  await expect(page.getByRole('button',{name:/合上进水挡板/})).toBeDisabled()
  await page.context().setOffline(true)
  await action(page,'松开泄压锁');await action(page,'装上手柄，转开回流闸')
  await expect(page.getByRole('main')).toHaveAttribute('data-gate','open')
  await page.screenshot({path:testInfo.outputPath('echo-sluice-open.png')})
  await decision(page,'ask')
  await page.screenshot({path:testInfo.outputPath('echo-decision.png')})
  await rescue(page,'careful',()=>page.screenshot({path:testInfo.outputPath('echo-rescue-visible.png')}))
  await expect(page.locator('.echo-ending')).toContainText('盐纸信已交还阿照，搭扣没有打开')
  await expect(page.locator('.echo-ending')).toContainText('你先等到了一个活人的回答')
  await page.screenshot({path:testInfo.outputPath('echo-ending-careful.png')})
  await page.getByRole('button',{name:'从决定前，走另一条路',exact:false}).click()
  const saved=page.locator('.echo-save-list article').filter({hasText:'救援方式决定前'})
  await saved.getByRole('button',{name:'从这里另开一程',exact:true}).click();await settled(page)
  await read(page);await rescue(page,'fast')
  await expect(page.locator('.echo-ending')).toContainText('旧信留在潮水里')
  await page.context().setOffline(false)
  await page.reload();await page.getByRole('button',{name:'继续这次接应',exact:true}).click();await settled(page)
  await read(page);await action(page,'收好铜铃，走回岸上')
  await expect(page.locator('.echo-ending')).toContainText('人会带着声音回来')
  expect(errors).toEqual([]);expect(external).toEqual([])
})

test('短篇手机逐句阅读与文字降级：误读铃声后的独立结尾',async({page},testInfo)=>{
  test.setTimeout(180000)
  await page.setViewportSize({width:390,height:844})
  await page.goto('play/tidemark-echo')
  await page.screenshot({path:testInfo.outputPath('echo-mobile-title.png')})
  await page.getByRole('button',{name:'画面与阅读设置',exact:true}).click()
  await page.getByRole('checkbox',{name:/文字探索/}).check();await close(page)
  await opening(page);await drain(page);await decision(page,'echo')
  await page.screenshot({path:testInfo.outputPath('echo-mobile-choice.png')})
  await rescue(page,'fast')
  await expect(page.locator('.echo-ending')).toContainText('你收回了过早的手势，重新听他回答')
  await page.screenshot({path:testInfo.outputPath('echo-mobile-ending.png')})
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)
  expect(overflow).toBe(false)
})
