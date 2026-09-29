import { COLORS } from './bubble-core.js';

export const MYSTERY_SVG = `<svg viewBox="0 0 160 160" aria-hidden="true"><defs><radialGradient id="mystery-glow" cx=".35" cy=".25" r=".8"><stop stop-color="#d9c8fb"/><stop offset="1" stop-color="#817aaa"/></radialGradient></defs><ellipse cx="80" cy="137" rx="36" ry="7" fill="#0c14302a"/><circle cx="80" cy="76" r="48" fill="url(#mystery-glow)" stroke="#dfd7fc" stroke-opacity=".45" stroke-width="2"/><circle cx="80" cy="76" r="40" fill="none" stroke="#efe6ff" stroke-opacity=".2" stroke-dasharray="3 5"/><path d="M68 64c0-17 26-17 26-2 0 10-14 9-14 20" fill="none" stroke="#fff1fa" stroke-width="7" stroke-linecap="round"/><circle cx="80" cy="97" r="4" fill="#fff1fa"/><path d="m125 29 3 8 9 2-7 5 1 8-7-4-7 3 3-8-5-6 8-1Z" fill="#f1d8a9"/><circle cx="24" cy="95" r="3" fill="#b5dcca"/><circle cx="35" cy="28" r="2" fill="#ecd7f8"/></svg>`;

function ellipse(ctx, x, y, rx, ry, fill, stroke) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}
function face(ctx, y = 0, wide = .29) {
  for (const x of [-wide, wide]) { ellipse(ctx, x, y, .052, .075, '#263451'); ellipse(ctx, x - .012, y - .026, .015, .021, '#fff'); }
  ctx.strokeStyle = '#394159'; ctx.lineWidth = .035; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, y + .12, .095, .08, Math.PI - .08); ctx.stroke();
  for (const x of [-wide - .12, wide + .12]) ellipse(ctx, x, y + .12, .085, .045, '#ff799480');
}
export function drawCharacter(ctx, skin, color, x, y, radius, time = 0, { player = false, protection = 0, feast = false, numbers = false, lightBackground = false } = {}) {
  const tone = COLORS[color] || COLORS[0];
  ctx.save(); ctx.translate(x, y); ctx.scale(radius, radius); ctx.lineWidth = .035;
  if (protection > 0) ctx.globalAlpha = .65 + Math.sin(time * 22) * .2;
  ellipse(ctx, .04, .9, .63, .12, '#07102a25');
  if (player) {
    if (feast) {
      ctx.lineWidth = .095;
      COLORS.forEach((color, i) => { ctx.strokeStyle = color.hex; ctx.beginPath(); const a = time * .7 + i * Math.PI * 2 / 7; ctx.arc(0, 0, 1.32, a, a + .72); ctx.stroke(); });
    }
    ctx.strokeStyle = protection ? '#da5b85' : lightBackground ? '#3d6488b0' : '#ffffffb0'; ctx.lineWidth = .035;
    ctx.setLineDash([.1, .08]); ctx.beginPath(); ctx.arc(0, 0, 1.23 + Math.sin(time * 3) * .025, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
  if (skin === 'frog') {
    ellipse(ctx, 0, .53, .6, .35, tone.hex, tone.dark);
    for (const side of [-1, 1]) {
      ellipse(ctx, side * .57, .68, .27, .14, tone.hex, tone.dark);
      for (let i = 0; i < 3; i++) ellipse(ctx, side * (.48 + i * .09), .74, .055, .065, '#ffffff66');
    }
    ellipse(ctx, 0, .5, .37, .22, '#f5f5cc');
    for (const side of [-1, 1]) { ellipse(ctx, side * .44, -.45, .34, .37, tone.hex, tone.dark); ellipse(ctx, side * .44, -.5, .23, .25, '#fff9df'); }
    ellipse(ctx, 0, .02, .88, .58, tone.hex, tone.dark);
    for (const side of [-1, 1]) { ellipse(ctx, side * .44, -.47, .064, .093, '#27364a'); ellipse(ctx, side * .46, -.5, .019, .026, '#fff'); ellipse(ctx, side * .55, .15, .12, .07, '#ffb4bc80'); }
    ctx.strokeStyle = tone.dark; ctx.lineWidth = .04; ctx.beginPath(); ctx.arc(0, -.02, .35, .3, Math.PI - .3); ctx.stroke();
    ellipse(ctx, -.07, .27, .035, .026, tone.dark); ellipse(ctx, .07, .27, .035, .026, tone.dark);
    ellipse(ctx, -.25, -.03, .12, .055, '#ffffff35');
  } else if (skin === 'pig') {
    for (const side of [-1, 1]) {
      ctx.fillStyle = tone.hex; ctx.strokeStyle = tone.dark; ctx.beginPath(); ctx.moveTo(side * .29, -.65); ctx.quadraticCurveTo(side * .87, -1.14, side * .87, -.49); ctx.lineTo(side * .66, -.17); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff55'; ctx.beginPath(); ctx.moveTo(side * .43, -.63); ctx.lineTo(side * .73, -.84); ctx.lineTo(side * .75, -.37); ctx.closePath(); ctx.fill();
    }
    ellipse(ctx, 0, .02, .87, .78, tone.hex, tone.dark);
    for (const side of [-1, 1]) { ellipse(ctx, side * .29, -.1, .048, .073, '#303748'); ellipse(ctx, side * .49, .11, .11, .06, '#ffffff45'); }
    ellipse(ctx, 0, .23, .35, .24, '#ffe6d7', '#ffffff60');
    for (const side of [-1, 1]) ellipse(ctx, side * .12, .23, .045, .066, tone.dark);
    ctx.strokeStyle = tone.dark; ctx.beginPath(); ctx.arc(0, .42, .13, .2, Math.PI - .2); ctx.stroke();
    ellipse(ctx, -.28, -.42, .15, .07, '#ffffff60');
    for (const side of [-1, 1]) ellipse(ctx, side * .42, .75, .18, .12, tone.dark);
  } else if (skin === 'mermaid') {
    ctx.fillStyle = tone.hex; ctx.strokeStyle = tone.dark; ctx.beginPath(); ctx.moveTo(-.27, .1); ctx.quadraticCurveTo(-.44, .67, .1, .82); ctx.quadraticCurveTo(.45, .9, .39, .51); ctx.quadraticCurveTo(.27, .69, .2, .59); ctx.lineTo(.2, .14); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = tone.hex; ctx.beginPath(); ctx.moveTo(.11, .78); ctx.quadraticCurveTo(-.37, .91, -.37, 1.13); ctx.quadraticCurveTo(.06, 1.09, .2, .87); ctx.quadraticCurveTo(.47, 1.11, .68, 1.05); ctx.quadraticCurveTo(.56, .72, .11, .78); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#ffffff70'; ctx.lineWidth = .025;
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) { ctx.beginPath(); ctx.arc(-.18 + col * .14, .28 + row * .13, .075, 0, Math.PI); ctx.stroke(); }
    ellipse(ctx, 0, -.38, .68, .65, tone.hex, tone.dark); ellipse(ctx, 0, -.26, .47, .48, '#ffe6d3');
    ctx.fillStyle = tone.hex; ctx.beginPath(); ctx.moveTo(-.46, -.44); ctx.quadraticCurveTo(-.37, -.92, .21, -.79); ctx.quadraticCurveTo(.55, -.65, .48, -.16); ctx.quadraticCurveTo(.15, -.24, .04, -.61); ctx.quadraticCurveTo(-.06, -.28, -.46, -.44); ctx.fill();
    face(ctx, -.22, .18);
    ellipse(ctx, -.32, .18, .08, .21, '#ffe6d3'); ellipse(ctx, .32, .17, .08, .2, '#ffe6d3');
    ellipse(ctx, -.13, .12, .13, .09, '#fff1b5'); ellipse(ctx, .13, .12, .13, .09, '#fff1b5');
    star(ctx, .48, -.62, .17, '#ffe99a');
  } else {
    const gradient = ctx.createRadialGradient(-.3, -.4, .03, .12, .13, 1.2);
    gradient.addColorStop(0, '#ffffffc0'); gradient.addColorStop(.25, tone.hex + 'd9'); gradient.addColorStop(.78, tone.hex + 'a8'); gradient.addColorStop(1, tone.dark + 'd9');
    ellipse(ctx, 0, 0, .91, .91, gradient, tone.hex);
    ctx.strokeStyle = '#ffffff75'; ctx.lineWidth = .04; ctx.beginPath(); ctx.arc(0, 0, .82, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
    ellipse(ctx, -.34, -.46, .2, .11, '#ffffffc9'); ellipse(ctx, -.52, -.25, .055, .08, '#ffffffa0');
    ctx.strokeStyle = tone.hex; ctx.lineWidth = .035; ctx.beginPath(); ctx.arc(0, 0, .76, .22, 1.35); ctx.stroke();
    face(ctx, .07);
  }
  if (numbers) {
    ellipse(ctx, .77, .67, .2, .2, '#1a2542dd'); ctx.fillStyle = '#fff'; ctx.font = '600 .26px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(color + 1), .77, .68);
  }
  if (player) {
    ctx.globalAlpha = 1; ctx.fillStyle = lightBackground ? '#355572' : '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = '700 .29px monospace'; ctx.fillText('YOU', 0, -1.4);
  }
  ctx.restore();
}
export function star(ctx, x, y, radius, fill) {
  ctx.beginPath(); for (let i = 0; i < 10; i++) { const angle = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? radius * .45 : radius; const px = x + Math.cos(angle) * r, py = y + Math.sin(angle) * r; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
export function drawPickup(ctx, type, x, y, radius, time = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(radius, radius); ctx.lineWidth = .05;
  ellipse(ctx, 0, 1.04, .7, .13, '#09112c35');
  ctx.strokeStyle = type === 'bomb' ? '#ffa275aa' : '#ffffff66'; ctx.lineWidth = .04;
  ctx.beginPath(); ctx.arc(0, 0, 1.12, 0, Math.PI * 2); ctx.stroke();
  if (type === 'heart') {
    const glow = ctx.createLinearGradient(0, -.8, .3, .9); glow.addColorStop(0, '#ffb6ce'); glow.addColorStop(1, '#ef416c');
    ctx.fillStyle = glow; ctx.strokeStyle = '#ffd0de'; ctx.beginPath(); ctx.moveTo(0, .85);
    ctx.bezierCurveTo(-1.75, -.08, -.8, -1.5, 0, -.6); ctx.bezierCurveTo(.8, -1.5, 1.75, -.08, 0, .85); ctx.fill(); ctx.stroke();
    ellipse(ctx, -.38, -.51, .14, .08, '#ffffffa0');
    ctx.strokeStyle = '#fff6f9'; ctx.lineWidth = .14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-.22, 0); ctx.lineTo(.22, 0); ctx.moveTo(0, -.22); ctx.lineTo(0, .22); ctx.stroke();
  } else if (type === 'feast') {
    const glow = ctx.createLinearGradient(-1, -.9, 1, .9); COLORS.forEach((c, i) => glow.addColorStop(i / 6, c.hex));
    star(ctx, 0, 0, 1.05, glow); ctx.strokeStyle = '#fff4d5'; ctx.stroke();
    face(ctx, -.07, .22); ellipse(ctx, -.2, -.58, .11, .06, '#ffffff90');
    star(ctx, 1.02, -.87, .16 + Math.sin(time * 4) * .025, '#fff0ae');
  } else {
    ctx.strokeStyle = '#d8b18a'; ctx.lineWidth = .12; ctx.beginPath(); ctx.moveTo(.25, -.72); ctx.quadraticCurveTo(.15, -1.28, .63, -1.11); ctx.stroke();
    star(ctx, .65, -1.1, .24 + Math.sin(time * 10) * .03, '#ffbe68');
    const metal = ctx.createRadialGradient(-.4, -.5, .04, .1, .3, 1.1); metal.addColorStop(0, '#6a748b'); metal.addColorStop(.45, '#252e44'); metal.addColorStop(1, '#080e20');
    ellipse(ctx, 0, 0, .82, .82, metal, '#939cb4'); ellipse(ctx, -.3, -.4, .17, .07, '#dfe8ff80');
    ctx.strokeStyle = '#ffb185'; ctx.lineWidth = .13; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -.2); ctx.lineTo(0, .17); ctx.stroke(); ellipse(ctx, 0, .38, .07, .07, '#ffb185');
  }
  ctx.fillStyle = type === 'bomb' ? '#ffb58e' : '#e8f0ff'; ctx.textAlign = 'center'; ctx.font = '600 .35px Arial'; ctx.fillText(type === 'heart' ? '+1 ♥' : type === 'feast' ? '全色' : '危险', 0, 1.62);
  ctx.restore();
}
function cloud(ctx, x, y, size, alpha) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#ffffff';
  ellipse(ctx, x, y, size * .95, size * .24, '#fff'); ellipse(ctx, x - size * .38, y - size * .17, size * .33, size * .32, '#fff'); ellipse(ctx, x + size * .03, y - size * .26, size * .45, size * .43, '#fff'); ellipse(ctx, x + size * .49, y - size * .13, size * .34, size * .28, '#fff'); ctx.restore();
}
export function drawBackground(ctx, width, height, background, time = 0) {
  const gradient = ctx.createLinearGradient(0, 0, width * .3, height);
  if (background === 'sky') { gradient.addColorStop(0, '#a9dbff'); gradient.addColorStop(.5, '#c8eaff'); gradient.addColorStop(1, '#edf6ff'); }
  else { gradient.addColorStop(0, '#162341'); gradient.addColorStop(.55, '#1a2440'); gradient.addColorStop(1, '#242944'); }
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
  if (background === 'sky') {
    const sun = ctx.createRadialGradient(width * .84, height * .16, 0, width * .84, height * .16, height * .26); sun.addColorStop(0, '#fff8c9b0'); sun.addColorStop(1, '#fff8c900'); ctx.fillStyle = sun; ctx.fillRect(0, 0, width, height);
    ellipse(ctx, width * .84, height * .16, 24, 24, '#fff6c7');
    for (let i = 0; i < 6; i++) cloud(ctx, ((i * width * .29 + time * (i % 2 ? 1.8 : -1.2) + width * 2) % (width + 180)) - 60, height * (.15 + i * .13), 35 + i % 3 * 20, .38 + i % 2 * .22);
  } else {
    ctx.fillStyle = '#b4c7ff30';
    for (let i = 0; i < 65; i++) { const x = (i * 113.7) % width, y = (i * 79.19) % height; ellipse(ctx, x, y, i % 8 ? .7 : 1.2, i % 8 ? .7 : 1.2, '#b4c7ff30'); }
    ctx.strokeStyle = '#a9bdff08'; ctx.lineWidth = 1;
    for (let x = 30; x < width; x += 55) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
    for (let y = 30; y < height; y += 55) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
  }
  ctx.strokeStyle = background === 'sky' ? '#729eb52b' : '#99b4ff14'; ctx.lineWidth = 1;
  for (const x of [15, width - 15]) for (const y of [15, height - 15]) { ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); ctx.stroke(); }
}
export function avatarImage(skin, color = 3) {
  const canvas = document.createElement('canvas'); canvas.width = 180; canvas.height = 160;
  drawCharacter(canvas.getContext('2d'), skin, color, 90, 77, 55, 0); return canvas.toDataURL();
}
export function skyImage() {
  const canvas = document.createElement('canvas'); canvas.width = 210; canvas.height = 140;
  drawBackground(canvas.getContext('2d'), 210, 140, 'sky'); return canvas.toDataURL();
}
export const GIFT_SVG = `<svg viewBox="0 0 240 240" aria-hidden="true"><defs><linearGradient id="gift-box" x2="1" y2="1"><stop stop-color="#ffb6cc"/><stop offset="1" stop-color="#ca7fcf"/></linearGradient><linearGradient id="gift-ribbon" x2="0" y2="1"><stop stop-color="#fff5b4"/><stop offset="1" stop-color="#ffd886"/></linearGradient></defs><ellipse cx="120" cy="215" rx="67" ry="10" fill="#0b102740"/><g class="gift-base"><path d="m45 104 75 17 75-17v89l-75 25-75-25Z" fill="url(#gift-box)" stroke="#fff" stroke-opacity=".35" stroke-width="2"/><path d="m120 121 75-17v89l-75 25Z" fill="#9269bd" opacity=".35"/><path d="m104 118 16 3 17-4v96l-17 5-16-5Z" fill="url(#gift-ribbon)"/><path d="m45 154 75 20 75-20v17l-75 23-75-23Z" fill="#ffe5a1" opacity=".7"/></g><g class="gift-lid"><path d="m37 96 83-26 83 26-83 27Z" fill="#ffd0e0"/><path d="m37 96 83 27 83-27v20l-83 26-83-26Z" fill="url(#gift-box)"/><path d="m106 74 14-4 14 4v63l-14 5-14-5Z" fill="url(#gift-ribbon)"/><path d="m70 85 14-5 83 26-15 5Z" fill="#ffedb0"/><path d="M119 71C77 73 62 43 77 31c19-16 43 19 42 40Z" fill="none" stroke="#ffeeb7" stroke-width="14"/><path d="M121 71c43 2 58-28 43-40-19-16-43 19-43 40Z" fill="none" stroke="#ffeeb7" stroke-width="14"/><circle cx="120" cy="69" r="12" fill="#fff5ce"/></g><path d="m31 63 4 10 11 2-9 7 1 11-9-6-10 4 4-10-7-8 11 1Z" fill="#ffeaaa"/><path d="m205 155 4 10 10 2-8 7 1 10-9-5-9 4 3-10-7-7 10-1Z" fill="#b9e9ec"/></svg>`;
export const DURIAN_SVG = `<svg viewBox="0 0 160 160" aria-hidden="true"><ellipse cx="80" cy="138" rx="43" ry="7" fill="#817b341c"/><path d="M77 32c-2-14 1-19 8-24" fill="none" stroke="#687140" stroke-width="8" stroke-linecap="round"/><path d="m78 25 9 7 13-2 6 11 12 2 3 13 11 8-3 13 7 12-7 12 1 12-12 6-7 12-14-1-11 7-12-6-14 2-8-11-12-4-1-13-8-10 5-13-4-13 9-9 2-13 13-4 6-12 14 2Z" fill="#b7c56c" stroke="#758345" stroke-width="3" stroke-linejoin="round"/><path d="M81 37c-24 12-30 70-6 93" fill="none" stroke="#dce79a" stroke-width="6"/><path d="m49 55 6 8-11 3Zm52-6 5 10-12-3Zm16 34-9 7 1-12Zm-70 28 5-10 6 10Zm58 7-10-4 10-7Z" fill="#81914a"/><ellipse cx="66" cy="79" rx="4" ry="6" fill="#404d30"/><ellipse cx="97" cy="79" rx="4" ry="6" fill="#404d30"/><path d="M73 94q9 10 18 0" fill="none" stroke="#404d30" stroke-width="3" stroke-linecap="round"/><ellipse cx="56" cy="91" rx="7" ry="4" fill="#eaae8880"/><ellipse cx="106" cy="91" rx="7" ry="4" fill="#eaae8880"/></svg>`;
