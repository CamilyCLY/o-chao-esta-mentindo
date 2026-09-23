/**
 * Obstacles - Obstáculos simples complementares
 * Spikes (espinhos que exigem pulo) e Birds (pássaros voadores que exigem abaixar/slide)
 */

const OBSTACLE_TYPES = {
  SPIKE: 'SPIKE',
  BIRD: 'BIRD'
};

class Obstacle {
  constructor(x, y, type = OBSTACLE_TYPES.SPIKE, platform = null) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.platform = platform; // Referência da plataforma de suporte

    if (this.type === OBSTACLE_TYPES.SPIKE) {
      this.width = 24;
      this.height = 18;
    } else if (this.type === OBSTACLE_TYPES.BIRD) {
      this.width = 32;
      this.height = 20;
      this.wingCycle = Math.random() * 5;
      this.flySpeed = 60; // Velocidade extra em relação ao cenário
    }
  }

  update(dt) {
    if (this.type === OBSTACLE_TYPES.BIRD) {
      this.wingCycle += dt * 10;
      this.x -= this.flySpeed * dt; // Voa contra o jogador
    } else if (this.type === OBSTACLE_TYPES.SPIKE && this.platform) {
      // Se a plataforma for móvel ou estiver tremendo/caindo, o espinho acompanha
      this.y = this.platform.y - this.height;
    }
  }

  getBounds() {
    return {
      left: this.x + 2,
      right: this.x + this.width - 2,
      top: this.y + 2,
      bottom: this.y + this.height - 2
    };
  }

  checkCollision(player) {
    const pb = player.getBounds();
    const ob = this.getBounds();

    const intersects = !(
      pb.right < ob.left ||
      pb.left > ob.right ||
      pb.bottom < ob.top ||
      pb.top > ob.bottom
    );

    return intersects;
  }

  render(ctx, cameraX, cameraY) {
    const sx = this.x - cameraX;
    const sy = this.y - cameraY;

    ctx.save();

    if (this.type === OBSTACLE_TYPES.SPIKE) {
      // Espinhos geométricos em gradiente vermelho-coral
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 1.5;

      const numSpikes = 2;
      const spikeW = this.width / numSpikes;

      for (let i = 0; i < numSpikes; i++) {
        const spikeX = sx + i * spikeW;
        ctx.beginPath();
        ctx.moveTo(spikeX, sy + this.height);
        ctx.lineTo(spikeX + spikeW / 2, sy);
        ctx.lineTo(spikeX + spikeW, sy + this.height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (this.type === OBSTACLE_TYPES.BIRD) {
      // Pássaro estilizado / Drone futurista
      ctx.translate(sx + this.width / 2, sy + this.height / 2);

      // Corpo
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Olho
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-8, -3, 3, 3);

      // Bico
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(-17, 0);
      ctx.lineTo(-12, 4);
      ctx.closePath();
      ctx.fill();

      // Asas batendo
      const wingY = Math.sin(this.wingCycle) * 10;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(2, -2);
      ctx.lineTo(6, wingY);
      ctx.lineTo(-4, -2);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}
