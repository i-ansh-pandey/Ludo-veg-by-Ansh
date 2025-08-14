
/* Offline Ludo - Vegetables Edition
   - Pass-and-play only (offline).
   - 4 players: Cabbage (Red), Potato (Green), Sweet Corn (Yellow), Tomato (Blue).
   - Central dice UI; full visible path highlighted.
*/

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const rollBtn = document.getElementById('rollBtn');
const diceFace = document.getElementById('diceFace');
const playersPanel = document.getElementById('playersPanel');
const toast = document.getElementById('toast');
const newGameBtn = document.getElementById('newGame');

const SIZE = 720;
const GRID = 15;
const CELL = SIZE / GRID;
const TOKEN_R = CELL * 0.32;

function cellCenter(x,y){ return [x*CELL + CELL/2, y*CELL + CELL/2]; }
function showToast(msg, ms=1600){ toast.textContent = msg; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'), ms); }

const PLAYERS = [
  {id:0,name:'Cabbage', color:'#ef4444', avatar:'assets/veg/cabbage.svg', startIndex:0},
  {id:1,name:'Potato', color:'#22c55e', avatar:'assets/veg/potato.svg', startIndex:13},
  {id:2,name:'Sweet Corn', color:'#eab308', avatar:'assets/veg/sweetcorn.svg', startIndex:26},
  {id:3,name:'Tomato', color:'#3b82f6', avatar:'assets/veg/tomato.svg', startIndex:39},
];

// Basic main path for 52 steps (same arrangement as earlier)
const MAIN_PATH = [
  [6,1],[7,1],[8,1],[8,2],[8,3],[8,4],[8,5],[9,6],[10,6],[11,6],[12,6],[13,6],[14,6],
  [14,7],[14,8],[13,8],[12,8],[11,8],[10,8],[9,8],[8,9],[8,10],[8,11],[8,12],[8,13],[8,14],
  [7,14],[6,14],[6,13],[6,12],[6,11],[6,10],[6,9],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
  [0,7],[0,6],[1,6],[2,6],[3,6],[4,6],[5,6],[6,5],[6,4],[6,3],[6,2],[6,1]
];
const ENTRY_INDEX = {0:50,1:11,2:24,3:37};
const SAFE = [0,8,13,21,26,34,39,47];

const HOME_PATH = {
  0:[[7,2],[7,3],[7,4],[7,5],[7,6],[7,7]],
  1:[[12,7],[11,7],[10,7],[9,7],[8,7],[7,7]],
  2:[[7,12],[7,11],[7,10],[7,9],[7,8],[7,7]],
  3:[[2,7],[3,7],[4,7],[5,7],[6,7],[7,7]]
};
const BASE_SLOTS = {
  0:[[1.5,1.5],[3.5,1.5],[1.5,3.5],[3.5,3.5]],
  1:[[11.5,1.5],[13.5,1.5],[11.5,3.5],[13.5,3.5]],
  2:[[11.5,11.5],[13.5,11.5],[11.5,13.5],[13.5,13.5]],
  3:[[1.5,11.5],[3.5,11.5],[1.5,13.5],[3.5,13.5]]
};

function wrap52(i){ i%=52; if(i<0) i+=52; return i; }

function newTokens(){ return [{pos:'base',steps:0},{pos:'base',steps:0},{pos:'base',steps:0},{pos:'base',steps:0}]; }

let state = null;
function newGame(){
  state = {
    players: PLAYERS.map(p => ({...p, tokens:newTokens(), finished:0})),
    current:0,
    dice:null,
    rolled:false,
    winner:null
  };
  updateProfiles();
  updatePanel();
  draw();
  statusEl.textContent = `${state.players[0].name} starts. Click the dice.`;
}
newGame();

function updateProfiles(){
  document.getElementById('profile-top').innerHTML = `<img src="${PLAYERS[0].avatar}" alt=""><div><strong>${PLAYERS[0].name}</strong></div>`;
  document.getElementById('profile-right').innerHTML = `<img src="${PLAYERS[1].avatar}" alt=""><div><strong>${PLAYERS[1].name}</strong></div>`;
  document.getElementById('profile-bottom').innerHTML = `<img src="${PLAYERS[2].avatar}" alt=""><div><strong>${PLAYERS[2].name}</strong></div>`;
  document.getElementById('profile-left').innerHTML = `<img src="${PLAYERS[3].avatar}" alt=""><div><strong>${PLAYERS[3].name}</strong></div>`;
}

function updatePanel(){
  playersPanel.innerHTML = '';
  for(const p of state.players){
    const el = document.createElement('div');
    el.className = 'player';
    el.innerHTML = `<div class="avatar"><img src="${p.avatar}" alt="${p.name}"></div>
                    <div class="meta"><div class="name">${p.name}</div><div class="count">Home: ${p.finished}/4</div></div>`;
    playersPanel.appendChild(el);
  }
}

function movableTokens(pidx, dice){
  const p = state.players[pidx];
  const arr=[];
  for(let i=0;i<4;i++){ if(isMoveValid(p,i,dice)) arr.push(i); }
  return arr;
}
function isMoveValid(p, idx, dice){
  const t = p.tokens[idx];
  if(t.pos==='home') return false;
  if(t.pos==='base') return dice===6;
  if(t.pos.type==='main'){
    let from = t.pos.index;
    let entry = ENTRY_INDEX[p.id];
    let dist = (entry - from + 52) % 52; if(dist===0) dist=52;
    if(dice <= dist) return true;
    const into = dice - dist;
    return (t.steps + into) <= 6;
  }
  if(t.pos.type==='home'){
    return (t.steps + dice) <= 6;
  }
  return false;
}

function tryMoveToken(pidx, tidx, dice){
  const p = state.players[pidx]; const t = p.tokens[tidx];
  if(!isMoveValid(p,tidx,dice)) { showToast('Invalid move'); return false; }
  if(t.pos==='base'){ t.pos = {type:'main', index: p.startIndex}; t.steps=0; }
  else if(t.pos.type==='main'){
    const entry = ENTRY_INDEX[p.id];
    let from = t.pos.index; let dist = (entry - from + 52) % 52; if(dist===0) dist=52;
    if(dice <= dist){ t.pos.index = wrap52(from + dice); }
    else{
      const into = dice - dist; t.pos = {type:'home'}; t.steps = into; if(t.steps===6){ t.pos='home'; p.finished++; }
    }
  } else if(t.pos.type==='home'){ t.steps += dice; if(t.steps===6){ t.pos='home'; p.finished++; } }

  // capture
  if(t.pos && t.pos.type==='main'){
    const landed = t.pos.index;
    if(!SAFE.includes(landed)){
      for(const opp of state.players){
        if(opp.id===p.id) continue;
        for(const ot of opp.tokens){
          if(ot.pos && ot.pos.type==='main' && ot.pos.index===landed){
            ot.pos='base'; ot.steps=0;
            showToast(`${p.name} captured a token!`);
          }
        }
      }
    }
  }

  updatePanel(); draw();

  if(p.finished===4 && state.winner===null){
    state.winner = p.id; crownWinner(p.id); playApplause(); statusEl.textContent = `${p.name} wins!`; motivateOthers(p.id); return true;
  }

  if(dice===6){ state.rolled=false; state.dice=null; diceFace.textContent='–'; statusEl.textContent = `${p.name} rolled a six! Roll again.`; return true; }

  // next
  nextTurn();
  return true;
}

function nextTurn(){ state.current = (state.current+1)%4; state.rolled=false; state.dice=null; diceFace.textContent='–'; statusEl.textContent = `Turn: ${state.players[state.current].name}`; }

// token screen position
function tokenScreenPos(p, idx){
  const t = p.tokens[idx];
  if(t.pos==='base'){ const slot=BASE_SLOTS[p.id][idx]; const [cx,cy]=cellCenter(slot[0],slot[1]); return {x:cx,y:cy}; }
  if(t.pos==='home'){ const [cx,cy]=cellCenter(7,7); return {x:cx + (idx-1.5)*CELL*0.12, y:cy + (p.id-1.5)*CELL*0.12}; }
  if(t.pos.type==='main'){ const [mx,my]=MAIN_PATH[t.pos.index]; const [cx,cy]=cellCenter(mx,my); return {x:cx,y:cy}; }
  if(t.pos.type==='home'){ const path = HOME_PATH[p.id]; const stepIdx = t.steps-1; const [hx,hy]=path[stepIdx]; const [cx,cy]=cellCenter(hx,hy); return {x:cx,y:cy}; }
  return {x:SIZE/2,y:SIZE/2};
}

function draw(){
  ctx.clearRect(0,0,SIZE,SIZE);
  drawGrid();
  drawHomeQuads();
  drawMainPath();
  drawSafeTiles();
  drawEntryHighlights();
  drawTokens();
}

function drawGrid(){
  ctx.strokeStyle='#e6edf3'; ctx.lineWidth=1;
  for(let i=0;i<=GRID;i++){ ctx.beginPath(); ctx.moveTo(i*CELL,0); ctx.lineTo(i*CELL,SIZE); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0,i*CELL); ctx.lineTo(SIZE,i*CELL); ctx.stroke(); }
}

function drawHomeQuads(){
  const quads = [{x:0,y:0,w:6,h:6,color:'rgba(239,68,68,.10)'},{x:9,y:0,w:6,h:6,color:'rgba(34,197,94,.10)'},{x:9,y:9,w:6,h:6,color:'rgba(234,179,8,.10)'},{x:0,y:9,w:6,h:6,color:'rgba(59,130,246,.10)'}];
  for(const q of quads){ ctx.fillStyle=q.color; ctx.fillRect(q.x*CELL, q.y*CELL, q.w*CELL, q.h*CELL); }
}

function drawMainPath(){
  // draw path squares for visibility
  for(let i=0;i<MAIN_PATH.length;i++){
    const [x,y]=MAIN_PATH[i]; const [cx,cy]=cellCenter(x,y);
    ctx.fillStyle='#ffffff'; ctx.strokeStyle='#cbd5e1'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.rect(cx-CELL*0.4, cy-CELL*0.4, CELL*0.8, CELL*0.8); ctx.fill(); ctx.stroke();
    // small index mark
    ctx.fillStyle='#94a3b8'; ctx.font='10px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(String(i+1), cx, cy);
  }
}

function drawSafeTiles(){ SAFE.forEach(idx=>{ const [x,y]=MAIN_PATH[idx]; ctx.fillStyle='#10b981'; ctx.globalAlpha=0.12; const [cx,cy]=cellCenter(x,y); ctx.beginPath(); ctx.arc(cx,cy,CELL*0.36,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; }); }

function drawEntryHighlights(){ for(const p of state.players){ const e = ENTRY_INDEX[p.id]; const [x,y]=MAIN_PATH[e]; ctx.fillStyle = p.color; ctx.globalAlpha=0.12; const [cx,cy]=cellCenter(x,y); ctx.beginPath(); ctx.arc(cx,cy,CELL*0.36,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; } }

function drawTokens(){
  for(const p of state.players){
    for(let i=0;i<4;i++){
      const pos = tokenScreenPos(p,i);
      ctx.beginPath(); ctx.arc(pos.x,pos.y,TOKEN_R,0,Math.PI*2); ctx.fillStyle=p.color; ctx.fill();
      ctx.lineWidth=3; ctx.strokeStyle='#fff'; ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(pos.x,pos.y,TOKEN_R*0.5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#0f172a'; ctx.font=`${Math.floor(TOKEN_R*0.7)}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(String(i+1), pos.x, pos.y);
    }
  }
}

// click tokens to move
canvas.addEventListener('click', (e)=>{
  if(state.winner!==null) return;
  if(!state.rolled){ showToast('Roll the dice first'); return; }
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  const p = state.players[state.current];
  const positions = p.tokens.map((_,i)=>({...tokenScreenPos(p,i), idx:i}));
  const hit = positions.find(pt => Math.hypot(pt.x-x,pt.y-y) <= TOKEN_R+4 );
  if(!hit){ showToast('Tap your token to move'); return; }
  const moved = tryMoveToken(state.current, hit.idx, state.dice);
  if(moved){
    // moved - if winner handled inside
  }
});

// dice behavior
function rollDiceAnim(){
  let rolls = 12;
  const iv = setInterval(()=>{
    const v = 1 + Math.floor(Math.random()*6);
    diceFace.textContent = String(v);
    rolls--;
    if(rolls<=0){ clearInterval(iv); state.dice = parseInt(diceFace.textContent); state.rolled = true; handleAfterRoll(); }
  },80);
}

function handleAfterRoll(){
  const movable = movableTokens(state.current, state.dice);
  if(movable.length===0){
    showToast('No moves available. Turn passes.');
    setTimeout(()=>{ nextTurn(); draw(); },700);
  } else {
    showToast('Select a token to move.');
  }
}

document.getElementById('diceCenter').addEventListener('click', ()=>{
  if(state.winner!==null) return;
  if(state.rolled){ showToast('You already rolled. Move a token.'); return; }
  rollDiceAnim();
});

newGameBtn.addEventListener('click', ()=>newGame());

// crown + applause
function crownWinner(wid){
  // add crown image to corresponding profile element
  const map = {0:'profile-top',1:'profile-right',2:'profile-bottom',3:'profile-left'};
  const el = document.getElementById(map[wid]);
  if(el){ const img = document.createElement('img'); img.src='assets/ui/crown.svg'; img.style.width='34px'; img.style.marginLeft='8px'; el.appendChild(img); }
}

function motivateOthers(wid){
  const msgs = ['Great try! Next round is yours 💪','Almost there—keep going! 🚀','Champions keep playing until they win ⭐','Nice moves! One more game? 😄'];
  for(const p of state.players){ if(p.id!==wid) showToast(`${p.name}: ${msgs[Math.floor(Math.random()*msgs.length)]}`, 2000); }
}

function playApplause(){
  try{
    const actx = new (window.AudioContext || window.webkitAudioContext)();
    const now = actx.currentTime;
    for(let i=0;i<18;i++){
      const t = now + Math.random()*1.5;
      const o = actx.createOscillator(); const g = actx.createGain();
      o.type='square'; o.frequency.value = 120 + Math.random()*80;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25 + Math.random()*0.4, t+0.02); g.gain.exponentialRampToValueAtTime(0.0001, t+0.12+Math.random()*0.2);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t+0.3);
    }
  }catch(e){console.warn('Audio failed',e);}
}

// registration of service worker (optional)
if('serviceWorker' in navigator){ window.addEventListener('load', ()=>{ navigator.serviceWorker.register('./service-worker.js').catch(()=>{}); }); }

draw();
