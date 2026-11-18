(function (global) {
  'use strict';

  const EB = (global.EB = global.EB || {});

  const ELEMENT_COLORS = {
    fire: ['#FF6D00', '#FF3D00', '#FFD180'],
    water: ['#00E5FF', '#2979FF', '#B2EBF2'],
    earth: ['#00E676', '#8D6E63', '#B9F6CA'],
    air: ['#B388FF', '#FFFFFF', '#E1BEE7']
  };

  const ParticleEngine = {
    particles: [],
    floatingTexts: [],
    lineFlashes: [],
    lightningBolts: [],
    shockwaves: [],
    shakeTime: 0,
    shakeMagnitude: 0,

    clear() {
      this.particles = [];
      this.floatingTexts = [];
      this.lineFlashes = [];
      this.lightningBolts = [];
      this.shockwaves = [];
      this.shakeTime = 0;
    },

    triggerShake(magnitude = 7, duration = 0.25) {
      this.shakeMagnitude = magnitude;
      this.shakeTime = duration;
    },

    spawnBlockBurst(x, y, size, element, count = 12) {
      const palette = ELEMENT_COLORS[element] || ['#00E5FF', '#2979FF', '#FFFFFF'];
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 190;
        this.particles.push({
          x: x + size * 0.5,
          y: y + size * 0.5,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 30,
          gravity: 260,
          radius: 2.5 + Math.random() * 4.5,
          color: palette[Math.floor(Math.random() * palette.length)],
          life: 0,
          maxLife: 0.45 + Math.random() * 0.35,
          isStar: false
        });
      }
    },

    spawnPlacementRipple(x, y, size, element) {
      const palette = ELEMENT_COLORS[element] || ['#00E5FF'];
      this.shockwaves.push({
        x: x + size * 0.5,
        y: y + size * 0.5,
        radius: size * 0.25,
        maxRadius: size * 0.9,
        color: palette[0],
        life: 0,
        maxLife: 0.24
      });
    },

    spawnLineFlash(x, y, w, h) {
      this.lineFlashes.push({
        x,
        y,
        w,
        h,
        life: 0,
        maxLife: 0.32
      });
    },

    spawnExplosion(cx, cy, radius) {
      this.shockwaves.push({
        x: cx,
        y: cy,
        radius: 10,
        maxRadius: radius,
        color: '#FF6D00',
        life: 0,
        maxLife: 0.4
      });
      for (let i = 0; i < 42; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 70 + Math.random() * 280;
        const colors = ['#FF3D00', '#FF9100', '#FFD740', '#FFFFFF'];
        this.particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          gravity: 180,
          radius: 3 + Math.random() * 6,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 0,
          maxLife: 0.45 + Math.random() * 0.35,
          isStar: false
        });
      }
      this.triggerShake(10, 0.32);
    },

    spawnLightningStrike(targetX, targetY, topY) {
      const points = [];
      const segments = 6;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const px = targetX + (i === 0 || i === segments ? 0 : (Math.random() - 0.5) * 24);
        const py = topY + (targetY - topY) * t;
        points.push({ x: px, y: py });
      }
      this.lightningBolts.push({
        points,
        life: 0,
        maxLife: 0.32
      });
      this.triggerShake(6, 0.22);
    },

    spawnStarFly(x, y, targetX, targetY) {
      this.particles.push({
        x,
        y,
        startX: x,
        startY: y,
        targetX,
        targetY,
        radius: 11,
        color: '#FFD740',
        life: 0,
        maxLife: 0.58,
        isStar: true
      });
    },

    spawnFloatingText(text, x, y, color = '#00E5FF', fontSize = 20) {
      this.floatingTexts.push({
        text,
        x,
        y,
        vy: -56,
        color,
        fontSize,
        life: 0,
        maxLife: 0.95
      });
    },

    update(dt) {
      if (this.shakeTime > 0) {
        this.shakeTime = Math.max(0, this.shakeTime - dt);
      }

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
          this.particles.splice(i, 1);
          continue;
        }
        if (p.isStar) {
          const t = p.life / p.maxLife;
          const ease = 1 - Math.pow(1 - t, 3);
          p.x = p.startX + (p.targetX - p.startX) * ease;
          p.y = p.startY + (p.targetY - p.startY) * ease - Math.sin(t * Math.PI) * 35;
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += p.gravity * dt;
        }
      }

      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const f = this.floatingTexts[i];
        f.life += dt;
        if (f.life >= f.maxLife) {
          this.floatingTexts.splice(i, 1);
          continue;
        }
        f.y += f.vy * dt;
        f.vy *= 0.96;
      }

      for (let i = this.lineFlashes.length - 1; i >= 0; i--) {
        this.lineFlashes[i].life += dt;
        if (this.lineFlashes[i].life >= this.lineFlashes[i].maxLife) {
          this.lineFlashes.splice(i, 1);
        }
      }

      for (let i = this.lightningBolts.length - 1; i >= 0; i--) {
        this.lightningBolts[i].life += dt;
        if (this.lightningBolts[i].life >= this.lightningBolts[i].maxLife) {
          this.lightningBolts.splice(i, 1);
        }
      }

      for (let i = this.shockwaves.length - 1; i >= 0; i--) {
        this.shockwaves[i].life += dt;
        if (this.shockwaves[i].life >= this.shockwaves[i].maxLife) {
          this.shockwaves.splice(i, 1);
        }
      }
    },

    render(ctx) {
      // Line flashes
      this.lineFlashes.forEach((f) => {
        const alpha = 1 - f.life / f.maxLife;
        ctx.save();
        ctx.fillStyle = `rgba(0, 229, 255, ${alpha * 0.55})`;
        ctx.fillRect(f.x, f.y, f.w, f.h);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
        ctx.fillRect(f.x + 2, f.y + 2, f.w - 4, f.h - 4);
        ctx.restore();
      });

      // Shockwaves
      this.shockwaves.forEach((s) => {
        const t = s.life / s.maxLife;
        const r = s.radius + (s.maxRadius - s.radius) * t;
        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 4 * (1 - t);
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // Lightning bolts
      this.lightningBolts.forEach((b) => {
        const alpha = 1 - b.life / b.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#00E5FF';
        ctx.shadowColor = '#00E5FF';
        ctx.shadowBlur = 14;
        ctx.lineWidth = 4;
        ctx.beginPath();
        b.points.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.restore();
      });

      // Particles
      this.particles.forEach((p) => {
        const alpha = 1 - p.life / p.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        if (p.isStar) {
          ctx.fillStyle = '#FFD740';
          ctx.shadowColor = '#FFD740';
          ctx.shadowBlur = 10;
          drawStarShape(ctx, p.x, p.y, 5, p.radius, p.radius * 0.45);
          ctx.fill();
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * (1 - (p.life / p.maxLife) * 0.4), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Floating Texts
      this.floatingTexts.forEach((f) => {
        const t = f.life / f.maxLife;
        const alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.font = `900 ${f.fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(6, 13, 42, 0.85)';
        ctx.strokeText(f.text, f.x, f.y);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
        ctx.restore();
      });
    }
  };

  function drawStarShape(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  }

  EB.Particles = ParticleEngine;
  EB.drawStarShape = drawStarShape;
})(window);
