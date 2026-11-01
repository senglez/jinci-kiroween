// First-person "time tunnel": stars stream past the viewer while glowing
// tree-ring-like circles (annual rings of time) rush toward the camera.
// `speed` is eased toward `targetSpeed`; `age` (0 = now, 1 = AD 1023) tints the tunnel sepia.

export class Warp {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.speed = 0.2;
    this.targetSpeed = 0.2;
    this.age = 0;
    this.running = false;
    this.stars = Array.from({ length: 700 }, () => this.spawnStar(true));
    this.rings = Array.from({ length: 14 }, (_, i) => ({ z: (i + 1) / 14, rot: Math.random() * 6.28, seed: Math.random() }));
    this.resize = this.resize.bind(this);
    this.frame = this.frame.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  spawnStar(anyDepth = false) {
    const a = Math.random() * Math.PI * 2;
    const r = 0.05 + Math.random() * 1.2;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, z: anyDepth ? Math.random() : 1, hue: Math.random() < 0.25 ? 28 : 270 };
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = this.canvas.clientWidth;
    this.h = this.canvas.clientHeight;
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.resize);
  }

  frame(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.speed += (this.targetSpeed - this.speed) * Math.min(1, dt * 2.5);
    this.draw(dt, now / 1000);
    requestAnimationFrame(this.frame);
  }

  draw(dt, t) {
    const { ctx, w, h } = this;
    const cx = w / 2 + Math.sin(t * 0.7) * w * 0.02 * this.speed;
    const cy = h / 2 + Math.cos(t * 0.5) * h * 0.02 * this.speed;
    const focal = Math.min(w, h) * 0.6;

    // background: deep night purple fading to old-paper amber as we go back
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.75);
    const mix = (a, b) => a.map((v, i) => Math.round(v + (b[i] - v) * this.age));
    const inner = mix([60, 20, 90], [120, 70, 25]);
    const outer = mix([6, 3, 14], [18, 9, 3]);
    g.addColorStop(0, `rgb(${inner})`);
    g.addColorStop(1, `rgb(${outer})`);
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.55 + 0.4 * (1 - Math.min(1, this.speed / 3)); // leave motion trails at speed
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;

    // rings of time
    ctx.lineWidth = 2;
    for (const ring of this.rings) {
      ring.z -= dt * this.speed * 0.18;
      if (ring.z <= 0.02) { ring.z += 1; ring.seed = Math.random(); }
      const r = focal * 0.35 / ring.z;
      if (r > Math.max(w, h) * 1.4) continue;
      const alpha = Math.min(1, (1 - ring.z) * 1.3) * 0.55;
      const hue = 275 - this.age * 245 + ring.seed * 20; // violet -> amber
      ctx.strokeStyle = `hsla(${hue}, 85%, ${55 + ring.seed * 15}%, ${alpha})`;
      ctx.setLineDash([r * 0.08, r * 0.05 + 6]);
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.92, ring.rot + t * 0.2 * (ring.seed - 0.5), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // streaking stars
    for (const s of this.stars) {
      const pz = s.z;
      s.z -= dt * this.speed * 0.35;
      if (s.z <= 0.01) Object.assign(s, this.spawnStar());
      const x1 = cx + (s.x / pz) * focal * 0.5;
      const y1 = cy + (s.y / pz) * focal * 0.5;
      const x2 = cx + (s.x / s.z) * focal * 0.5;
      const y2 = cy + (s.y / s.z) * focal * 0.5;
      const light = 1 - s.z;
      const hue = s.hue === 28 ? 28 : 270 - this.age * 230;
      ctx.strokeStyle = `hsla(${hue}, 90%, ${60 + light * 30}%, ${light})`;
      ctx.lineWidth = Math.max(0.6, light * 2.6);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // vignette
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
}
