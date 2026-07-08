import { EffectPool } from '../entities/particle';

export function drawEffects(ctx: CanvasRenderingContext2D, effects: EffectPool) {
  for (const p of effects.getParticles()) {
    const t = p.life / p.maxLife;
    const alpha = p.alphaFade ? Math.max(0, t) : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    if (p.shape === 'circle') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size * (0.5 + t * 0.5), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === 'rect') {
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    } else if (p.shape === 'spark') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-p.size, 0);
      ctx.lineTo(p.size, 0);
      ctx.stroke();
    } else if (p.shape === 'ring') {
      const expand = (1 - t) * 90;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 4 * t + 1;
      ctx.globalAlpha = alpha * 0.9;
      ctx.beginPath();
      ctx.arc(0, 0, p.size + expand, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  for (const p of effects.getPopups()) {
    const t = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = Math.max(0, t);
    ctx.fillStyle = p.color;
    ctx.font = `bold ${p.size}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.fillText(p.text, p.x, p.y);
    ctx.restore();
  }
}
