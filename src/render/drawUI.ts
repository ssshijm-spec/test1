import { formatPower } from '../core/number';
import { VIEWPORT } from '../data/balance';

export interface TierCardInfo {
  tierName: string;
  lore: string;
  evolveLine: string;
  isEvolve: boolean;
  alpha: number;
  scale: number;
}

export interface HudParams {
  power: number;
  tierName: string;
  stageName: string;
  stageIndex: number;
  totalStages: number;
  stageProgress: number; // 0~1
  tierCard: TierCardInfo | null;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawHUD(ctx: CanvasRenderingContext2D, p: HudParams) {
  const w = VIEWPORT.width;

  // 상단 바 배경
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, w, 78);

  // 전력 표기
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px "Segoe UI", sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 6;
  ctx.fillText(formatPower(p.power), 16, 40);

  ctx.font = '13px "Segoe UI", sans-serif';
  ctx.fillStyle = '#d8e6ff';
  ctx.fillText(p.tierName, 16, 60);

  // 스테이지 이름 (우측)
  ctx.textAlign = 'right';
  ctx.font = 'bold 15px "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`STAGE ${p.stageIndex + 1} / ${p.totalStages}`, w - 16, 30);
  ctx.font = '13px "Segoe UI", sans-serif';
  ctx.fillStyle = '#cfd8e6';
  ctx.fillText(p.stageName, w - 16, 50);

  // 스테이지 진행바
  const barW = w - 32;
  const barX = 16;
  const barY = 64;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, barX, barY, barW, 6, 3);
  ctx.fill();
  ctx.fillStyle = '#3ddc63';
  roundRect(ctx, barX, barY, barW * Math.min(1, Math.max(0, p.stageProgress)), 6, 3);
  ctx.fill();
  ctx.restore();

  if (p.tierCard) {
    drawTierCard(ctx, p.tierCard);
  }
}

function drawTierCard(ctx: CanvasRenderingContext2D, card: TierCardInfo) {
  const w = VIEWPORT.width;
  const h = VIEWPORT.height;
  const cardW = w - 64;
  const cardH = 150;
  const cx = w / 2;
  const cy = h / 2;

  ctx.save();
  ctx.globalAlpha = card.alpha;
  ctx.translate(cx, cy);
  ctx.scale(card.scale, card.scale);
  ctx.translate(-cx, -cy);

  ctx.fillStyle = card.isEvolve ? 'rgba(20,30,45,0.88)' : 'rgba(45,30,30,0.85)';
  roundRect(ctx, cx - cardW / 2, cy - cardH / 2, cardW, cardH, 16);
  ctx.fill();
  ctx.strokeStyle = card.isEvolve ? '#ffd23d' : '#a05050';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = card.isEvolve ? '#ffd23d' : '#e0a0a0';
  ctx.font = 'bold 15px "Segoe UI", sans-serif';
  ctx.fillText(card.isEvolve ? '진 화 !' : '전력 감소로 인한 강등', cx, cy - cardH / 2 + 26);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px "Segoe UI", sans-serif';
  ctx.fillText(card.tierName, cx, cy - 8);

  ctx.font = '14px "Segoe UI", sans-serif';
  ctx.fillStyle = '#d8e0ea';
  wrapText(ctx, card.lore, cx, cy + 24, cardW - 40, 18);

  if (card.isEvolve) {
    ctx.font = 'italic 13px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffe98a';
    ctx.fillText(`"${card.evolveLine}"`, cx, cy + cardH / 2 - 18);
  }
  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  const lines: string[] = [];
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
}
