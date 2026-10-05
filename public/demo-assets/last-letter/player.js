
'use strict';
const $=id=>document.getElementById(id),canvas=$('film'),ctx=canvas.getContext('2d',{alpha:false});
const W=1920,H=1080,DURATION=50,images={},sound=$('sound');sound.volume=.85;
let time=0,playing=false,started=false,ready=false,compare=false,staticTime=0,lastStamp=0,audioGood=true,playRequest=0;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const fade=(t,a,b,d=.7)=>smooth((t-a)/d)*smooth((b-t)/d);
const frac=x=>x-Math.floor(x),hash=n=>frac(Math.sin(n*127.1+311.7)*43758.5453123);
const scenes=[0,8,16,24,33,42,50];
const serif='"Songti SC","STSong","Noto Serif CJK SC",serif';
function fill(color,alpha=1){ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=color;ctx.fillRect(0,0,W,H);ctx.restore()}
function text(str,x,y,size=30,color='#efeade',align='left',alpha=1,font=serif){ctx.save();ctx.globalAlpha*=clamp(alpha);ctx.fillStyle=color;ctx.font=`400 ${size}px ${font}`;ctx.textAlign=align;ctx.shadowColor='#000';ctx.shadowBlur=12;ctx.fillText(str,x,y);ctx.restore()}
function spaced(str,x,y,size,spacing,color,alpha=1){ctx.save();ctx.globalAlpha*=clamp(alpha);ctx.fillStyle=color;ctx.font=`400 ${size}px ${serif}`;let width=ctx.measureText(str).width+(str.length-1)*spacing;x-=width/2;for(const char of str){ctx.fillText(char,x,y);x+=ctx.measureText(char).width+spacing}ctx.restore()}
function plate(key,z=1,x=0,y=0,alpha=1){let im=images[key];ctx.save();ctx.globalAlpha*=clamp(alpha);ctx.translate(W/2+x,H/2+y);ctx.scale(z,z);ctx.drawImage(im,-W/2,-H/2,W,H);ctx.restore()}
function vignette(strength=.5){let g=ctx.createRadialGradient(W*.5,H*.46,H*.18,W*.5,H*.48,W*.66);g.addColorStop(0,'transparent');g.addColorStop(1,`rgba(0,5,12,${strength})`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
function glow(x,y,r,color,alpha=1){ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha*=clamp(alpha);let g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore()}
function rain(t,strength=1,warm=false){ctx.save();ctx.lineCap='round';for(let layer=0;layer<3;layer++){let n=[180,70,26][layer],speed=[220,420,690][layer],len=[15,28,55][layer];ctx.lineWidth=[.75,1.2,1.7][layer];for(let i=0;i<n;i++){let seed=i+layer*300,x=frac(hash(seed)+t*(.012+layer*.008))*1.25*W-W*.12,y=frac(hash(seed+44)+t*speed/H)*(H+100)-50;ctx.strokeStyle=warm?`rgba(232,215,179,${(.05+hash(seed+1)*.15)*strength})`:`rgba(170,213,226,${(.045+hash(seed+1)*.14)*strength})`;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-4-layer*5,y+len);ctx.stroke()}}ctx.restore()}
function ripples(t,warm=false){ctx.save();ctx.strokeStyle=warm?'#eac890':'#9ebfc7';for(let i=0;i<28;i++){let q=frac(t*.75+hash(i)),x=80+hash(i+80)*760,y=745+hash(i+90)*290;ctx.globalAlpha=(1-q)*.15;ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(x,y,q*37+2,q*7+1,0,0,Math.PI*2);ctx.stroke()}ctx.restore()}
function mist(t,amount=1,warm=false){ctx.save();ctx.globalCompositeOperation='screen';for(let i=0;i<7;i++){let x=frac(hash(i+90)+t*(.010+i*.0004))*2500-280,y=720+Math.sin(t*.25+i)*90;let g=ctx.createRadialGradient(x,y,0,x,y,410);g.addColorStop(0,warm?`rgba(216,184,129,${.062*amount})`:`rgba(156,199,207,${.065*amount})`);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.save();ctx.translate(0,y);ctx.scale(1,.35);ctx.translate(0,-y);ctx.fillRect(x-410,y-410,820,820);ctx.restore()}ctx.restore()}
function steam(t,x,y,s){ctx.save();ctx.globalCompositeOperation='screen';for(let i=0;i<22;i++){let life=frac(t*.18+i/22),cx=x-life*470*s+Math.sin(i*4.7)*45,cy=y-life*320*s+Math.cos(i)*20,r=(25+life*175)*s;let g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,`rgba(167,188,190,${.18*(1-life)})`);g.addColorStop(.45,`rgba(136,171,179,${.10*(1-life)})`);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(cx-r,cy-r,2*r,2*r)}ctx.restore()}
function motes(t,amount=1){ctx.save();ctx.globalCompositeOperation='screen';for(let i=0;i<48;i++){let x=frac(hash(i+260)+t*.014)*W,y=frac(hash(i+530)-t*.026)*H;let a=(.15+.35*Math.sin(t+i)**2)*amount;glow(x,y,4+hash(i)*8,'#ffd393',a)}ctx.restore()}
function woman(t,x=440,y=200,h=710,zoom=1){const im=images.woman,w=h*im.width/im.height;ctx.save();ctx.translate(x,y+h);ctx.scale(zoom,zoom);const step=8;for(let sy=0;sy<im.height;sy+=step){let f=sy/im.height,sh=Math.min(step,im.height-sy),sway=(Math.sin(t*1.25)*2.2+Math.sin(t*2.3)*.6)*(1-f),breath=1+Math.sin(t*1.65)*.0017;ctx.drawImage(im,0,sy,im.width,sh,-w/2+sway,-h+(sy/im.height*h)*breath,w,sh/im.height*h*breath+.5)}ctx.restore()}
function blink(t){let a=0;for(const at of [18.5,21.8,35.3,39.0]){let d=Math.abs(t-at);a=Math.max(a,clamp((.16-d)/.055))}return a}
function portrait(t,z,x=0,y=0,late=false){plate('portrait',z,x,y);const b=compare?0:blink(t);if(b>0){ctx.save();ctx.translate(W/2+x,H/2+y);ctx.scale(z,z);ctx.translate(-W/2,-H/2);ctx.globalAlpha=b;ctx.drawImage(blinkLayer,0,0,W,H);ctx.restore()}if(!compare){glow(1730,650,560,'#ffb051',late?.14:.08);rain(t,.42,true)}vignette(.42)}
let blinkLayer;
function buildBlink(){blinkLayer=document.createElement('canvas');blinkLayer.width=W;blinkLayer.height=H;let c=blinkLayer.getContext('2d');c.drawImage(images.blink,0,0,W,H);const mask=document.createElement('canvas');mask.width=W;mask.height=H;const m=mask.getContext('2d');for(let [x,y,rx,ry] of [[1223,285,150,70],[1390,327,73,60]]){m.save();m.translate(x,y);m.scale(rx,ry);let g=m.createRadialGradient(0,0,.45,0,0,1);g.addColorStop(0,'#fff');g.addColorStop(1,'transparent');m.fillStyle=g;m.fillRect(-1,-1,2,2);m.restore()}c.globalCompositeOperation='destination-in';c.drawImage(mask,0,0);}
function shot(index,t){const tt=compare?staticTime:t;let p=clamp((tt-scenes[index])/(scenes[index+1]-scenes[index]));
 if(index===0){let z=1.03+p*.065;plate('station',z,-p*17,p*7);if(!compare){glow(996,590,95,'#eeaa42',.17+.03*Math.sin(t*3));mist(t,.8)}woman(tt,540-p*35,285-p*12,610+p*38);if(!compare){rain(t,.95);ripples(t)}vignette(.53)}
 if(index===1){plate('watch',1.015+p*.095,-p*48,p*22);if(!compare){rain(t,.38);glow(1190,390,280,'#edc888',.03+.025*Math.sin(t*1.7))}vignette(.55)}
 if(index===2){portrait(tt,1.01+p*.055,-p*14,p*10)}
 if(index===3){let p2=smooth(p),s=.68+p2*.30,fx=1410+p2*320,fy=920+p2*140;plate('track-plate',1.025,-8,0);ctx.save();ctx.translate(fx-1540*s,fy-1000*s);ctx.scale(s,s);ctx.drawImage(images['train-layer'],0,0,W,H);ctx.restore();if(!compare){glow(fx-170*s,fy-675*s,380,'#ffb846',.28);glow(fx-170*s,fy-400*s,230,'#ffb846',.15);steam(t,fx-260*s,fy-910*s,s);mist(t,2.4,true);motes(t,.85);rain(t,.95,true);ripples(t,true)}vignette(.38)}
 if(index===4){portrait(tt,1.055+p*.045,-40-p*32,26+p*17,true);if(!compare)glow(1920,700,1000,'#ffc479',.075+p*.07)}
 if(index===5){plate('train',1.045+p*.02,0,-8);woman(tt,515,365,580);if(!compare){mist(t,1.4,true);rain(t,.55*(1-p),true);motes(t,.7)}vignette(.55);fill('#06101b',.18+p*.36)}
}
const captions=[
 [1.2,5.0,'这座车站，已经停运了十年。'],
 [5.1,7.85,'今晚，我却收到一张回程票。'],
 [8.8,12.5,'寄信人，是十年前离开的妈妈。'],
 [12.7,15.85,'停了十年的表，忽然走了。'],
 [17,20.3,'信上只有一句话：'],
 [20.4,23.9,'「别怕，最后一班车会等你。」'],
 [27.2,31.9,'远处，有人轻轻叫了我的名字。'],
 [34,37.8,'原来，她不是来带我走的。'],
 [38,41.8,'她只是想，再送我一次回家。']
];
function render(t){ctx.clearRect(0,0,W,H);fill('#04080c');let index=Math.min(5,scenes.findIndex((s,i)=>i<6&&t>=s&&t<scenes[i+1]));if(index<0)index=5;shot(index,t);
 // Brief editorial dissolves, with one headlight match flash at the arrival.
 if(!compare&&index>0){let d=t-scenes[index];if(d<.58){ctx.save();ctx.globalAlpha=1-smooth(d/.58);shot(index-1,scenes[index]-.001);ctx.restore()}}
 if(!compare&&t>=24&&t<24.55)fill('#f5d8ad',Math.sin((t-24)/.55*Math.PI)*.20);
 // Cinematic framing with open, readable subtitle space.
 let top=ctx.createLinearGradient(0,0,0,220);top.addColorStop(0,'#02070db0');top.addColorStop(1,'transparent');ctx.fillStyle=top;ctx.fillRect(0,0,W,220);
 let bottom=ctx.createLinearGradient(0,830,0,H);bottom.addColorStop(0,'transparent');bottom.addColorStop(1,'#010408ed');ctx.fillStyle=bottom;ctx.fillRect(0,830,W,250);
 ctx.fillStyle='#03070a';ctx.fillRect(0,0,W,54);ctx.fillRect(0,H-54,W,54);
 if(t<7.8){let a=fade(t,.5,7.8,.8);text('山间旧站 · 23:59',112,142,19,'#b8cbd0','left',a,'sans-serif');ctx.save();ctx.globalAlpha=a*.6;ctx.fillStyle='#d0b883';ctx.fillRect(112,158,38,1);ctx.restore()}
 if(index===1){let a=fade(t,9,15.8,.65);text('十年前寄出',115,255,19,'#c4b28e','left',a,'sans-serif');text('今夜抵达',112,315,39,'#ede3ce','left',a)}
 for(let [a,b,s] of captions){let o=fade(t,a,b,.35);if(o>0)text(s,W/2,969,29,'#f1eadd','center',o)}
 if(t>=42){let a=smooth((t-42.8)/1.3);spaced('末班来信',W/2,485,87,22,'#f2e5cc',a);text('T H E   L A S T   L E T T E R',W/2,540,17,'#dfceb0','center',a,'sans-serif');text('有些告别，绕了很远的路，才终于抵达。',W/2,641,24,'#e2d9c8','center',smooth((t-44.2)/1.3));text('终',W/2,894,19,'#aeae9e','center',smooth((t-47)/1))}
 if(t<1)fill('#02060b',1-smooth(t));if(t>49)fill('#02060b',smooth((t-49)/1)*.22);
 // Fine deterministic texture is animated only during playback.
 if(!compare){ctx.save();ctx.globalAlpha=.018;ctx.fillStyle='#d0e1de';for(let i=0;i<800;i++){let seed=i+Math.floor(t*12)*311;ctx.fillRect(hash(seed)*W,hash(seed+921)*H,1.2,1.2)}ctx.restore()}
}
function poster(){portrait(18,1.015,0,0);vignette(.25);ctx.fillStyle='#03070a';ctx.fillRect(0,0,W,36);ctx.fillRect(0,H-36,W,36)}
function updateUI(){let seconds=Math.min(50,Math.floor(time));$('clock').textContent=`00:${String(seconds).padStart(2,'0')} / 00:50`;$('seek').value=time;$('play').textContent=playing?'暂停':'播放';$('play').setAttribute('aria-label',playing?'暂停':'播放')}
async function play(){
  if(!ready)return;
  const request=++playRequest;
  if(time>=DURATION-.05)time=0;
  started=true;$('cover').classList.add('hide');
  try{
    if(sound.readyState<1)await new Promise((resolve,reject)=>{
      const clean=()=>{clearTimeout(timeout);sound.removeEventListener('loadedmetadata',loaded);sound.removeEventListener('error',failed)};
      const loaded=()=>{clean();resolve()};const failed=()=>{clean();reject(new Error('Audio unavailable'))};
      const timeout=setTimeout(failed,8000);
      sound.addEventListener('loadedmetadata',loaded,{once:true});sound.addEventListener('error',failed,{once:true});sound.load();
    });
    if(request!==playRequest)return;
    sound.currentTime=time;await sound.play();audioGood=true;
  }catch(e){audioGood=false;$('mute').textContent='声音不可用';sound.pause()}
  if(request!==playRequest){sound.pause();return}
  playing=true;lastStamp=performance.now();updateUI();
}
function pause(){++playRequest;playing=false;sound.pause();updateUI()}

function seek(t){time=clamp(t,0,DURATION);sound.currentTime=time;staticTime=time;started=true;$('cover').classList.add('hide');render(time);updateUI()}
function tick(stamp){let dt=Math.min(.15,(stamp-lastStamp)/1000);lastStamp=stamp;if(playing){time=audioGood&&!sound.paused?sound.currentTime:time+dt;if(time>=DURATION-.025){time=DURATION;pause()}render(time);updateUI()}requestAnimationFrame(tick)}
$('start').onclick=play;$('play').onclick=()=>playing?pause():play();$('restart').onclick=()=>{seek(0);play()};$('seek').oninput=e=>seek(+e.target.value);
$('mute').onclick=()=>{sound.muted=!sound.muted;$('mute').textContent=sound.muted?'声音 关':'声音 开';$('mute').setAttribute('aria-pressed',sound.muted)};
$('volume').oninput=e=>{sound.volume=+e.target.value;sound.muted=false;$('mute').textContent='声音 开';$('mute').setAttribute('aria-pressed','false')};
$('compare').onclick=()=>{compare=!compare;staticTime=time;$('compare').classList.toggle('active',compare);$('compare').textContent=compare?'恢复动效':'静帧对照';$('compare').setAttribute('aria-pressed',compare);$('badge').classList.toggle('show',compare);if(started)render(time)};
$('full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('cinema').requestFullscreen()}catch(e){$('full').textContent='请使用浏览器全屏'}};
document.addEventListener('keydown',e=>{if(!ready||e.altKey||e.ctrlKey||e.metaKey)return;if(['INPUT','BUTTON'].includes(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();playing?pause():play()}if(e.code==='ArrowRight'){e.preventDefault();seek(time+5)}if(e.code==='ArrowLeft'){e.preventDefault();seek(time-5)}if(e.key==='f')$('full').click()});
sound.addEventListener('ended',()=>{time=DURATION;pause();render(time)});
window.movie={renderAt(t){pause();seek(t)},play,pause,get time(){return time},get ready(){return ready},get playing(){return playing},duration:DURATION};
async function load(){try{let loaded=0;await Promise.all(['station','woman','watch','train','portrait','blink','train-layer','track-plate'].map(name=>new Promise((resolve,reject)=>{let im=new Image;im.onload=()=>{images[name]=im;loaded++;$('startLabel').textContent=`正在准备画面 ${loaded} / 8`;resolve()};im.onerror=()=>reject(new Error('画面加载失败：'+name));im.src='assets/'+name+'.webp'})));await document.fonts.ready;buildBlink();ready=true;poster();for(const id of ['start','play','restart','seek','compare'])$(id).disabled=false;$('startLabel').textContent='播放完整短片';requestAnimationFrame(tick)}catch(e){$('loadStatus').className='error';$('loadStatus').textContent=e.message+'。请保留 assets 文件夹，刷新后重试。';$('startLabel').textContent='加载失败'}}load();

document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
window.addEventListener('pagehide',pause);
