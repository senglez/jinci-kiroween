// Ambient Halloween effects: drifting ghost-fire wisps, bats, and a lantern-light burst on success.

export class Embers {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.wisps = [];
    this.sparks = [];
    this.density = 0;
    this.frame = this.frame.bind(this);
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = this.canvas.clientWidth;
    this.h = this.canvas.clientHeight;
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setDensity(n) {
    this.density = n;
  }

  // Burst of lantern sparks (used for snaps and the final celebration).
  burst(x, y, count = 40, hues = [28, 45, 280]) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 60 + Math.random() * 260;
      this.sparks.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60,
        life: 1, decay: 0.5 + Math.random() * 0.7,
        hue: hues[Math.floor(Math.random() * hues.length)], size: 1.5 + Math.random() * 2.5,
      });
    }
  }

  celebrate() {
    let n = 0;
    const fire = () => {
      this.burst(this.w * (0.15 + Math.random() * 0.7), this.h * (0.1 + Math.random() * 0.4), 70);
      if (++n < 9) setTimeout(fire, 380);
    };
    fire();
  }

  frame(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);

    if (this.wisps.length < this.density && Math.random() < 0.3) {
      this.wisps.push({ x: Math.random() * w, y: h + 20, r: 3 + Math.random() * 5, vy: 18 + Math.random() * 30, phase: Math.random() * 6, life: 1, hue: Math.random() < 0.6 ? 160 : 280 });
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.wisps) {
      p.y -= p.vy * dt;
      p.x += Math.sin(now / 700 + p.phase) * 0.6;
      p.life -= dt * 0.12;
      const gl = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
      gl.addColorStop(0, `hsla(${p.hue}, 90%, 70%, ${0.5 * p.life})`);
      gl.addColorStop(1, `hsla(${p.hue}, 90%, 50%, 0)`);
      ctx.fillStyle = gl;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    this.wisps = this.wisps.filter((p) => p.life > 0 && p.y > -40);

    for (const s of this.sparks) {
      s.vy += 140 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 0.985;
      s.life -= s.decay * dt;
      ctx.fillStyle = `hsla(${s.hue}, 95%, 65%, ${Math.max(0, s.life)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    this.sparks = this.sparks.filter((s) => s.life > 0);
    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(this.frame);
  }
}

const BAT_PATH = 'M0 8 C6 2 10 2 14 6 C16 2 18 1 20 3 C22 1 24 2 26 6 C30 2 34 2 40 8 C34 7 31 9 30 12 C27 9 24 10 22 13 L20 10 L18 13 C16 10 13 9 10 12 C9 9 6 7 0 8 Z';

export function spawnBats(container, count = 7) {
  for (let i = 0; i < count; i++) {
    const bat = document.createElement('div');
    bat.className = 'bat';
    bat.style.setProperty('--top', `${5 + Math.random() * 45}%`);
    bat.style.setProperty('--dur', `${14 + Math.random() * 16}s`);
    bat.style.setProperty('--delay', `${-Math.random() * 25}s`);
    bat.style.setProperty('--scale', `${0.6 + Math.random() * 0.9}`);
    bat.innerHTML = `<svg viewBox="0 0 40 16" aria-hidden="true"><path d="${BAT_PATH}"/></svg>`;
    container.appendChild(bat);
  }
}
