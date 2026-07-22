/* 嗎哪收集・天天夠用 —— tsum 連鏈版(物理堆疊+劃線連同款)
 * 反向化鑰匙:連線不是「消滅」,是「收進罐裡」——每天收每天的分(出16:4),
 * 第六天雙倍預備安息日(出16:5);多收的沒有餘、少收的沒有缺(出16:18)。
 * 經文:出16:4-5 / 16:18 / 16:31(和合本,已 cuv 查驗)。
 * 零相依、可離線、手機直向友善。榮耀歸神。
 */
(function(){
'use strict';
var W = 540, H = 960;
var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
cv.width = W; cv.height = H;

// ---------- letterbox fit ----------
function fit(){
  var vw = innerWidth, vh = innerHeight, s = Math.min(vw/W, vh/H);
  cv.style.width = (W*s)+'px'; cv.style.height = (H*s)+'px';
}
addEventListener('resize', fit); fit();

// ---------- tsum 圖鑑:五種嗎哪+兩種鵪鶉(出16:13 晚上有鵪鶉,早晨有嗎哪) ----------
var TYPES = [
  // 07-22:辨識強化——顏色拉開+專屬記號(白霜亮片/蜜香漩渦/芫荽點/金黃麥穗/晨露水珠),不只靠色也靠形
  {id:'m0', kind:'manna', name:'白霜嗎哪', c1:'#ffffff', c2:'#d5cfba', frost:true},
  {id:'m1', kind:'manna', name:'蜜香嗎哪', c1:'#f2c56a', c2:'#cf9838', swirl:true},
  {id:'m2', kind:'manna', name:'芫荽嗎哪', c1:'#c4dc8e', c2:'#8fae58', dots:true},
  {id:'m3', kind:'manna', name:'金黃嗎哪', c1:'#f4b03c', c2:'#c67f18', wheat:true},
  {id:'m4', kind:'manna', name:'晨露嗎哪', c1:'#b4d4f2', c2:'#7ba6cc', drop:true},
  {id:'q0', kind:'quail', name:'褐鵪鶉',   c1:'#a86e38', c2:'#7a4c22'},
  {id:'q1', kind:'quail', name:'灰鵪鶉',   c1:'#9aa4ac', c2:'#6d7880', brow:true},
  // 07-22 擴充:更多嗎哪(使用者點名),一樣「顏色拉開+形狀記號」
  {id:'m5', kind:'manna', name:'莓果嗎哪',   c1:'#e08aa0', c2:'#b8607a', heart:true},
  {id:'m6', kind:'manna', name:'紫羅蘭嗎哪', c1:'#b39ade', c2:'#8a6fb8', star2:true},
  {id:'m7', kind:'manna', name:'海鹽嗎哪',   c1:'#7cc8d8', c2:'#4f9cb0', wave:true}
];

// ---------- 年齡三檔(kid-age-modes) ----------
var MODES = {
  young:{ label:'幼幼(4-6)', types:4, minChain:2, target:600,  r:47, feed:20 },
  kid:  { label:'兒童(7-11)', types:7, minChain:3, target:3000, r:38, feed:11 },
  teen: { label:'青少年(12+)', types:10, minChain:5, target:6000, r:32, feed:8 }
};
var modeKey = 'kid';
try{ modeKey = localStorage.getItem('manna-mode') || 'kid'; }catch(e){}
if(!MODES[modeKey]) modeKey = 'kid';
var M = MODES[modeKey];
var level = 1, curTarget = M.target;   // 07-22 關卡制:第N關目標=基礎×(1+0.5×(N-1)),續關存本機

// ---------- 版面 ----------
var CROWD_TOP = 64, CROWD_H = 150;           // 上方營地(帳棚+收糧的家人)
var PLAY_TOP = CROWD_TOP + CROWD_H + 8;      // 堆疊區頂
var FLOOR = H - 26;                          // 堆疊區底

// ---------- 狀態 ----------
var tsums = [], chain = [], flying = [], sparks = [];
var fed = 0, shownFed = 0, chainCount = 0, playing = false, won = false;
var startTime = 0, doneSent = false;
var blessT = 0;          // >0 = 第六天雙倍(加倍)剩餘秒
var nextBlessAt = 6;     // 第幾鏈觸發第六天
var spawnQueue = 0, spawnTick = 0;
var CAP = 46;
var muted = false;
try{ muted = localStorage.getItem('manna-mute') === '1'; }catch(e){}
var scene = 'menu';      // menu | play | win
var banner = null;       // {text, t}
var hintT = 0, checkT = 0, hintGroup = null;   // 提示/救援(07-21)
var dbgChecks = 0, dbgRescues = 0;             // 07-22 診斷計數(test 鉤子讀)

function activeTypes(){
  // 幼幼 4 款=2嗎哪2鵪鶉好分辨;兒童 7;青少年 10 全員(07-22 圖鑑擴充)
  if (M.types === 4) return [TYPES[0], TYPES[3], TYPES[5], TYPES[6]];
  if (M.types === 7) return [TYPES[0], TYPES[1], TYPES[2], TYPES[3], TYPES[5], TYPES[6], TYPES[7]];
  return TYPES;
}

// ---------- 音效/BGM(零檔案 WebAudio) ----------
var AC = null;
function ac(){ if(!AC){ try{ AC = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return AC; }
function blip(f, dur, type, vol){
  if (muted) return; var a = ac(); if(!a) return;
  try{
    var o = a.createOscillator(), g = a.createGain();
    o.type = type||'sine'; o.frequency.value = f;
    g.gain.setValueAtTime((vol||0.12), a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + (dur||0.15));
    o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + (dur||0.15) + 0.02);
  }catch(e){}
}
function chordCollect(n){
  var base = 392; // G4
  [0,4,7, n>=5?12:null].forEach(function(st,i){
    if(st===null) return;
    setTimeout(function(){ blip(base*Math.pow(2,st/12), 0.25, 'triangle', 0.1); }, i*40);
  });
}
// 清晨曠野 BGM:兩軌八小節循環(每關不同曲——與五餅二魚不同旋律)
var bgmTimer = null, bgmStep = 0;
var MELO = [392,440,523,587, 523,440,392,330, 392,523,587,659, 587,523,440,392];
var BASS = [98,98,131,131, 147,147,131,131, 98,98,131,131, 165,165,98,98];
function bgmTick(){
  if (muted || scene !== 'play') return;
  var i = bgmStep % 16;
  blip(BASS[i], 0.24, 'sine', 0.05);
  if (bgmStep % 2 === 0) blip(MELO[(bgmStep/2)%16|0], 0.2, 'triangle', 0.04);
  bgmStep++;
}
function bgmStart(){ if (bgmTimer) return; bgmTimer = setInterval(bgmTick, 260); }

// ---------- 曉臻預烤語音(播報人聲鐵律:mp3 有就播,沒有就靜默,絕不機器聲) ----------
var VOICES = { intro:'voice/intro.mp3', bless:'voice/bless.mp3', win:'voice/win.mp3' };
var voiceEl = null, blessSpoken = false;
function speak(key){
  if (muted) return;
  try{
    if (voiceEl){ voiceEl.pause(); }
    voiceEl = new Audio(VOICES[key]);
    voiceEl.volume = 1; voiceEl.play().catch(function(){});
  }catch(e){}
}

// ---------- 產生/物理(Verlet 圓) ----------
function rnd(a,b){ return a + Math.random()*(b-a); }
function spawnTsum(){
  var ts = activeTypes(), t, x;
  // 07-22:群聚生成——45% 抄場上隨機一顆的型別、落在它附近,讓 5+ 長鏈自然可達(鏈長本無上限,是密度不夠)
  var anchor = playing && tsums.length && Math.random() < (modeKey==='teen'?0.25:modeKey==='kid'?0.35:0.45) ? tsums[(Math.random()*tsums.length)|0] : null;   // 07-22:開場鋪場不群聚(會滾雪球整片同色),只在補球時群聚
  if (anchor && !anchor.t.wild){
    t = anchor.t;
    x = Math.max(M.r+6, Math.min(W-M.r-6, anchor.x + rnd(-70,70)));
  } else {
    t = ts[(Math.random()*ts.length)|0];
    x = rnd(M.r+6, W-M.r-6);
  }
  // 07-22:有大有小(像一網滿滿的魚)——15% 大隻 1.3×、~25% 小隻 0.78×、其餘微抖動
  var sr = M.r * (Math.random()<0.15 ? 1.3 : (Math.random()<0.3 ? 0.78 : rnd(0.92,1.08)));
  tsums.push({ x:x, y:PLAY_TOP - rnd(20,140), px:0, py:0, r:sr, t:t,
               wob:Math.random()*6.28, hi:0 });
  var s = tsums[tsums.length-1]; s.px = s.x; s.py = s.y - rnd(0,2);
}
function physics(dt){
  var i, j, a, b;
  for (i=0;i<tsums.length;i++){
    a = tsums[i];
    var vx = (a.x - a.px)*0.99, vy = (a.y - a.py)*0.99;
    a.px = a.x; a.py = a.y;
    a.x += vx; a.y += vy + 0.42;
  }
  for (var it=0; it<3; it++){
    for (i=0;i<tsums.length;i++){
      a = tsums[i];
      if (a.x < a.r) a.x = a.r;
      if (a.x > W-a.r) a.x = W-a.r;
      if (a.y > FLOOR - a.r) a.y = FLOOR - a.r;
      if (a.y < -200) a.y = -200;
    }
    for (i=0;i<tsums.length;i++){
      for (j=i+1;j<tsums.length;j++){
        a = tsums[i]; b = tsums[j];
        var dx = b.x-a.x, dy = b.y-a.y, rr = a.r+b.r;
        if (Math.abs(dx)>rr || Math.abs(dy)>rr) continue;
        var d2 = dx*dx+dy*dy;
        if (d2 >= rr*rr || d2 === 0) continue;
        var d = Math.sqrt(d2), push = (rr-d)/d*0.5;
        dx*=push; dy*=push;
        a.x-=dx; a.y-=dy; b.x+=dx; b.y+=dy;
      }
    }
  }
}

// ---------- 連鏈輸入 ----------
var dragging = false, curP = null, trail = [];
function evPos(e){
  var r = cv.getBoundingClientRect();
  var p = (e.touches && e.touches[0]) || e;
  return { x:(p.clientX-r.left)/r.width*W, y:(p.clientY-r.top)/r.height*H };
}
function hitTsum(p){
  for (var i=tsums.length-1;i>=0;i--){
    var t = tsums[i], dx = p.x-t.x, dy = p.y-t.y;
    if (dx*dx+dy*dy < t.r*t.r*1.1) return t;
  }
  return null;
}
function onDown(e){
  hintT = 0; hintGroup = null;
  e.preventDefault();
  var p = evPos(e);
  if (scene === 'menu'){ menuTap(p); return; }
  if (scene === 'win'){ winTap(p); return; }
  if (hudTap(p)) return;
  var t = hitTsum(p);
  if (t){ dragging = true; curP = p; trail = [{x:t.x, y:t.y}]; chain = [t]; t.hi = 1; blip(440, 0.08, 'sine', 0.08); }
}
function onMove(e){
  if (!dragging || scene!=='play') return;
  e.preventDefault();
  var p = evPos(e), t = hitTsum(p);
  curP = p;                                   // 07-22:游標徽章位置
  trail.push({x:p.x, y:p.y});                 // 07-22:滑鼠軌跡(線會轉彎,不是直線)
  if (trail.length > 60) trail.shift();
  if (!t) return;
  var last = chain[chain.length-1];
  if (t === last) return;
  var prev = chain[chain.length-2];
  if (t === prev){ last.hi = 0; chain.pop(); blip(330,0.06,'sine',0.06); return; } // 回滑取消
  if (chain.indexOf(t) !== -1) return;
  if (t.t !== last.t) return;
  var dx = t.x-last.x, dy = t.y-last.y, lim = (t.r+last.r)*1.35;
  if (dx*dx+dy*dy > lim*lim) return;
  chain.push(t); t.hi = 1;
  blip(440*Math.pow(2, Math.min(chain.length,12)/12), 0.08, 'sine', 0.09);
}
function onUp(e){
  if (scene!=='play'){ dragging=false; return; }
  if (!dragging) return;
  dragging = false; curP = null;
  var n = chain.length;
  if (n >= M.minChain) collect(chain.slice());
  for (var i=0;i<chain.length;i++) chain[i].hi = 0;
  chain = [];
}
cv.addEventListener('pointerdown', onDown);
cv.addEventListener('pointermove', onMove);
addEventListener('pointerup', onUp);
addEventListener('pointercancel', onUp);   // 07-22 修:手機手勢中斷只發 cancel,不接=dragging 卡死→救援全停
cv.addEventListener('touchstart', function(e){e.preventDefault();}, {passive:false});

// ---------- 收鏈=收進罐裡(收集類:天上照樣降,收 n 補 n;不搞越收越多) ----------
function collect(list){
  var n = list.length;
  var mult = (n>=8?3 : n>=5?2 : 1) * (blessT>0?2:1);
  var portions = n * M.feed * mult;
  fed = Math.min(curTarget, fed + portions);
  chainCount++;
  hintT = 0; hintGroup = null;
  chordCollect(n);
  for (var i=0;i<n;i++){
    var t = list[i], idx = tsums.indexOf(t);
    if (idx !== -1) tsums.splice(idx,1);
    flying.push({ x:t.x, y:t.y, r:t.r, t:t.t, tx:rnd(60,W-60), ty:CROWD_TOP+CROWD_H*0.62, p:0, d:i*0.05 });
  }
  for (i=0;i<10+n*2;i++) sparks.push({ x:list[0].x, y:list[0].y, vx:rnd(-3,3), vy:rnd(-4,1), life:1 });
  spawnQueue += n;                          // 收集類:收 n 補 n(天天降、天天收)
  banner = { text: n>=5 ? ('好大一把!收進 '+portions+' 份') : ('收進 '+portions+' 份口糧'), t:1.4 };
  if (chainCount >= nextBlessAt && blessT<=0){
    blessT = 8; nextBlessAt += (modeKey==='teen'?13:10);
    banner = { text:'✨ 第六天——收雙倍,預備安息日!', t:2.4 };
    blip(784,0.4,'triangle',0.12); blip(988,0.5,'triangle',0.1);
    if (!blessSpoken){ blessSpoken = true; speak('bless'); }
  }
  if (fed >= curTarget && !won){
    won = true; scene = 'win'; speak('win');
    if (!doneSent){ doneSent = true;
      if (window.__ping) window.__ping('manna-tsum-done', Math.round((Date.now()-startTime)/1000)); }
  }
}


// ---------- 提示+卡死救援(07-21 修:場上可能完全沒有可連的同款相鄰組=卡死) ----------
function findGroup(){
  for (var i=0;i<tsums.length;i++){
    var seed = tsums[i];
    var group = [seed], seen = [seed], grow = true;
    while (grow && group.length < 9){
      grow = false;
      for (var j=0;j<tsums.length;j++){
        var c = tsums[j];
        if (seen.indexOf(c) !== -1 || c.t !== seed.t) continue;
        var lastT = group[group.length-1];
        var dx=c.x-lastT.x, dy=c.y-lastT.y, lim=(c.r+lastT.r)*1.35;
        if (dx*dx+dy*dy <= lim*lim){ group.push(c); seen.push(c); grow = true; break; }
      }
    }
    if (group.length >= M.minChain) return group;
  }
  return null;
}
function rescue(){
  // 無鏈可連的溫柔救援:挑一顆,把離它最近的幾顆變成同款(必產生可連組),火花+橫幅
  // 07-22:只挑「已落定」的球(掉落中的遞色後落地會散,鏈必斷)
  var cands = tsums.filter(function(t){ return !t.t.wild && Math.abs(t.y - t.py) < 1.5 && t.y > PLAY_TOP; });
  if (cands.length <= M.minChain) return false;
  var seed = cands[(Math.random()*cands.length)|0];
  // 07-22 修 v2:沿「實際相鄰」走訪遞色,不搬位置——瞬移進人堆會被物理彈散(minChain≥4 必斷鏈);
  // 堆裡最近的未用球本來就貼著(~1.0×半徑和<1.35 可連),純換色=物理穩定、必可連
  var used = [seed], prev = seed;
  for (var i=0;i<M.minChain-1;i++){
    var best = null, bd = 1e9;
    for (var j=0;j<cands.length;j++){
      var c = cands[j];
      if (used.indexOf(c) !== -1) continue;
      var dx=c.x-prev.x, dy=c.y-prev.y, d2=dx*dx+dy*dy;
      if (d2 < bd){ bd = d2; best = c; }
    }
    if (!best) break;
    var lim = (best.r+prev.r)*1.2;
    if (bd > lim*lim){
      // 稀疏場才輕移貼齊 prev(順著原方向,不闖進堆中心)
      var ang = Math.atan2(best.y-prev.y, best.x-prev.x);
      best.x = Math.max(best.r, Math.min(W-best.r, prev.x + Math.cos(ang)*(prev.r+best.r)*0.98));
      best.y = Math.max(PLAY_TOP, Math.min(FLOOR-best.r, prev.y + Math.sin(ang)*(prev.r+best.r)*0.98));
      best.px = best.x; best.py = best.y;
    }
    best.t = seed.t;
    for (var k=0;k<6;k++) sparks.push({ x:best.x, y:best.y, vx:rnd(-2,2), vy:rnd(-3,1), life:1 });
    used.push(best); prev = best;
  }
  banner = { text:"✨ 神眷顧——嗎哪聚在一起了!", t:2.0 };
  blip(659,0.3,'triangle',0.1);
  hintGroup = null; hintT = 0;
  return true;
}
// ---------- 畫圖 ----------
function roundRect(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

// 立體感三件套:色彩混合 + 球面漸層 + 高光/接地影(canvas 2D 假 3D,零相依)
function hex2rgb(h){ return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }
function mixc(h, f){ // f>0 往白、f<0 往黑
  var c = hex2rgb(h), t = f>0 ? 255 : 0, a = Math.abs(f);
  return 'rgb('+Math.round(c[0]+(t-c[0])*a)+','+Math.round(c[1]+(t-c[1])*a)+','+Math.round(c[2]+(t-c[2])*a)+')';
}
function ballGrad(x, y, r, c1, c2){
  var g = ctx.createRadialGradient(x - r*0.35, y - r*0.45, r*0.12, x, y, r*1.02);
  g.addColorStop(0, mixc(c1, 0.55));
  g.addColorStop(0.45, c1);
  g.addColorStop(1, mixc(c2, -0.22));
  return g;
}
function ballHighlight(x, y, r){
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.beginPath(); ctx.ellipse(x - r*0.34, y - r*0.44, r*0.24, r*0.13, -0.55, 0, 7); ctx.fill();
}
function groundShadow(x, y, r){
  ctx.fillStyle = 'rgba(70,50,20,.16)';
  ctx.beginPath(); ctx.ellipse(x, y + r*0.86, r*0.78, r*0.2, 0, 0, 7); ctx.fill();
}

function drawFace(x,y,r,happy){
  // 臉部鐵則:每顆 tsum 都有眼和嘴
  ctx.fillStyle = '#3a2a18';
  ctx.beginPath(); ctx.arc(x-r*0.28, y-r*0.08, r*0.085, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x+r*0.28, y-r*0.08, r*0.085, 0, 7); ctx.fill();
  ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = Math.max(2, r*0.07); ctx.lineCap='round';
  ctx.beginPath(); ctx.arc(x, y+r*0.14, r*0.24, 0.25, Math.PI-0.25); ctx.stroke();
  if (happy){
    ctx.fillStyle = 'rgba(240,120,120,.45)';
    ctx.beginPath(); ctx.arc(x-r*0.5, y+r*0.1, r*0.12, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x+r*0.5, y+r*0.1, r*0.12, 0, 7); ctx.fill();
  }
}
function drawTsum(t, xx, yy, rr){
  var x = xx!==undefined?xx:t.x, y = yy!==undefined?yy:t.y, r = (rr!==undefined?rr:t.r) * (t.hi? 1.13:1);
  var ty = t.t;
  ctx.save();
  groundShadow(x, y, r);
  if (t.hi){ ctx.shadowColor = '#fff'; ctx.shadowBlur = 14; }
  if (ty.kind === 'manna'){
    // 圓滾滾嗎哪:球面漸層立體感
    ctx.fillStyle = mixc(ty.c2, -0.1);
    ctx.beginPath(); ctx.arc(x, y+r*0.06, r, 0, 7); ctx.fill();
    ctx.fillStyle = ballGrad(x, y-r*0.04, r*0.96, ty.c1, ty.c2);
    ctx.beginPath(); ctx.arc(x, y-r*0.04, r*0.96, 0, 7); ctx.fill();
    if (ty.dots){ ctx.fillStyle = 'rgba(110,130,70,.5)';
      for (var i=0;i<6;i++){ var a2=i*1.05+0.4; ctx.beginPath();
        ctx.arc(x+Math.cos(a2)*r*0.5, y-r*0.15+Math.sin(a2)*r*0.35, r*0.05, 0, 7); ctx.fill(); } }
    if (ty.wheat){ ctx.strokeStyle='rgba(170,130,50,.55)'; ctx.lineWidth=r*0.06; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(x-r*0.35, y-r*0.5); ctx.quadraticCurveTo(x, y-r*0.7, x+r*0.35, y-r*0.5); ctx.stroke(); }
    if (ty.swirl){ ctx.strokeStyle='rgba(255,240,200,.75)'; ctx.lineWidth=r*0.09;
      ctx.beginPath(); ctx.arc(x, y-r*0.05, r*0.6, 2.6, 5.2); ctx.stroke(); }
    if (ty.frost){                       // 白霜:十字亮片 ×3
      ctx.strokeStyle='rgba(160,180,210,.8)'; ctx.lineWidth=Math.max(2,r*0.05); ctx.lineCap='round';
      var fpts=[[-0.42,-0.3],[0.4,-0.42],[0.12,0.42]];
      for (var fi2=0; fi2<3; fi2++){
        var fx=x+fpts[fi2][0]*r, fy=y+fpts[fi2][1]*r, fl=r*0.14;
        ctx.beginPath(); ctx.moveTo(fx-fl,fy); ctx.lineTo(fx+fl,fy);
        ctx.moveTo(fx,fy-fl); ctx.lineTo(fx,fy+fl); ctx.stroke();
      }
    }
    if (ty.drop){                        // 晨露:大水珠+小水珠
      ctx.fillStyle='rgba(70,130,190,.75)';
      ctx.beginPath(); ctx.arc(x+r*0.38, y+r*0.3, r*0.17, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(x-r*0.35, y-r*0.32, r*0.11, 0, 7); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.85)';
      ctx.beginPath(); ctx.arc(x+r*0.33, y+r*0.24, r*0.05, 0, 7); ctx.fill();
    }
    if (ty.heart){                       // 莓果:深紅愛心
      ctx.fillStyle = '#8a2038';
      ctx.font = 'bold ' + Math.max(10, r*0.45) + 'px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('♥', x+r*0.35, y+r*0.45);
    }
    if (ty.star2){                       // 紫羅蘭:白星
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.font = 'bold ' + Math.max(10, r*0.45) + 'px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('★', x-r*0.35, y-r*0.25);
    }
    if (ty.wave){                        // 海鹽:兩道波浪
      ctx.strokeStyle = 'rgba(30,90,110,.6)'; ctx.lineWidth = Math.max(2, r*0.08); ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(x-r*0.45, y+r*0.25);
      ctx.quadraticCurveTo(x-r*0.2, y+r*0.1, x, y+r*0.25); ctx.quadraticCurveTo(x+r*0.2, y+r*0.4, x+r*0.45, y+r*0.25); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x-r*0.35, y-r*0.15);
      ctx.quadraticCurveTo(x-r*0.1, y-r*0.3, x+r*0.1, y-r*0.15); ctx.stroke();
    }
    ballHighlight(x, y-r*0.04, r*0.96);
    drawFace(x, y-r*0.02, r, t.hi);
  } else {
    // 鵪鶉:圓身+小翅+尖喙+短尾,一樣有臉、一樣立體
    ctx.fillStyle = mixc(ty.c2, -0.15);
    ctx.beginPath();               // 短尾
    ctx.moveTo(x-r*0.8, y);
    ctx.lineTo(x-r*1.2, y-r*0.35); ctx.lineTo(x-r*1.05, y+r*0.25); ctx.closePath(); ctx.fill();
    ctx.fillStyle = ballGrad(x, y, r*0.95, ty.c1, ty.c2);
    ctx.beginPath(); ctx.arc(x, y, r*0.95, 0, 7); ctx.fill();
    ctx.fillStyle = mixc(ty.c2, 0.08);   // 小翅膀
    ctx.beginPath(); ctx.ellipse(x-r*0.35, y+r*0.15, r*0.42, r*0.26, -0.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8a83c';           // 尖喙
    ctx.beginPath(); ctx.moveTo(x+r*0.85, y-r*0.05);
    ctx.lineTo(x+r*1.15, y+r*0.05); ctx.lineTo(x+r*0.85, y+r*0.18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = mixc(ty.c1, 0.35);   // 頭羽
    ctx.beginPath(); ctx.ellipse(x+r*0.2, y-r*0.62, r*0.3, r*0.16, 0.3, 0, 7); ctx.fill();
    if (ty.brow){                        // 灰鵪鶉:白眉紋(和褐鵪鶉一眼分開)
      ctx.strokeStyle='rgba(255,255,255,.9)'; ctx.lineWidth=Math.max(2,r*0.07); ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(x-r*0.15, y-r*0.42); ctx.quadraticCurveTo(x+r*0.3, y-r*0.58, x+r*0.62, y-r*0.35); ctx.stroke();
    }
    ballHighlight(x, y, r*0.95);
    drawFace(x+r*0.15, y-r*0.05, r*0.9, t.hi);
  }
  ctx.restore();
}
function drawCrowdPerson(x, y, s, i, t){
  // 營地收糧的家人(有臉),收滿比例越高越多人舉罐歡呼
  var happyN = Math.floor((fed/curTarget)*CROWD_N);
  var happy = i < happyN;
  var bob = happy ? Math.sin(t*5 + i)*2 : 0;
  ctx.fillStyle = ['#a8663c','#7a8a4a','#5a7a9c','#9c7a5a','#8a5a7a'][i%5];
  ctx.beginPath(); ctx.arc(x, y - 6*s + bob*0.3, 7*s, Math.PI, 0); ctx.fill();
  ctx.fillRect(x-7*s, y-6*s+bob*0.3, 14*s, 6*s);
  ctx.fillStyle = '#f2c9a0';
  ctx.beginPath(); ctx.arc(x, y-13*s + bob, 5.2*s, 0, 7); ctx.fill();
  ctx.fillStyle = '#4a3020';
  ctx.beginPath(); ctx.arc(x, y-16*s + bob, 5*s, Math.PI*1.05, Math.PI*1.95); ctx.fill(); // 髮(耳前無髮)
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath(); ctx.arc(x-1.8*s, y-13.5*s+bob, 0.7*s, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x+1.8*s, y-13.5*s+bob, 0.7*s, 0, 7); ctx.fill();
  ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 0.8*s;
  ctx.beginPath(); ctx.arc(x, y-11.8*s+bob, 1.6*s, 0.3, Math.PI-0.3); ctx.stroke();
  if (happy){ // 雙手高舉陶罐
    ctx.strokeStyle = '#f2c9a0'; ctx.lineWidth = 2*s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x-6*s, y-6*s); ctx.lineTo(x-8*s, y-17*s-bob); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+6*s, y-6*s); ctx.lineTo(x+8*s, y-17*s-bob); ctx.stroke();
    ctx.fillStyle = '#b3733f';
    ctx.beginPath(); ctx.ellipse(x, y-20*s-bob, 4.5*s, 3.2*s, 0, 0, 7); ctx.fill(); // 陶罐
  }
}
var CROWD_N = 24, crowdPos = [];
(function(){
  for (var i=0;i<CROWD_N;i++){
    crowdPos.push({ x: 36 + (i%8)*68 + ((i/8|0)%2)*30 + rnd(-8,8),
                    y: CROWD_TOP + 52 + (i/8|0)*44 + rnd(-4,4), s: rnd(0.85,1.1) });
  }
})();

function drawHUD(){
  ctx.fillStyle = '#7a5a28';
  ctx.fillRect(0,0,W,CROWD_TOP);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 26px "Microsoft JhengHei",sans-serif'; ctx.textAlign='center';
  ctx.fillText('已收 ' + Math.round(shownFed) + ' / ' + curTarget + ' 份口糧', W/2, 40);
  // 返回大廳
  ctx.font = '20px sans-serif'; ctx.textAlign='left';
  ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText('← 大廳', 12, 38);
  ctx.textAlign='right';
  ctx.fillText(muted?'🔇':'🔊', W-14, 38);
  ctx.font = 'bold 16px "Microsoft JhengHei",sans-serif'; ctx.textAlign='left';
  ctx.fillStyle = '#ffe9a8'; ctx.fillText('第'+level+'關', 12, 58);
  // 進度條
  ctx.fillStyle = 'rgba(0,0,0,.3)'; roundRect(80, 48, W-160, 10, 5); ctx.fill();
  ctx.fillStyle = blessT>0 ? '#ffd54a' : '#e8cf8a';
  var w = Math.max(10,(W-160)*Math.min(1, shownFed/curTarget));
  roundRect(80, 48, w, 10, 5); ctx.fill();
}
function hudTap(p){
  if (p.y < CROWD_TOP){
    if (p.x < 100){ location.href = 'https://hfpc-bible-games.netlify.app/'; return true; }
    if (p.x > W-100){ muted = !muted; try{ localStorage.setItem('manna-mute', muted?'1':'0'); }catch(e){} return true; }
  }
  return false;
}

function drawScene(t){
  // 清晨曠野:暖色天空+沙地
  var g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#f2d9a8'); g.addColorStop(0.35,'#eec98e'); g.addColorStop(1,'#e2b273');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  // 營地帶(沙丘+帳棚)
  ctx.fillStyle = '#d9b378';
  ctx.fillRect(0, CROWD_TOP, W, CROWD_H);
  for (var i=0;i<4;i++){ // 帳棚
    var tx = 60 + i*140;
    ctx.fillStyle = i%2 ? '#a8764a' : '#96684a';
    ctx.beginPath(); ctx.moveTo(tx-34, CROWD_TOP+46); ctx.lineTo(tx, CROWD_TOP+10); ctx.lineTo(tx+34, CROWD_TOP+46); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(60,35,15,.5)';
    ctx.beginPath(); ctx.moveTo(tx-8, CROWD_TOP+46); ctx.lineTo(tx, CROWD_TOP+26); ctx.lineTo(tx+8, CROWD_TOP+46); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,.3)'; // 晨光雲
  for (i=0;i<3;i++){ ctx.beginPath();
    ctx.ellipse(90+i*180 + Math.sin(t*0.3+i)*10, CROWD_TOP-24, 44,14, 0,0,7); ctx.fill(); }
  for (i=0;i<CROWD_N;i++) drawCrowdPerson(crowdPos[i].x, crowdPos[i].y, crowdPos[i].s, i, t);
  // 堆疊區底(清晨露水退去、遍地嗎哪的收糧地)
  ctx.fillStyle = '#f4e7c8';
  ctx.fillRect(0, PLAY_TOP-6, W, FLOOR-PLAY_TOP+40);
  ctx.fillStyle = 'rgba(180,150,90,.25)';
  for (i=0;i<5;i++) ctx.fillRect(0, PLAY_TOP+ i*(FLOOR-PLAY_TOP)/5, W, 2);
  ctx.fillStyle = '#caa96a'; ctx.fillRect(0, FLOOR, W, H-FLOOR);
}
function drawChainLine(){
  // 07-22 修:改畫在 tsum 上層(舊版先畫線再畫球=線被球蓋住看不見),並沿滑鼠軌跡轉彎
  if (!dragging || chain.length < 1) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,235,120,.9)'; ctx.lineWidth = 14; ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.shadowColor = 'rgba(255,240,160,.9)'; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.moveTo(chain[0].x, chain[0].y);
  for (var i=1;i<chain.length;i++) ctx.lineTo(chain[i].x, chain[i].y);
  for (i=0;i<trail.length;i++) ctx.lineTo(trail[i].x, trail[i].y);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 5; ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();
  // 已選顆數徽章(跟著游標)
  if (curP && chain.length >= 2){
    ctx.fillStyle = 'rgba(30,60,38,.9)';
    ctx.beginPath(); ctx.arc(curP.x, curP.y - 44, 20, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffe9a8'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(chain.length, curP.x, curP.y - 36);
  }
}

// ---------- 開場/勝利畫面 ----------
var menuBtns = [];
function drawMenu(t){
  drawScene(t);
  ctx.fillStyle = 'rgba(50,35,15,.82)'; ctx.fillRect(0,0,W,H);
  ctx.textAlign='center'; ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 52px "Microsoft JhengHei",sans-serif';
  ctx.fillText('嗎哪收集', W/2, 190);
  ctx.font = 'bold 34px "Microsoft JhengHei",sans-serif';
  ctx.fillText('天 天 夠 用', W/2, 245);
  // 示意 tsum
  var demo = [TYPES[0], TYPES[5], TYPES[1], TYPES[6], TYPES[3]];
  for (var i=0;i<5;i++) drawTsum({t:demo[i], hi:0}, 90+i*90, 330 + Math.sin(t*2+i)*8, 34);
  ctx.fillStyle = '#fff'; ctx.font = '22px "Microsoft JhengHei",sans-serif';
  ctx.fillText('「我要將糧食從天降給你們。百姓可以出去,', W/2, 420);
  ctx.fillText('每天收每天的分。」(出16:4)', W/2, 452);
  ctx.font = '24px "Microsoft JhengHei",sans-serif'; ctx.fillStyle = '#f2e3bc';
  ctx.fillText('劃線連起同款的嗎哪或鵪鶉,收進罐裡', W/2, 510);
  ctx.fillText('每天收每天的分——天父天天供應!', W/2, 544);
  menuBtns = [];
  var keys = ['young','kid','teen'];
  for (i=0;i<3;i++){
    var y = 610 + i*92, sel = keys[i]===modeKey;
    ctx.fillStyle = sel ? '#ffd54a' : 'rgba(255,255,255,.14)';
    roundRect(W/2-170, y, 340, 72, 18); ctx.fill();
    ctx.fillStyle = sel ? '#4a3510' : '#fff';
    ctx.font = 'bold 30px "Microsoft JhengHei",sans-serif';
    // 07-22:標明「連N顆」——玩家會以為每檔都是連3
    ctx.font = 'bold 28px "Microsoft JhengHei",sans-serif';
    ctx.fillText(MODES[keys[i]].label, W/2, y+32);
    ctx.font = '21px "Microsoft JhengHei",sans-serif';
    ctx.fillText('同款連 ' + MODES[keys[i]].minChain + ' 顆・收滿 ' + MODES[keys[i]].target + ' 份', W/2, y+60);
    menuBtns.push({ x:W/2-170, y:y, w:340, h:72, key:keys[i] });
  }
  ctx.fillStyle = '#e8d5a0'; ctx.font = '20px sans-serif';
  ctx.fillText('點一個年齡檔就開始 ▶', W/2, 910);
}
function menuTap(p){
  for (var i=0;i<menuBtns.length;i++){
    var b = menuBtns[i];
    if (p.x>b.x && p.x<b.x+b.w && p.y>b.y && p.y<b.y+b.h){
      modeKey = b.key; M = MODES[modeKey];
      try{ localStorage.setItem('manna-mode', modeKey); }catch(e){}
      startGame(); return;
    }
  }
}
function startGame(){
  try{ level = Math.max(1, parseInt(localStorage.getItem('manna-lvl-'+modeKey))||1); }catch(e){ level = 1; }
  curTarget = Math.round(M.target * (1 + (level-1)*0.5));
  tsums = []; chain = []; flying = []; sparks = [];
  fed = 0; shownFed = 0; chainCount = 0; won = false; blessT = 0; blessSpoken = false;
  nextBlessAt = modeKey==='young' ? 4 : 8;
  spawnQueue = 0; doneSent = false;
  hintT = 0; checkT = 0; hintGroup = null;
  var n = Math.min(CAP-6, Math.floor((W-20)/(2*M.r)) * 6);
  for (var i=0;i<n;i++) spawnTsum();
  scene = 'play'; playing = true; startTime = Date.now();
  banner = { text: '劃線連起 ' + M.minChain + ' 顆同款!', t: 3 };   // 07-22:各檔連鏈門檻不同(青少年=4),開場講清楚
  ac(); bgmStart(); speak('intro');
  if (window.__ping) window.__ping('manna-tsum-start');
}
var winBtns = [];
function drawWin(t){
  drawScene(t);
  for (var i=0;i<tsums.length;i++) drawTsum(tsums[i]);
  ctx.fillStyle = 'rgba(50,35,15,.88)'; ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';
  ctx.fillStyle = '#ffe9a8'; ctx.font = 'bold 44px "Microsoft JhengHei",sans-serif';
  ctx.fillText('🎉 各家的罐都收滿了!', W/2, 170);
  // 一排陶罐(俄梅珥量器)
  var bx0 = W/2 - 3.5*62, by = 262;
  for (i=0;i<8;i++){
    var bx = bx0 + i*62, fill = Math.min(1, Math.max(0, (t*4 - i*0.35)));
    ctx.fillStyle = '#b3733f';
    ctx.beginPath(); ctx.moveTo(bx-15, by-16); ctx.quadraticCurveTo(bx-20, by+6, bx-11, by+16);
    ctx.lineTo(bx+11, by+16); ctx.quadraticCurveTo(bx+20, by+6, bx+15, by-16);
    ctx.quadraticCurveTo(bx, by-22, bx-15, by-16); ctx.closePath(); ctx.fill();
    if (fill > 0.2){
      ctx.fillStyle = '#f2f0e4';
      ctx.beginPath(); ctx.arc(bx-6, by-18, 6,0,7); ctx.arc(bx+2, by-21, 7,0,7); ctx.arc(bx+9, by-17, 5,0,7); ctx.fill();
    }
  }
  ctx.fillStyle = '#fff'; ctx.font = '23px "Microsoft JhengHei",sans-serif';
  var L = ['「及至用俄梅珥量一量,多收的也沒有餘,','少收的也沒有缺;各人按著自己的飯量收取。」','(出埃及記 16:18)','',
           '「這食物,以色列家叫嗎哪;樣子像芫荽子,','顏色是白的,滋味如同攙蜜的薄餅。」(出16:31)'];
  for (i=0;i<L.length;i++) ctx.fillText(L[i], W/2, 340 + i*38);
  ctx.fillStyle = '#f2e3bc'; ctx.font = '22px "Microsoft JhengHei",sans-serif';
  ctx.fillText('天父天天供應,日用的飲食天天賜下——', W/2, 604);
  ctx.fillText('留到早晨會生蟲變臭,學會天天倚靠祂。', W/2, 638);
  winBtns = [];
  var nextT = Math.round(M.target * (1 + level*0.5));
  var items = [['⭐ 下一關(目標 '+nextT+')','next'],['🔊 再聽經文','listen'],['再玩一次','again'],['← 回大廳','lobby']];
  for (i=0;i<items.length;i++){
    var y = 652 + i*76;
    ctx.fillStyle = 'rgba(255,255,255,.15)'; roundRect(W/2-160, y, 320, 66, 16); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 27px "Microsoft JhengHei",sans-serif';
    ctx.fillText(items[i][0], W/2, y+43);
    winBtns.push({ x:W/2-160, y:y, w:320, h:66, act:items[i][1] });
  }
}
function winTap(p){
  for (var i=0;i<winBtns.length;i++){
    var b = winBtns[i];
    if (p.x>b.x && p.x<b.x+b.w && p.y>b.y && p.y<b.y+b.h){
      if (b.act==='next'){ try{ localStorage.setItem('manna-lvl-'+modeKey, ''+(level+1)); }catch(e){} startGame(); return; }
      if (b.act==='listen') speak('win');
      else if (b.act==='again') scene = 'menu';
      else location.href = 'https://hfpc-bible-games.netlify.app/';
      return;
    }
  }
}

// ---------- 主迴圈 ----------
var last = 0, winT = 0;
function loop(ms){
  requestAnimationFrame(loop);
  var t = ms/1000, dt = Math.min(0.05, t-last); last = t;
  if (scene === 'menu'){ drawMenu(t); return; }
  if (scene === 'win'){ winT += dt; drawWin(winT); return; }
  // play
  if (blessT > 0) blessT -= dt;
  spawnTick -= dt;
  if (spawnQueue > 0 && spawnTick <= 0 && tsums.length < CAP){
    spawnTsum(); spawnQueue--; spawnTick = 0.12;
  }
  physics(dt);
  // 提示+卡死救援:4 秒沒動作亮提示;場上真的無鏈可連就溫柔聚攏(每秒檢查一次)
  hintT += dt; checkT += dt;
  if (checkT >= 1){
    checkT = 0; dbgChecks++;
    if (hintGroup){
      // 07-22:除了「還在場上」也驗「仍彼此可連」——物理擠散的過期提示要放掉,救援才會再補
      for (var hi=0;hi<hintGroup.length;hi++){
        var bad = tsums.indexOf(hintGroup[hi])===-1;
        if (!bad && hi>0){
          var A=hintGroup[hi-1], B=hintGroup[hi], hdx=B.x-A.x, hdy=B.y-A.y, hlim=(A.r+B.r)*1.35;
          bad = hdx*hdx+hdy*hdy > hlim*hlim;
        }
        if (bad){ hintGroup=null; break; }
      }
    }
    if (!hintGroup && !dragging){
      var g0 = findGroup();
      // 07-22 修:場滿 CAP 時 spawnQueue 永遠掉不到 0(生成被 tsums.length<CAP 擋)
      // →舊條件 spawnQueue===0 讓救援永不觸發=死局;場滿就直接放行救援
      if (!g0 && flying.length===0 && (spawnQueue===0 || tsums.length >= CAP)){ dbgRescues++; rescue(); g0 = findGroup(); }
      if (hintT >= (modeKey==='teen'?10:modeKey==='kid'?6:4) && g0) hintGroup = g0;
    }
  }
  shownFed += (fed - shownFed) * Math.min(1, dt*6);
  drawScene(t);
  for (var i=0;i<tsums.length;i++) drawTsum(tsums[i]);
  drawChainLine();   // 07-22:畫在球上層才看得見
  if (hintGroup && !dragging){   // 提示:金色光圈脈動
    ctx.strokeStyle = 'rgba(255,235,140,'+(0.55+0.35*Math.sin(t*6))+')';
    ctx.lineWidth = 5;
    for (i=0;i<hintGroup.length;i++){
      var hg = hintGroup[i];
      ctx.beginPath(); ctx.arc(hg.x, hg.y, hg.r*1.12+2*Math.sin(t*6), 0, 7); ctx.stroke();
    }
  }
  // 飛向營地的口糧
  for (i=flying.length-1;i>=0;i--){
    var f = flying[i];
    if (f.d > 0){ f.d -= dt; drawTsum({t:f.t,hi:0}, f.x, f.y, f.r); continue; }
    f.p += dt*2.4;
    if (f.p >= 1){ flying.splice(i,1); continue; }
    var e = 1-(1-f.p)*(1-f.p);
    drawTsum({t:f.t,hi:0}, f.x+(f.tx-f.x)*e, f.y+(f.ty-f.y)*e - Math.sin(e*Math.PI)*80, f.r*(1-e*0.5));
  }
  for (i=sparks.length-1;i>=0;i--){
    var s = sparks[i]; s.life -= dt*1.6; s.x += s.vx; s.y += s.vy; s.vy += 0.15;
    if (s.life<=0){ sparks.splice(i,1); continue; }
    ctx.fillStyle = 'rgba(255,230,140,'+s.life+')';
    ctx.beginPath(); ctx.arc(s.x, s.y, 4*s.life, 0, 7); ctx.fill();
  }
  if (blessT > 0){
    ctx.fillStyle = 'rgba(255,213,74,'+ (0.10+0.06*Math.sin(t*6)) +')';
    ctx.fillRect(0, PLAY_TOP-6, W, FLOOR-PLAY_TOP+40);
  }
  drawHUD();
  if (banner && banner.t > 0){
    banner.t -= dt;
    ctx.fillStyle = 'rgba(70,50,20,.85)';
    roundRect(W/2-210, PLAY_TOP+8, 420, 52, 14); ctx.fill();
    ctx.fillStyle = '#ffe9a8'; ctx.font = 'bold 24px "Microsoft JhengHei",sans-serif'; ctx.textAlign='center';
    ctx.fillText(banner.text, W/2, PLAY_TOP+43);
  }
}
requestAnimationFrame(loop);

// ---------- 測試鉤子(?test=1 才掛;Playwright 驗證用,不影響玩家) ----------
if (location.search.indexOf('test=1') !== -1){
  window.__tsum = {
    state: function(){ return { scene:scene, fed:fed, n:tsums.length, queue:spawnQueue, chains:chainCount, mode:modeKey, dragging:dragging, hint:!!hintGroup, checks:dbgChecks, rescues:dbgRescues, chainLen:chain.length, level:level }; },
    deadlock: function(){
      // 重現 07-22 死局:場滿 CAP+隊列>0+全場無同款相鄰(每顆給獨一無二的假型別)
      while (tsums.length < CAP) spawnTsum();
      tsums.length = CAP;
      for (var i=0;i<tsums.length;i++){
        var ty = tsums[i].t;
        tsums[i].t = { id:'zz'+i, kind:ty.kind, name:ty.name, c1:ty.c1, c2:ty.c2 };
      }
      spawnQueue = 5; hintT = 5; checkT = 0; hintGroup = null;
      return { n:tsums.length, queue:spawnQueue, group:findGroup()?1:0 };
    },
    row: function(n){
      // 排一排同款(驗證鏈長無上限):前 n 顆同型等距一列,其餘搬離
      var ty = tsums[0].t;
      for (var i=0;i<tsums.length;i++){
        var c = tsums[i];
        if (i < n){ c.t = ty; c.x = 40 + i*(c.r*1.6); c.y = FLOOR - c.r; }
        else { c.y = PLAY_TOP + 10; c.x = W - 30; }
        c.px = c.x; c.py = c.y;
      }
      return { y: FLOOR - tsums[0].r, xs: tsums.slice(0,n).map(function(c){return c.x;}) };
    },
    start: function(k){ if(k && MODES[k]){ modeKey=k; M=MODES[k]; } startGame(); },
    autoChain: function(){
      // BFS 找一組同款相鄰 >= minChain,走正式 collect 路徑
      for (var i=0;i<tsums.length;i++){
        var seed = tsums[i], group = [seed], seen = [seed];
        var grow = true;
        while (grow && group.length < 9){
          grow = false;
          for (var j=0;j<tsums.length;j++){
            var c = tsums[j];
            if (seen.indexOf(c) !== -1 || c.t !== seed.t) continue;
            var lastT = group[group.length-1];
            var dx=c.x-lastT.x, dy=c.y-lastT.y, lim=(c.r+lastT.r)*1.35;
            if (dx*dx+dy*dy <= lim*lim){ group.push(c); seen.push(c); grow = true; break; }
          }
        }
        if (group.length >= M.minChain){ collect(group); return group.length; }
      }
      return 0;
    },
    findGroup: function(){ var g=findGroup(); return g?g.length:0; },
    rescue: function(){ return rescue(); },
    win: function(){ fed = curTarget - 1; return this.autoChain(); }
  };
}
})();
