// ============================================================
//  js/retro-bg.js — REAL RETRO ARCADE SOCCER STADIUM ENGINE
//  Dangerous Boys Stadium · 2.5D Real Pitch · 2 Gawang & Kiper
//  Arcade Round Buttons · Fisika Pantul & Gol Realistis · 60 FPS
// ============================================================

(function () {
  'use strict';

  // Resolusi virtual retro arcade (640x360) — tajam, proporsional, 0% lag
  const V_WIDTH = 640;
  const V_HEIGHT = 360;

  // Batas area lapangan hijau
  const PITCH_TOP = 70;
  const PITCH_BOTTOM = 330;
  const PITCH_LEFT = 36;
  const PITCH_RIGHT = 604;

  // Dimensi gawang kiri dan kanan
  const GOAL_Y_TOP = 145;
  const GOAL_Y_BOTTOM = 255;
  const GOAL_DEPTH = 32;

  let canvas = null;
  let ctx = null;
  let animId = null;
  let isPaused = false;
  let currentMode = 'soccer'; // 'soccer' atau 'mario'
  let lastTime = 0;

  // Skor & Timer Pertandingan
  let scorePlayer = 0; // Dangerous Boys (BJR-18)
  let scoreCPU = 0;    // Banjar Rival FC
  let matchTime = 90 * 60; // 90 menit virtual (menghitung mundur)
  let goalCelebrationTimer = 0;
  let goalScorer = ''; // 'player' | 'cpu'
  let goalParticles = [];
  let whistleFlash = 0;

  // Audio Sintesis Retro (Web Audio API)
  let audioCtx = null;
  let soundEnabled = true;

  function initAudio() {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) audioCtx = new AudioCtx();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playRetroSound(type) {
    if (!soundEnabled || !audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'kick') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.1);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'shoot') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.16);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.16);
      } else if (type === 'goal') {
        // Melodi kemenangan gol 8-bit
        const freqs = [330, 392, 493.88, 587.33, 659.25, 783.99];
        freqs.forEach((f, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'square';
          o.frequency.setValueAtTime(f, now + idx * 0.08);
          g.gain.setValueAtTime(0.22, now + idx * 0.08);
          g.gain.linearRampToValueAtTime(0.01, now + (idx + 1) * 0.08);
          o.connect(g);
          g.connect(audioCtx.destination);
          o.start(now + idx * 0.08);
          o.stop(now + (idx + 1) * 0.08);
        });
      } else if (type === 'whistle') {
        // Peluit wasit retro
        osc.type = 'square';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.setValueAtTime(1800, now + 0.08);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'save') {
        // Kiper menepis bola
        osc.type = 'noise' in osc ? 'noise' : 'square';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      }
    } catch {
      // Audio fallback aman
    }
  }

  // ── PALET RETRO ARCADE ─────────────────────────────────────────
  const PALETTE = {
    '.': null,
    'K': '#181512', // Hitam Karbon
    'W': '#ffffff', // Putih
    'P': '#fdcca0', // Kulit Peach
    'G': '#c27827', // Emas Jersey Dangerous Boys
    'R': '#d63220', // Merah Retro
    'B': '#1d4ed8', // Biru Retro Jersey Lawan
    'Y': '#facc15', // Kuning Koin
    'O': '#78350f', // Rambut Cokelat
    'L': '#15803d', // Hijau Kiper
    'S': '#64748b', // Abu-Abu Sepatu
  };

  function drawPixelMatrix(context, matrix, startX, startY, pixelSize = 2, flipX = false) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const char = matrix[r][c];
        const color = PALETTE[char];
        if (color) {
          context.fillStyle = color;
          const drawX = flipX ? startX + (cols - 1 - c) * pixelSize : startX + c * pixelSize;
          const drawY = startY + r * pixelSize;
          context.fillRect(Math.floor(drawX), Math.floor(drawY), pixelSize, pixelSize);
        }
      }
    }
  }

  // ── SPRITE PIXEL ART KARAKTER (12x14 PIXELS) ─────────────────

  // 1. Pemain Dangerous Boys (Jersey Emas BJR-18)
  const SPRITE_P1_RUN_1 = [
    "...OOOOOO...",
    "...PPPPPP...",
    "...P.K.KP...",
    "...PPPPPP...",
    "...GGGGGG...",
    "..GGKKKKGG..",
    "..GGGGGGGG..",
    "...GGGGGG...",
    "...KK..KK...",
    "...KK..KK...",
    "..RR....RR..",
    "..RR....RR..",
  ];

  const SPRITE_P1_RUN_2 = [
    "...OOOOOO...",
    "...PPPPPP...",
    "...P.K.KP...",
    "...PPPPPP...",
    "...GGGGGG...",
    "..GGKKKKGG..",
    "..GGGGGGGG..",
    "...GGGGGG...",
    "....KK.KK...",
    "...KK...KK..",
    "..RR.....RR.",
    "..RR......RR",
  ];

  const SPRITE_P1_KICK = [
    "...OOOOOO...",
    "...PPPPPP...",
    "...P.K.KP...",
    "...PPPPPP...",
    "...GGGGGG...",
    "..GGGGGGGGG.",
    "..GGKKKKGG..",
    "...GGGGGG...",
    "...KK...KK..",
    "..KK.....KK.",
    ".RR.......RR",
  ];

  const SPRITE_P1_CELEBRATE = [
    ".RR....RR...",
    ".RR.OO.RR...",
    "...OOOOOO...",
    "...PPPPPP...",
    "...P.K.KP...",
    "...PPPPPP...",
    "...GGGGGG...",
    "..GGGGGGGG..",
    "..GGKKKKGG..",
    "...GGGGGG...",
    "...KK..KK...",
    "..RR....RR..",
  ];

  // 2. Pemain Lawan (Jersey Biru / Banjar Rival FC)
  const SPRITE_OPP_RUN_1 = [
    "...KKKKKK...",
    "...PPPPPP...",
    "...P.K.KP...",
    "...PPPPPP...",
    "...BBBBBB...",
    "..BBWWWWBB..",
    "..BBBBBBBB..",
    "...BBBBBB...",
    "...WW..WW...",
    "...WW..WW...",
    "..KK....KK..",
    "..KK....KK..",
  ];

  const SPRITE_OPP_RUN_2 = [
    "...KKKKKK...",
    "...PPPPPP...",
    "...P.K.KP...",
    "...PPPPPP...",
    "...BBBBBB...",
    "..BBWWWWBB..",
    "..BBBBBBBB..",
    "...BBBBBB...",
    "....WW.WW...",
    "...WW...WW..",
    "..KK.....KK.",
    "..KK......KK",
  ];

  // 3. Kiper (Jersey Hijau Terang)
  const SPRITE_GK = [
    "...KKKKKK...",
    "...PPPPPP...",
    "...P.K.KP...",
    "...PPPPPP...",
    "..LLLLLLLL..",
    ".LLLLKKLLLL.",
    "..LLLLLLLL..",
    "...LLLLLL...",
    "...KK..KK...",
    "..YY....YY..",
    "..YY....YY..",
  ];

  // 4. Bola Sepak Retro (8x8)
  const SPRITE_BALL = [
    "..KKKK..",
    ".KWWWWK.",
    "KWWKKWWK",
    "KWKKKKWK",
    "KWKKKKWK",
    "KWWKKWWK",
    ".KWWWWK.",
    "..KKKK..",
  ];

  // 5. Mario Bros Retro
  const SPRITE_MARIO_RUN_1 = [
    "....RRRRR....",
    "...RRRRRRRRR.",
    "...OORRPPO...",
    "..OPOOPPPO...",
    "..OPOOOPPPO..",
    "..OOPPPPPOO..",
    "....PPPPPPP..",
    "...RRBRRR....",
    "..RRRBRRRBR..",
    ".RRRRBBBBRRR.",
    ".PPRBBYBBRRP.",
    ".PPBBBBBBRPP.",
    "...BBBBBB....",
    "..OOOOOOOO...",
    ".OOOO..OOOO..",
  ];

  const SPRITE_MARIO_RUN_2 = [
    "....RRRRR....",
    "...RRRRRRRRR.",
    "...OORRPPO...",
    "..OPOOPPPO...",
    "..OPOOOPPPO..",
    "..OOPPPPPOO..",
    "....PPPPPPP..",
    "..RRRBRRR....",
    ".RRRRBRRRBR..",
    ".PPRRBBBBRRR.",
    ".PPBBBYBBRRP.",
    "...BBBBBB....",
    "...OOO..OOO..",
    "..OOOO...OOO.",
  ];

  // ── ENTITAS PERTANDINGAN ─────────────────────────────────────

  // Status Input Kontrol
  const input = {
    left: false,
    right: false,
    up: false,
    down: false,
    shoot: false,
    pass: false,
    sprint: false,
  };

  // Bola Sepak dengan Fisika 2.5D (x, y, z ketinggian)
  const ball = {
    x: V_WIDTH / 2,
    y: (PITCH_TOP + PITCH_BOTTOM) / 2,
    z: 0, // Ketinggian di atas tanah
    vx: 0,
    vy: 0,
    vz: 0,
    rotation: 0,
    radius: 6,
    reset() {
      this.x = V_WIDTH / 2;
      this.y = (PITCH_TOP + PITCH_BOTTOM) / 2;
      this.z = 0;
      this.vx = 0;
      this.vy = 0;
      this.vz = 0;
      this.rotation = 0;
    }
  };

  // Pemain Anda: BJR-18 Dangerous Boys (Penyerang No. 10)
  const player = {
    x: 220,
    y: 200,
    vx: 0,
    vy: 0,
    speed: 2.2,
    facing: 1, // 1 = kanan, -1 = kiri
    state: 'idle', // 'idle' | 'run' | 'kick' | 'celebrate'
    frame: 0,
    animTimer: 0,
    kickTimer: 0,
  };

  // Teman Setim (AI Dangerous Boys No. 7)
  const teammate = {
    x: 180,
    y: 130,
    vx: 0,
    vy: 0,
    speed: 1.8,
    facing: 1,
    frame: 0,
    animTimer: 0,
  };

  // Bek Lawan (AI Banjar Rival FC No. 4)
  const opponent = {
    x: 420,
    y: 200,
    vx: 0,
    vy: 0,
    speed: 1.7,
    facing: -1,
    frame: 0,
    animTimer: 0,
    tackleTimer: 0,
  };

  // Kiper Kanan (Kiper Lawan)
  const goalieRight = {
    x: 590,
    y: 200,
    vy: 1.2,
    minY: GOAL_Y_TOP + 10,
    maxY: GOAL_Y_BOTTOM - 10,
    diveTimer: 0,
  };

  // Kiper Kiri (Kiper Dangerous Boys)
  const goalieLeft = {
    x: 46,
    y: 200,
    vy: 1.0,
    minY: GOAL_Y_TOP + 10,
    maxY: GOAL_Y_BOTTOM - 10,
    diveTimer: 0,
  };

  // ── INISIALISASI CANVAS & KONTROLER ─────────────────────────
  function initGame() {
    canvas = document.getElementById('soccerGameCanvas');
    if (!canvas) return;

    ctx = canvas.getContext('2d', { alpha: false });
    canvas.width = V_WIDTH;
    canvas.height = V_HEIGHT;
    ctx.imageSmoothingEnabled = false;

    // Pasang tombol kontroler arcade nyata (D-Pad bulat & Tombol aksi bulat)
    setupArcadeControls();

    // Event listener keyboard
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Resize
    window.addEventListener('resize', handleCanvasResize);
    handleCanvasResize();

    // Loop
    lastTime = performance.now();
    animId = requestAnimationFrame(gameLoop);
  }

  function handleCanvasResize() {
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (parent) {
      canvas.style.width = '100%';
      canvas.style.height = '100%';
    }
  }

  // ── KEYBOARD HANDLERS ───────────────────────────────────────
  function handleKeyDown(e) {
    initAudio();

    if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = true;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') input.up = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') input.down = true;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.sprint = true;

    if (e.code === 'Space' || e.code === 'KeyK') {
      input.shoot = true;
      executeShoot();
    }
    if (e.code === 'KeyJ' || e.code === 'KeyX') {
      input.pass = true;
      executePass();
    }
  }

  function handleKeyUp(e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') input.up = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') input.down = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.sprint = false;
    if (e.code === 'Space' || e.code === 'KeyK') input.shoot = false;
    if (e.code === 'KeyJ' || e.code === 'KeyX') input.pass = false;
  }

  // ── AKSI MENEMBAK & MENGOPER BOLA ────────────────────────────
  function executeShoot() {
    const dist = Math.hypot(player.x + 8 - ball.x, player.y + 12 - ball.y);
    if (dist < 26) {
      player.state = 'kick';
      player.kickTimer = 0.25;

      // Arah tembakan menuju gawang kanan (gawang lawan)
      const targetGoalX = PITCH_RIGHT + 10;
      const targetGoalY = GOAL_Y_TOP + (GOAL_Y_BOTTOM - GOAL_Y_TOP) * (0.2 + Math.random() * 0.6);
      const angle = Math.atan2(targetGoalY - ball.y, targetGoalX - ball.x);

      const power = input.sprint ? 6.8 : 5.4;
      ball.vx = Math.cos(angle) * power;
      ball.vy = Math.sin(angle) * power * 0.6;
      ball.vz = 3.2 + Math.random() * 2.0; // Angkat bola melambung di udara

      playRetroSound('shoot');
    }
  }

  function executePass() {
    const dist = Math.hypot(player.x + 8 - ball.x, player.y + 12 - ball.y);
    if (dist < 26) {
      player.state = 'kick';
      player.kickTimer = 0.2;

      // Oper mendatar ke arah teman setim (teammate)
      const angle = Math.atan2(teammate.y - ball.y, teammate.x - ball.x);
      const power = 4.2;
      ball.vx = Math.cos(angle) * power;
      ball.vy = Math.sin(angle) * power;
      ball.vz = 0.5;

      playRetroSound('kick');
    }
  }

  // ── UPDATE LOGIKA GAME (60 FPS) ─────────────────────────────
  function updateGame(dt) {
    // 1. Partikel Selebrasi Gol
    for (let i = goalParticles.length - 1; i >= 0; i--) {
      const p = goalParticles[i];
      p.x += p.vx * 60 * dt;
      p.y += p.vy * 60 * dt;
      p.vy += 3.5 * dt;
      p.life -= dt;
      if (p.life <= 0) goalParticles.splice(i, 1);
    }

    if (whistleFlash > 0) whistleFlash -= dt;

    // Saat perayaan gol, bola dan pemain jeda sejenak
    if (goalCelebrationTimer > 0) {
      goalCelebrationTimer -= dt;
      if (goalCelebrationTimer <= 0) {
        resetKickoff();
      }
      return;
    }

    // Hitung waktu pertandingan mundur
    if (matchTime > 0) matchTime -= dt * 25; // 1 detik dunia nyata = ~25 detik pertandingan

    // 2. Pergerakan Pemain Anda (Dangerous Boys)
    const currentSpeed = (input.sprint ? player.speed * 1.5 : player.speed);
    player.vx = 0;
    player.vy = 0;

    if (input.left) { player.vx = -currentSpeed; player.facing = -1; }
    if (input.right) { player.vx = currentSpeed; player.facing = 1; }
    if (input.up) { player.vy = -currentSpeed * 0.75; }
    if (input.down) { player.vy = currentSpeed * 0.75; }

    player.x += player.vx * 60 * dt;
    player.y += player.vy * 60 * dt;

    // Batasi pemain di dalam garis lapangan
    player.x = Math.max(PITCH_LEFT + 8, Math.min(PITCH_RIGHT - 24, player.x));
    player.y = Math.max(PITCH_TOP + 4, Math.min(PITCH_BOTTOM - 24, player.y));

    // Animasi langkah kaki
    if (Math.abs(player.vx) > 0.1 || Math.abs(player.vy) > 0.1) {
      player.animTimer += dt;
      if (player.animTimer > (input.sprint ? 0.08 : 0.13)) {
        player.frame = (player.frame + 1) % 2;
        player.animTimer = 0;
      }
    }

    if (player.kickTimer > 0) {
      player.kickTimer -= dt;
      if (player.kickTimer <= 0) player.state = 'idle';
    }

    // 3. AI Teman Setim (Membantu membuka ruang)
    const targetTeammateX = player.x + 80;
    const dxTm = targetTeammateX - teammate.x;
    teammate.x += Math.sign(dxTm) * Math.min(Math.abs(dxTm), teammate.speed * 60 * dt);
    teammate.x = Math.max(PITCH_LEFT + 20, Math.min(PITCH_RIGHT - 60, teammate.x));

    // 4. AI Bek Lawan (Menghadang Pemain & Mengejar Bola)
    const targetDefX = ball.x > V_WIDTH / 2 ? ball.x + 14 : V_WIDTH / 2 + 60;
    const targetDefY = ball.y;
    const angleDef = Math.atan2(targetDefY - opponent.y, targetDefX - opponent.x);
    opponent.vx = Math.cos(angleDef) * opponent.speed;
    opponent.vy = Math.sin(angleDef) * opponent.speed * 0.7;

    opponent.x += opponent.vx * 60 * dt;
    opponent.y += opponent.vy * 60 * dt;
    opponent.facing = opponent.vx > 0 ? 1 : -1;

    // Sapuan/Tackle Lawan jika dekat bola
    const distOppBall = Math.hypot(opponent.x + 8 - ball.x, opponent.y + 12 - ball.y);
    if (distOppBall < 18) {
      // Lawan membuang bola ke arah kiri (menyerang ke gawang Dangerous Boys)
      ball.vx = -(3.8 + Math.random() * 1.8);
      ball.vy = (Math.random() - 0.5) * 3.2;
      ball.vz = 2.0;
      playRetroSound('kick');
    }

    // 5. AI Kiper Lawan (Gawang Kanan)
    goalieRight.y += goalieRight.vy * 60 * dt;
    if (goalieRight.y >= goalieRight.maxY || goalieRight.y <= goalieRight.minY) {
      goalieRight.vy = -goalieRight.vy;
    }

    // Kiper menepis tembakan ke gawang kanan
    if (
      ball.x >= PITCH_RIGHT - 24 &&
      ball.x <= PITCH_RIGHT + 6 &&
      ball.y >= GOAL_Y_TOP - 10 &&
      ball.y <= GOAL_Y_BOTTOM + 10 &&
      Math.abs(ball.y - (goalieRight.y + 12)) < 30
    ) {
      ball.vx = -(3.6 + Math.random() * 1.5);
      ball.vy = (Math.random() - 0.5) * 4;
      ball.vz = 2.2;
      playRetroSound('save');
    }

    // 6. AI Kiper Dangerous Boys (Gawang Kiri)
    goalieLeft.y += goalieLeft.vy * 60 * dt;
    if (goalieLeft.y >= goalieLeft.maxY || goalieLeft.y <= goalieLeft.minY) {
      goalieLeft.vy = -goalieLeft.vy;
    }

    if (
      ball.x <= PITCH_LEFT + 24 &&
      ball.x >= PITCH_LEFT - 6 &&
      Math.abs(ball.y - (goalieLeft.y + 12)) < 30
    ) {
      ball.vx = 3.6 + Math.random() * 1.5;
      ball.vy = (Math.random() - 0.5) * 4;
      ball.vz = 2.0;
      playRetroSound('save');
    }

    // 7. Fisika Gerak Bola (2.5D dengan Ketinggian Z)
    ball.x += ball.vx * 60 * dt;
    ball.y += ball.vy * 60 * dt;

    // Ketinggian Z dan Gravitasi
    if (ball.z > 0 || ball.vz !== 0) {
      ball.vz -= 9.8 * dt * 1.2;
      ball.z += ball.vz * 60 * dt;

      if (ball.z <= 0) {
        ball.z = 0;
        ball.vz = -ball.vz * 0.55; // Pantulan lantai
        if (Math.abs(ball.vz) < 0.4) ball.vz = 0;
      }
    }

    // Gesekan rumput mendatar
    ball.vx *= 0.985;
    ball.vy *= 0.985;
    ball.rotation += ball.vx * dt * 8;

    // Dribble otomatis saat pemain berlari mendorong bola
    const distP1Ball = Math.hypot(player.x + 8 - ball.x, player.y + 12 - ball.y);
    if (distP1Ball < 18 && ball.z < 6 && player.kickTimer <= 0) {
      ball.vx = player.facing * (Math.abs(player.vx) + 0.8);
      ball.vy = player.vy * 0.9;
    }

    // ── 8. DETEKSI GOL REALISTIS ────────────────────────────────
    // Gawang Kanan (GOL DANGEROUS BOYS!)
    if (
      ball.x >= PITCH_RIGHT &&
      ball.x <= PITCH_RIGHT + GOAL_DEPTH &&
      ball.y >= GOAL_Y_TOP &&
      ball.y <= GOAL_Y_BOTTOM
    ) {
      scorePlayer++;
      triggerGoal('player');
      return;
    }

    // Gawang Kiri (GOL LAWAN)
    if (
      ball.x <= PITCH_LEFT &&
      ball.x >= PITCH_LEFT - GOAL_DEPTH &&
      ball.y >= GOAL_Y_TOP &&
      ball.y <= GOAL_Y_BOTTOM
    ) {
      scoreCPU++;
      triggerGoal('cpu');
      return;
    }

    // Pantulan tiang gawang atas & bawah
    if (ball.y < PITCH_TOP + 4) {
      ball.y = PITCH_TOP + 4;
      ball.vy = Math.abs(ball.vy) * 0.8;
    } else if (ball.y > PITCH_BOTTOM - 4) {
      ball.y = PITCH_BOTTOM - 4;
      ball.vy = -Math.abs(ball.vy) * 0.8;
    }

    // Batas tepi kiri dan kanan selain jaring gawang
    if ((ball.y < GOAL_Y_TOP || ball.y > GOAL_Y_BOTTOM)) {
      if (ball.x <= PITCH_LEFT) {
        ball.x = PITCH_LEFT;
        ball.vx = Math.abs(ball.vx) * 0.8;
      } else if (ball.x >= PITCH_RIGHT) {
        ball.x = PITCH_RIGHT;
        ball.vx = -Math.abs(ball.vx) * 0.8;
      }
    }
  }

  function triggerGoal(team) {
    goalCelebrationTimer = 2.8;
    goalScorer = team;
    whistleFlash = 0.5;
    playRetroSound('whistle');
    setTimeout(() => playRetroSound('goal'), 200);

    if (team === 'player') {
      player.state = 'celebrate';
    }

    // Buat 45 partikel konfeti berhamburan
    goalParticles = [];
    const goalX = team === 'player' ? PITCH_RIGHT + 12 : PITCH_LEFT - 12;
    for (let i = 0; i < 45; i++) {
      goalParticles.push({
        x: goalX,
        y: GOAL_Y_TOP + Math.random() * (GOAL_Y_BOTTOM - GOAL_Y_TOP),
        vx: (Math.random() - 0.5) * 8 + (team === 'player' ? -4 : 4),
        vy: -Math.random() * 6 - 2,
        color: ['#c27827', '#facc15', '#ffffff', '#1d4ed8', '#d63220'][Math.floor(Math.random() * 5)],
        life: 2.5,
      });
    }
  }

  function resetKickoff() {
    ball.reset();
    player.x = 220;
    player.y = 200;
    player.state = 'idle';
    teammate.x = 180;
    teammate.y = 130;
    opponent.x = 420;
    opponent.y = 200;
  }

  // ── RENDER STADION & PERTANDINGAN SEPAK BOLA ─────────────────
  function render() {
    // 1. Gambar Tribun Penonton & Lampu Sorot Stadion
    renderStadiumGrandstand();

    // 2. Gambar Rumput Lapangan Bergaris Hijau 2-Tone
    renderGrassPitch();

    // 3. Gambar Garis Lapangan & Lingkaran Tengah
    renderPitchMarkings();

    // 4. Gambar 2 Gawang Lengkap dengan Jaring Perspektif 3D
    renderGoalNets();

    // 5. Gambar Kiper
    drawPixelMatrix(ctx, SPRITE_GK, goalieLeft.x, goalieLeft.y, 2, false);
    drawPixelMatrix(ctx, SPRITE_GK, goalieRight.x, goalieRight.y, 2, true);

    // 6. Gambar Pemain AI Lawan
    const oppSprite = opponent.frame === 0 ? SPRITE_OPP_RUN_1 : SPRITE_OPP_RUN_2;
    drawPixelMatrix(ctx, oppSprite, opponent.x, opponent.y, 2, opponent.facing === -1);

    // 7. Gambar Teman Setim Dangerous Boys
    const tmSprite = teammate.frame === 0 ? SPRITE_P1_RUN_1 : SPRITE_P1_RUN_2;
    drawPixelMatrix(ctx, tmSprite, teammate.x, teammate.y, 2, false);

    // 8. Gambar Pemain Anda (Dangerous Boys BJR-18)
    let pSprite = player.frame === 0 ? SPRITE_P1_RUN_1 : SPRITE_P1_RUN_2;
    if (player.state === 'kick') pSprite = SPRITE_P1_KICK;
    if (player.state === 'celebrate') pSprite = SPRITE_P1_CELEBRATE;
    drawPixelMatrix(ctx, pSprite, player.x, player.y, 2, player.facing === -1);

    // Indikator nama "BJR-18 / KAMU" di atas kepala pemain
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 8px monospace';
    ctx.fillText('▼ BJR·10', player.x - 2, player.y - 6);

    // 9. Gambar Bayangan dan Bola Sepak (dengan Ketinggian Z)
    renderSoccerBall();

    // 10. Partikel Konfeti
    goalParticles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 3, 3);
    });

    // 11. Banner Perayaan Gol Layar Penuh
    if (goalCelebrationTimer > 0) {
      renderGoalCelebrationBanner();
    }
  }

  function renderStadiumGrandstand() {
    // Langit & Atap Stadion
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, V_WIDTH, PITCH_TOP);

    // Tribun Penonton Retro Pixel
    const crowdColors = ['#dc2626', '#2563eb', '#f59e0b', '#ffffff', '#10b981', '#7c3aed'];
    for (let row = 0; row < 3; row++) {
      const y = 8 + row * 16;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, y + 10, V_WIDTH, 4);

      for (let x = 8; x < V_WIDTH - 8; x += 12) {
        const color = crowdColors[(x + row * 7) % crowdColors.length];
        ctx.fillStyle = color;
        ctx.fillRect(x, y + 2, 8, 8); // Badan penonton
        ctx.fillStyle = '#fdcca0';
        ctx.fillRect(x + 2, y, 4, 3);  // Kepala penonton
      }
    }

    // Papan Iklan Tepi Lapangan
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, PITCH_TOP - 14, V_WIDTH, 14);
    ctx.strokeStyle = '#c27827';
    ctx.strokeRect(0, PITCH_TOP - 14, V_WIDTH, 14);

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 8px monospace';
    ctx.fillText('★ DANGEROUS BOYS STADIUM BANJAR CITY · SEJAK 2018 · PERSAHABATAN ABADI ★', 80, PITCH_TOP - 4);
  }

  function renderGrassPitch() {
    // Rumput bergaris vertikal 2-tone hijau cerah khas stadion asli
    const stripeWidth = 40;
    for (let x = 0; x < V_WIDTH; x += stripeWidth) {
      const isEven = Math.floor(x / stripeWidth) % 2 === 0;
      ctx.fillStyle = isEven ? '#2e8540' : '#287739';
      ctx.fillRect(x, PITCH_TOP, stripeWidth, PITCH_BOTTOM - PITCH_TOP);
    }
  }

  function renderPitchMarkings() {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    // Garis Batas Lapangan
    ctx.strokeRect(PITCH_LEFT, PITCH_TOP, PITCH_RIGHT - PITCH_LEFT, PITCH_BOTTOM - PITCH_TOP);

    // Garis Tengah & Lingkaran Tengah
    const midX = V_WIDTH / 2;
    ctx.beginPath();
    ctx.moveTo(midX, PITCH_TOP);
    ctx.lineTo(midX, PITCH_BOTTOM);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(midX, (PITCH_TOP + PITCH_BOTTOM) / 2, 48, 0, Math.PI * 2);
    ctx.stroke();

    // Titik Tengah Kickoff
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(midX, (PITCH_TOP + PITCH_BOTTOM) / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    // Kotak Penalti Kiri
    ctx.strokeRect(PITCH_LEFT, 115, 84, 170);
    ctx.strokeRect(PITCH_LEFT, 145, 32, 110);

    // Kotak Penalti Kanan
    ctx.strokeRect(PITCH_RIGHT - 84, 115, 84, 170);
    ctx.strokeRect(PITCH_RIGHT - 32, 145, 32, 110);
  }

  function renderGoalNets() {
    // 1. Gawang Kiri (Dangerous Boys Goal)
    draw3DGoal(PITCH_LEFT - GOAL_DEPTH, GOAL_Y_TOP, GOAL_DEPTH, GOAL_Y_BOTTOM - GOAL_Y_TOP, 'left');

    // 2. Gawang Kanan (Lawan / Sasaran Tembak Anda)
    draw3DGoal(PITCH_RIGHT, GOAL_Y_TOP, GOAL_DEPTH, GOAL_Y_BOTTOM - GOAL_Y_TOP, 'right');
  }

  function draw3DGoal(x, y, w, h, side) {
    // Jaring gawang berpola
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;

    for (let gy = y; gy <= y + h; gy += 8) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + w, gy);
      ctx.stroke();
    }
    for (let gx = x; gx <= x + w; gx += 6) {
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + h);
      ctx.stroke();
    }

    // Tiang gawang putih tebal
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    // Label Gawang
    ctx.fillStyle = side === 'left' ? '#facc15' : '#ef4444';
    ctx.font = 'bold 7px monospace';
    const tagText = side === 'left' ? 'BJR-18' : 'RIVAL';
    ctx.fillText(tagText, x + 2, y - 4);
  }

  function renderSoccerBall() {
    // Bayangan bola di tanah (posisi Y sebenarnya tanpa Z)
    const shadowSize = Math.max(3, 7 - ball.z * 0.12);
    ctx.fillStyle = 'rgba(10, 15, 10, 0.35)';
    ctx.beginPath();
    ctx.ellipse(ball.x, ball.y, shadowSize, shadowSize * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bola di udara (berada pada Y - Z)
    ctx.save();
    ctx.translate(ball.x, ball.y - ball.z);
    ctx.rotate(ball.rotation);
    drawPixelMatrix(ctx, SPRITE_BALL, -8, -8, 2, false);
    ctx.restore();
  }

  function renderGoalCelebrationBanner() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(V_WIDTH / 2 - 160, 110, 320, 68);
    ctx.strokeStyle = goalScorer === 'player' ? '#facc15' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(V_WIDTH / 2 - 160, 110, 320, 68);

    ctx.textAlign = 'center';
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = goalScorer === 'player' ? '#facc15' : '#f87171';
    ctx.fillText('★ GOOOOLLLLLL! ★', V_WIDTH / 2, 142);

    ctx.font = '10px monospace';
    ctx.fillStyle = '#ffffff';
    const subText = goalScorer === 'player'
      ? 'DANGEROUS BOYS (BJR-18) MENCETAK ANGKA!'
      : 'BANJAR RIVAL FC MEMBALAS GOL!';
    ctx.fillText(subText, V_WIDTH / 2, 162);
    ctx.textAlign = 'left';
  }

  // ── GAME LOOP ───────────────────────────────────────────────
  function gameLoop(now) {
    if (!isPaused) {
      const dt = Math.min((now - lastTime) / 1000, 0.08);
      lastTime = now;

      updateGame(dt);
      render();
      updateHUDDisplay();
    } else {
      lastTime = now;
    }

    animId = requestAnimationFrame(gameLoop);
  }

  function updateHUDDisplay() {
    const scoreEl = document.getElementById('hudScoreText');
    if (scoreEl) {
      scoreEl.textContent = `${scorePlayer}  -  ${scoreCPU}`;
    }

    const timerEl = document.getElementById('hudTimerText');
    if (timerEl) {
      const totalSec = Math.max(0, Math.floor(matchTime));
      const min = Math.floor(totalSec / 60).toString().padStart(2, '0');
      const sec = (totalSec % 60).toString().padStart(2, '0');
      timerEl.textContent = `${min}:${sec}`;
    }
  }

  // ── KONTROLER ARCADE BULAT (TOMBOL FISIK GAME CONSOLE) ──────
  function setupArcadeControls() {
    // 1. D-Pad Bulat Kiri (Arah)
    const bindBtn = (id, onStart, onEnd) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const start = (e) => { e.preventDefault(); initAudio(); onStart(); };
      const end = (e) => { e.preventDefault(); onEnd(); };
      btn.addEventListener('mousedown', start);
      btn.addEventListener('mouseup', end);
      btn.addEventListener('mouseleave', end);
      btn.addEventListener('touchstart', start, { passive: false });
      btn.addEventListener('touchend', end, { passive: false });
    };

    bindBtn('arcLeft',  () => input.left = true,  () => input.left = false);
    bindBtn('arcRight', () => input.right = true, () => input.right = false);
    bindBtn('arcUp',    () => input.up = true,    () => input.up = false);
    bindBtn('arcDown',  () => input.down = true,  () => input.down = false);

    // 2. Tombol Aksi Bulat Kanan
    bindBtn('arcShoot', () => { input.shoot = true; executeShoot(); }, () => input.shoot = false);
    bindBtn('arcPass',  () => { input.pass = true; executePass(); },   () => input.pass = false);
    bindBtn('arcSprint',() => input.sprint = true,                     () => input.sprint = false);

    // 3. Tombol Reset Skor & Audio
    const btnSound = document.getElementById('arcSound');
    if (btnSound) {
      btnSound.addEventListener('click', () => {
        initAudio();
        soundEnabled = !soundEnabled;
        btnSound.textContent = soundEnabled ? '🔊' : '🔇';
      });
    }

    const btnReset = document.getElementById('arcReset');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        scorePlayer = 0;
        scoreCPU = 0;
        matchTime = 90 * 60;
        resetKickoff();
        playRetroSound('whistle');
      });
    }
  }

  // Load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
  } else {
    initGame();
  }

})();
