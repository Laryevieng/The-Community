// ============================================================
//  js/retro-bg.js — Game Retro Sepak Bola & Mario Interaktif
//  Dua Gawang · Cetak Gol · Kendali Keyboard & Touch · 60 FPS
// ============================================================

(function () {
  'use strict';

  // Resolusi virtual internal kecil (480x270) untuk performa 60 FPS tanpa beban CPU
  const V_WIDTH = 480;
  const V_HEIGHT = 270;

  let canvas = null;
  let ctx = null;
  let animId = null;
  let isPaused = false;
  let isPlayMode = true; // Mode interaktif dimainkan pengguna
  let currentMode = 'soccer'; // 'soccer' atau 'mario'

  // Waktu frame
  let lastTime = 0;

  // Skor Pertandingan
  let scorePlayer = 0; // Dangerous Boys (BJR-18)
  let scoreCPU = 0;    // Tim Lawan (RIVAL)
  let goalCelebrationTimer = 0;
  let goalScorer = ''; // 'player' atau 'cpu'
  let goalParticles = [];

  // Audio Sintesis Retro (Web Audio API - 0 Berkas Eksternal, 0 Lag)
  let audioCtx = null;
  let soundEnabled = true;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
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
        // Suara tendangan bola thud
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'goal') {
        // Nada perayaan gol retro (Arpeggio C-E-G-C)
        const notes = [261.63, 329.63, 392.00, 523.25];
        notes.forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'square';
          o.frequency.setValueAtTime(freq, now + idx * 0.1);
          g.gain.setValueAtTime(0.2, now + idx * 0.1);
          g.gain.linearRampToValueAtTime(0.01, now + (idx + 1) * 0.1);
          o.connect(g);
          g.connect(audioCtx.destination);
          o.start(now + idx * 0.1);
          o.stop(now + (idx + 1) * 0.1);
        });
      } else if (type === 'jump') {
        // Nada lompatan retro Mario/pemain
        osc.type = 'square';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(460, now + 0.12);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      }
    } catch {
      // Abaikan bila audio dicegah autoplay browser
    }
  }

  // ── PALET PIXEL RETRO ─────────────────────────────────────────
  const PALETTE = {
    '.': null,
    'K': '#181512', // Hitam Karbon
    'W': '#ffffff', // Putih
    'P': '#fdcca0', // Kulit Peach
    'G': '#c27827', // Emas Jersey Dangerous Boys
    'R': '#d63220', // Merah Retro
    'B': '#2255cc', // Biru Retro
    'Y': '#f7b500', // Kuning Koin
    'O': '#6b533a', // Cokelat
    'L': '#48a048', // Hijau Lapangan
    'M': '#e09840', // Amber
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

  // ── MATRIKS SPRITE BITMAP ────────────────────────────────────

  // Pemain 1: Dangerous Boys (Jersey Emas BJR-18)
  const SPRITE_P1_RUN_1 = [
    "....KKKKK....",
    "...KKKKKKK...",
    "...PPPPPPP...",
    "...P.K.K.P...",
    "...PPPPPPP...",
    "....GGGGG....",
    "...GGGGGGG...",
    "...GKKKKKG...",
    "...GGGGGGG...",
    "....KK.KK....",
    "....KK.KK....",
    "...RR...RR...",
    "...RR...RR...",
  ];

  const SPRITE_P1_RUN_2 = [
    "....KKKKK....",
    "...KKKKKKK...",
    "...PPPPPPP...",
    "...P.K.K.P...",
    "...PPPPPPP...",
    "....GGGGG....",
    "...GGGGGGG...",
    "...GKKKKKG...",
    "...GGGGGGG...",
    ".....KK.KK...",
    "....KK...KK..",
    "...RR.....RR.",
    "...RR......RR",
  ];

  const SPRITE_P1_KICK = [
    "....KKKKK....",
    "...KKKKKKK...",
    "...PPPPPPP...",
    "...P.K.K.P...",
    "...PPPPPPP...",
    "....GGGGG....",
    "...GGGGGGGG..",
    "...GKKKKKG...",
    "....GGGGG....",
    "....KK..KK...",
    "....KK...KKK.",
    "...RR.....RRR",
  ];

  const SPRITE_P1_CELEBRATE = [
    ".RR.....RR...",
    ".RR.KKK.RR...",
    "..KKKKKKK....",
    "...PPPPPPP...",
    "...P.K.K.P...",
    "...PPPPPPP...",
    "....GGGGG....",
    "...GGGGGGG...",
    "...GKKKKKG...",
    "....GGGGG....",
    "....KK.KK....",
    "....KK.KK....",
    "...RR...RR...",
  ];

  // Pemain 2: Lawan Lapangan (Jersey Putih/Biru)
  const SPRITE_P2_RUN_1 = [
    "....OOOOO....",
    "...OOOOOOO...",
    "...PPPPPPP...",
    "...P.K.K.P...",
    "...PPPPPPP...",
    "....WWWWW....",
    "...WWWWWWW...",
    "...WBBBBBW...",
    "...WWWWWWW...",
    "....BB.BB....",
    "....BB.BB....",
    "...KK...KK...",
    "...KK...KK...",
  ];

  const SPRITE_P2_RUN_2 = [
    "....OOOOO....",
    "...OOOOOOO...",
    "...PPPPPPP...",
    "...P.K.K.P...",
    "...PPPPPPP...",
    "....WWWWW....",
    "...WWWWWWW...",
    "...WBBBBBW...",
    "...WWWWWWW...",
    ".....BB.BB...",
    "....BB...BB..",
    "...KK.....KK.",
    "...KK......KK",
  ];

  // Kiper Lawan (Kuningan/Hijau)
  const SPRITE_GK = [
    "....KKKKK....",
    "...KKKKKKK...",
    "...PPPPPPP...",
    "...P.K.K.P...",
    "...PPPPPPP...",
    "....LLLLL....",
    "..LLLLLLLLL..",
    "..LLKKKKKLL..",
    "..LLLLLLLLL..",
    "....KK.KK....",
    "...KKK.KKK...",
    "...YY...YY...",
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

  // Mario Bros 8-Bit
  const SPRITE_MARIO_STAND = [
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

  const SPRITE_MARIO_RUN = [
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

  const SPRITE_MARIO_JUMP = [
    "....RRRRR....",
    "...RRRRRRRRR.",
    "...OORRPPO...",
    "..OPOOPPPO...",
    "..OPOOOPPPO..",
    "..OOPPPPPOO..",
    "....PPPPPPP..",
    ".PPRRBRRR....",
    ".PPRRBRRRBR..",
    ".RRRRBBBBRRR.",
    "...RBBYBBRRP.",
    "...BBBBBB....",
    "..OOO..OOO...",
    ".OOOO...OOOO.",
  ];

  const SPRITE_BLOCK = [
    "YYYYYYYYYYYYY",
    "YOOOOOOOOOOOY",
    "YOKKYYYYYKOOY",
    "YOKKYKKYYKOOY",
    "YOKKYKKYYKOOY",
    "YOOOYYYKKKOOY",
    "YOOOYYKKKOOOY",
    "YOOOYYKKKOOOY",
    "YOOOOOOOOOOOY",
    "YOOOYYKKKOOOY",
    "YOOOYYKKKOOOY",
    "YOOOOOOOOOOOY",
    "YYYYYYYYYYYYY",
  ];

  // ── ENTITAS & KENDALI KEYBOARD ──────────────────────────────
  const keys = {
    left: false,
    right: false,
    jump: false,
    kick: false,
  };

  // Bola
  const ball = {
    x: 240,
    y: 220,
    vx: 0,
    vy: 0,
    groundY: 228,
    radius: 7,
    rotation: 0,
    reset() {
      this.x = 240;
      this.y = 210;
      this.vx = 0;
      this.vy = 0;
      this.rotation = 0;
    }
  };

  // Pemain 1 (Dangerous Boys / Pemain Anda)
  const player1 = {
    x: 120,
    y: 204,
    vx: 0,
    vy: 0,
    groundY: 204,
    isJumping: false,
    state: 'run',
    frame: 0,
    animTimer: 0,
    facing: 1,
    kickTimer: 0,
    celebrateTimer: 0,
  };

  // Pemain 2 (Lawan Bergerak / Bertahan)
  const player2 = {
    x: 320,
    y: 204,
    vx: 0,
    vy: 0,
    groundY: 204,
    isJumping: false,
    state: 'run',
    frame: 0,
    animTimer: 0,
    facing: -1,
    kickTimer: 0,
  };

  // Kiper Lawan (Menjaga Gawang Kanan)
  const goalkeeper = {
    x: 432,
    y: 204,
    vy: 0.8,
    minY: 196,
    maxY: 218,
    state: 'stand',
  };

  // Mario Bros
  const mario = {
    x: 60,
    y: 200,
    vx: 1.4,
    vy: 0,
    groundY: 200,
    isJumping: false,
    frame: 0,
    animTimer: 0,
    facing: 1,
  };

  const mysteryBlock = {
    x: 240,
    y: 130,
    bumpY: 0,
    coinY: 0,
    coinActive: false,
  };

  // ── INISIALISASI GAME ENGINE ────────────────────────────────
  function initGameEngine() {
    canvas = document.getElementById('retroCanvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'retroCanvas';
      document.body.prepend(canvas);
    }

    ctx = canvas.getContext('2d', { alpha: true });
    canvas.width = V_WIDTH;
    canvas.height = V_HEIGHT;
    ctx.imageSmoothingEnabled = false;

    // Pasang tombol kontroler on-screen untuk mobile dan desktop
    createRetroGameWidget();

    // Event listener keyboard
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Resize canvas
    window.addEventListener('resize', handleResize);
    handleResize();

    // Mulai animasi
    lastTime = performance.now();
    animId = requestAnimationFrame(gameLoop);
  }

  function handleResize() {
    if (canvas) {
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
    }
  }

  // ── PENANGANAN INPUT KEYBOARD ───────────────────────────────
  function handleKeyDown(e) {
    initAudio();

    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      keys.left = true;
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      keys.right = true;
    } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      keys.jump = true;
      executePlayerJump();
    } else if (e.code === 'Space' || e.code === 'KeyX' || e.code === 'Enter') {
      keys.kick = true;
      executePlayerKick();
    }
  }

  function handleKeyUp(e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.jump = false;
    if (e.code === 'Space' || e.code === 'KeyX' || e.code === 'Enter') keys.kick = false;
  }

  function executePlayerJump() {
    if (currentMode === 'soccer') {
      if (!player1.isJumping) {
        player1.vy = -4.8;
        player1.isJumping = true;
        playRetroSound('jump');
      }
    } else {
      if (!mario.isJumping) {
        mario.vy = -5.5;
        mario.isJumping = true;
        playRetroSound('jump');
      }
    }
  }

  function executePlayerKick() {
    if (currentMode !== 'soccer') return;

    player1.state = 'kick';
    player1.kickTimer = 0.22;

    // Cek jarak pemain ke bola untuk menendang
    const distToBall = Math.hypot(player1.x + 8 - ball.x, player1.y + 12 - ball.y);
    if (distToBall < 24) {
      // Tembakan kencang ke arah hadap pemain menuju gawang lawan
      const shootPowerX = player1.facing === 1 ? 4.5 + Math.random() * 1.5 : -4.5;
      const shootPowerY = player1.isJumping ? 1.5 : -(2.2 + Math.random() * 2.0); // Tendangan melambung atau menukik

      ball.vx = shootPowerX;
      ball.vy = shootPowerY;
      playRetroSound('kick');
    }
  }

  // ── UPDATE FISIKA PERTANDINGAN SEPAK BOLA ────────────────────
  function updateSoccer(dt) {
    // 1. Partikel Selebrasi Gol
    for (let i = goalParticles.length - 1; i >= 0; i--) {
      const p = goalParticles[i];
      p.x += p.vx * 60 * dt;
      p.y += p.vy * 60 * dt;
      p.vy += 4.0 * dt;
      p.life -= dt;
      if (p.life <= 0) goalParticles.splice(i, 1);
    }

    // Jeda selebrasi gol
    if (goalCelebrationTimer > 0) {
      goalCelebrationTimer -= dt;
      if (goalCelebrationTimer <= 0) {
        ball.reset();
        player1.x = 120;
        player1.y = player1.groundY;
        player2.x = 320;
        player2.y = player2.groundY;
      }
      return;
    }

    // 2. Kendali Pemain 1 (Pengguna / Dangerous Boys)
    if (isPlayMode) {
      if (keys.left) {
        player1.vx = -2.2;
        player1.facing = -1;
      } else if (keys.right) {
        player1.vx = 2.2;
        player1.facing = 1;
      } else {
        player1.vx = 0;
      }
    } else {
      // Mode otomatis bila pengguna tidak sedang menekan kontrol
      const dxToBall = (ball.x - 12) - player1.x;
      if (Math.abs(dxToBall) > 4) {
        player1.facing = dxToBall > 0 ? 1 : -1;
        player1.vx = Math.sign(dxToBall) * 1.6;
      } else {
        player1.vx = 0;
      }
    }

    // Lompatan & Gravitasi Pemain 1
    if (player1.isJumping) {
      player1.vy += 12 * dt;
      player1.y += player1.vy * 60 * dt;
      if (player1.y >= player1.groundY) {
        player1.y = player1.groundY;
        player1.vy = 0;
        player1.isJumping = false;
      }
    }

    player1.x += player1.vx * 60 * dt;
    player1.x = Math.max(34, Math.min(V_WIDTH - 44, player1.x)); // Batas gawang

    // Animasi langkah kaki
    if (Math.abs(player1.vx) > 0.1) {
      player1.animTimer += dt;
      if (player1.animTimer > 0.12) {
        player1.frame = (player1.frame + 1) % 2;
        player1.animTimer = 0;
      }
    }

    if (player1.kickTimer > 0) {
      player1.kickTimer -= dt;
      if (player1.kickTimer <= 0) player1.state = 'run';
    }

    // 3. AI Pemain 2 (Lawan Menghadang dan Mengoper)
    const target2X = ball.x + 12;
    const dx2 = target2X - player2.x;
    if (Math.abs(dx2) > 6) {
      player2.facing = dx2 > 0 ? 1 : -1;
      player2.x += Math.sign(dx2) * 1.5 * 60 * dt;
      player2.animTimer += dt;
      if (player2.animTimer > 0.14) {
        player2.frame = (player2.frame + 1) % 2;
        player2.animTimer = 0;
      }
    }

    // Tendangan AI Pemain 2 jika dekat bola
    if (Math.abs(player2.x - (ball.x + 4)) < 14 && Math.abs(player2.y - ball.y) < 20) {
      player2.state = 'kick';
      player2.kickTimer = 0.2;
      ball.vx = -(2.8 + Math.random() * 1.8);
      ball.vy = -(1.5 + Math.random() * 2.2);
      playRetroSound('kick');
    }

    if (player2.kickTimer > 0) {
      player2.kickTimer -= dt;
      if (player2.kickTimer <= 0) player2.state = 'run';
    }
    player2.x = Math.max(34, Math.min(V_WIDTH - 44, player2.x));

    // 4. AI Kiper Lawan (Menjaga Garis Gawang Kanan)
    goalkeeper.y += goalkeeper.vy * 60 * dt;
    if (goalkeeper.y >= goalkeeper.maxY || goalkeeper.y <= goalkeeper.minY) {
      goalkeeper.vy = -goalkeeper.vy;
    }

    // Blok Kiper saat bola mendekat ke gawang kanan
    if (ball.x >= 424 && ball.x <= 444 && Math.abs(ball.y - (goalkeeper.y + 12)) < 24) {
      ball.vx = -(3.2 + Math.random() * 1.2); // Tepis bola keluar
      ball.vy = (Math.random() - 0.5) * 3;
      playRetroSound('kick');
    }

    // 5. Fisika Gerak Bola
    ball.vy += 9.8 * dt * 1.4; // Gravitasi
    ball.x += ball.vx * 60 * dt;
    ball.y += ball.vy * 60 * dt;
    ball.rotation += ball.vx * dt * 6;

    // Gesekan & Pantulan Tanah
    if (ball.y >= ball.groundY) {
      ball.y = ball.groundY;
      ball.vy = -ball.vy * 0.65;
      ball.vx *= 0.985;
      if (Math.abs(ball.vy) < 0.2) ball.vy = 0;
    }

    // Kontak Dribble Otomatis Pemain 1
    const p1BallDist = Math.hypot(player1.x + 8 - ball.x, player1.y + 12 - ball.y);
    if (p1BallDist < 14 && player1.kickTimer <= 0) {
      // Dorong pelan bola ke depan mengikuti arah lari
      ball.vx = player1.facing * (Math.abs(player1.vx) + 0.6);
      if (ball.y >= ball.groundY - 4) ball.vy = -0.5;
    }

    // ── 6. DETEKSI GOL 2 GAWANG ──────────────────────────────────
    // Gawang Kanan (Gawang Lawan - Sasaran Dangerous Boys)
    if (ball.x >= 448 && ball.y >= 195 && ball.y <= 238) {
      scorePlayer++;
      triggerGoalCelebration('player');
      return;
    }

    // Gawang Kiri (Gawang Dangerous Boys)
    if (ball.x <= 28 && ball.y >= 195 && ball.y <= 238) {
      scoreCPU++;
      triggerGoalCelebration('cpu');
      return;
    }

    // Pantulan tiang / mistar gawang
    if (ball.x <= 28 && ball.y < 195) {
      ball.x = 28;
      ball.vx = Math.abs(ball.vx) * 0.85;
    }
    if (ball.x >= 448 && ball.y < 195) {
      ball.x = 448;
      ball.vx = -Math.abs(ball.vx) * 0.85;
    }
  }

  function triggerGoalCelebration(team) {
    goalCelebrationTimer = 2.4;
    goalScorer = team;
    playRetroSound('goal');

    if (team === 'player') {
      player1.state = 'celebrate';
    }

    // Buat 30 partikel konfeti retro
    goalParticles = [];
    for (let i = 0; i < 35; i++) {
      goalParticles.push({
        x: team === 'player' ? 450 : 30,
        y: 210,
        vx: (Math.random() - 0.5) * 8 + (team === 'player' ? -3 : 3),
        vy: -Math.random() * 6 - 2,
        color: ['#c27827', '#d63220', '#f7b500', '#ffffff', '#2255cc'][Math.floor(Math.random() * 5)],
        life: 2.0,
      });
    }
  }

  // ── UPDATE FISIKA: MARIO BROS ────────────────────────────────
  function updateMario(dt) {
    if (isPlayMode) {
      if (keys.left) {
        mario.vx = -2.2;
        mario.facing = -1;
      } else if (keys.right) {
        mario.vx = 2.2;
        mario.facing = 1;
      } else {
        mario.vx = 0;
      }
    } else {
      mario.vx = 1.4 * mario.facing;
      if (mario.x >= V_WIDTH - 40) mario.facing = -1;
      if (mario.x <= 20) mario.facing = 1;
    }

    // Animasi lari
    if (Math.abs(mario.vx) > 0.1) {
      mario.animTimer += dt;
      if (mario.animTimer > 0.12) {
        mario.frame = (mario.frame + 1) % 2;
        mario.animTimer = 0;
      }
    }

    mario.x += mario.vx * 60 * dt;
    mario.x = Math.max(10, Math.min(V_WIDTH - 30, mario.x));

    // Fisika lompat
    if (mario.isJumping) {
      mario.vy += 12 * dt;
      mario.y += mario.vy * 60 * dt;

      // Benturan dengan balok [?]
      if (
        mario.y <= mysteryBlock.y + 26 &&
        mario.y >= mysteryBlock.y &&
        Math.abs(mario.x - (mysteryBlock.x - 4)) < 18 &&
        mario.vy < 0
      ) {
        mario.vy = 1.8;
        mysteryBlock.bumpY = -6;
        mysteryBlock.coinActive = true;
        mysteryBlock.coinY = mysteryBlock.y - 10;
        playRetroSound('kick');
      }

      if (mario.y >= mario.groundY) {
        mario.y = mario.groundY;
        mario.vy = 0;
        mario.isJumping = false;
      }
    }

    if (mysteryBlock.bumpY < 0) {
      mysteryBlock.bumpY += 30 * dt;
      if (mysteryBlock.bumpY > 0) mysteryBlock.bumpY = 0;
    }

    if (mysteryBlock.coinActive) {
      mysteryBlock.coinY -= 60 * dt;
      if (mysteryBlock.coinY < mysteryBlock.y - 36) {
        mysteryBlock.coinActive = false;
      }
    }
  }

  // ── RENDER GAMBAR KE CANVAS ─────────────────────────────────
  function render() {
    ctx.clearRect(0, 0, V_WIDTH, V_HEIGHT);

    if (currentMode === 'soccer') {
      renderSoccerPitch();
    } else {
      renderMarioWorld();
    }
  }

  function renderSoccerPitch() {
    // 1. Papan Skor Retro di Atas Lapangan
    ctx.fillStyle = 'rgba(24, 21, 18, 0.85)';
    ctx.fillRect(V_WIDTH / 2 - 80, 12, 160, 24);
    ctx.strokeStyle = '#c27827';
    ctx.lineWidth = 1;
    ctx.strokeRect(V_WIDTH / 2 - 80, 12, 160, 24);

    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f7b500';
    ctx.fillText(`BJR-18 [ ${scorePlayer} ]  :  [ ${scoreCPU} ] RIVAL`, V_WIDTH / 2, 27);
    ctx.textAlign = 'left';

    // 2. Garis Lapangan & Garis Tepi
    ctx.strokeStyle = 'rgba(194, 120, 39, 0.3)';
    ctx.beginPath();
    ctx.moveTo(0, 238);
    ctx.lineTo(V_WIDTH, 238);
    // Lingkaran tengah
    ctx.arc(V_WIDTH / 2, 238, 28, Math.PI, 0, false);
    ctx.stroke();

    // 3. Dua Gawang Retro Lengkap dengan Jaring
    // Gawang Kiri (Dangerous Boys)
    drawGoalpost(6, 195, 24, 43, 'left');
    // Gawang Kanan (Gawang Lawan / Sasaran Tembak)
    drawGoalpost(V_WIDTH - 30, 195, 24, 43, 'right');

    // 4. Karakter Pemain 1 (Dangerous Boys)
    let p1Sprite;
    if (player1.state === 'celebrate') {
      p1Sprite = SPRITE_P1_CELEBRATE;
    } else if (player1.state === 'kick') {
      p1Sprite = SPRITE_P1_KICK;
    } else {
      p1Sprite = player1.frame === 0 ? SPRITE_P1_RUN_1 : SPRITE_P1_RUN_2;
    }
    drawPixelMatrix(ctx, p1Sprite, player1.x, player1.y, 2, player1.facing === -1);

    // Indikator "YOU" di atas Pemain 1
    ctx.fillStyle = '#f7b500';
    ctx.font = 'bold 7px monospace';
    ctx.fillText('▼ KAMU', player1.x - 2, player1.y - 6);

    // 5. Karakter Pemain 2 (Lawan)
    const p2Sprite = player2.state === 'kick'
      ? SPRITE_P2_RUN_1
      : (player2.frame === 0 ? SPRITE_P2_RUN_1 : SPRITE_P2_RUN_2);
    drawPixelMatrix(ctx, p2Sprite, player2.x, player2.y, 2, player2.facing === -1);

    // 6. Kiper Lawan di Gawang Kanan
    drawPixelMatrix(ctx, SPRITE_GK, goalkeeper.x, goalkeeper.y, 2, true);
    ctx.fillStyle = '#48a048';
    ctx.font = '6px monospace';
    ctx.fillText('KIPER', goalkeeper.x - 1, goalkeeper.y - 4);

    // 7. Bola Sepak
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.rotation);
    drawPixelMatrix(ctx, SPRITE_BALL, -8, -8, 2, false);
    ctx.restore();

    // Bayangan bola
    ctx.fillStyle = 'rgba(24, 21, 18, 0.25)';
    ctx.beginPath();
    ctx.ellipse(ball.x, 236, Math.max(3, 8 - (228 - ball.y) * 0.1), 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // 8. Tampilan Banner Selebrasi GOL!
    if (goalCelebrationTimer > 0) {
      renderGoalBanner();
    }

    // 9. Gambar Partikel Konfeti
    goalParticles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 3, 3);
    });
  }

  function drawGoalpost(x, y, w, h, side) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    // Rangka tiang gawang
    ctx.strokeRect(x, y, w, h);

    // Pola jaring retro bergaris
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    for (let lx = x + 4; lx < x + w; lx += 4) {
      ctx.beginPath();
      ctx.moveTo(lx, y);
      ctx.lineTo(lx, y + h);
      ctx.stroke();
    }
    for (let ly = y + 4; ly < y + h; ly += 6) {
      ctx.beginPath();
      ctx.moveTo(x, ly);
      ctx.lineTo(x + w, ly);
      ctx.stroke();
    }
  }

  function renderGoalBanner() {
    ctx.fillStyle = 'rgba(18, 16, 14, 0.9)';
    ctx.fillRect(V_WIDTH / 2 - 120, 80, 240, 52);
    ctx.strokeStyle = goalScorer === 'player' ? '#f7b500' : '#d63220';
    ctx.lineWidth = 2;
    ctx.strokeRect(V_WIDTH / 2 - 120, 80, 240, 52);

    ctx.textAlign = 'center';
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = goalScorer === 'player' ? '#f7b500' : '#ff7a70';
    ctx.fillText('★ GOOOLLLL! ★', V_WIDTH / 2, 105);

    ctx.font = '9px monospace';
    ctx.fillStyle = '#ffffff';
    const textDesc = goalScorer === 'player'
      ? 'DANGEROUS BOYS MENCETAK SKOR!'
      : 'TIM LAWAN MEMBALAS GOL!';
    ctx.fillText(textDesc, V_WIDTH / 2, 122);
    ctx.textAlign = 'left';
  }

  function renderMarioWorld() {
    // Lantai bata
    ctx.fillStyle = 'rgba(184, 61, 46, 0.25)';
    ctx.fillRect(0, 232, V_WIDTH, 38);
    ctx.strokeStyle = 'rgba(184, 61, 46, 0.5)';
    ctx.strokeRect(0, 232, V_WIDTH, 1);

    // Balok [?]
    const blockY = mysteryBlock.y + mysteryBlock.bumpY;
    drawPixelMatrix(ctx, SPRITE_BLOCK, mysteryBlock.x, blockY, 2, false);

    // Koin
    if (mysteryBlock.coinActive) {
      ctx.fillStyle = '#f7b500';
      ctx.fillRect(mysteryBlock.x + 8, mysteryBlock.coinY, 8, 12);
      ctx.fillStyle = '#fff';
      ctx.fillRect(mysteryBlock.x + 10, mysteryBlock.coinY + 2, 4, 8);
    }

    // Mario
    let marioSprite;
    if (mario.isJumping) {
      marioSprite = SPRITE_MARIO_JUMP;
    } else {
      marioSprite = mario.frame === 0 ? SPRITE_MARIO_STAND : SPRITE_MARIO_RUN;
    }
    drawPixelMatrix(ctx, marioSprite, mario.x, mario.y, 2, mario.facing === -1);

    ctx.fillStyle = '#f7b500';
    ctx.font = 'bold 7px monospace';
    ctx.fillText('▼ MARIO', mario.x + 1, mario.y - 6);
  }

  // ── GAME LOOP UTAMA ─────────────────────────────────────────
  function gameLoop(now) {
    if (!isPaused) {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (currentMode === 'soccer') {
        updateSoccer(dt);
      } else {
        updateMario(dt);
      }

      render();
    } else {
      lastTime = now;
    }

    animId = requestAnimationFrame(gameLoop);
  }

  // ── WIDGET KONTROL RETRO & ON-SCREEN GAMEPAD ──────────────────
  function createRetroGameWidget() {
    if (document.getElementById('retroControlsWidget')) return;

    // 1. Panel Mode & Suara di Pojok Kiri Bawah
    const widget = document.createElement('div');
    widget.id = 'retroControlsWidget';
    widget.className = 'retro-widget';
    widget.innerHTML = `
      <div class="retro-widget-header">
        <span class="retro-widget-dot"></span>
        <span class="retro-widget-title">Game Retro Dangerous Boys</span>
      </div>
      <div class="retro-widget-btns">
        <button id="btnModeSoccer" class="retro-btn active" title="Mode Pertandingan Sepak Bola">
          ⚽ Bola
        </button>
        <button id="btnModeMario" class="retro-btn" title="Mode Mario Bros">
          🍄 Mario
        </button>
        <button id="btnToggleSound" class="retro-btn" title="Suara Efek Retro">
          🔊 Suara
        </button>
        <button id="btnResetMatch" class="retro-btn" title="Mulai Ulang Skor">
          ↺ Reset
        </button>
      </div>
    `;
    document.body.appendChild(widget);

    // 2. On-Screen Gamepad di Pojok Kanan Bawah untuk Kendali Langsung
    const gamepad = document.createElement('div');
    gamepad.id = 'retroGamepad';
    gamepad.className = 'retro-gamepad';
    gamepad.innerHTML = `
      <div class="gamepad-group">
        <button id="padLeft" class="pad-btn" aria-label="Lari Kiri">◀ Kiri</button>
        <button id="padRight" class="pad-btn" aria-label="Lari Kanan">▶ Kanan</button>
      </div>
      <div class="gamepad-group">
        <button id="padJump" class="pad-btn pad-action" aria-label="Lompat">🦘 Lompat</button>
        <button id="padKick" class="pad-btn pad-kick" aria-label="Tendang">⚽ Tendang</button>
      </div>
    `;
    document.body.appendChild(gamepad);

    // Event Listener Widget
    document.getElementById('btnModeSoccer').addEventListener('click', () => {
      initAudio();
      currentMode = 'soccer';
      ball.reset();
      document.getElementById('btnModeSoccer').classList.add('active');
      document.getElementById('btnModeMario').classList.remove('active');
    });

    document.getElementById('btnModeMario').addEventListener('click', () => {
      initAudio();
      currentMode = 'mario';
      mario.x = 60;
      mario.y = mario.groundY;
      mario.vy = 0;
      mario.isJumping = false;
      document.getElementById('btnModeMario').classList.add('active');
      document.getElementById('btnModeSoccer').classList.remove('active');
    });

    const btnSound = document.getElementById('btnToggleSound');
    btnSound.addEventListener('click', () => {
      initAudio();
      soundEnabled = !soundEnabled;
      btnSound.textContent = soundEnabled ? '🔊 Suara' : '🔇 Hening';
      btnSound.classList.toggle('active', soundEnabled);
    });

    document.getElementById('btnResetMatch').addEventListener('click', () => {
      scorePlayer = 0;
      scoreCPU = 0;
      ball.reset();
      playRetroSound('kick');
    });

    // Event Listener Gamepad (Mendukung Mouse & Layar Sentuh Touch)
    const bindPad = (elemId, onPress, onRelease) => {
      const el = document.getElementById(elemId);
      if (!el) return;
      el.addEventListener('mousedown', e => { e.preventDefault(); initAudio(); onPress(); });
      el.addEventListener('mouseup', e => { e.preventDefault(); onRelease(); });
      el.addEventListener('mouseleave', e => { onRelease(); });
      el.addEventListener('touchstart', e => { e.preventDefault(); initAudio(); onPress(); });
      el.addEventListener('touchend', e => { e.preventDefault(); onRelease(); });
    };

    bindPad('padLeft', () => { keys.left = true; }, () => { keys.left = false; });
    bindPad('padRight', () => { keys.right = true; }, () => { keys.right = false; });
    bindPad('padJump', () => { keys.jump = true; executePlayerJump(); }, () => { keys.jump = false; });
    bindPad('padKick', () => { keys.kick = true; executePlayerKick(); }, () => { keys.kick = false; });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGameEngine);
  } else {
    initGameEngine();
  }

})();
