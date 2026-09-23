/**
 * Game - Loop Principal, Câmera, Geração Procedural e Gerenciamento de Estado
 * "O Chão Está Mentindo"
 */

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // Estado do jogo
    this.state = 'START'; // 'START', 'PLAYING', 'PAUSED', 'GAMEOVER'
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('floor_lying_highscore') || '0', 10);
    this.distance = 0;
    this.fakesAvoided = 0;
    this.combo = 0;
    this.comboTimer = 0;

    // Velocidade e progressão
    this.baseSpeed = 330;
    this.currentSpeed = 330;
    this.maxSpeed = 580;

    // Câmera
    this.cameraX = 0;
    this.cameraY = 0;
    this.screenShake = 0;

    // Entidades
    this.player = new Player();
    this.platforms = [];
    this.obstacles = [];
    this.lastGeneratedX = 0;
    this.lastPlatformY = 380;

    // Parallax
    this.bgClouds = [];
    this.bgMountains = [];

    // Timers
    this.lastTime = 0;

    // Frases divertidas de Game Over
    this.deathPhrases = [
      "“Eu avisei que o chão estava mentindo.”",
      "“Você confiou demais nesse chão.”",
      "“Essa plataforma não era sua amiga.”",
      "“Gravidade: 1 x Você: 0.”",
      "“O chão: 'Foi mal, eu tinha um compromisso'.”",
      "“A física te enganou direitinho de novo!”",
      "“Dica de ouro: se tremeu ou tem pedrinhas caindo, corra!”",
      "“Você pisou no vazio com uma confiança invejável.”",
      "“Mentiu na cara dura e você caiu no golpe!”"
    ];

    // Elementos do DOM
    this.dom = {
      score: document.getElementById('score-display'),
      highScore: document.getElementById('highscore-display'),
      distance: document.getElementById('distance-display'),
      phaseBadge: document.getElementById('phase-badge'),
      comboPill: document.getElementById('combo-pill'),
      comboText: document.getElementById('combo-text'),
      startScreen: document.getElementById('start-screen'),
      pauseScreen: document.getElementById('pause-screen'),
      gameOverScreen: document.getElementById('gameover-screen'),
      finalScore: document.getElementById('final-score'),
      finalDistance: document.getElementById('final-distance'),
      finalFakes: document.getElementById('final-fakes-avoided'),
      finalHighScore: document.getElementById('final-highscore'),
      newRecordTag: document.getElementById('new-record-tag'),
      gameOverPhrase: document.getElementById('gameover-message'),
      soundBtn: document.getElementById('btn-sound'),
      soundIcon: document.getElementById('sound-icon'),
      pauseBtn: document.getElementById('btn-pause')
    };

    this.init();
  }

  init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.initParallax();
    this.setupInputs();
    this.updateHUD();

    // Loop inicial
    requestAnimationFrame((t) => this.loop(t));
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  initParallax() {
    this.bgClouds = [];
    for (let i = 0; i < 8; i++) {
      this.bgClouds.push({
        x: Math.random() * this.canvas.width * 2,
        y: 40 + Math.random() * (this.canvas.height * 0.35),
        speed: 15 + Math.random() * 25,
        width: 80 + Math.random() * 120,
        height: 35 + Math.random() * 30
      });
    }

    this.bgMountains = [];
    const count = 12;
    for (let i = 0; i < count; i++) {
      this.bgMountains.push({
        x: i * 220,
        height: 140 + Math.random() * 180,
        width: 240 + Math.random() * 100,
        color: i % 2 === 0 ? '#1e243b' : '#171c30'
      });
    }
  }

  setupInputs() {
    // Teclado
    window.addEventListener('keydown', (e) => {
      audio.ensureContext();
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (this.state === 'START' || this.state === 'GAMEOVER') {
          this.startOrRestart();
        } else if (this.state === 'PLAYING') {
          this.player.requestJump();
        }
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        if (this.state === 'PLAYING') {
          this.player.setDucking(true);
        }
      } else if (e.code === 'KeyP') {
        this.togglePause();
      } else if (e.code === 'KeyR') {
        if (this.state === 'PLAYING' || this.state === 'PAUSED' || this.state === 'GAMEOVER') {
          this.startOrRestart();
        }
      } else if (e.code === 'KeyM') {
        this.toggleSound();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (this.state === 'PLAYING') {
          this.player.cancelJump();
        }
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        if (this.state === 'PLAYING') {
          this.player.setDucking(false);
        }
      }
    });

    // Botões de UI
    document.getElementById('btn-start').addEventListener('click', () => {
      audio.ensureContext();
      this.startOrRestart();
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
      audio.ensureContext();
      this.startOrRestart();
    });

    document.getElementById('btn-resume').addEventListener('click', () => {
      this.togglePause();
    });

    document.getElementById('btn-restart-pause').addEventListener('click', () => {
      this.startOrRestart();
    });

    this.dom.soundBtn.addEventListener('click', () => {
      this.toggleSound();
    });

    this.dom.pauseBtn.addEventListener('click', () => {
      this.togglePause();
    });

    // Controles Touch Mobile
    const touchJump = document.getElementById('touch-jump');
    const touchDuck = document.getElementById('touch-duck');

    const handleJumpPress = (e) => {
      e.preventDefault();
      audio.ensureContext();
      touchJump.classList.add('pressed');
      if (this.state === 'START' || this.state === 'GAMEOVER') {
        this.startOrRestart();
      } else if (this.state === 'PLAYING') {
        this.player.requestJump();
      }
    };

    const handleJumpRelease = (e) => {
      e.preventDefault();
      touchJump.classList.remove('pressed');
      if (this.state === 'PLAYING') {
        this.player.cancelJump();
      }
    };

    touchJump.addEventListener('touchstart', handleJumpPress, { passive: false });
    touchJump.addEventListener('touchend', handleJumpRelease, { passive: false });
    touchJump.addEventListener('mousedown', handleJumpPress);
    touchJump.addEventListener('mouseup', handleJumpRelease);

    const handleDuckPress = (e) => {
      e.preventDefault();
      audio.ensureContext();
      touchDuck.classList.add('pressed');
      if (this.state === 'PLAYING') {
        this.player.setDucking(true);
      }
    };

    const handleDuckRelease = (e) => {
      e.preventDefault();
      touchDuck.classList.remove('pressed');
      if (this.state === 'PLAYING') {
        this.player.setDucking(false);
      }
    };

    touchDuck.addEventListener('touchstart', handleDuckPress, { passive: false });
    touchDuck.addEventListener('touchend', handleDuckRelease, { passive: false });
    touchDuck.addEventListener('mousedown', handleDuckPress);
    touchDuck.addEventListener('mouseup', handleDuckRelease);

    // Clique direto na tela como salto rápido se não for botão
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.state === 'START' || this.state === 'GAMEOVER') {
        this.startOrRestart();
      } else if (this.state === 'PLAYING') {
        if (e.clientY > window.innerHeight * 0.75) {
          // Clique na base da tela abaixa
          this.player.setDucking(true);
          setTimeout(() => this.player.setDucking(false), 350);
        } else {
          this.player.requestJump();
        }
      }
    });
  }

  toggleSound() {
    const isMuted = audio.toggleMute();
    this.dom.soundIcon.textContent = isMuted ? '🔇' : '🔊';
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.dom.pauseScreen.classList.remove('hidden');
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.dom.pauseScreen.classList.add('hidden');
      this.lastTime = performance.now();
    }
  }

  startOrRestart() {
    this.score = 0;
    this.distance = 0;
    this.fakesAvoided = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.currentSpeed = this.baseSpeed;
    this.screenShake = 0;

    this.platforms = [];
    this.obstacles = [];
    particleSystem.reset();
    memorySystem.reset();

    // Gera base inicial sólida e segura para começo confortável
    const groundY = Math.max(300, Math.min(this.canvas.height - 180, 420));
    const startGround = new Platform(40, groundY, 650, 36, PLATFORM_TYPES.SAFE);
    this.platforms.push(startGround);

    this.lastGeneratedX = startGround.x + startGround.width;
    this.lastPlatformY = groundY;

    // Reseta personagem em cima da primeira plataforma
    this.player.reset(120, groundY - this.player.standHeight);

    // Gera primeiras plataformas
    this.generateProceduralWorld(this.player.x + this.canvas.width * 1.5);

    // Esconde telas de sobreposição
    this.dom.startScreen.classList.add('hidden');
    this.dom.pauseScreen.classList.add('hidden');
    this.dom.gameOverScreen.classList.add('hidden');
    this.dom.newRecordTag.classList.add('hidden');

    this.state = 'PLAYING';
    this.lastTime = performance.now();
  }

  generateProceduralWorld(targetX) {
    while (this.lastGeneratedX < targetX) {
      const distanceMeters = Math.floor(this.distance);
      clueSystem.update(distanceMeters);

      // Distância do vão (gap) e largura da próxima plataforma
      // Garante que o salto seja 100% fisicamente possível!
      const minGap = 55;
      const maxGap = Math.min(170, 75 + (this.currentSpeed / 4));
      const gap = minGap + Math.random() * (maxGap - minGap);

      const nextX = this.lastGeneratedX + gap;

      // Variação de altura suave (evita saltos impossíveis para cima)
      const heightVariation = (Math.random() - 0.48) * 80;
      const nextY = Math.max(220, Math.min(this.canvas.height - 140, this.lastPlatformY + heightVariation));

      // Largura da plataforma
      const minW = Math.max(110, 220 - (distanceMeters / 15));
      const width = minW + Math.random() * 120;

      // Escolhe tipo de plataforma de acordo com a fase de dificuldade
      const type = this.pickPlatformType(distanceMeters);

      const plat = new Platform(nextX, nextY, width, 32, type);
      this.platforms.push(plat);

      // Gera obstáculos simples ocasionalmente
      this.maybeSpawnObstacle(plat, distanceMeters);

      this.lastGeneratedX = nextX + width;
      this.lastPlatformY = nextY;
    }
  }

  pickPlatformType(distanceMeters) {
    const roll = Math.random();

    if (clueSystem.phase === 'initial') {
      // Fase inicial: 75% Segura, 25% Falsa
      return roll < 0.75 ? PLATFORM_TYPES.SAFE : PLATFORM_TYPES.FAKE;
    } else if (clueSystem.phase === 'medium') {
      // Fase média: 50% Segura, 25% Falsa, 15% Frágil, 10% Móvel
      if (roll < 0.50) return PLATFORM_TYPES.SAFE;
      if (roll < 0.75) return PLATFORM_TYPES.FAKE;
      if (roll < 0.90) return PLATFORM_TYPES.FRAGILE;
      return PLATFORM_TYPES.MOVING;
    } else {
      // Fase avançada: 38% Segura, 25% Falsa, 15% Frágil, 12% Surpresa, 10% Fantasma
      if (roll < 0.38) return PLATFORM_TYPES.SAFE;
      if (roll < 0.63) return PLATFORM_TYPES.FAKE;
      if (roll < 0.78) return PLATFORM_TYPES.FRAGILE;
      if (roll < 0.90) return PLATFORM_TYPES.SURPRISE;
      return PLATFORM_TYPES.GHOST;
    }
  }

  maybeSpawnObstacle(platform, distanceMeters) {
    if (distanceMeters < 120) return; // Início limpo sem obstáculos
    if (platform.type !== PLATFORM_TYPES.SAFE) return; // Obstáculos só em plataformas seguras para não sobrecarregar
    if (platform.width < 160) return;

    const roll = Math.random();

    // Espinho (exige pulo)
    if (roll < 0.28) {
      const spikeX = platform.x + platform.width * 0.45;
      const spikeY = platform.y - 18;
      this.obstacles.push(new Obstacle(spikeX, spikeY, OBSTACLE_TYPES.SPIKE, platform));
    }
    // Pássaro voador (exige abaixar/slide)
    else if (roll < 0.46 && distanceMeters > 300) {
      const birdX = platform.x + platform.width * 0.6;
      const birdY = platform.y - 42; // Altura da cabeça do jogador em pé
      this.obstacles.push(new Obstacle(birdX, birdY, OBSTACLE_TYPES.BIRD, platform));
    }
  }

  // Loop de Animação e Física
  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min(0.06, (timestamp - this.lastTime) / 1000); // Evita espirais de lag
    this.lastTime = timestamp;

    if (this.state === 'PLAYING') {
      this.update(dt);
    }

    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    // 1. Progressão de Velocidade e Distância
    this.distance += (this.currentSpeed * dt) / 25; // 25 px = ~1 metro
    this.score += Math.floor(dt * 30);
    this.currentSpeed = Math.min(this.maxSpeed, this.baseSpeed + (this.distance * 0.25));

    // Atualiza sistema de pistas
    clueSystem.update(Math.floor(this.distance));

    // 2. Atualiza Jogador
    this.player.update(dt, this.currentSpeed);

    // 3. Atualiza Plataformas e Colisões
    let playerOnGroundThisFrame = false;

    for (let i = 0; i < this.platforms.length; i++) {
      const plat = this.platforms[i];
      plat.update(dt, this.player);

      // Checa se jogador pousou nesta plataforma
      if (!this.player.isDead && plat.isSolid) {
        const pb = this.player.getBounds();
        const prevPlayerBottom = pb.bottom - (this.player.vy * dt);

        const isHorizontalInside = pb.right > plat.x + 4 && pb.left < plat.x + plat.width - 4;
        const crossedTop = prevPlayerBottom <= plat.y + 10 && pb.bottom >= plat.y - 2;

        if (isHorizontalInside && crossedTop && this.player.vy >= 0) {
          this.player.landOnPlatform(plat.y);
          plat.onStep();
          playerOnGroundThisFrame = true;

          // Se for plataforma falsa que o jogador conseguiu tocar e sair ou pisar
          if (plat.type !== PLATFORM_TYPES.SAFE && !plat.scoreGiven) {
            plat.scoreGiven = true;
            this.fakesAvoided++;
            this.addCombo();
          }
        }
      }
    }

    if (!playerOnGroundThisFrame && this.player.isGrounded) {
      this.player.isGrounded = false;
    }

    // 4. Atualiza Obstáculos e Colisão
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.update(dt);

      if (!this.player.isDead && obs.checkCollision(this.player)) {
        // Colisão fatal com espinho ou pássaro
        this.triggerGameOver();
        return;
      }

      // Remove obstáculos passados
      if (obs.x + obs.width < this.cameraX - 100) {
        this.obstacles.splice(i, 1);
      }
    }

    // 5. Atualiza Desafios da Zona de Memória
    memorySystem.checkTrigger(this.distance, this.platforms, this.player.x);
    memorySystem.update(dt, this.player, (bonusPoints) => {
      this.score += bonusPoints;
      this.showComboAlert(`MEMÓRIA PERFEITA! +${bonusPoints}`);
    });

    // 6. Atualiza Partículas
    particleSystem.update(dt);

    // 7. Timer do Combo
    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.dom.comboPill.classList.add('hidden');
      }
    }

    // 8. Câmera segue o jogador suavemente
    const targetCamX = this.player.x - this.canvas.width * 0.25;
    this.cameraX += (targetCamX - this.cameraX) * 8 * dt;

    // Shake da câmera decai
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }

    // 9. Geração Procedural à Frente e Limpeza
    this.generateProceduralWorld(this.player.x + this.canvas.width * 1.5);
    this.cleanupOldEntities();

    // 10. Queda no Abismo (Morte)
    if (!this.player.isDead && this.player.y > this.canvas.height + 60) {
      this.triggerGameOver();
    }

    // 11. Atualiza HUD
    this.updateHUD();
  }

  addCombo() {
    this.combo++;
    this.comboTimer = 2.5;
    const bonus = 25 * this.combo;
    this.score += bonus;
    this.showComboAlert(`CHÃO DESVENDADO! +${bonus} (x${this.combo})`);
  }

  showComboAlert(text) {
    this.dom.comboText.textContent = text;
    this.dom.comboPill.classList.remove('hidden');
  }

  cleanupOldEntities() {
    const cullX = this.cameraX - 250;
    this.platforms = this.platforms.filter(p => (p.x + p.width > cullX) && (p.y < this.canvas.height + 400));
  }

  triggerGameOver() {
    if (this.player.isDead) return;
    this.player.isDead = true;
    this.screenShake = 16;
    audio.playFall();

    // Verifica novo recorde
    let isNewRecord = false;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('floor_lying_highscore', this.highScore.toString());
      isNewRecord = true;
      audio.playNewRecord();
    }

    // Exibe tela de Game Over após breve momento de queda
    setTimeout(() => {
      this.state = 'GAMEOVER';
      this.dom.finalScore.textContent = this.score;
      this.dom.finalDistance.textContent = `${Math.floor(this.distance)} m`;
      this.dom.finalFakes.textContent = this.fakesAvoided;
      this.dom.finalHighScore.textContent = this.highScore;

      // Mensagem divertida aleatória
      const phrase = this.deathPhrases[Math.floor(Math.random() * this.deathPhrases.length)];
      this.dom.gameOverPhrase.textContent = phrase;

      if (isNewRecord) {
        this.dom.newRecordTag.classList.remove('hidden');
        particleSystem.emitCelebration(this.player.x, this.player.y);
      } else {
        this.dom.newRecordTag.classList.add('hidden');
      }

      this.dom.gameOverScreen.classList.remove('hidden');
    }, 450);
  }

  updateHUD() {
    this.dom.score.textContent = String(this.score).padStart(4, '0');
    this.dom.highScore.textContent = String(this.highScore).padStart(4, '0');
    this.dom.distance.textContent = `${Math.floor(this.distance)} m`;

    const phaseClass = clueSystem.getPhaseClass();
    const phaseName = clueSystem.getPhaseName();
    this.dom.phaseBadge.className = `phase-badge ${phaseClass}`;
    this.dom.phaseBadge.textContent = phaseName;
  }

  // ==========================================================================
  // RENDERIZAÇÃO GRÁFICA COMPLETA
  // ==========================================================================

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();

    // Efeito de Screen Shake
    if (this.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake;
      const shakeY = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(shakeX, shakeY);
    }

    // 1. Céu Dinâmico com Gradiente Suave (evolução sutil com a distância)
    this.renderSky(ctx, w, h);

    // 2. Parallax: Montanhas Distantes
    this.renderMountains(ctx, w, h);

    // 3. Parallax: Nuvens Flutuantes
    this.renderClouds(ctx);

    // 4. Plataformas
    const subtlety = clueSystem.clueSubtlety;
    for (let i = 0; i < this.platforms.length; i++) {
      this.platforms[i].render(ctx, this.cameraX, this.cameraY, subtlety);
    }

    // 5. Obstáculos
    for (let i = 0; i < this.obstacles.length; i++) {
      this.obstacles[i].render(ctx, this.cameraX, this.cameraY);
    }

    // 6. Personagem
    this.player.render(ctx, this.cameraX, this.cameraY);

    // 7. Partículas
    particleSystem.render(ctx, this.cameraX, this.cameraY);

    ctx.restore();
  }

  renderSky(ctx, w, h) {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    const d = this.distance % 2400;

    if (d < 800) {
      // Manhã / Dia Radiante
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(0.6, '#1e293b');
      skyGrad.addColorStop(1, '#0f1423');
    } else if (d < 1600) {
      // Pôr do Sol / Entardecer Púrpura
      skyGrad.addColorStop(0, '#2e1065');
      skyGrad.addColorStop(0.6, '#4c1d95');
      skyGrad.addColorStop(1, '#1e1b4b');
    } else {
      // Noite Neon
      skyGrad.addColorStop(0, '#050512');
      skyGrad.addColorStop(0.6, '#0f172a');
      skyGrad.addColorStop(1, '#1e1b4b');
    }

    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);
  }

  renderMountains(ctx, w, h) {
    const parallax = this.cameraX * 0.12;

    for (let i = 0; i < this.bgMountains.length; i++) {
      const m = this.bgMountains[i];
      let screenX = (m.x - parallax) % (this.bgMountains.length * 220);
      if (screenX < -m.width) screenX += this.bgMountains.length * 220;

      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.moveTo(screenX, h);
      ctx.lineTo(screenX + m.width / 2, h - m.height);
      ctx.lineTo(screenX + m.width, h);
      ctx.closePath();
      ctx.fill();
    }
  }

  renderClouds(ctx) {
    const parallax = this.cameraX * 0.35;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let i = 0; i < this.bgClouds.length; i++) {
      const c = this.bgClouds[i];
      let screenX = (c.x - parallax) % (this.canvas.width * 2);
      if (screenX < -c.width) screenX += this.canvas.width * 2;

      ctx.beginPath();
      ctx.ellipse(screenX, c.y, c.width / 2, c.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Inicia o jogo quando a janela carregar
window.addEventListener('load', () => {
  window.game = new Game();
});
