/**
 * ClueSystem - Gerenciador do Sistema de Pistas Visuais
 * Modula a sutileza das pistas conforme a progressão da fase e distância percorrida.
 */
class ClueSystem {
  constructor() {
    this.phase = 'initial'; // 'initial' (0-350m), 'medium' (350-850m), 'advanced' (850m+)
    this.clueSubtlety = 1.0; // 1.0 = super claro e evidente, 0.25 = sutil e rápido
  }

  update(distanceMeters) {
    if (distanceMeters < 350) {
      this.phase = 'initial';
      this.clueSubtlety = 1.0; // Pistas muito claras: rachaduras grandes, contraste visível, vibrações
    } else if (distanceMeters < 850) {
      this.phase = 'medium';
      this.clueSubtlety = 0.65; // Pistas médias: fissuras menores, cores mais próximas
    } else {
      this.phase = 'advanced';
      this.clueSubtlety = 0.35; // Pistas sutis: micro-trincas e reflexos rápidos
    }
  }

  getPhaseName() {
    if (this.phase === 'initial') return 'INICIAL';
    if (this.phase === 'medium') return 'MÉDIA';
    return 'AVANÇADA';
  }

  getPhaseClass() {
    return this.phase;
  }
}

const clueSystem = new ClueSystem();
