// ============================================================
//  js/retro-bg.js — REAL RETRO MOBA SOCCER STADIUM ENGINE
//  Fixed Timestep 60FPS · Smooth Lerp Velocity & Dribble
//  Aspect-Ratio Preserved Display (Mobile/Tablet/Laptop)
//  Dynamic Floating 360° Joystick & Glassmorphic MOBA Skills
// ============================================================

(function () {
  'use strict';

  // Resolusi virtual retro arcade (640x360) — proporsi 16:9 stadion klasik
  const V_WIDTH = 640;
  const V_HEIGHT = 360;

  // Batas area lapangan hijau
  const PITCH_TOP = 64;
  const PITCH_BOTTOM = 336;
  const PITCH_LEFT = 38;
  const PITCH_RIGHT = 602;

  // Dimensi gawang kiri dan kanan
  const GOAL_Y_TOP = 145;
  const GOAL_Y_BOTTOM = 255;
  const GOAL_DEPTH = 32;

  let canvas = null;
  let ctx = null;
  let animId = null;
  let isPaused = false;
  let lastTime = 0;
  let accumulator = 0;
  const FIXED_STEP = 1 / 60; // 60 FPS deterministic physics

  // Skor & Timer Pertandingan
  let scorePlayer = 0; // Dangerous Boys (BJR-18)
  let scoreCPU = 0;    // Banjar Rival FC
  let matchTime = 90 * 60; // 90 menit virtual
  let goalCelebrationTimer = 0;
  let goalScorer = ''; // 'player' | 'cpu'
  let goalParticles = [];

  // Vektor Gerak MOBA Bebas 360°
  const joystickVector = { x: 0, y: 0, active: false };
  const tapTarget = { x: 0, y: 0, active: false };

  // Status Tombol Skill
  const input = {
    left: false,
    right: false,
    up: false,
    down: false,
  };

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
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'dash') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(640, now + 0.12);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'goal') {
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
        osc.type = 'square';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.setValueAtTime(1800, now + 0.08);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'save') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      }
    } catch {
      // Audio fallback
    }
  }

  // ── PALET PIXEL RETRO ─────────────────────────────────────────
  const PALETTE = {
    '.': null,
    'K': '#181512',
    'W': '#ffffff',
    'P': '#fdcca0',
    'G': '#c27827',
    'R': '#d63220',
    'B': '#1d4ed8',
    'Y': '#facc15',
    'O': '#78350f',
    'L': '#15803d',
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

  // ── SPRITES PIXEL ART (4-STAGE SMOOTH RUN CYCLE) ─────────────

  // Dangerous Boys (Jersey Emas BJR-18)
  const SPRITE_P1_STAND = [
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

  const SPRITE_P1_RUN_L = [
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

  const SPRITE_P1_RUN_R = [
    "...OOOOOO...",
    "...PPPPPP...",
    "...P.K.KP...",
    "...PPPPPP...",
    "...GGGGGG...",
    "..GGKKKKGG..",
    "..GGGGGGGG..",
    "...GGGGGG...",
    "...KK.KK....",
    "..KK...KK...",
    ".RR.....RR..",
    "RR......RR..",
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

  // Lawan (Jersey Biru Banjar Rival FC)
  const SPRITE_OPP_STAND = [
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

  const SPRITE_OPP_RUN_L = [
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

  const SPRITE_OPP_RUN_R = [
    "...KKKKKK...",
    "...PPPPPP...",
    "...P.K.KP...",
    "...PPPPPP...",
    "...BBBBBB...",
    "..BBWWWWBB..",
    "..BBBBBBBB..",
    "...BBBBBB...",
    "...WW.WW....",
    "..WW...WW...",
    ".KK.....KK..",
    "KK......KK..",
  ];

  // Kiper (Jersey Hijau Terang)
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

  // Bola Sepak 8x8
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

  // ── ENTITAS LAPANGAN ─────────────────────────────────────────
  const ball = {
    x: V_WIDTH / 2,
    y: (PITCH_TOP + PITCH_BOTTOM) / 2,
    z: 0,
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

  const player = {
    x: 220,
    y: 200,
    vx: 0,
    vy: 0,
    baseSpeed: 2.7,
    facing: 1,
    state: 'idle',
    animPhase: 0,
    kickTimer: 0,
    dashTimer: 0,
  };

  const teammate = {
    x: 180,
    y: 130,
    vx: 0,
    vy: 0,
    speed: 1.8,
    facing: 1,
    animPhase: 0,
  };

  const opponent = {
    x: 420,
    y: 200,
    vx: 0,
    vy: 0,
    speed: 1.8,
    facing: -1,
    animPhase: 0,
  };

  const goalieRight = {
    x: 590,
    y: 200,
    vy: 1.2,
    minY: GOAL_Y_TOP + 10,
    maxY: GOAL_Y_BOTTOM - 10,
  };

  const goalieLeft = {
    x: 46,
    y: 200,
    vy: 1.0,
    minY: GOAL_Y_TOP + 10,
    maxY: GOAL_Y_BOTTOM - 10,
  };

  // ── INISIALISASI ENGINE ─────────────────────────────────────
  function initGame() {
    canvas = document.getElementById('soccerGameCanvas');
    if (!canvas) return;

    ctx = canvas.getContext('2d', { alpha: false });
    canvas.width = V_WIDTH;
    canvas.height = V_HEIGHT;
    ctx.imageSmoothingEnabled = false;

    // Pasang MOBA Virtual Joystick & Action Buttons
    setupMobaJoystick();
    setupMobaActionButtons();
    setupPitchDirectTouch();

    // Event Keyboard
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Resize
    window.addEventListener('resize', handleCanvasResize);
    handleCanvasResize();

    // Game loop
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

  // ── HITUNG KOORDINAT SENTUH PADA CANVAS (LETTERBOX AWARE) ────
  function getCanvasCoords(clientX, clientY) {
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const canvasAspect = V_WIDTH / V_HEIGHT;
    const rectAspect = rect.width / rect.height;

    let renderWidth, renderHeight, offsetX, offsetY;
    if (rectAspect > canvasAspect) {
      renderHeight = rect.height;
      renderWidth = renderHeight * canvasAspect;
      offsetX = (rect.width - renderWidth) / 2;
      offsetY = 0;
    } else {
      renderWidth = rect.width;
      renderHeight = renderWidth / canvasAspect;
      offsetX = 0;
      offsetY = (rect.height - renderHeight) / 2;
    }

    const scale = V_WIDTH / renderWidth;
    const x = (clientX - (rect.left + offsetX)) * scale;
    const y = (clientY - (rect.top + offsetY)) * scale;
    return { x, y };
  }

  // ── DYNAMIC FLOATING MOBA JOYSTICK (MUNCUL OTOMATIS DI MANA PUN KURSOR DITARUH) ──
  function setupMobaJoystick() {
    const arena = document.getElementById('retro-game');
    const base = document.getElementById('mobaJoyBase');
    const knob = document.getElementById('mobaJoyKnob');
    if (!arena || !base || !knob) return;

    const MAX_DIST = 38;
    let activePointerId = null;
    let originX = 0;
    let originY = 0;

    function updateJoystickPosition(clientX, clientY) {
      const dx = clientX - originX;
      const dy = clientY - originY;
      const distance = Math.hypot(dx, dy);

      const angle = Math.atan2(dy, dx);
      const clampedDist = Math.min(distance, MAX_DIST);

      const knobX = Math.cos(angle) * clampedDist;
      const knobY = Math.sin(angle) * clampedDist;

      knob.style.transform = `translate(${knobX}px, ${knobY}px)`;

      // Normalisasi vektor dengan deadzone halus
      const intensity = clampedDist / MAX_DIST;
      if (intensity > 0.08) {
        joystickVector.x = Math.cos(angle) * intensity;
        joystickVector.y = Math.sin(angle) * intensity;
        joystickVector.active = true;
      } else {
        joystickVector.x = 0;
        joystickVector.y = 0;
        joystickVector.active = false;
      }
      tapTarget.active = false;
    }

    arena.addEventListener('pointerdown', (e) => {
      // Abaikan bila menekan tombol aksi kanan atau HUD mini
      if (e.target.closest('.moba-action-cluster') || e.target.closest('.arcade-hud-mini')) return;

      initAudio();
      activePointerId = e.pointerId;
      try { arena.setPointerCapture(e.pointerId); } catch {}

      const arenaRect = arena.getBoundingClientRect();
      const posX = e.clientX - arenaRect.left;
      const posY = e.clientY - arenaRect.top;

      originX = e.clientX;
      originY = e.clientY;

      base.style.left = `${posX}px`;
      base.style.top = `${posY}px`;
      base.classList.add('active');

      knob.style.transform = 'translate(0px, 0px)';
      joystickVector.x = 0;
      joystickVector.y = 0;
      joystickVector.active = true;
    });

    arena.addEventListener('pointermove', (e) => {
      if (activePointerId === e.pointerId) {
        e.preventDefault();
        updateJoystickPosition(e.clientX, e.clientY);
      }
    });

    const releaseJoystick = (e) => {
      if (activePointerId === e.pointerId) {
        activePointerId = null;
        knob.style.transform = 'translate(0px, 0px)';
        base.classList.remove('active');
        joystickVector.x = 0;
        joystickVector.y = 0;
        joystickVector.active = false;
      }
    };

    arena.addEventListener('pointerup', releaseJoystick);
    arena.addEventListener('pointercancel', releaseJoystick);
  }

  // ── DIRECT TOUCH / TAP TO MOVE PADA LAPANGAN ─────────────────
  function setupPitchDirectTouch() {
    if (!canvas) return;

    canvas.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.moba-action-cluster') || e.target.closest('.arcade-hud-mini')) return;

      const coords = getCanvasCoords(e.clientX, e.clientY);
      if (coords.y >= PITCH_TOP && coords.y <= PITCH_BOTTOM && coords.x >= PITCH_LEFT && coords.x <= PITCH_RIGHT) {
        initAudio();
        tapTarget.x = coords.x;
        tapTarget.y = coords.y;
        tapTarget.active = true;
      }
    });
  }

  // ── TOMBOL AKSI SKILL MOBA (RIGHT CLUSTER) ───────────────────
  function setupMobaActionButtons() {
    const bindAction = (id, onTrigger) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const act = (e) => {
        e.preventDefault();
        e.stopPropagation();
        initAudio();
        onTrigger();
      };
      btn.addEventListener('pointerdown', act);
    };

    bindAction('mobaShoot', executeShoot);
    bindAction('mobaPass', executePass);
    bindAction('mobaDash', executeDash);

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

  // ── AKSI TEMBAKAN, UMPAN, & DASH ─────────────────────────────
  function executeShoot() {
    const dist = Math.hypot(player.x + 8 - ball.x, player.y + 12 - ball.y);
    if (dist < 32) {
      player.state = 'kick';
      player.kickTimer = 0.25;

      const targetGoalX = PITCH_RIGHT + 14;
      const targetGoalY = GOAL_Y_TOP + (GOAL_Y_BOTTOM - GOAL_Y_TOP) * (0.2 + Math.random() * 0.6);
      const angle = Math.atan2(targetGoalY - ball.y, targetGoalX - ball.x);

      const power = player.dashTimer > 0 ? 7.6 : 6.0;
      ball.vx = Math.cos(angle) * power;
      ball.vy = Math.sin(angle) * power * 0.65;
      ball.vz = 3.6 + Math.random() * 1.8;

      playRetroSound('shoot');
    }
  }

  function executePass() {
    const dist = Math.hypot(player.x + 8 - ball.x, player.y + 12 - ball.y);
    if (dist < 32) {
      player.state = 'kick';
      player.kickTimer = 0.2;

      const angle = Math.atan2(teammate.y - ball.y, teammate.x - ball.x);
      const power = 4.6;
      ball.vx = Math.cos(angle) * power;
      ball.vy = Math.sin(angle) * power;
      ball.vz = 0.6;

      playRetroSound('kick');
    }
  }

  function executeDash() {
    if (player.dashTimer <= 0) {
      player.dashTimer = 0.45;
      playRetroSound('dash');
    }
  }

  function handleKeyDown(e) {
    initAudio();
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = true;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') input.up = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') input.down = true;

    if (e.code === 'Space' || e.code === 'KeyK') executeShoot();
    if (e.code === 'KeyJ' || e.code === 'KeyX') executePass();
    if (e.code === 'ShiftLeft' || e.code === 'KeyL') executeDash();
  }

  function handleKeyUp(e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') input.up = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') input.down = false;
  }

  // ── UPDATE FISIKA DENGAN LERP PERMULUSAN (60 FPS FIXED) ──────
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

    if (goalCelebrationTimer > 0) {
      goalCelebrationTimer -= dt;
      if (goalCelebrationTimer <= 0) resetKickoff();
      return;
    }

    if (matchTime > 0) matchTime -= dt * 25;

    // 2. Kecepatan dan Status Dash (Skill Sprint)
    let maxSpeed = player.baseSpeed;
    if (player.dashTimer > 0) {
      player.dashTimer -= dt;
      maxSpeed = player.baseSpeed * 1.85;
    }

    // 3. TARGET VELOCITY DARI MOBA JOYSTICK / TAP / KEYBOARD
    let targetVx = 0;
    let targetVy = 0;

    if (joystickVector.active) {
      targetVx = joystickVector.x * maxSpeed;
      targetVy = joystickVector.y * maxSpeed * 0.8;
      if (Math.abs(joystickVector.x) > 0.08) {
        player.facing = joystickVector.x > 0 ? 1 : -1;
      }
    } else if (tapTarget.active) {
      const dx = tapTarget.x - (player.x + 8);
      const dy = tapTarget.y - (player.y + 12);
      const dist = Math.hypot(dx, dy);
      if (dist > 8) {
        targetVx = (dx / dist) * maxSpeed;
        targetVy = (dy / dist) * maxSpeed * 0.8;
        player.facing = dx > 0 ? 1 : -1;
      } else {
        tapTarget.active = false;
      }
    } else {
      let kx = 0;
      let ky = 0;
      if (input.left) kx -= 1;
      if (input.right) kx += 1;
      if (input.up) ky -= 1;
      if (input.down) ky += 1;

      if (kx !== 0 || ky !== 0) {
        const len = Math.hypot(kx, ky);
        targetVx = (kx / len) * maxSpeed;
        targetVy = (ky / len) * maxSpeed * 0.8;
        if (kx !== 0) player.facing = kx > 0 ? 1 : -1;
      }
    }

    // ── LERP PERMULUSAN INERSIA GERAK PEMAIN (ACCELERATION & DECELERATION) ──
    const accel = 0.24; // Akselerasi halus
    player.vx += (targetVx - player.vx) * accel;
    player.vy += (targetVy - player.vy) * accel;

    player.x += player.vx * 60 * dt;
    player.y += player.vy * 60 * dt;

    // Batas area lapangan
    player.x = Math.max(PITCH_LEFT + 8, Math.min(PITCH_RIGHT - 24, player.x));
    player.y = Math.max(PITCH_TOP + 4, Math.min(PITCH_BOTTOM - 24, player.y));

    // Animasi langkah kaki mulus (4 tahap berulang secara ritmis)
    const currentSpeedMag = Math.hypot(player.vx, player.vy);
    if (currentSpeedMag > 0.2) {
      player.animPhase += currentSpeedMag * dt * 3.8;
    } else {
      player.animPhase = 0;
    }

    if (player.kickTimer > 0) {
      player.kickTimer -= dt;
      if (player.kickTimer <= 0) player.state = 'idle';
    }

    // 4. AI Teman Setim (Dangerous Boys No. 7) — Gerak Halus
    const targetTeammateX = player.x + 88;
    const targetTeammateY = player.y > (PITCH_TOP + PITCH_BOTTOM) / 2 ? player.y - 70 : player.y + 70;
    teammate.vx += (Math.sign(targetTeammateX - teammate.x) * teammate.speed - teammate.vx) * 0.12;
    teammate.vy += (Math.sign(targetTeammateY - teammate.y) * teammate.speed * 0.6 - teammate.vy) * 0.12;

    teammate.x += teammate.vx * 60 * dt;
    teammate.y += teammate.vy * 60 * dt;
    teammate.x = Math.max(PITCH_LEFT + 24, Math.min(PITCH_RIGHT - 70, teammate.x));
    teammate.y = Math.max(PITCH_TOP + 10, Math.min(PITCH_BOTTOM - 26, teammate.y));
    teammate.animPhase += Math.hypot(teammate.vx, teammate.vy) * dt * 3.5;

    // 5. AI Bek Lawan (Banjar Rival FC No. 4) — Smooth Pursuit
    const targetDefX = ball.x > V_WIDTH / 2 ? ball.x + 14 : V_WIDTH / 2 + 70;
    const targetDefY = ball.y;
    const angleDef = Math.atan2(targetDefY - opponent.y, targetDefX - opponent.x);
    const oppTargetVx = Math.cos(angleDef) * opponent.speed;
    const oppTargetVy = Math.sin(angleDef) * opponent.speed * 0.7;

    opponent.vx += (oppTargetVx - opponent.vx) * 0.15;
    opponent.vy += (oppTargetVy - opponent.vy) * 0.15;

    opponent.x += opponent.vx * 60 * dt;
    opponent.y += opponent.vy * 60 * dt;
    opponent.facing = opponent.vx > 0 ? 1 : -1;
    opponent.animPhase += Math.hypot(opponent.vx, opponent.vy) * dt * 3.5;

    // Tackle Bek Lawan
    const distOppBall = Math.hypot(opponent.x + 8 - ball.x, opponent.y + 12 - ball.y);
    if (distOppBall < 18) {
      ball.vx = -(4.2 + Math.random() * 1.6);
      ball.vy = (Math.random() - 0.5) * 3.0;
      ball.vz = 2.2;
      playRetroSound('kick');
    }

    // 6. AI Kiper Lawan (Gawang Kanan) — Smooth Glide
    const targetGkY = Math.max(GOAL_Y_TOP + 12, Math.min(GOAL_Y_BOTTOM - 12, ball.y));
    goalieRight.vy += (Math.sign(targetGkY - goalieRight.y) * 1.4 - goalieRight.vy) * 0.18;
    goalieRight.y += goalieRight.vy * 60 * dt;

    if (
      ball.x >= PITCH_RIGHT - 24 &&
      ball.x <= PITCH_RIGHT + 6 &&
      ball.y >= GOAL_Y_TOP - 10 &&
      ball.y <= GOAL_Y_BOTTOM + 10 &&
      Math.abs(ball.y - (goalieRight.y + 12)) < 30
    ) {
      ball.vx = -(4.0 + Math.random() * 1.5);
      ball.vy = (Math.random() - 0.5) * 4;
      ball.vz = 2.4;
      playRetroSound('save');
    }

    // 7. AI Kiper Dangerous Boys (Gawang Kiri)
    const targetGkLeftY = Math.max(GOAL_Y_TOP + 12, Math.min(GOAL_Y_BOTTOM - 12, ball.y));
    goalieLeft.vy += (Math.sign(targetGkLeftY - goalieLeft.y) * 1.2 - goalieLeft.vy) * 0.18;
    goalieLeft.y += goalieLeft.vy * 60 * dt;

    if (
      ball.x <= PITCH_LEFT + 24 &&
      ball.x >= PITCH_LEFT - 6 &&
      Math.abs(ball.y - (goalieLeft.y + 12)) < 30
    ) {
      ball.vx = 4.0 + Math.random() * 1.5;
      ball.vy = (Math.random() - 0.5) * 4;
      ball.vz = 2.2;
      playRetroSound('save');
    }

    // ── 8. FISIKA BOLA & DRIBBLE MAGNETIK HALUS ─────────────────
    ball.x += ball.vx * 60 * dt;
    ball.y += ball.vy * 60 * dt;

    if (ball.z > 0 || ball.vz !== 0) {
      ball.vz -= 9.8 * dt * 1.2;
      ball.z += ball.vz * 60 * dt;
      if (ball.z <= 0) {
        ball.z = 0;
        ball.vz = -ball.vz * 0.55;
        if (Math.abs(ball.vz) < 0.4) ball.vz = 0;
      }
    }

    ball.vx *= 0.985;
    ball.vy *= 0.985;
    ball.rotation += (Math.hypot(ball.vx, ball.vy) * 0.15 * Math.sign(ball.vx || 1));

    // Kontrol Dribble Magnetik Mulus (Bola menempel halus di kaki pemain)
    const distP1Ball = Math.hypot(player.x + 8 - ball.x, player.y + 12 - ball.y);
    if (distP1Ball < 22 && ball.z < 6 && player.kickTimer <= 0) {
      const targetBallX = player.x + 8 + player.facing * 12;
      const targetBallY = player.y + 18;
      // Interpolasi mulus mendekat ke ujung sepatu
      ball.x += (targetBallX - ball.x) * 0.28;
      ball.y += (targetBallY - ball.y) * 0.28;
      ball.vx = player.vx * 1.05;
      ball.vy = player.vy * 1.05;
    }

    // ── 9. DETEKSI GOL 2 GAWANG ──────────────────────────────────
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

    // Pantulan tiang
    if (ball.y < PITCH_TOP + 4) {
      ball.y = PITCH_TOP + 4;
      ball.vy = Math.abs(ball.vy) * 0.8;
    } else if (ball.y > PITCH_BOTTOM - 4) {
      ball.y = PITCH_BOTTOM - 4;
      ball.vy = -Math.abs(ball.vy) * 0.8;
    }

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
    playRetroSound('whistle');
    setTimeout(() => playRetroSound('goal'), 200);

    if (team === 'player') player.state = 'celebrate';

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
    player.vx = 0;
    player.vy = 0;
    player.state = 'idle';
    teammate.x = 180;
    teammate.y = 130;
    opponent.x = 420;
    opponent.y = 200;
  }

  // ── RENDER STADION SEPAK BOLA ────────────────────────────────
  function render() {
    renderStadiumGrandstand();
    renderGrassPitch();
    renderPitchMarkings();
    renderGoalNets();

    // Kiper
    drawPixelMatrix(ctx, SPRITE_GK, goalieLeft.x, goalieLeft.y, 2, false);
    drawPixelMatrix(ctx, SPRITE_GK, goalieRight.x, goalieRight.y, 2, true);

    // AI Lawan (Animasi 4 Langkah Halus)
    const oppCycle = Math.floor(opponent.animPhase) % 4;
    let oppSprite = SPRITE_OPP_STAND;
    if (oppCycle === 1) oppSprite = SPRITE_OPP_RUN_L;
    if (oppCycle === 3) oppSprite = SPRITE_OPP_RUN_R;
    drawPixelMatrix(ctx, oppSprite, opponent.x, opponent.y, 2, opponent.facing === -1);

    // Teman Setim
    const tmCycle = Math.floor(teammate.animPhase) % 4;
    let tmSprite = SPRITE_P1_STAND;
    if (tmCycle === 1) tmSprite = SPRITE_P1_RUN_L;
    if (tmCycle === 3) tmSprite = SPRITE_P1_RUN_R;
    drawPixelMatrix(ctx, tmSprite, teammate.x, teammate.y, 2, false);

    // Pemain Anda (BJR-18 Dangerous Boys) — 4-Stage Animation
    let pSprite = SPRITE_P1_STAND;
    if (player.state === 'kick') {
      pSprite = SPRITE_P1_KICK;
    } else if (player.state === 'celebrate') {
      pSprite = SPRITE_P1_CELEBRATE;
    } else {
      const pCycle = Math.floor(player.animPhase) % 4;
      if (pCycle === 1) pSprite = SPRITE_P1_RUN_L;
      if (pCycle === 3) pSprite = SPRITE_P1_RUN_R;
    }
    drawPixelMatrix(ctx, pSprite, player.x, player.y, 2, player.facing === -1);

    // Indikator Hero MOBA di atas kepala
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 8px monospace';
    ctx.fillText('▼ BJR·10', player.x - 2, player.y - 6);

    // Lingkaran Aura Hero MOBA di kaki
    ctx.strokeStyle = player.dashTimer > 0 ? '#38bdf8' : 'rgba(250, 204, 21, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(player.x + 8, player.y + 24, 12, 5, 0, 0, Math.PI * 2);
    ctx.stroke();

    renderSoccerBall();

    // Partikel Gol
    goalParticles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 3, 3);
    });

    if (goalCelebrationTimer > 0) {
      renderGoalCelebrationBanner();
    }
  }

  function renderStadiumGrandstand() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, V_WIDTH, PITCH_TOP);

    const crowdColors = ['#dc2626', '#2563eb', '#f59e0b', '#ffffff', '#10b981', '#7c3aed'];
    for (let row = 0; row < 3; row++) {
      const y = 8 + row * 15;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, y + 10, V_WIDTH, 4);

      for (let x = 8; x < V_WIDTH - 8; x += 12) {
        const color = crowdColors[(x + row * 7) % crowdColors.length];
        ctx.fillStyle = color;
        ctx.fillRect(x, y + 2, 8, 8);
        ctx.fillStyle = '#fdcca0';
        ctx.fillRect(x + 2, y, 4, 3);
      }
    }

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, PITCH_TOP - 14, V_WIDTH, 14);
    ctx.strokeStyle = '#c27827';
    ctx.strokeRect(0, PITCH_TOP - 14, V_WIDTH, 14);

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 8px monospace';
    ctx.fillText('★ DANGEROUS BOYS STADIUM BANJAR CITY · SEJAK 2018 · PERSAHABATAN ABADI ★', 80, PITCH_TOP - 4);
  }

  function renderGrassPitch() {
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

    ctx.strokeRect(PITCH_LEFT, PITCH_TOP, PITCH_RIGHT - PITCH_LEFT, PITCH_BOTTOM - PITCH_TOP);

    const midX = V_WIDTH / 2;
    ctx.beginPath();
    ctx.moveTo(midX, PITCH_TOP);
    ctx.lineTo(midX, PITCH_BOTTOM);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(midX, (PITCH_TOP + PITCH_BOTTOM) / 2, 48, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(midX, (PITCH_TOP + PITCH_BOTTOM) / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeRect(PITCH_LEFT, 115, 84, 170);
    ctx.strokeRect(PITCH_LEFT, 145, 32, 110);

    ctx.strokeRect(PITCH_RIGHT - 84, 115, 84, 170);
    ctx.strokeRect(PITCH_RIGHT - 32, 145, 32, 110);
  }

  function renderGoalNets() {
    draw3DGoal(PITCH_LEFT - GOAL_DEPTH, GOAL_Y_TOP, GOAL_DEPTH, GOAL_Y_BOTTOM - GOAL_Y_TOP, 'left');
    draw3DGoal(PITCH_RIGHT, GOAL_Y_TOP, GOAL_DEPTH, GOAL_Y_BOTTOM - GOAL_Y_TOP, 'right');
  }

  function draw3DGoal(x, y, w, h, side) {
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

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = side === 'left' ? '#facc15' : '#ef4444';
    ctx.font = 'bold 7px monospace';
    const tagText = side === 'left' ? 'BJR-18' : 'RIVAL';
    ctx.fillText(tagText, x + 2, y - 4);
  }

  function renderSoccerBall() {
    const shadowSize = Math.max(3, 7 - ball.z * 0.12);
    ctx.fillStyle = 'rgba(10, 15, 10, 0.35)';
    ctx.beginPath();
    ctx.ellipse(ball.x, ball.y, shadowSize, shadowSize * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

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

  // ── FIXED TIMESTEP 60FPS ACCUMULATOR GAME LOOP (ZERO STUTTER) ──
  function gameLoop(now) {
    if (!lastTime) lastTime = now;
    let elapsed = (now - lastTime) / 1000;
    lastTime = now;

    if (elapsed > 0.1) elapsed = 0.1; // Clamp lag spikes

    if (!isPaused) {
      accumulator += elapsed;
      while (accumulator >= FIXED_STEP) {
        updateGame(FIXED_STEP);
        accumulator -= FIXED_STEP;
      }
      render();
      updateHUDDisplay();
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

  // Load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
  } else {
    initGame();
  }

})();
