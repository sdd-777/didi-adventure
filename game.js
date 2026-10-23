/* ============================================================
   迪迪历险记 · DIDI'S ADVENTURE
   像素风闯关小游戏：奔跑 / 跳跃 / 金币 / 陷阱 / 道具 / 飞行看风景
   ============================================================ */
(() => {
'use strict';

/* ---------------- 常量 ---------------- */
const W = 320, H = 180;
const GROUND_Y = 152;                 // 地面顶边
const GRAV = 0.55;                    // 重力
const JUMP_V = -7.0;                  // 起跳速度
const DJUMP_V = -6.2;                 // 二段跳
const COIN_GOAL = 100;
const CHAR_W = 16, CHAR_H = 18;
const POWER_TIME = 600;               // 道具持续 10 秒（60fps）
const CHAR_ROW = { girl: 0, boy: 1, dino: 2 };
const CHARS_META = [
  { id: 'girl', name: 't_name_girl.png', desc: 't_desc_girl.png' },
  { id: 'boy',  name: 't_name_boy.png',  desc: 't_desc_boy.png'  },
  { id: 'dino', name: 't_name_dino.png', desc: 't_desc_dino.png' },
];
const SKIES = [
  { file: 'sky_sunrise.png', label: 't_sky_sunrise.png' },
  { file: 'sky_sunset.png',  label: 't_sky_sunset.png'  },
  { file: 'sky_fire.png',    label: 't_sky_fire.png'    },
  { file: 'sky_evening.png', label: 't_sky_evening.png' },
  { file: 'sky_day.png',     label: 't_sky_day.png'     },
  { file: 'sky_night.png',   label: 't_sky_night.png'   },
];

/* ---------------- 资源 ---------------- */
const FILES = [
  'chars.png', 'coin.png', 'heart.png', 'item_shield.png', 'item_x2.png', 'item_rocket.png',
  'spike.png', 'popup.png', 'fire.png', 'hammer.png', 'dust.png',
  'sky_day_run.png', 'mountains_far.png', 'hills_near.png', 'ground.png',
  'cloud1.png', 'cloud2.png', 'cloud3.png', 'bush.png', 'tree.png', 'flower.png', 'fence.png',
  'sky_sunrise.png', 'sky_sunset.png', 'sky_fire.png', 'sky_evening.png', 'sky_day.png', 'sky_night.png',
  'screen_title.png', 'screen_select.png', 'screen_pause.png', 'screen_win.png', 'screen_over.png',
  'screen_win_touch.png', 'screen_over_touch.png',
  't_name_girl.png', 't_desc_girl.png', 't_name_boy.png', 't_desc_boy.png', 't_name_dino.png', 't_desc_dino.png',
  't_hud_dist.png', 't_best.png', 't_prompt.png', 't_prompt2.png', 't_prompt_touch.png', 't_prompt2_touch.png',
  't_sel_hint.png', 't_sel_hint_touch.png', 't_sel_hint2.png', 't_sel_hint2_touch.png',
  't_pause_resume.png', 't_pause_resume_t.png', 't_pause_restart.png', 't_pause_restart_t.png', 't_pause_menu.png',
  't_toast_shield.png', 't_toast_x2.png', 't_toast_rocket.png', 't_toast_rocket_off.png', 't_toast_shield_off.png', 't_flight_hint.png', 't_flight_hint_touch.png',
  't_stat_coins.png', 't_stat_dist.png', 't_sep.png', 't_record.png', 't_x2badge.png',
  't_row_music.png', 't_row_sfx.png', 't_on.png', 't_off.png',
  't_landscape.png', 't_landscape2.png',
  't_sky_sunrise.png', 't_sky_sunset.png', 't_sky_fire.png', 't_sky_evening.png', 't_sky_day.png', 't_sky_night.png',
  'digits.png',
];
const IMG = {};
function loadAll(done) {
  let n = FILES.length;
  FILES.forEach(f => {
    const im = new Image();
    im.onload = () => { if (--n === 0) done(); };
    im.onerror = () => { console.warn('缺失资源', f); if (--n === 0) done(); };
    im.src = 'assets/' + f;
    IMG[f] = im;
  });
}

/* ---------------- 工具 ---------------- */
const rand = (a, b) => a + Math.random() * (b - a);
const irand = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const $ = id => document.getElementById(id);

/* ---------------- 画布 ------------- */
const canvas = $('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

/* 平台探测：触屏设备走移动端（?touch=1 / ?desktop=1 可强制覆盖） */
const QS = new URLSearchParams(location.search);
const IS_TOUCH = QS.get('touch') === '1' ? true
  : QS.get('desktop') === '1' ? false
  : (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || navigator.maxTouchPoints > 0);

function resize() {
  const vw = innerWidth, vh = innerHeight;
  let s = Math.min(vw / W, vh / H);
  // 桌面小窗也保证至少 2 倍（字更大更好认）；实在放不下 2 倍时才退回适配
  if (s < 2 && vw >= W * 2 && vh >= H * 2) s = 2;
  const scale = s >= 1 ? Math.floor(s * 2) / 2 : s;  // 允许 0.5 步进，缩放更顺滑
  canvas.style.width = Math.round(W * scale) + 'px';
  canvas.style.height = Math.round(H * scale) + 'px';
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 120));

/* 横屏引导（移动端） */
function checkOrientation() {
  G.portrait = G.touch && innerHeight > innerWidth + 40;
}
addEventListener('resize', checkOrientation);
addEventListener('orientationchange', () => setTimeout(checkOrientation, 120));

/* 首次游戏时尝试全屏 + 锁定横屏（浏览器允许才生效） */
function tryLandscapeLock() {
  if (!G.touch || G.locked) return;
  G.locked = true;
  try {
    const el = document.documentElement;
    if (el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().catch(() => {});
    if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
  } catch (err) { /* 忽略：不支持就退回横屏提示 */ }
}

/* ---------------- 音频 ---------------- */
const AudioSys = {
  ctx: null, master: null,
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  },
  tone(freq, dur, type = 'square', vol = 0.12, slideTo = 0, delay = 0) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  },
  noise(dur, vol = 0.15, delay = 0) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(g); g.connect(this.master);
    src.start(t0);
  },
  sfx(name, combo = 0) {
    if (!this.ctx || !G.sfxOn) return;
    switch (name) {
      case 'jump':   this.tone(300, 0.14, 'square', 0.10, 660); break;
      case 'djump':  this.tone(420, 0.14, 'square', 0.10, 880); break;
      case 'coin':   this.tone(900 + combo * 25, 0.08, 'sine', 0.10, 1450); break;
      case 'power':  [520, 660, 784, 1046].forEach((f, i) => this.tone(f, 0.09, 'square', 0.10, 0, i * 0.07)); break;
      case 'hurt':   this.tone(220, 0.28, 'sawtooth', 0.14, 70); this.noise(0.18, 0.12); break;
      case 'shatter':this.noise(0.2, 0.16); this.tone(500, 0.12, 'square', 0.08, 180); break;
      case 'click':  this.tone(640, 0.05, 'square', 0.08); break;
      case 'land':   this.noise(0.06, 0.07); break;
      case 'mile':   [880, 1174].forEach((f, i) => this.tone(f, 0.1, 'square', 0.09, 0, i * 0.09)); break;
      case 'win':    [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.16, 'square', 0.11, 0, i * 0.13)); break;
      case 'over':   [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.12, 0, i * 0.16)); break;
    }
  },
};
/* 背景音乐：简易 8-bit 循环 */
const Music = {
  on: true, timer: null, step: 0, nextT: 0,
  lead: [0, 4, 7, 4, 5, 9, 12, 9, 7, 11, 14, 11, 5, 9, 12, 7,
         0, 4, 7, 4, 9, 12, 16, 12, 7, 11, 14, 16, 14, 11, 7, 4],
  bass: [0, 0, 7, 7, 5, 5, 0, 0, 7, 7, 5, 5, 9, 9, 7, 7],
  note(n) { return 261.63 * Math.pow(2, n / 12); },
  start() {
    if (this.timer || !AudioSys.ctx) return;
    this.nextT = AudioSys.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.sched(), 60);
  },
  sched() {
    if (!AudioSys.ctx) return;
    while (this.nextT < AudioSys.ctx.currentTime + 0.25) {
      const playing = (G.state === 'title' || G.state === 'select' || G.state === 'play') && this.on;
      const d = this.nextT - AudioSys.ctx.currentTime;
      if (playing) {
        AudioSys.tone(this.note(this.lead[this.step] + 12), 0.11, 'square', 0.045, 0, Math.max(0, d));
        if (this.step % 2 === 0)
          AudioSys.tone(this.note(this.bass[this.step / 2 % 16]), 0.2, 'triangle', 0.07, 0, Math.max(0, d));
      }
      this.step = (this.step + 1) % 32;
      this.nextT += 0.135;
    }
  },
};

/* ---------------- 游戏状态 ---------------- */
const G = {
  state: 'title',           // title select play pause win over
  t: 0,                     // 全局帧计时
  shake: 0, hitStop: 0,
  blink: 0,
  charIdx: 0,
  selIdx: 0,                // 选角
  pauseIdx: 0,
  best: { dist: 0, coins: 0 },
  musicOn: true, sfxOn: true,
  skyIdx: 0,
  touch: IS_TOUCH,          // 平台模式
  portrait: false,          // 移动端竖屏中
  locked: false,            // 已尝试横屏锁定
};
try {
  G.best = JSON.parse(localStorage.getItem('didi_best_v1')) || G.best;
  const c = parseInt(localStorage.getItem('didi_char_v1') || '0', 10);
  if (c >= 0 && c < 3) G.charIdx = c;
} catch (e) { /* 忽略 */ }
function saveBest() {
  try {
    localStorage.setItem('didi_best_v1', JSON.stringify(G.best));
    localStorage.setItem('didi_char_v1', String(G.charIdx));
  } catch (e) { /* 忽略 */ }
}

/* ---------------- 玩家 ---------------- */
const player = {
  x: 56, y: GROUND_Y - CHAR_H, vy: 0,
  onGround: true, jumpsUsed: 0, coyote: 0,
  hearts: 2, invuln: 0,
  shield: 0, x2: 0, rocket: 0,
  runT: 0, hurtT: 0,
  dragging: false, dragTX: 0, dragTY: 0,   // 触屏飞行拖动
};
const world = {
  scrollX: 0, speed: 2.2, dist: 0, coins: 0,
  ents: [], nextX: 420, lastHazardX: 0, lastItemX: 0,
  won: false,
};
let particles = [], toasts = [];

/* ---------------- 输入 ---------------- */
const keys = {};
let jumpPressed = false, jumpHeld = false;

function doJump() {
  if (G.state !== 'play') return;
  if (player.rocket > 0) return;
  if (player.onGround || player.coyote > 0) {
    player.vy = JUMP_V; player.onGround = false; player.coyote = 0; player.jumpsUsed = 1;
    AudioSys.sfx('jump');
    spawnDust(player.x + 6, player.y + CHAR_H - 2, 4);
  } else if (player.jumpsUsed < 2) {
    player.vy = DJUMP_V; player.jumpsUsed = 2;
    AudioSys.sfx('djump');
    for (let i = 0; i < 6; i++)
      particles.push({ x: player.x + 8, y: player.y + 12, vx: rand(-1.4, 1.4), vy: rand(-0.6, 1.2), life: 16, type: 'spark', col: '#BEE9F7' });
  }
}

function primary() {  // 主确认 / 跳跃
  AudioSys.ensure(); Music.start();
  if (G.state === 'title') { G.state = 'select'; G.selIdx = G.charIdx; AudioSys.sfx('click'); }
  else if (G.state === 'select') { startRun(); }
  else if (G.state === 'play') { jumpPressed = true; jumpHeld = true; }
  else if (G.state === 'pause') { activatePauseRow(); }
  else if (G.state === 'win') { G.state = 'play'; AudioSys.sfx('click'); }
  else if (G.state === 'over') { G.state = 'select'; G.selIdx = G.charIdx; AudioSys.sfx('click'); }
}

addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (keys[e.code]) return;
  keys[e.code] = true;
  AudioSys.ensure(); Music.start();
  switch (e.code) {
    case 'Space': case 'Enter': case 'ArrowUp': case 'KeyW':
      primary(); break;
    case 'ArrowLeft': case 'KeyA':
      if (G.state === 'select') { G.selIdx = (G.selIdx + 2) % 3; AudioSys.sfx('click'); }
      else if (G.state === 'pause') { G.pauseIdx = (G.pauseIdx + 4) % 5; AudioSys.sfx('click'); }
      break;
    case 'ArrowRight': case 'KeyD':
      if (G.state === 'select') { G.selIdx = (G.selIdx + 1) % 3; AudioSys.sfx('click'); }
      else if (G.state === 'pause') { G.pauseIdx = (G.pauseIdx + 1) % 5; AudioSys.sfx('click'); }
      break;
    case 'ArrowDown': case 'KeyS':
      if (G.state === 'pause') { G.pauseIdx = (G.pauseIdx + 1) % 5; AudioSys.sfx('click'); }
      break;
    case 'Escape': case 'KeyP':
      if (G.state === 'play') openPause();
      else if (G.state === 'pause') closePause();
      else if (G.state === 'select') { G.state = 'title'; AudioSys.sfx('click'); }
      else if (G.state === 'win') endFromWin();
      break;
    case 'KeyR':
      if (G.state === 'play' || G.state === 'pause') startRun();
      break;
    case 'KeyM':
      Music.on = !Music.on; G.musicOn = Music.on;
      break;
  }
});
addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    jumpHeld = false;
    if (G.state === 'play' && player.vy < -3) player.vy = -3;  // 短跳
  }
});

/* 指针（触屏：点按/上滑/拖动；鼠标：点击即响应） */
const TP = { on: false, id: -1, x0: 0, y0: 0, x: 0, y: 0, moved: false, swiped: false };

function toCanvas(e) {
  const r = canvas.getBoundingClientRect();
  return {
    px: (e.clientX - r.left) / r.width * W,
    py: (e.clientY - r.top) / r.height * H,
  };
}

/* 菜单类点击（标题/选角/暂停/胜利/结束），鼠标与触屏共用 */
function menuTap(px, py) {
  if (G.state === 'title') { G.state = 'select'; G.selIdx = G.charIdx; AudioSys.sfx('click'); }
  else if (G.state === 'select') {
    const cards = [22, 118, 214];
    for (let i = 0; i < 3; i++)
      if (px >= cards[i] && px <= cards[i] + 84 && py >= 36 && py <= 136) { G.selIdx = i; AudioSys.sfx('click'); return; }
    if (py > 150) { G.state = 'title'; AudioSys.sfx('click'); return; }
    startRun();
  }
  else if (G.state === 'pause') {
    if (px >= W - 30 && px <= W - 6 && py >= 16 && py <= 34) { closePause(); return; }
    if (py >= 62 && py <= 142 && px >= 70 && px <= 250) {
      G.pauseIdx = clamp(Math.floor((py - 66) / 15), 0, 4);
      activatePauseRow();
    }
  }
  else if (G.state === 'win') {
    if (py >= 92 && py <= 112 && px >= 88 && px <= 232) { G.state = 'play'; AudioSys.sfx('click'); }
    else if (py >= 118 && py <= 138) endFromWin();
  }
  else if (G.state === 'over') {
    if (py >= 96 && py <= 116) startRun();
    else if (py >= 122 && py <= 142) { G.state = 'select'; G.selIdx = G.charIdx; AudioSys.sfx('click'); }
  }
}

canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  AudioSys.ensure(); Music.start();
  const { px, py } = toCanvas(e);
  TP.on = true; TP.id = e.pointerId;
  TP.x0 = px; TP.y0 = py; TP.x = px; TP.y = py;
  TP.moved = false; TP.swiped = false;
  if (G.state !== 'play') menuTap(px, py);
});

canvas.addEventListener('pointermove', e => {
  if (!TP.on || e.pointerId !== TP.id) return;
  const { px, py } = toCanvas(e);
  TP.x = px; TP.y = py;
  if (Math.abs(px - TP.x0) > 8 || Math.abs(py - TP.y0) > 8) TP.moved = true;
  if (G.state === 'play') {
    // 上滑跳跃（每次触摸只触发一次）
    if (!TP.swiped && py - TP.y0 < -28) { TP.swiped = true; doJump(); }
    // 飞行中：按住拖动 = 移动吃金币
    if (player.rocket > 0) { player.dragging = true; player.dragTX = px; player.dragTY = py; }
  }
});

function endPointer(e) {
  if (!TP.on || (e.pointerId !== undefined && e.pointerId !== TP.id)) return;
  if (G.state === 'play' && TP.on) {
    const { px, py } = toCanvas(e);
    // 画布内暂停按钮（右上角）
    if (px >= W - 30 && px <= W - 6 && py >= 16 && py <= 34) { openPause(); TP.on = false; return; }
    if (!TP.moved && !TP.swiped) doJump();   // 点按 = 跳跃
  }
  TP.on = false;
  player.dragging = false;
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('pointerleave', endPointer);

/* 暂停 / 静音：统一用画布内按钮 + 键盘（避免覆盖右上角里程 HUD） */

/* ---------------- 流程 ---------------- */
function startRun() {
  G.charIdx = G.selIdx;
  player.x = 56; player.y = GROUND_Y - CHAR_H; player.vy = 0;
  player.onGround = true; player.jumpsUsed = 0; player.coyote = 0;
  player.hearts = 2; player.invuln = 0;
  player.shield = 0; player.x2 = 0; player.rocket = 0;
  player.dragging = false;
  world.scrollX = 0; world.speed = 2.2; world.dist = 0; world.coins = 0;
  world.ents = []; world.nextX = 420; world.lastHazardX = 0; world.lastItemX = 0;
  world.won = false;
  particles = []; toasts = [];
  G.state = 'play';
  checkOrientation();
  tryLandscapeLock();
  saveBest();
  AudioSys.sfx('click');
}
function openPause() { G.state = 'pause'; G.pauseIdx = 0; AudioSys.sfx('click'); }
function closePause() { G.state = 'play'; AudioSys.sfx('click'); }
function endFromWin() {
  G.state = 'over';
  AudioSys.sfx('over');
}
function winGame() {
  world.won = true;
  G.state = 'win';
  AudioSys.sfx('win');
  if (world.dist > G.best.dist) G.best.dist = world.dist;
  saveBest();
  for (let i = 0; i < 40; i++)
    particles.push({ x: rand(0, W), y: rand(-20, 60), vx: rand(-0.6, 0.6), vy: rand(0.5, 2.2), life: 90, type: 'confetti', col: ['#FFD66E', '#E24A4A', '#7ED0F2', '#7FBE5A', '#FFFFFF'][irand(0, 4)] });
}
function gameOver() {
  G.state = 'over';
  AudioSys.sfx('over');
  if (world.dist > G.best.dist) G.best.dist = world.dist;
  saveBest();
}
function newRecord() { return world.dist >= G.best.dist && world.dist > 0 && G.state === 'over'; }

/* ---------------- 粒子 / 提示 ---------------- */
function spawnDust(x, y, n) {
  for (let i = 0; i < n; i++)
    particles.push({ x: x + rand(-3, 3), y: y + rand(-1, 1), vx: rand(-0.8, -0.2), vy: rand(-0.5, -0.1), life: irand(14, 24), type: 'dust' });
}
function toast(key) {
  if (!key.endsWith('.png')) key += '.png';
  toasts.push({ key, t: 0 });
  if (toasts.length > 2) toasts.shift();
}

/* ---------------- 世界生成 ---------------- */
function addEnt(e) { world.ents.push(e); }

function coinArc(x, n) {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    addEnt({ type: 'coin', x: x + i * 15, y: GROUND_Y - 26 - Math.sin(t * Math.PI) * 34, ph: rand(0, 6) });
  }
  return n * 15;
}
function coinLine(x, n, dy) {
  for (let i = 0; i < n; i++) addEnt({ type: 'coin', x: x + i * 15, y: GROUND_Y - (dy || 24), ph: rand(0, 6) });
  return n * 15;
}

function spawnChunk() {
  const x = world.nextX;
  const dist = world.dist;
  const hazardW = clamp(0.16 + dist / 9000, 0.16, 0.52);
  const r = Math.random();
  const sinceHazard = x - world.lastHazardX;
  const minGap = 58 + world.speed * 12;

  // 道具补充
  if (x - world.lastItemX > rand(650, 950)) {
    const kind = ['shield', 'x2', 'rocket'][irand(0, 2)];
    addEnt({ type: 'item', kind, x: x + 20, y: GROUND_Y - 42, ph: rand(0, 6) });
    world.lastItemX = x;
    world.nextX = x + 60;
    return;
  }

  if (sinceHazard < minGap || r > hazardW) {
    // 安逸区：金币 / 风景
    const p = Math.random();
    if (p < 0.4) { const n = irand(4, 7); world.nextX = x + coinArc(x, n) + rand(30, 70); }
    else if (p < 0.7) { const n = irand(3, 6); world.nextX = x + coinLine(x, n, irand(20, 40)) + rand(30, 70); }
    else { spawnScenery(x); world.nextX = x + rand(50, 90); }
    return;
  }

  // 陷阱区
  world.lastHazardX = x;
  const kind = irand(0, 3);
  let w = 60;
  if (kind === 0) {           // 地刺
    const n = irand(1, dist > 2500 ? 3 : 2);
    for (let i = 0; i < n; i++) addEnt({ type: 'spike', x: x + 14 + i * 13, y: GROUND_Y - 8 });
    coinArc(x, 4);
    w = 14 + n * 13;
  } else if (kind === 1) {    // 火焰棒
    addEnt({ type: 'firebar', x: x + 30, y: GROUND_Y, ang: rand(0, 6.28), spd: rand(0.022, 0.038) * (Math.random() < 0.5 ? 1 : -1) });
    coinLine(x + 6, 3, 44);
    w = 76;
  } else if (kind === 2) {    // 摆锤
    addEnt({ type: 'hammer', x: x + 34, y: 20, ang: rand(0, 6.28), spd: rand(0.03, 0.045), amp: rand(0.7, 1.0) });
    coinLine(x + 4, 2, 30);
    w = 84;
  } else {                    // 弹出刺
    const n = irand(1, 2);
    for (let i = 0; i < n; i++)
      addEnt({ type: 'popup', x: x + 16 + i * 34, y: GROUND_Y - 8, ph: irand(0, 60), period: irand(95, 130) });
    coinArc(x + 6, 3);
    w = 16 + n * 34;
  }
  world.nextX = x + w + rand(40, 80);
}

function spawnScenery(x) {
  const p = Math.random();
  if (p < 0.3) {
    const f = ['cloud1.png', 'cloud2.png', 'cloud3.png'][irand(0, 2)];
    addEnt({ type: 'scenery', file: f, x, y: rand(14, 64), par: 0.35 });
  } else if (p < 0.55) addEnt({ type: 'scenery', file: 'bush.png', x, y: GROUND_Y - 13, par: 1 });
  else if (p < 0.7) addEnt({ type: 'scenery', file: 'tree.png', x, y: GROUND_Y - 46, par: 1 });
  else if (p < 0.85) addEnt({ type: 'scenery', file: 'fence.png', x, y: GROUND_Y - 12, par: 1 });
  else addEnt({ type: 'scenery', file: 'flower.png', x, y: GROUND_Y - 8, par: 1 });
}

/* ---------------- 更新 ---------------- */
function popupUp(e) {  // 弹出刺上升量 0~8
  if (e.ph < 8) return e.ph;
  if (e.ph < 50) return 8;
  if (e.ph < 58) return 8 - (e.ph - 50);
  return 0;
}

function update() {
  G.t++;
  G.blink++;
  if (G.shake > 0.4) G.shake *= 0.86; else G.shake = 0;

  // 粒子始终更新
  particles = particles.filter(p => {
    p.x += p.vx; p.y += p.vy; p.life--;
    if (p.type === 'confetti') { p.vy += 0.03; p.vx += rand(-0.03, 0.03); }
    if (p.type === 'dust') p.vy += 0.02;
    return p.life > 0;
  });
  toasts = toasts.filter(t => ++t.t < 130);

  if (G.state === 'title' || G.state === 'select') return;
  if (G.state === 'pause' || G.state === 'win' || G.state === 'over') return;

  /* ---- 游戏中 ---- */
  if (G.hitStop > 0) { G.hitStop--; return; }
  if (G.portrait && G.touch) return;   // 移动端竖屏：冻结玩法，等横屏

  // 速度与距离
  world.speed = Math.min(3.9, 2.2 + world.dist / 2400);
  const spd = world.speed * (player.rocket > 0 ? 1.15 : 1);
  world.scrollX += spd;
  world.dist = Math.floor(world.scrollX / 10);

  // 生成 / 回收
  while (world.nextX < world.scrollX + W + 120) spawnChunk();
  world.ents = world.ents.filter(e => e.x > world.scrollX - 80);

  // 实体行为
  for (const e of world.ents) {
    if (e.type === 'firebar') e.ang += e.spd;
    else if (e.type === 'hammer') e.ang += e.spd;
    else if (e.type === 'popup') { e.ph = (e.ph + 1) % e.period; }
    // 飞行中：天空金币磁吸（手指拖动也能轻松吃到）
    else if (e.type === 'coin' && player.rocket > 0) {
      const cx = e.x - world.scrollX + 5, cy = e.y + 5;
      const dx = player.x + 8 - cx, dy = player.y + 9 - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < 46 * 46) { e.x += dx * 0.14; e.y += dy * 0.14; }
    }
  }

  /* ---- 玩家 ---- */
  if (player.rocket > 0) {
    player.rocket--;
    if (player.rocket > POWER_TIME - 24) {
      // 起飞：快速滑入天空
      player.y += (48 - player.y) * 0.28;
    } else {
      // 自由飞行：方向键 / 触屏拖动
      const fly = 1.9;
      if (keys['ArrowUp'] || keys['KeyW']) player.y -= fly;
      if (keys['ArrowDown'] || keys['KeyS']) player.y += fly;
      if (keys['ArrowLeft'] || keys['KeyA']) player.x -= fly * 0.9;
      if (keys['ArrowRight'] || keys['KeyD']) player.x += fly * 0.9;
      if (player.dragging) {
        player.x += (player.dragTX - 8 - player.x) * 0.28;
        player.y += (player.dragTY - 9 - player.y) * 0.28;
      }
      player.y = clamp(player.y, 12, 120);
      player.x = clamp(player.x, 18, 156);
    }
    // 即将结束：平滑回到奔跑道
    if (player.rocket < 24) player.x += (56 - player.x) * 0.16;
    player.vy = 0;
    if (G.t % 3 === 0)
      particles.push({ x: player.x + 8 + rand(-2, 2), y: player.y + 17, vx: rand(-0.5, 0.5), vy: rand(1, 2.4), life: 14, type: 'flame', col: Math.random() < 0.5 ? '#F28241' : '#FFD66E' });
    // 飞行中生成天空金币（高低错落，值得主动飞过去吃）
    if (Math.random() < 0.10)
      addEnt({ type: 'coin', x: world.scrollX + W + 24, y: rand(18, 112), ph: rand(0, 6) });
    if (player.rocket === 0) toast('t_toast_rocket_off');
  } else {
    player.vy = Math.min(player.vy + GRAV, 9);
    player.y += player.vy;
    if (player.y >= GROUND_Y - CHAR_H) {
      if (!player.onGround && player.vy > 2.5) { spawnDust(player.x + 8, GROUND_Y - 2, 5); AudioSys.sfx('land'); }
      player.y = GROUND_Y - CHAR_H; player.vy = 0; player.onGround = true; player.jumpsUsed = 0; player.coyote = 6;
    } else {
      player.onGround = false;
      if (player.coyote > 0) player.coyote--;
    }
  }
  if (player.onGround && player.rocket <= 0 && G.t % 7 === 0)
    spawnDust(player.x + 4, GROUND_Y - 2, 1);

  if (player.invuln > 0) player.invuln--;
  if (player.shield > 0) player.shield--;
  if (player.x2 > 0) player.x2--;
  player.runT += spd;

  /* ---- 碰撞 ---- */
  const px = player.x + 2, py = player.y + 2, pw = CHAR_W - 4, ph = CHAR_H - 4;

  for (let i = world.ents.length - 1; i >= 0; i--) {
    const e = world.ents[i];
    const ex = e.x - world.scrollX;
    if (ex < -30 || ex > W + 30) continue;

    if (e.type === 'coin') {
      if (Math.abs(ex + 5 - (px + pw / 2)) < 12 && Math.abs(e.y + 5 - (py + ph / 2)) < 13) {
        collectCoin(e, i);
      }
    } else if (e.type === 'item') {
      if (Math.abs(ex + 7 - (px + pw / 2)) < 15 && Math.abs(e.y + 7 - (py + ph / 2)) < 16) {
        collectItem(e, i);
      }
    } else if (e.type === 'spike' || e.type === 'popup') {
      let sy = e.y, dead = true;
      if (e.type === 'popup') {
        const up = popupUp(e);
        sy = e.y - up; dead = up > 3;
      }
      if (dead && rectHit(px, py, pw, ph, ex + 1, sy + 2, 10, 5)) {
        if (player.shield > 0) { shieldBreak(e, i, ex, sy); }
        else if (player.invuln <= 0 && player.rocket <= 0) { hurt(); world.ents.splice(i, 1); }
      }
    } else if (e.type === 'firebar') {
      for (let b = 0; b < 3; b++) {
        const a = e.ang + b * 2.094;
        const bx = ex + Math.cos(a) * 26, by = e.y - 6 + Math.sin(a) * 26;
        if (circleHit(px, py, pw, ph, bx + 4, by + 4, 4.5)) {
          if (player.shield > 0) { shieldBreak(null, i, bx, by); }
          else if (player.invuln <= 0 && player.rocket <= 0) hurt();
          break;
        }
      }
    } else if (e.type === 'hammer') {
      const a = e.amp * Math.sin(e.ang);
      const hx = ex + Math.sin(a) * 112, hy = e.y + Math.cos(a) * 112;
      if (circleHit(px, py, pw, ph, hx + 6, hy + 6, 6)) {
        if (player.shield > 0) { /* 铁锤砸盾：无伤 */ }
        else if (player.invuln <= 0 && player.rocket <= 0) hurt();
      }
    }
  }

  // 二段跳缓冲
  if (jumpPressed) { jumpPressed = false; doJump(); }
}

function rectHit(px, py, pw, ph, rx, ry, rw, rh) {
  return px < rx + rw && px + pw > rx && py < ry + rh && py + ph > ry;
}
function circleHit(px, py, pw, ph, cx, cy, r) {
  const nx = clamp(cx, px, px + pw), ny = clamp(cy, py, py + ph);
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

function collectCoin(e, i) {
  const gain = player.x2 > 0 ? 2 : 1;
  world.coins = (world.coins || 0) + gain;
  world.ents.splice(i, 1);
  AudioSys.sfx('coin', Math.min(12, Math.floor(world.coins / 8)));
  for (let k = 0; k < 5; k++)
    particles.push({ x: e.x - world.scrollX + 5, y: e.y + 5, vx: rand(-1.2, 1.2), vy: rand(-1.6, -0.4), life: 22, type: 'coinpop', col: '#FFD66E' });
  if (!world.won && world.coins >= COIN_GOAL) winGame();
}

function collectItem(e, i) {
  world.ents.splice(i, 1);
  AudioSys.sfx('power');
  if (e.kind === 'shield') { player.shield = POWER_TIME; toast('t_toast_shield'); }
  else if (e.kind === 'x2') { player.x2 = POWER_TIME; toast('t_toast_x2'); }
  else {
    player.rocket = POWER_TIME;
    G.skyIdx = irand(0, SKIES.length - 1);
    toast('t_toast_rocket');
    setTimeout(() => toast(SKIES[G.skyIdx].label), 900);
    setTimeout(() => toast(G.touch ? 't_flight_hint_touch' : 't_flight_hint'), 2100);
  }
  for (let k = 0; k < 8; k++)
    particles.push({ x: e.x - world.scrollX + 7, y: e.y + 7, vx: rand(-1.6, 1.6), vy: rand(-1.8, -0.4), life: 24, type: 'spark', col: '#FFFFFF' });
}

function shieldBreak(e, i, ex, sy) {
  AudioSys.sfx('shatter');
  G.shake = Math.max(G.shake, 4);
  for (let k = 0; k < 10; k++)
    particles.push({ x: ex + 6, y: sy + 3, vx: rand(-2, 2), vy: rand(-2, 0.5), life: 20, type: 'spark', col: '#7ED0F2' });
  if (e) world.ents.splice(i, 1);
}

function hurt() {
  player.hearts--;
  player.invuln = 80;
  G.shake = 9;
  G.hitStop = 7;
  player.vy = -3.6;
  AudioSys.sfx('hurt');
  for (let k = 0; k < 8; k++)
    particles.push({ x: player.x + 8, y: player.y + 9, vx: rand(-2, 2), vy: rand(-2.4, -0.4), life: 26, type: 'spark', col: '#E24A4A' });
  if (player.hearts <= 0) gameOver();
}

function activatePauseRow() {
  AudioSys.sfx('click');
  if (G.pauseIdx === 0) closePause();
  else if (G.pauseIdx === 1) startRun();
  else if (G.pauseIdx === 2) { G.state = 'title'; }
  else if (G.pauseIdx === 3) { Music.on = !Music.on; G.musicOn = Music.on; }
  else if (G.pauseIdx === 4) { G.sfxOn = !G.sfxOn; AudioSys.sfx('click'); }
}

/* ---------------- 渲染 ---------------- */
function blit(name, x, y) { ctx.drawImage(IMG[name], Math.round(x), Math.round(y)); }
function blitCell(sheet, cx, cy, x, y) {
  ctx.drawImage(sheet, cx, cy, CHAR_W, CHAR_H, Math.round(x), Math.round(y), CHAR_W, CHAR_H);
}

function drawNum(n, x, y, minDig) {
  const s = String(Math.max(0, Math.floor(n)));
  let str = s;
  if (minDig && s.length < minDig) str = s.padStart(minDig, '0');
  for (let i = 0; i < str.length; i++) {
    const g = '0123456789'.indexOf(str[i]);
    ctx.drawImage(IMG['digits.png'], g * 6, 0, 6, 11, Math.round(x + i * 6), Math.round(y), 6, 11);
  }
  return str.length * 6;
}
function drawGlyph(ch, x, y) {
  const g = '0123456789/M+.'.indexOf(ch);
  if (g < 0) return 0;
  ctx.drawImage(IMG['digits.png'], g * 6, 0, 6, 11, Math.round(x), Math.round(y), 6, 11);
  return 7;
}

/* 背景 */
function drawBackground() {
  const skyFile = player.rocket > 0 ? SKIES[G.skyIdx].file : 'sky_day_run.png';
  const off = (world.scrollX * 0.12) % W;
  blit(skyFile, -off, 0); blit(skyFile, W - off, 0);
  if (player.rocket <= 0) {
    const mo = (world.scrollX * 0.5) % W;
    blit('mountains_far.png', -mo, GROUND_Y - 72); blit('mountains_far.png', W - mo, GROUND_Y - 72);
    const ho = (world.scrollX * 0.7) % W;
    blit('hills_near.png', -ho, GROUND_Y - 48); blit('hills_near.png', W - ho, GROUND_Y - 48);
  }
}

function drawGround() {
  const go = Math.floor(world.scrollX) % 32;
  for (let x = -go; x < W; x += 32) blit('ground.png', x, GROUND_Y);
}

function drawEnts() {
  for (const e of world.ents) {
    const x = e.x - world.scrollX;
    if (x < -60 || x > W + 60) continue;
    switch (e.type) {
      case 'coin': {
        const f = Math.floor((G.t / 6 + e.ph)) % 4;
        ctx.drawImage(IMG['coin.png'], f * 10, 0, 10, 10, Math.round(x), Math.round(e.y), 10, 10);
        break;
      }
      case 'item': {
        const bobY = e.y + Math.sin(G.t * 0.08 + e.ph) * 3;
        blit(e.kind === 'shield' ? 'item_shield.png' : e.kind === 'x2' ? 'item_x2.png' : 'item_rocket.png', x, bobY);
        break;
      }
      case 'spike': blit('spike.png', x, e.y); break;
      case 'popup': {
        const up = popupUp(e);
        // 底座常驻，刺刃随 up 上升
        ctx.drawImage(IMG['popup.png'], 0, 6, 12, 2, Math.round(x), Math.round(e.y + 6), 12, 2);
        if (up > 0.5)
          ctx.drawImage(IMG['popup.png'], 0, 0, 12, 6, Math.round(x), Math.round(e.y + 2 - up), 12, 6);
        break;
      }
      case 'firebar': {
        ctx.drawImage(IMG['fire.png'], 16, 0, 8, 8, Math.round(x), Math.round(e.y - 8), 8, 8);
        const f = Math.floor(G.t / 5) % 2;
        for (let b = 0; b < 3; b++) {
          const a = e.ang + b * 2.094;
          const bx = x + Math.cos(a) * 26, by = e.y - 6 + Math.sin(a) * 26;
          ctx.drawImage(IMG['fire.png'], f * 8, 0, 8, 8, Math.round(bx), Math.round(by), 8, 8);
        }
        break;
      }
      case 'hammer': {
        const a = e.amp * Math.sin(e.ang);
        const hx = x + Math.sin(a) * 112, hy = e.y + Math.cos(a) * 112;
        // 锁链
        ctx.fillStyle = '#8A5A33';
        const steps = 8;
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          ctx.fillRect(Math.round(x + (hx - x) * t), Math.round(e.y + (hy - e.y) * t), 2, 2);
        }
        ctx.drawImage(IMG['hammer.png'], 0, 0, 12, 12, Math.round(hx - 6), Math.round(hy - 6), 12, 12);
        break;
      }
      case 'scenery': blit(e.file, x, e.y); break;
    }
  }
}

function drawPlayer() {
  const row = CHAR_ROW[CHARS_META[G.charIdx].id];
  let frame;
  if (player.rocket > 0) frame = 6;
  else if (!player.onGround) frame = player.vy < 0 ? 6 : 7;
  else frame = 2 + (Math.floor(player.runT / 5) % 4);
  if (player.invuln > 0 && Math.floor(player.invuln / 4) % 2 === 0) return;  // 受伤闪烁

  // 护盾泡
  if (player.shield > 0) {
    ctx.globalAlpha = 0.32 + Math.sin(G.t * 0.15) * 0.06;
    ctx.fillStyle = '#7ED0F2';
    ctx.beginPath(); ctx.arc(player.x + 8, player.y + 9, 13, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = '#BEE9F7'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(player.x + 8, player.y + 9, 13, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  blitCell(IMG['chars.png'], frame * CHAR_W, row * CHAR_H, player.x, player.y);
  if (player.rocket > 0) blit('item_rocket.png', player.x + 1, player.y + 12);
}

function drawParticles() {
  for (const p of particles) {
    const a = clamp(p.life / 20, 0, 1);
    ctx.globalAlpha = a;
    if (p.type === 'dust') {
      const f = p.life > 16 ? 0 : p.life > 8 ? 1 : 2;
      ctx.drawImage(IMG['dust.png'], f * 5, 0, 5, 5, Math.round(p.x), Math.round(p.y), 5, 5);
    } else if (p.type === 'coinpop') {
      ctx.fillStyle = p.col;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
    } else if (p.type === 'flame') {
      ctx.fillStyle = p.col;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
    } else {
      ctx.fillStyle = p.col;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
    }
    ctx.globalAlpha = 1;
  }
}

/* 画布内暂停按钮（像素风格，右上角） */
function drawPauseBtn() {
  const bx = W - 28, by = 18;
  ctx.fillStyle = 'rgba(20, 23, 31, 0.72)';
  ctx.fillRect(bx, by, 22, 15);
  ctx.strokeStyle = '#8A93A6'; ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, by + 0.5, 21, 14);
  ctx.fillStyle = G.state === 'pause' ? '#FFD66E' : '#E8ECF4';
  ctx.fillRect(bx + 7, by + 4, 3, 7);
  ctx.fillRect(bx + 12, by + 4, 3, 7);
}

function drawHUD() {
  // 爱心
  for (let i = 0; i < 2; i++) {
    const full = i < player.hearts;
    ctx.drawImage(IMG['heart.png'], full ? 0 : 9, 0, 9, 8, 6 + i * 11, 6, 9, 8);
  }
  // 金币
  ctx.drawImage(IMG['coin.png'], Math.floor(G.t / 6) % 4 * 10, 0, 10, 10, 6, 18, 10, 10);
  let cx = 19;
  cx += drawNum(world.coins, cx, 17);
  cx += drawGlyph('/', cx, 17);
  cx += drawNum(COIN_GOAL, cx, 17);
  if (player.x2 > 0) blit('t_x2badge.png', cx + 5, 17);

  // 里程
  const distW = IMG['t_hud_dist.png'].width + String(world.dist).length * 6 + 7;
  let dx = W - 6 - distW;
  blit('t_hud_dist.png', dx, 6); dx += IMG['t_hud_dist.png'].width;
  dx += drawNum(world.dist, dx, 5);
  drawGlyph('M', dx, 5);

  // 画布内暂停按钮（右上角）
  drawPauseBtn();

  // 道具计时
  let py = 30;
  const bars = [['item_shield.png', player.shield], ['item_x2.png', player.x2], ['item_rocket.png', player.rocket]];
  for (const [file, t] of bars) {
    if (t > 0) {
      blit(file, 6, py);
      ctx.fillStyle = '#14171f'; ctx.fillRect(6, py + 15, 14, 3);
      ctx.fillStyle = t > 120 ? '#7FBE5A' : '#E24A4A';
      ctx.fillRect(6, py + 15, Math.round(14 * t / POWER_TIME), 3);
      py += 20;
    }
  }
  // 飞行风景名
  if (player.rocket > 0) {
    const lb = IMG[SKIES[G.skyIdx].label];
    ctx.globalAlpha = player.rocket > 540 ? (600 - player.rocket) / 60 : player.rocket < 60 ? player.rocket / 60 : 1;
    blit(SKIES[G.skyIdx].label, (W - lb.width) / 2, 24);
    ctx.globalAlpha = 1;
  }
  // 提示
  for (const t of toasts) {
    const im = IMG[t.key];
    ctx.globalAlpha = t.t < 12 ? t.t / 12 : t.t > 108 ? (130 - t.t) / 22 : 1;
    blit(t.key, (W - im.width) / 2, 44);
    ctx.globalAlpha = 1;
  }
}

/* 各界面 */
function renderTitle() {
  blit('screen_title.png', 0, 0);
  // 三角色 idle 展示
  const xs = [92, 136, 180];
  for (let i = 0; i < 3; i++) {
    const row = CHAR_ROW[CHARS_META[i].id];
    const f = Math.floor((G.t + i * 30) / 42) % 2;
    blitCell(IMG['chars.png'], f * CHAR_W, row * CHAR_H, xs[i], 146 - CHAR_H);
  }
  // 最佳纪录
  const bw = IMG['t_best.png'].width + String(G.best.dist).length * 6 + 7;
  let bx = W - 6 - bw;
  blit('t_best.png', bx, 6); bx += IMG['t_best.png'].width;
  bx += drawNum(G.best.dist, bx, 5);
  drawGlyph('M', bx, 5);
  // 闪烁提示（桌面：空格键；移动端：触控）
  if (Math.floor(G.t / 30) % 2 === 0) {
    const p1 = G.touch ? 't_prompt_touch.png' : 't_prompt.png';
    const p2 = G.touch ? 't_prompt2_touch.png' : 't_prompt2.png';
    blit(p1, (W - IMG[p1].width) / 2, 158);
    blit(p2, (W - IMG[p2].width) / 2, 174);
  }
}

function renderSelect() {
  blit('screen_select.png', 0, 0);
  const cards = [22, 118, 214];
  for (let i = 0; i < 3; i++) {
    const cx0 = cards[i];
    const row = CHAR_ROW[CHARS_META[i].id];
    const sel = i === G.selIdx;
    if (sel) {
      ctx.fillStyle = '#FFD66E';
      ctx.fillRect(cx0 - 2, 34, 88, 2); ctx.fillRect(cx0 - 2, 136, 88, 2);
      ctx.fillRect(cx0 - 2, 34, 2, 104); ctx.fillRect(cx0 + 84, 34, 2, 104);
      // 小三角
      const ty = 30 + Math.sin(G.t * 0.12) * 2;
      ctx.fillStyle = '#FFD66E';
      ctx.fillRect(cx0 + 40, ty, 3, 4); ctx.fillRect(cx0 + 38, ty + 1, 7, 2);
    }
    // 角色（选中：跑步循环；未选：idle）
    let f;
    if (sel) f = 2 + (Math.floor(G.t / 5) % 4);
    else f = Math.floor((G.t + i * 25) / 46) % 2;
    const sx = cx0 + 26, sy = 42;
    // 放大 2 倍绘制
    ctx.drawImage(IMG['chars.png'], f * CHAR_W, row * CHAR_H, CHAR_W, CHAR_H, sx, sy, CHAR_W * 2, CHAR_H * 2);
    blit(CHARS_META[i].name, cx0 + 42 - IMG[CHARS_META[i].name].width / 2, 84);
    blit(CHARS_META[i].desc, cx0 + 42 - IMG[CHARS_META[i].desc].width / 2, 100);
  }
  // 底部提示（桌面/移动端两套）
  const h1 = G.touch ? 't_sel_hint_touch.png' : 't_sel_hint.png';
  const h2 = G.touch ? 't_sel_hint2_touch.png' : 't_sel_hint2.png';
  blit(h1, (W - IMG[h1].width) / 2, 146);
  blit(h2, (W - IMG[h2].width) / 2, 160);
}

function drawWorldLayers() {
  drawBackground();
  // 云（最远视差，在山之前）
  for (const e of world.ents)
    if (e.type === 'scenery' && e.par < 1) blit(e.file, e.x - world.scrollX * e.par, e.y);
  // 树（地面之前，遮住树干底）
  for (const e of world.ents)
    if (e.type === 'scenery' && e.file === 'tree.png') blit(e.file, e.x - world.scrollX, e.y);
  drawGround();
  // 其余地面装饰
  for (const e of world.ents)
    if (e.type === 'scenery' && e.par === 1 && e.file !== 'tree.png') blit(e.file, e.x - world.scrollX, e.y);
  drawEnts();
  drawPlayer();
  drawParticles();
}

function renderPlay() {
  ctx.save();
  if (G.shake > 0) ctx.translate(Math.round(rand(-G.shake, G.shake)), Math.round(rand(-G.shake, G.shake)));
  drawWorldLayers();
  ctx.restore();
  drawHUD();
}

function renderPause() {
  renderPlayWorldOnly();
  blit('screen_pause.png', 0, 0);
  // 菜单行（桌面带按键提示，移动端纯文字）
  const sfx = G.touch ? '_t.png' : '.png';
  const rows = [
    't_pause_resume' + sfx,
    't_pause_restart' + sfx,
    't_pause_menu.png',
  ];
  for (let i = 0; i < 3; i++) blit(rows[i], 100, 70 + i * 15);
  // 光标
  const y = 70 + G.pauseIdx * 15;
  ctx.fillStyle = '#FFD66E';
  const bobY = Math.sin(G.t * 0.15) * 1;
  ctx.fillRect(84, y + 2 + bobY, 3, 6); ctx.fillRect(87, y + 4 + bobY, 2, 2);
  // 音乐 / 音效开关（实时状态）
  blit('t_row_music.png', 100, 115);
  blit(Music.on ? 't_on.png' : 't_off.png', 100 + IMG['t_row_music.png'].width, 115);
  blit('t_row_sfx.png', 100, 130);
  blit(G.sfxOn ? 't_on.png' : 't_off.png', 100 + IMG['t_row_sfx.png'].width, 130);
}
function renderPlayWorldOnly() {
  ctx.save();
  if (G.shake > 0) ctx.translate(Math.round(rand(-G.shake, G.shake)), Math.round(rand(-G.shake, G.shake)));
  drawWorldLayers();
  ctx.restore();
}

function renderWin() {
  renderPlayWorldOnly();
  blit(G.touch ? 'screen_win_touch.png' : 'screen_win.png', 0, 0);
}

function renderOver() {
  renderPlayWorldOnly();
  blit(G.touch ? 'screen_over_touch.png' : 'screen_over.png', 0, 0);
  // 成绩行
  const coins = world.coins || 0;
  const lineW = IMG['t_stat_coins.png'].width + 4 + String(coins).length * 6 + 10 + IMG['t_stat_dist.png'].width + 4 + String(world.dist).length * 6 + 7;
  let sx = (W - lineW) / 2;
  blit('t_stat_coins.png', sx, 78); sx += IMG['t_stat_coins.png'].width + 4;
  sx += drawNum(coins, sx, 77);
  sx += 10;
  blit('t_stat_dist.png', sx, 78); sx += IMG['t_stat_dist.png'].width + 4;
  sx += drawNum(world.dist, sx, 77);
  drawGlyph('M', sx, 77);
  if (newRecord()) blit('t_record.png', (W - IMG['t_record.png'].width) / 2, 94);
}

/* 移动端竖屏遮罩 */
function renderLandscapeOverlay() {
  ctx.fillStyle = 'rgba(12, 14, 22, 0.88)';
  ctx.fillRect(0, 0, W, H);
  // 旋转的手机图标（像素风）
  const cx = 160, cy = 62;
  const wob = Math.sin(G.t * 0.06) * 0.35;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(wob);
  ctx.fillStyle = '#2A3350';
  ctx.fillRect(-13, -22, 26, 44);
  ctx.strokeStyle = '#FFD66E'; ctx.lineWidth = 2;
  ctx.strokeRect(-12, -21, 24, 42);
  ctx.fillStyle = '#FFD66E';
  ctx.fillRect(-4, -16, 8, 26);
  ctx.restore();
  const t1 = IMG['t_landscape.png'], t2 = IMG['t_landscape2.png'];
  blit('t_landscape.png', (W - t1.width) / 2, 104);
  blit('t_landscape2.png', (W - t2.width) / 2, 124);
}

function render() {
  ctx.clearRect(0, 0, W, H);
  switch (G.state) {
    case 'title': renderTitle(); break;
    case 'select': renderSelect(); break;
    case 'play': renderPlay(); break;
    case 'pause': renderPause(); break;
    case 'win': renderWin(); break;
    case 'over': renderOver(); break;
  }
  if (G.touch && G.portrait && G.state !== 'title') renderLandscapeOverlay();
}

/* ---------------- 主循环 ---------------- */
let last = 0, acc = 0;
function loop(t) {
  requestAnimationFrame(loop);
  if (!last) last = t;
  let dt = t - last; last = t;
  if (dt > 120) dt = 120;
  acc += dt;
  const STEP = 1000 / 60;
  let n = 0;
  while (acc >= STEP && n < 4) { update(); acc -= STEP; n++; }
  if (acc > STEP * 4) acc = 0;
  render();
}

/* ---------------- 启动 ---------------- */
resize();
loadAll(() => {
  $('loading').style.display = 'none';
  checkOrientation();
  resize();
  requestAnimationFrame(loop);
});

/* 调试句柄（自动化测试用） */
window.__SDD = { G, player, world, particles, toasts, AudioSys, Music, startRun, keys };

})();
