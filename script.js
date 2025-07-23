window.onload = () => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const levelEl = document.getElementById('level');
  const highScoreEl = document.getElementById('highScore');

  let score = 0;
  let level = 1;
  let highScore = localStorage.getItem('brickGameHigh') || 0;
  highScoreEl.textContent = highScore;

  const paddle = { w: 100, h: 10, x: 0 };
  let paddleColor = '#0ff';
  const powerUpDuration = 8000;

  const balls = [{ x: 0, y: 0, dx: 2, dy: -2, rad: 8 }];

  const brickCfg = {
    cols: 8,
    baseRows: 3,
    w: 65,
    h: 20,
    pad: 10,
    top: 40
  };

  let bricks = [];
  const powerUps = [];

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight * 0.65;

    // Dinamik tuğla ve padding boyutları
    brickCfg.pad = canvas.width * 0.015;
    brickCfg.w = (canvas.width - (brickCfg.cols - 1) * brickCfg.pad) / brickCfg.cols;
    brickCfg.h = brickCfg.w / 3;

    // Paddle pozisyonu ortalanır
    paddle.x = canvas.width / 2 - paddle.w / 2;

    // Top ortalanır
    balls[0].x = canvas.width / 2;
    balls[0].y = canvas.height - 30;

    resetBricks();
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function resetBricks() {
    bricks = [];
    const rows = brickCfg.baseRows + level - 1;
    for (let c = 0; c < brickCfg.cols; c++) {
      bricks[c] = [];
      for (let r = 0; r < rows; r++) {
        const isBomb = Math.random() < 0.1;
        const dur = isBomb ? 1 : Math.floor(Math.random() * 3) + 1;
        bricks[c][r] = { x: 0, y: 0, dur, bomb: isBomb };
      }
    }
  }

  // Mouse kontrolü
  document.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    let mouseX = e.clientX - rect.left;
    paddle.x = Math.min(Math.max(mouseX - paddle.w / 2, 0), canvas.width - paddle.w);
  });

  // Dokunmatik kontrol
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    let touchX = touch.clientX - rect.left;
    paddle.x = Math.min(Math.max(touchX - paddle.w / 2, 0), canvas.width - paddle.w);
  }, { passive: false });

  function drawBricks() {
    const totalBricksWidth = brickCfg.cols * brickCfg.w + (brickCfg.cols - 1) * brickCfg.pad;
    const offsetX = (canvas.width - totalBricksWidth) / 2;
    bricks.forEach((col, i) => {
      col.forEach((b, j) => {
        if (b.dur > 0) {
          b.x = offsetX + i * (brickCfg.w + brickCfg.pad);
          b.y = brickCfg.top + j * (brickCfg.h + brickCfg.pad);
          ctx.fillStyle = b.bomb ? '#f0f' : ['#ff0', '#0f0', '#00f'][b.dur - 1];
          ctx.shadowBlur = b.bomb ? 25 : 15;
          ctx.shadowColor = ctx.fillStyle;
          ctx.fillRect(b.x, b.y, brickCfg.w, brickCfg.h);
          ctx.shadowBlur = 0;
        }
      });
    });
  }

  function drawPaddle() {
    ctx.fillStyle = paddleColor;
    ctx.shadowBlur = 20;
    ctx.shadowColor = paddleColor;
    ctx.fillRect(paddle.x, canvas.height - paddle.h, paddle.w, paddle.h);
    ctx.shadowBlur = 0;
  }

  function drawBall(ball) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.rad, 0, Math.PI * 2);
    ctx.fillStyle = '#0f0';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#0f0';
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0;
  }

  function createPowerUp(x, y, type) {
    powerUps.push({ x, y, type, size: 20, dy: 2 });
  }

  function drawPowerUps() {
    powerUps.forEach(pu => {
      ctx.beginPath();
      ctx.fillStyle = pu.type === 'grow' ? '#0f0' : '#f00';
      ctx.shadowBlur = 15;
      ctx.shadowColor = ctx.fillStyle;
      ctx.fillRect(pu.x, pu.y, pu.size, pu.size);
      ctx.closePath();
      ctx.shadowBlur = 0;
    });
  }

  function updatePowerUps() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
      let pu = powerUps[i];
      pu.y += pu.dy;
      if (
        pu.y + pu.size >= canvas.height - paddle.h &&
        pu.x + pu.size > paddle.x &&
        pu.x < paddle.x + paddle.w
      ) {
        activatePowerUp(pu.type);
        powerUps.splice(i, 1);
      } else if (pu.y > canvas.height) {
        powerUps.splice(i, 1);
      }
    }
  }

  function activatePowerUp(type) {
    if (type === 'grow') {
      paddle.w = Math.min(paddle.w + 40, canvas.width);
      paddleColor = '#0f0';
      setTimeout(() => {
        paddle.w = 100;
        paddleColor = '#0ff';
      }, powerUpDuration);
    }
  }

  function explode(i, j) {
    const dirs = [[1,0], [-1,0], [0,1], [0,-1]];
    dirs.forEach(([dx, dy]) => {
      const nb = bricks[i + dx]?.[j + dy];
      if (nb && nb.dur > 0) {
        nb.dur = 0;
        score++;
        scoreEl.textContent = score;
      }
    });
  }

  function update() {
    balls.forEach((ball, bi) => {
      ball.x += ball.dx;
      ball.y += ball.dy;

      if (ball.x + ball.rad > canvas.width || ball.x - ball.rad < 0) ball.dx = -ball.dx;
      if (ball.y - ball.rad < 0) ball.dy = -ball.dy;
      else if (ball.y + ball.rad > canvas.height - paddle.h) {
        if (ball.x > paddle.x && ball.x < paddle.x + paddle.w) ball.dy = -ball.dy;
        else balls.splice(bi, 1);
      }

      bricks.forEach((col, i) => {
        col.forEach((b, j) => {
          if (
            b.dur > 0 &&
            ball.x > b.x &&
            ball.x < b.x + brickCfg.w &&
            ball.y > b.y &&
            ball.y < b.y + brickCfg.h
          ) {
            b.dur--;
            score++;
            scoreEl.textContent = score;
            if (b.bomb) explode(i, j);

            if (Math.random() < 0.2) {
              createPowerUp(b.x + brickCfg.w / 2 - 10, b.y + brickCfg.h / 2 - 10, 'grow');
            }

            ball.dy = -ball.dy;
          }
        });
      });
    });

    updatePowerUps();

    if (balls.length === 0) {
      endGame();
    }

    if (bricks.flat().every(b => b.dur === 0)) {
      level++;
      levelEl.textContent = level;
      resetBricks();
      balls.length = 0;
      balls.push({ x: canvas.width / 2, y: canvas.height - 30, dx: 2, dy: -2, rad: 8 });
    }
  }

  function drawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBricks();
    drawPaddle();
    balls.forEach(drawBall);
    drawPowerUps();
  }

  function endGame() {
    if (score > highScore) localStorage.setItem('brickGameHigh', score);
    alert(`Oyun Bitti!\nSkor: ${score}\nEn Yüksek: ${Math.max(score, highScore)}`);
    document.location.reload();
  }

  function loop() {
    update();
    drawAll();
    requestAnimationFrame(loop);
  }

  loop();
};
