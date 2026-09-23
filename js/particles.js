/**
 * ParticleSystem - Sistema de partículas de alta performance em Canvas 2D
 */
class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  // Reseta todas as partículas ativas
  reset() {
    this.particles = [];
  }

  // Atualiza física das partículas e remove expiradas
  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.gravity || 0) * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.rotation !== undefined) {
        p.rotation += (p.vRot || 0) * dt;
      }
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // Renderiza todas as partículas na cena (ajustadas pela câmera)
  render(ctx, cameraX, cameraY) {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const screenX = p.x - cameraX;
      const screenY = p.y - cameraY;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(screenX, screenY);
      if (p.rotation) {
        ctx.rotate(p.rotation);
      }

      if (p.type === 'circle') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'rect' || p.type === 'debris') {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else if (p.type === 'spark') {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size * 1.5, -p.size * 0.5, p.size * 3, p.size);
      } else if (p.type === 'star') {
        ctx.fillStyle = p.color;
        this.drawStar(ctx, 0, 0, 5, p.size * 1.2, p.size * 0.6);
      }

      ctx.restore();
    }
  }

  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }

  // Poeira de aterrissagem
  emitDustLanding(x, y) {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI / 8) * i + Math.PI;
      const speed = 40 + Math.random() * 60;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y,
        vx: Math.cos(angle) * speed + (i < 4 ? -30 : 30),
        vy: -Math.random() * 40 - 10,
        gravity: 120,
        size: 3 + Math.random() * 3,
        color: '#e2e8f0',
        life: 0.35 + Math.random() * 0.2,
        maxLife: 0.5,
        type: 'circle'
      });
    }
  }

  // Poeira ao correr
  emitRunDust(x, y) {
    if (Math.random() > 0.4) return;
    this.particles.push({
      x: x - 6,
      y: y,
      vx: -50 - Math.random() * 40,
      vy: -15 - Math.random() * 20,
      gravity: 50,
      size: 2 + Math.random() * 2.5,
      color: '#cbd5e1',
      life: 0.25,
      maxLife: 0.25,
      type: 'circle'
    });
  }

  // Escombros de plataforma falsa quebrando
  emitPlatformCrumble(x, y, width, height, baseColor = '#64748b') {
    const count = Math.min(24, Math.floor(width / 8));
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + Math.random() * width,
        y: y + Math.random() * height,
        vx: (Math.random() - 0.5) * 180,
        vy: -40 - Math.random() * 120,
        gravity: 580,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 12,
        size: 4 + Math.random() * 6,
        color: baseColor,
        life: 0.8 + Math.random() * 0.5,
        maxLife: 1.3,
        type: 'debris'
      });
    }
  }

  // Pista sutil: micro-cascalho caindo debaixo da plataforma
  emitClueDust(x, y) {
    if (Math.random() > 0.3) return;
    this.particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y,
      vx: (Math.random() - 0.5) * 15,
      vy: 30 + Math.random() * 40,
      gravity: 120,
      size: 1.5 + Math.random() * 1.5,
      color: 'rgba(239, 68, 68, 0.75)',
      life: 0.4 + Math.random() * 0.3,
      maxLife: 0.7,
      type: 'circle'
    });
  }

  // Confetes e estrelas para bônus ou novo recorde
  emitCelebration(x, y) {
    const colors = ['#ffbe0b', '#00f0ff', '#ff007f', '#10b981', '#8b5cf6'];
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 260;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        gravity: 300,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 8,
        size: 5 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0.9 + Math.random() * 0.8,
        maxLife: 1.7,
        type: Math.random() > 0.4 ? 'star' : 'rect'
      });
    }
  }
}

const particleSystem = new ParticleSystem();
