export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  shape: 'circle' | 'rect' | 'spark' | 'ring';
  rotation: number;
  vRotation: number;
  gravity: number;
  alphaFade: boolean;
}

export interface Popup {
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  text: string;
  color: string;
  size: number;
}

/** 오브젝트 풀링된 파티클/팝업 매니저 — 저사양 모바일에서도 GC 압박 없이 동작하도록 배열 재사용. */
export class EffectPool {
  private particles: Particle[] = [];
  private popups: Popup[] = [];
  private readonly maxParticles = 260;

  spawnParticle(p: Omit<Particle, 'life'> & { life?: number }) {
    if (this.particles.length >= this.maxParticles) this.particles.shift();
    this.particles.push({ ...p, life: p.life ?? p.maxLife } as Particle);
  }

  spawnPopup(p: Omit<Popup, 'life'>) {
    this.popups.push({ ...p, life: p.maxLife });
  }

  spawnBurst(
    x: number,
    y: number,
    count: number,
    color: string,
    speed: [number, number],
    life: [number, number],
    shape: Particle['shape'] = 'circle',
    rng: () => number = Math.random,
  ) {
    for (let i = 0; i < count; i++) {
      const angle = rng() * Math.PI * 2;
      const spd = speed[0] + rng() * (speed[1] - speed[0]);
      this.spawnParticle({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        maxLife: life[0] + rng() * (life[1] - life[0]),
        color,
        size: 3 + rng() * 5,
        shape,
        rotation: rng() * Math.PI * 2,
        vRotation: (rng() - 0.5) * 6,
        gravity: 220,
        alphaFade: true,
      });
    }
  }

  spawnRing(x: number, y: number, color: string) {
    this.spawnParticle({
      x,
      y,
      vx: 0,
      vy: 0,
      maxLife: 500,
      color,
      size: 4,
      shape: 'ring',
      rotation: 0,
      vRotation: 0,
      gravity: 0,
      alphaFade: true,
    });
  }

  update(dt: number) {
    const s = dt / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * s;
      p.x += p.vx * s;
      p.y += p.vy * s;
      p.rotation += p.vRotation * s;
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.popups.splice(i, 1);
        continue;
      }
      p.y += p.vy * s;
    }
  }

  getParticles(): readonly Particle[] {
    return this.particles;
  }

  getPopups(): readonly Popup[] {
    return this.popups;
  }

  clear() {
    this.particles.length = 0;
    this.popups.length = 0;
  }
}
