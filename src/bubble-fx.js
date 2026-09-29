import { COLORS } from './bubble-core.js';
import { star } from './bubble-art.js';

export function createFireworks(canvas, reduced = false) {
  const ctx = canvas.getContext('2d'); let width = 1, height = 1, time = 0, next = 0, particles = [], rockets = [];
  function resize() { width = canvas.clientWidth || innerWidth; height = canvas.clientHeight || innerHeight; const dpr = Math.min(devicePixelRatio, 1.6); canvas.width = width * dpr; canvas.height = height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  resize();
  function burst(x, y, color) {
    const count = reduced ? 22 : width < 600 ? 58 : 82;
    for (let i = 0; i < count; i++) { const angle = i / count * Math.PI * 2 + Math.random() * .06, speed = (70 + Math.random() * 100) * (reduced ? .3 : 1); particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color: i % 8 ? color : '#fff4d0', life: 1.2 + Math.random(), age: 0, radius: 1.4 + Math.random() * 1.4, star: i % 7 === 0 }); }
  }
  return {
    resize,
    step(dt) {
      time += dt;
      if (time >= next && time < 3.9) {
        next = time + (reduced ? .8 : .38); const x = width * (.12 + Math.random() * .76), y = height * (.12 + Math.random() * .48), color = COLORS[Math.floor(Math.random() * 7)].hex;
        if (reduced) burst(x, y, color); else rockets.push({ x, y: height + 20, target: y, start: height + 20, age: 0, duration: .65 + Math.random() * .3, color });
      }
      for (const rocket of rockets) { rocket.age += dt; rocket.y = rocket.start + (rocket.target - rocket.start) * Math.min(1, rocket.age / rocket.duration); if (rocket.age >= rocket.duration) { burst(rocket.x, rocket.target, rocket.color); rocket.dead = true; } }
      rockets = rockets.filter(r => !r.dead);
      for (const p of particles) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.exp(-.9 * dt); p.vy += (reduced ? 15 : 65) * dt; }
      particles = particles.filter(p => p.age < p.life);
      ctx.clearRect(0, 0, width, height); ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (const rocket of rockets) { const gradient = ctx.createLinearGradient(rocket.x, rocket.y, rocket.x, rocket.y + 50); gradient.addColorStop(0, rocket.color); gradient.addColorStop(1, '#ffffff00'); ctx.strokeStyle = gradient; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rocket.x, rocket.y); ctx.lineTo(rocket.x, rocket.y + 50); ctx.stroke(); }
      for (const p of particles) { ctx.globalAlpha = Math.max(0, 1 - p.age / p.life); ctx.fillStyle = p.color; if (p.star) star(ctx, p.x, p.y, p.radius * 2.2, p.color); else { ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill(); } }
      ctx.restore();
      return time;
    },
    clear() { particles = []; rockets = []; ctx.clearRect(0, 0, width, height); },
  };
}
