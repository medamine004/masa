/* =========================================
   Love Snake — game logic
   ========================================= */
(() => {
  'use strict';

  /* ---------- Config ---------- */
  const GRID_SIZE = 16;
  const STEP_MS_START = 170;
  const STEP_MS_MIN = 95;
  const SPEEDUP_EVERY = 5;
  const MAX_LIVES = 3;
  const MESSAGE_EVERY = 5;
  const WIN_SCORE = 25;

  const LOVE_MESSAGES = [
    'MASA',
    'كل خطوة بهالقلب… وأنتِ وجهته 💗',
    'ما أحتاج خريطة، قلبي يعرف طريقك 🌟',
    'كل نجمة جمعتها، إهداء لعيونك ✨',
    'لو اللعبة طولت، السبب إني ما أبغى أوقف وأنا أفكر فيك',
    'أنتِ النجمة اللي ما تخلص من حياتي 🤍',
    'حتى وأنا ألعب، إنتِ بخاطري',
    'كل ما يكبر القلب، أتذكر كم تكبر محبتي لك',
  ];

  const FINAL_MESSAGES_WIN = (score) =>
    
`جمعت ${score} نجمة قبل ما يتعب قلبي شوي 😅
بس صدّقيني، تعبه بيروح... وحبي لك ما بيروح.
خلك جنبي، وعدّي اللعب مرّة ثانية معي 🤍`;

  const FINAL_MESSAGES_LOSE = (score) =>
    'كل خطوة بهالقلب… وأنتِ وجهته 💗masa',
    'ما أحتاج خريطة، قلبي يعرف طريقك 🌟',
    'كل نجمة جمعتها، إهداء لعيونك ✨',
    'لو اللعبة طولت، السبب إني ما أبغى أوقف وأنا أفكر فيك',
    'أنتِ النجمة اللي ما تخلص من حياتي 🤍'
    'كل ما يكبر القلب، أتذكر كم تكبر محبتي لك',
    `جمعت ${score} نجمة، وكل واحدة فيهم ذكّرتني فيكِ.
ما كان قصدي أصنع لعبة بس...
كان قصدي أوصل لقلبك بطريقة لطيفة.
أحبك أكثر من كل النجوم اللي بالسما 🤍`;

  /* ---------- DOM refs ---------- */
  const screens = {
    start: document.getElementById('screen-start'),
    game: document.getElementById('screen-game'),
    end: document.getElementById('screen-end'),
  };
  const btnStart = document.getElementById('btn-start');
  const btnReplay = document.getElementById('btn-replay');
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const livesTrack = document.getElementById('lives');
  const messagePop = document.getElementById('message-pop');
  const pauseOverlay = document.getElementById('pause-overlay');
  const endTitle = document.getElementById('end-title');
  const endScore = document.getElementById('end-score');
  const letterText = document.getElementById('letter-text');
  const touchControls = document.getElementById('touch-controls');

  /* ---------- State ---------- */
  let cellPx = 0;
  let snake = [];
  let dir = { x: 1, y: 0 };
  let pendingDir = null;
  let star = { x: 0, y: 0 };
  let score = 0;
  let lives = MAX_LIVES;
  let stepMs = STEP_MS_START;
  let loopHandle = null;
  let lastMessageMilestone = 0;
  let isPaused = false;
  let isRunning = false;

  /* ---------- Screen switching ---------- */
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
  }

  /* ---------- Setup / resize ---------- */
  function fitCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const size = Math.floor(rect.width);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cellPx = size / GRID_SIZE;
  }

  function resetLivesUI() {
    livesTrack.querySelectorAll('.life-pip').forEach((pip, i) => {
      pip.classList.toggle('lost', i >= lives);
    });
  }

  function placeStar() {
    let valid = false;
    while (!valid) {
      const x = Math.floor(Math.random() * GRID_SIZE);
      const y = Math.floor(Math.random() * GRID_SIZE);
      if (!snake.some(seg => seg.x === x && seg.y === y)) {
        star = { x, y };
        valid = true;
      }
    }
  }

  function resetGame() {
    const mid = Math.floor(GRID_SIZE / 2);
    snake = [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
    ];
    dir = { x: 1, y: 0 };
    pendingDir = null;
    score = 0;
    lives = MAX_LIVES;
    stepMs = STEP_MS_START;
    lastMessageMilestone = 0;
    isPaused = false;
    scoreEl.textContent = '0';
    resetLivesUI();
    placeStar();
    fitCanvas();
    draw();
  }

  /* ---------- Game loop ---------- */
  function startLoop() {
    stopLoop();
    loopHandle = setInterval(tick, stepMs);
  }

  function stopLoop() {
    if (loopHandle) clearInterval(loopHandle);
    loopHandle = null;
  }

  function tick() {
    if (!isRunning || isPaused) return;

    if (pendingDir) {
      dir = pendingDir;
      pendingDir = null;
    }

    const head = snake[0];
    const newHead = { x: head.x + dir.x, y: head.y + dir.y };

    const hitWall = newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE;
    const hitSelf = !hitWall && snake.some((seg, i) => i !== snake.length - 1 && seg.x === newHead.x && seg.y === newHead.y);

    if (hitWall || hitSelf) {
      handleCollision();
      return;
    }

    snake.unshift(newHead);

    if (newHead.x === star.x && newHead.y === star.y) {
      score += 1;
      scoreEl.textContent = String(score);

      if (score >= WIN_SCORE) {
        draw();
        endGame(true);
        return;
      }

      placeStar();
      maybeSpeedUp();
      maybeShowMessage();
    } else {
      snake.pop();
    }

    draw();
  }

  function maybeSpeedUp() {
    if (score % SPEEDUP_EVERY === 0) {
      stepMs = Math.max(STEP_MS_MIN, stepMs - 8);
      startLoop();
    }
  }

  function maybeShowMessage() {
    const milestone = Math.floor(score / MESSAGE_EVERY);
    if (milestone > lastMessageMilestone) {
      lastMessageMilestone = milestone;
      const msg = LOVE_MESSAGES[Math.floor(Math.random() * LOVE_MESSAGES.length)];
      popMessage(msg);
    }
  }

  function popMessage(text) {
    messagePop.textContent = text;
    messagePop.classList.add('show');
    isPaused = true;
    setTimeout(() => {
      messagePop.classList.remove('show');
      isPaused = false;
    }, 1500);
  }

  function handleCollision() {
    lives -= 1;
    resetLivesUI();

    if (lives <= 0) {
      endGame(false);
      return;
    }

    const mid = Math.floor(GRID_SIZE / 2);
    snake = [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
    ];
    dir = { x: 1, y: 0 };
    pendingDir = null;
    placeStar();

    isPaused = true;
    pauseOverlay.classList.add('show');
    pauseOverlay.querySelector('p').textContent = 'تعثرنا شوي… اضغط نكمل 🤍';

    const resume = () => {
      pauseOverlay.classList.remove('show');
      isPaused = false;
      pauseOverlay.removeEventListener('pointerdown', resume);
      canvas.removeEventListener('pointerdown', resume);
    };

    pauseOverlay.addEventListener('pointerdown', resume, { once: true });
    canvas.addEventListener('pointerdown', resume, { once: true });
    document.addEventListener('keydown', resume, { once: true });
  }

  function endGame(won) {
    stopLoop();
    isRunning = false;

    if (won) {
      endTitle.textContent = 'جمعت كل نجومي 🌟';
      letterText.textContent = FINAL_MESSAGES_WIN(score);
    } else {
      endTitle.textContent = 'القلب احتاج راحة 🤍';
      letterText.textContent = FINAL_MESSAGES_LOSE(score);
    }

    // ✅ Correction ici
    endScore.textContent = `النجوم المجمّعة: ${score}`;

    showScreen('end');
  }

  /* ---------- Drawing ---------- */
  function drawHeartPath(cx, cy, size) {
    const s = size;
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.32);
    ctx.bezierCurveTo(cx, cy, cx - s * 0.5, cy - s * 0.42, cx - s * 0.5, cy - s * 0.08);
    ctx.bezierCurveTo(cx - s * 0.5, cy + s * 0.22, cx - s * 0.2, cy + s * 0.42, cx, cy + s * 0.62);
    ctx.bezierCurveTo(cx + s * 0.2, cy + s * 0.42, cx + s * 0.5, cy + s * 0.22, cx + s * 0.5, cy - s * 0.08);
    ctx.bezierCurveTo(cx + s * 0.5, cy - s * 0.42, cx, cy, cx, cy + s * 0.32);
    ctx.closePath();
  }

  function drawStarPath(cx, cy, outerR) {
    const innerR = outerR * 0.45;
    const spikes = 5;
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerR;
      let y = cy + Math.sin(rot) * outerR;
      ctx.lineTo(x, y);
      rot += step;
      x = cx + Math.cos(rot) * innerR;
      y = cy + Math.sin(rot) * innerR;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerR);
    ctx.closePath();
  }

  function draw() {
    const size = canvas.width / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, size, size);

    // Star
    const starCx = star.x * cellPx + cellPx / 2;
    const starCy = star.y * cellPx + cellPx / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(255,214,107,0.85)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#FFD66B';
    drawStarPath(starCx, starCy, cellPx * 0.34);
    ctx.fill();
    ctx.restore();

    // Snake (hearts)
    snake.forEach((seg, i) => {
      const cx = seg.x * cellPx + cellPx / 2;
      const cy = seg.y * cellPx + cellPx / 2;
      const isHead = i === 0;
      const t = i / Math.max(1, snake.length - 1);

      const r1 = 255, g1 = 92, b1 = 138;
      const r2 = 201, g2 = 166, b2 = 255;
      const r = Math.round(r1 + (r2 - r1) * t);
      const g = Math.round(g1 + (g2 - g1) * t);
      const b = Math.round(b1 + (b2 - b1) * t);

      ctx.save();
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      if (isHead) {
        ctx.shadowColor = 'rgba(255,92,138,0.8)';
        ctx.shadowBlur = 12;
      }
      const sizeFactor = isHead ? 0.86 : 0.7 - t * 0.18;
      drawHeartPath(cx, cy, cellPx * sizeFactor);
      ctx.fill();
      ctx.restore();
    });
  }

  /* ---------- Input ---------- */
  function setDir(nx, ny) {
    const head = snake[0];
    const second = snake[1];
    if (second && head.x + nx === second.x && head.y + ny === second.y) return;
    pendingDir = { x: nx, y: ny };
  }

  document.addEventListener('keydown', (e) => {
    if (!isRunning) return;
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': setDir(0, -1); e.preventDefault(); break;
      case 'ArrowDown': case 's': case 'S': setDir(0, 1); e.preventDefault(); break;
      case 'ArrowLeft': case 'a': case 'A': setDir(-1, 0); e.preventDefault(); break;
      case 'ArrowRight': case 'd': case 'D': setDir(1, 0); e.preventDefault(); break;
    }
  });

  // Touch buttons
  touchControls.querySelectorAll('.dpad-btn').forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const d = btn.dataset.dir;
      if (d === 'up') setDir(0, -1);
      if (d === 'down') setDir(0, 1);
      if (d === 'left') setDir(-1, 0);
      if (d === 'right') setDir(1, 0);
    });
  });

  // Swipe
  let touchStart = null;
  canvas.addEventListener('pointerdown', (e) => {
    touchStart = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!touchStart) return;
    const dx = e.clientX - touchStart.x;
    const dy = e.clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      setDir(dx > 0 ? 1 : -1, 0);
    } else {
      setDir(0, dy > 0 ? 1 : -1);
    }
  });

  /* ---------- Buttons ---------- */
  function beginGame() {
    showScreen('game');
    resetGame();
    isRunning = true;
    startLoop();
  }

  btnStart.addEventListener('click', beginGame);
  btnReplay.addEventListener('click', beginGame);

  window.addEventListener('resize', () => {
    if (screens.game.classList.contains('active')) fitCanvas();
    draw();
  });

  /* ---------- Start ---------- */
  showScreen('start');
})();
