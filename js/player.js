/**
 * Player - Classe do personagem jogável
 * Controla física, estados (correr, pular, abaixar, cair), animações e renderização vetorial.
 */
class Player {
  constructor() {
    this.width = 38;
    this.height = 48;
    this.standHeight = 48;
    this.duckHeight = 24;

    this.x = 100;
    this.y = 200;
    this.vx = 320; // Velocidade horizontal inicial (pixels/s)
    this.vy = 0;   // Velocidade vertical

    this.gravity = 1450;
    this.jumpForce = -520;
    this.minJumpForce = -280;

    this.isGrounded = false;
    this.isDucking = false;
    this.isDead = false;

    // Buffers para controles precisos
    this.coyoteTime = 0.1;
    this.coyoteTimer = 0;
    this.jumpBufferTime = 0.12;
    this.jumpBufferTimer = 0;

    // Animação & Squash & Stretch
    this.runCycle = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.rotation = 0;

    // Cachecol estilizado que balança com a física
    this.scarfSegments = [
      { x: 0, y: 0 },
      { x: -10, y: 5 },
      { x: -20, y: 10 },
      { x: -30, y: 16 }
    ];

    this.colorBody = '#00f0ff';
    this.colorScarf = '#ff007f';
    this.colorHead = '#f8fafc';
  }

  reset(startX = 120, startY = 280) {
    this.x = startX;
    this.y = startY;
    this.vx = 320;
    this.vy = 0;
    this.height = this.standHeight;
    this.isGrounded = false;
    this.isDucking = false;
    this.isDead = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.runCycle = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.rotation = 0;

    for (let i = 0; i < this.scarfSegments.length; i++) {
      this.scarfSegments[i] = { x: this.x - i * 8, y: this.y + 12 };
    }
  }

  // Solicita pulo (bufferizado)
  requestJump() {
    if (this.isDead) return;
    this.jumpBufferTimer = this.jumpBufferTime;
  }

  // Cancela pulo cedo (pulo com altura variável ao soltar botão)
  cancelJump() {
    if (this.vy < this.minJumpForce) {
      this.vy = this.minJumpForce;
    }
  }

  // Define se está abaixado
  setDucking(ducking) {
    if (this.isDead) return;
    if (ducking && !this.isDucking) {
      this.isDucking = true;
      this.height = this.duckHeight;
      this.y += (this.standHeight - this.duckHeight);
      audio.playSlide();
    } else if (!ducking && this.isDucking) {
      this.isDucking = false;
      this.y -= (this.standHeight - this.duckHeight);
      this.height = this.standHeight;
    }
  }

  update(dt, currentSpeed) {
    if (this.isDead) {
      // Animação dramática de queda giratória
      this.vy += this.gravity * 0.9 * dt;
      this.y += this.vy * dt;
      this.x += this.vx * 0.3 * dt;
      this.rotation += 8 * dt;
      return;
    }

    this.vx = currentSpeed;
    this.x += this.vx * dt;

    // Física Vertical
    this.vy += this.gravity * dt;
    this.y += this.vy * dt;

    // Timers de Coyote e Jump Buffer
    if (this.isGrounded) {
      this.coyoteTimer = this.coyoteTime;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);

    // Executa pulo se buffer e coyote forem válidos
    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.performJump();
    }

    // Animação de corrida
    if (this.isGrounded && !this.isDucking) {
      this.runCycle += dt * (this.vx / 35);
      particleSystem.emitRunDust(this.x + 8, this.y + this.height);
    }

    // Retorno suave de Squash & Stretch
    this.scaleX += (1 - this.scaleX) * 12 * dt;
    this.scaleY += (1 - this.scaleY) * 12 * dt;

    // Atualiza segmentos do cachecol com inércia
    this.updateScarf(dt);
  }

  performJump() {
    this.vy = this.jumpForce;
    this.isGrounded = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;

    // Efeito de estiramento do pulo
    this.scaleX = 0.8;
    this.scaleY = 1.3;

    audio.playJump();
    particleSystem.emitDustLanding(this.x + this.width / 2, this.y + this.height);
  }

  landOnPlatform(platformY) {
    if (this.vy > 0) {
      this.y = platformY - this.height;
      this.vy = 0;
      if (!this.isGrounded) {
        this.isGrounded = true;
        // Squash ao aterrissar
        this.scaleX = 1.3;
        this.scaleY = 0.75;
        audio.playLand();
        particleSystem.emitDustLanding(this.x + this.width / 2, this.y + this.height);
      }
    }
  }

  updateScarf(dt) {
    const headX = this.x + 10;
    const headY = this.y + (this.isDucking ? 12 : 16);

    this.scarfSegments[0].x = headX;
    this.scarfSegments[0].y = headY;

    for (let i = 1; i < this.scarfSegments.length; i++) {
      const prev = this.scarfSegments[i - 1];
      const cur = this.scarfSegments[i];

      // O vento puxa para a esquerda proporcional à velocidade
      const targetX = prev.x - 10 - (this.vx / 80);
      const wave = Math.sin(this.runCycle * 1.5 + i) * 4;
      const targetY = prev.y + (this.vy * 0.04) + wave;

      cur.x += (targetX - cur.x) * 18 * dt;
      cur.y += (targetY - cur.y) * 18 * dt;
    }
  }

  // Hitbox AABB para colisão com plataformas e obstáculos
  getBounds() {
    return {
      left: this.x + 4,
      right: this.x + this.width - 4,
      top: this.y,
      bottom: this.y + this.height
    };
  }

  render(ctx, cameraX, cameraY) {
    const screenX = this.x - cameraX;
    const screenY = this.y - cameraY;

    ctx.save();
    ctx.translate(screenX + this.width / 2, screenY + this.height / 2);

    if (this.rotation !== 0) {
      ctx.rotate(this.rotation);
    }
    ctx.scale(this.scaleX, this.scaleY);

    const halfW = this.width / 2;
    const halfH = this.height / 2;

    // 1. Renderiza Cachecol Atrás do Personagem
    ctx.save();
    ctx.strokeStyle = this.colorScarf;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-halfW + 10, -halfH + (this.isDucking ? 10 : 16));
    for (let i = 1; i < this.scarfSegments.length; i++) {
      const seg = this.scarfSegments[i];
      ctx.lineTo(seg.x - (this.x + halfW), seg.y - (this.y + halfH));
    }
    ctx.stroke();
    ctx.restore();

    // 2. Pernas / Corrida
    if (!this.isDead && !this.isDucking) {
      const legOffset = Math.sin(this.runCycle) * 10;
      ctx.fillStyle = '#0284c7';
      // Perna Esquerda
      ctx.fillRect(-halfW + 6 + (this.isGrounded ? legOffset : 4), halfH - 12, 7, 12);
      // Perna Direita
      ctx.fillRect(-halfW + 18 - (this.isGrounded ? legOffset : -4), halfH - 12, 7, 12);
    } else if (this.isDucking) {
      // Pernas esticadas deslizando
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-halfW - 4, halfH - 8, 16, 7);
    }

    // 3. Corpo Principal (Design geométrico e moderno)
    const bodyHeight = this.isDucking ? halfH : halfH * 1.5;
    const bodyRadius = 8;

    ctx.fillStyle = this.colorBody;
    this.roundRect(ctx, -halfW + 4, -halfH + 2, this.width - 8, bodyHeight, bodyRadius);

    // Efeito de brilho / luz no corpo
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    this.roundRect(ctx, -halfW + 6, -halfH + 4, this.width - 16, 4, 2);

    // 4. Cabeça / Viseira Expressiva
    const eyeY = this.isDucking ? -halfH + 7 : -halfH + 11;
    ctx.fillStyle = '#0f172a';
    this.roundRect(ctx, halfW - 16, eyeY, 14, 10, 3);

    // Pupila / Brilho Neon na Viseira
    ctx.fillStyle = '#38bdf8';
    if (this.isDead) {
      // Olho em X quando cai
      ctx.strokeStyle = '#ff007f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(halfW - 14, eyeY + 2);
      ctx.lineTo(halfW - 4, eyeY + 8);
      ctx.moveTo(halfW - 4, eyeY + 2);
      ctx.lineTo(halfW - 14, eyeY + 8);
      ctx.stroke();
    } else {
      ctx.fillRect(halfW - 10, eyeY + 2, 6, 6);
    }

    // 5. Faixa do Cachecol no Pescoço
    ctx.fillStyle = this.colorScarf;
    this.roundRect(ctx, -halfW + 4, eyeY + 11, this.width - 8, 6, 3);

    ctx.restore();
  }

  // Utilitário para retângulos arredondados
  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  }
}
