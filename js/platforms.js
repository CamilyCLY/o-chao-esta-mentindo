/**
 * Platforms - Gerenciamento e renderização dos tipos de plataforma
 * Suporta: SAFE, FAKE, FRAGILE, SURPRISE, MOVING, GHOST
 */

const PLATFORM_TYPES = {
  SAFE: 'SAFE',
  FAKE: 'FAKE',
  FRAGILE: 'FRAGILE',
  SURPRISE: 'SURPRISE',
  MOVING: 'MOVING',
  GHOST: 'GHOST'
};

class Platform {
  constructor(x, y, width, height, type = PLATFORM_TYPES.SAFE) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;

    this.isSolid = true;
    this.steppedOn = false;
    this.steppedTimer = 0;
    this.isBroken = false;
    this.isFalling = false;
    this.fallVy = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;

    // Pistas e animações
    this.clueDustTimer = Math.random() * 0.5;
    this.microVibrationTimer = Math.random() * 2;

    // Configurações específicas de tipo
    this.timeBeforeBreak = 0.42; // Para FAKE
    if (this.type === PLATFORM_TYPES.FRAGILE) {
      this.timeBeforeBreak = 0.22;
    } else if (this.type === PLATFORM_TYPES.SURPRISE) {
      this.timeBeforeBreak = 0.08; // Quase instantâneo!
    }

    // Plataforma Móvel
    if (this.type === PLATFORM_TYPES.MOVING) {
      this.startX = x;
      this.moveRange = 70 + Math.random() * 50;
      this.moveSpeed = 80 + Math.random() * 40;
      this.moveDir = 1;
    }

    // Plataforma Fantasma
    if (this.type === PLATFORM_TYPES.GHOST) {
      this.ghostCycle = Math.random() * 3;
      this.ghostAlpha = 1;
    }

    // Modo de Memória
    this.isMemoryRevealed = false;
    this.isMemoryHidden = false;

    // Seed visual para rachaduras aleatórias mas consistentes
    this.crackSeed = Math.random();
  }

  update(dt, player) {
    // 1. Plataforma Móvel
    if (this.type === PLATFORM_TYPES.MOVING && !this.isBroken) {
      const prevX = this.x;
      this.x += this.moveDir * this.moveSpeed * dt;
      if (this.x > this.startX + this.moveRange) {
        this.x = this.startX + this.moveRange;
        this.moveDir = -1;
      } else if (this.x < this.startX - this.moveRange) {
        this.x = this.startX - this.moveRange;
        this.moveDir = 1;
      }

      // Se o jogador estiver em cima dela, transporta o jogador junto
      if (player && player.isGrounded && this.isPlayerOnTop(player)) {
        player.x += (this.x - prevX);
      }
    }

    // 2. Plataforma Fantasma (Ciclo de fase)
    if (this.type === PLATFORM_TYPES.GHOST && !this.isBroken) {
      this.ghostCycle += dt;
      // Período total = 3 segundos (2s sólido, 1s fantasma)
      const period = this.ghostCycle % 3.0;
      if (period < 1.8) {
        this.isSolid = true;
        this.ghostAlpha = 0.75 + Math.sin(period * 6) * 0.15;
      } else {
        this.isSolid = false;
        this.ghostAlpha = 0.2 + Math.sin(period * 6) * 0.1;
      }
    }

    // 3. Comportamento ao ser pisada
    if (this.steppedOn && !this.isBroken) {
      this.steppedTimer += dt;

      // Tremor da plataforma falsa / frágil
      if (this.type === PLATFORM_TYPES.FAKE || this.type === PLATFORM_TYPES.FRAGILE || this.type === PLATFORM_TYPES.SURPRISE) {
        const shakeIntensity = Math.min(6, this.steppedTimer * 14);
        this.shakeOffsetX = (Math.random() - 0.5) * shakeIntensity;
        this.shakeOffsetY = (Math.random() - 0.5) * shakeIntensity;

        // Quebra quando estoura o tempo
        if (this.steppedTimer >= this.timeBeforeBreak) {
          this.breakPlatform();
        }
      }
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }

    // 4. Micro-vibração como pista visual prévia (para FAKE e FRAGILE)
    if (!this.steppedOn && !this.isBroken) {
      if (this.type === PLATFORM_TYPES.FAKE || this.type === PLATFORM_TYPES.FRAGILE) {
        this.microVibrationTimer += dt;
        if (this.microVibrationTimer > 1.8) {
          // Vibra 0.15s sutilmente
          if (this.microVibrationTimer < 2.0) {
            this.shakeOffsetX = (Math.random() - 0.5) * 1.5;
          } else {
            this.microVibrationTimer = 0;
            this.shakeOffsetX = 0;
          }
        }

        // Pista de poeira caindo
        this.clueDustTimer += dt;
        if (this.clueDustTimer > 0.4) {
          this.clueDustTimer = 0;
          particleSystem.emitClueDust(this.x + this.width * 0.5, this.y + this.height);
        }
      }
    }

    // 5. Queda da plataforma quebrada
    if (this.isFalling) {
      this.fallVy += 980 * dt;
      this.y += this.fallVy * dt;
    }
  }

  isPlayerOnTop(player) {
    const b = player.getBounds();
    return b.right > this.x && b.left < this.x + this.width && Math.abs(b.bottom - this.y) < 6;
  }

  onStep() {
    if (this.steppedOn || this.isBroken) return;
    this.steppedOn = true;
    this.steppedTimer = 0;

    if (this.type === PLATFORM_TYPES.FAKE || this.type === PLATFORM_TYPES.FRAGILE) {
      audio.playCrack();
    } else if (this.type === PLATFORM_TYPES.SURPRISE) {
      // Cai na hora com som surpresa!
      this.breakPlatform();
    }
  }

  breakPlatform() {
    if (this.isBroken) return;
    this.isBroken = true;
    this.isSolid = false;
    this.isFalling = true;
    this.fallVy = 80;

    audio.playBreak();
    particleSystem.emitPlatformCrumble(
      this.x,
      this.y,
      this.width,
      this.height,
      this.type === PLATFORM_TYPES.FAKE ? '#ef4444' : '#f59e0b'
    );
  }

  render(ctx, cameraX, cameraY, clueSubtlety = 1.0) {
    const screenX = this.x - cameraX + this.shakeOffsetX;
    const screenY = this.y - cameraY + this.shakeOffsetY;

    ctx.save();

    // Opacidade para Fantasma
    if (this.type === PLATFORM_TYPES.GHOST) {
      ctx.globalAlpha = this.ghostAlpha;
    }

    // 1. Cores de Superfície e Base
    let topColor = '#10b981'; // Verde seguro
    let baseColor = '#1e293b'; // Ardósia escura sólida
    let edgeColor = '#34d399';

    // Se estiver no modo de memória OCULTO, todas parecem absolutamente normais e iguais!
    const disguise = this.isMemoryHidden;

    if (!disguise) {
      if (this.type === PLATFORM_TYPES.FAKE) {
        // Tonalidade ligeiramente avermelhada / borda alterada proporcional à sutileza
        const rShift = Math.floor(16 + 80 * clueSubtlety);
        topColor = `rgb(${16 + rShift}, 160, 110)`;
        edgeColor = `rgb(${52 + rShift}, 180, 130)`;
      } else if (this.type === PLATFORM_TYPES.FRAGILE) {
        // Tonalidade ligeiramente âmbar/amarelada
        topColor = clueSubtlety > 0.5 ? '#eab308' : '#3cb371';
        edgeColor = clueSubtlety > 0.5 ? '#fde047' : '#5eead4';
      } else if (this.type === PLATFORM_TYPES.SURPRISE) {
        // Leve reflexo púrpura
        edgeColor = clueSubtlety > 0.5 ? '#a855f7' : '#34d399';
      } else if (this.type === PLATFORM_TYPES.MOVING) {
        topColor = '#0284c7';
        edgeColor = '#38bdf8';
        baseColor = '#0f172a';
      } else if (this.type === PLATFORM_TYPES.GHOST) {
        topColor = '#8b5cf6';
        edgeColor = '#c4b5fd';
        baseColor = '#1e1b4b';
      }
    }

    // 2. Desenho do Bloco da Plataforma
    const radius = 6;
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.moveTo(screenX + radius, screenY);
    ctx.lineTo(screenX + this.width - radius, screenY);
    ctx.quadraticCurveTo(screenX + this.width, screenY, screenX + this.width, screenY + radius);
    ctx.lineTo(screenX + this.width, screenY + this.height - radius);
    ctx.quadraticCurveTo(screenX + this.width, screenY + this.height, screenX + this.width - radius, screenY + this.height);
    ctx.lineTo(screenX + radius, screenY + this.height);
    ctx.quadraticCurveTo(screenX, screenY + this.height, screenX, screenY + this.height - radius);
    ctx.lineTo(screenX, screenY + radius);
    ctx.quadraticCurveTo(screenX, screenY, screenX + radius, screenY);
    ctx.closePath();
    ctx.fill();

    // 3. Camada Superior (Grama / Superfície)
    ctx.fillStyle = topColor;
    ctx.fillRect(screenX, screenY, this.width, 7);

    // Linha de Borda Superior Iluminada
    ctx.fillStyle = edgeColor;
    ctx.fillRect(screenX, screenY, this.width, 2);

    // 4. Detalhes de Pistas Visuais (Rachaduras)
    if (!disguise && (this.type === PLATFORM_TYPES.FAKE || this.type === PLATFORM_TYPES.FRAGILE || this.type === PLATFORM_TYPES.SURPRISE)) {
      this.drawCracks(ctx, screenX, screenY, clueSubtlety);
    }

    // 5. Detalhes de Plataforma Móvel (Setas indicativas de movimento)
    if (this.type === PLATFORM_TYPES.MOVING) {
      this.drawMovingChevrons(ctx, screenX, screenY);
    }

    // 6. Badges Revelados no Modo de Memória
    if (this.isMemoryRevealed && !this.isMemoryHidden) {
      this.drawMemoryBadge(ctx, screenX, screenY);
    }

    ctx.restore();
  }

  // Desenha rachaduras estilizadas como pista visual
  drawCracks(ctx, sx, sy, subtlety) {
    ctx.save();
    ctx.strokeStyle = this.type === PLATFORM_TYPES.FAKE ? 'rgba(239, 68, 68, 0.75)' : 'rgba(245, 158, 11, 0.75)';
    ctx.lineWidth = Math.max(1, 2.5 * subtlety);
    ctx.beginPath();

    const crackX = sx + this.width * (0.2 + (this.crackSeed * 0.6));
    ctx.moveTo(crackX, sy + 1);
    ctx.lineTo(crackX - 4 * subtlety, sy + 7);
    ctx.lineTo(crackX + 3 * subtlety, sy + 14);

    if (subtlety > 0.5) {
      // Ramificação extra na fase inicial
      ctx.moveTo(crackX - 4 * subtlety, sy + 7);
      ctx.lineTo(crackX - 9 * subtlety, sy + 11);
    }

    ctx.stroke();
    ctx.restore();
  }

  drawMovingChevrons(ctx, sx, sy) {
    ctx.save();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.5)';
    const midX = sx + this.width / 2;
    const midY = sy + this.height / 2 + 2;

    // Triângulos de sentido de movimento
    ctx.beginPath();
    ctx.moveTo(midX - 10, midY);
    ctx.lineTo(midX - 6, midY - 4);
    ctx.lineTo(midX - 6, midY + 4);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(midX + 10, midY);
    ctx.lineTo(midX + 6, midY - 4);
    ctx.lineTo(midX + 6, midY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawMemoryBadge(ctx, sx, sy) {
    ctx.save();
    let text = 'SEGURA';
    let bgColor = '#10b981';

    if (this.type === PLATFORM_TYPES.FAKE) {
      text = 'FALSA';
      bgColor = '#ef4444';
    } else if (this.type === PLATFORM_TYPES.FRAGILE) {
      text = 'FRÁGIL';
      bgColor = '#f59e0b';
    } else if (this.type === PLATFORM_TYPES.SURPRISE) {
      text = 'PERIGO';
      bgColor = '#a855f7';
    }

    const badgeW = 60;
    const badgeH = 18;
    const badgeX = sx + (this.width - badgeW) / 2;
    const badgeY = sy - 26;

    // Balão com cantos arredondados compatível
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
    } else {
      ctx.rect(badgeX, badgeY, badgeW, badgeH);
    }
    ctx.fill();

    // Pequeno triângulo apontador
    ctx.beginPath();
    ctx.moveTo(badgeX + badgeW / 2 - 4, badgeY + badgeH);
    ctx.lineTo(badgeX + badgeW / 2 + 4, badgeY + badgeH);
    ctx.lineTo(badgeX + badgeW / 2, badgeY + badgeH + 4);
    ctx.closePath();
    ctx.fill();

    // Texto
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, badgeX + badgeW / 2, badgeY + badgeH / 2);

    ctx.restore();
  }
}
