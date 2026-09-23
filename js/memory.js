/**
 * MemorySystem - Gerenciador dos Desafios de Sequência de Memória
 * Exibe rapidamente pistas das próximas plataformas e oculta temporariamente para testar a memória.
 */
class MemorySystem {
  constructor() {
    this.isActive = false;
    this.isMemorizing = false; // Período de preview (1.8s)
    this.previewTimer = 0;
    this.previewDuration = 1.8;
    this.platformsInChallenge = [];
    this.lastTriggerDistance = 0;
    this.triggerInterval = 380; // Metros entre cada desafio

    this.bannerEl = document.getElementById('memory-banner');
    this.timerFillEl = document.getElementById('memory-timer-fill');
    this.instructionEl = document.getElementById('memory-instruction');
  }

  reset() {
    this.isActive = false;
    this.isMemorizing = false;
    this.previewTimer = 0;
    this.platformsInChallenge = [];
    this.lastTriggerDistance = 0;
    this.hideBanner();
  }

  // Verifica se é hora de iniciar um novo desafio de memória
  checkTrigger(distanceMeters, platforms, playerX) {
    if (this.isActive) return;
    if (distanceMeters - this.lastTriggerDistance >= this.triggerInterval) {
      // Pega as próximas 4 a 6 plataformas à frente do jogador
      const upcoming = platforms.filter(p => p.x > playerX + 180 && !p.isBroken).slice(0, 5);

      if (upcoming.length >= 4) {
        this.startChallenge(upcoming, distanceMeters);
      }
    }
  }

  startChallenge(platforms, currentDistance) {
    this.isActive = true;
    this.isMemorizing = true;
    this.previewTimer = this.previewDuration;
    this.platformsInChallenge = platforms;
    this.lastTriggerDistance = currentDistance;

    // Configura plataformas para revelação clara
    this.platformsInChallenge.forEach(p => {
      p.isMemoryRevealed = true;
      p.isMemoryHidden = false;
    });

    audio.playMemoryStart();
    this.showBanner();
  }

  update(dt, player, onChallengeSuccess) {
    if (!this.isActive) return;

    if (this.isMemorizing) {
      this.previewTimer -= dt;
      const progress = Math.max(0, this.previewTimer / this.previewDuration);
      if (this.timerFillEl) {
        this.timerFillEl.style.width = `${progress * 100}%`;
      }

      if (this.previewTimer <= 0) {
        // Fim do tempo de preview: OCULTA TODAS AS PISTAS!
        this.isMemorizing = false;
        this.platformsInChallenge.forEach(p => {
          p.isMemoryRevealed = false;
          p.isMemoryHidden = true; // Chão fica aparentemente uniforme
        });

        if (this.instructionEl) {
          this.instructionEl.textContent = 'PISTAS ESCONDIDAS! CONFIE NA SUA MEMÓRIA!';
        }

        // Esconde banner após 1s de aviso
        setTimeout(() => {
          this.hideBanner();
        }, 1200);
      }
    } else {
      // Jogador está atravessando o trecho
      const lastPlatform = this.platformsInChallenge[this.platformsInChallenge.length - 1];
      if (lastPlatform && player.x > lastPlatform.x + lastPlatform.width) {
        // Passou com sucesso pelo trecho de memória!
        this.completeChallenge(player, onChallengeSuccess);
      }
    }
  }

  completeChallenge(player, callback) {
    this.isActive = false;
    this.platformsInChallenge.forEach(p => {
      p.isMemoryHidden = false;
    });
    this.platformsInChallenge = [];

    audio.playMemorySuccess();
    particleSystem.emitCelebration(player.x, player.y);

    if (callback) {
      callback(500); // 500 pontos de super bônus
    }
  }

  showBanner() {
    if (this.bannerEl) {
      if (this.instructionEl) {
        this.instructionEl.textContent = 'MEMORIZE O CAMINHO ANTES QUE AS PISTAS SUMAM!';
      }
      if (this.timerFillEl) {
        this.timerFillEl.style.width = '100%';
      }
      this.bannerEl.classList.remove('hidden');
    }
  }

  hideBanner() {
    if (this.bannerEl) {
      this.bannerEl.classList.add('hidden');
    }
  }
}

const memorySystem = new MemorySystem();
