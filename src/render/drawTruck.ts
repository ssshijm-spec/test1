import { TierDef } from '../data/tiers';
import { Truck } from '../entities/truck';
import { laneCenterX, TRUCK_SCREEN_Y } from './layout';

const BASE_W = 46;
const BASE_L = 64;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawWheel(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#444';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
}

export function drawTruck(ctx: CanvasRenderingContext2D, truck: Truck, tier: TierDef, elapsedMs: number) {
  const v = tier.visual;
  const bob = Math.sin(truck.bobPhase * 8) * 1.6 * v.scale;
  const cx = laneCenterX(truck.lane);
  const cy = TRUCK_SCREEN_Y + bob;

  let scale = v.scale;
  if (truck.evolveFxMs > 0) {
    const t = truck.evolveFxMs / 1200;
    scale *= 1 + Math.sin(t * Math.PI) * 0.55;
  }

  const w = BASE_W * v.bodyWidth;
  const l = BASE_L * v.bodyLength;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, l * 0.42, w * 0.62, w * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  // 아우라 (고티어)
  if (v.hasAura) {
    const pulse = 0.5 + 0.5 * Math.sin(elapsedMs / 220);
    const grad = ctx.createRadialGradient(0, 0, w * 0.2, 0, 0, w * 1.3);
    grad.addColorStop(0, v.glowColor + 'aa');
    grad.addColorStop(1, v.glowColor + '00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, w * (1.0 + pulse * 0.25), 0, Math.PI * 2);
    ctx.fill();
  }

  // 배기 화염
  if (v.hasExhaustFlames) {
    const flick = 0.6 + 0.4 * Math.sin(elapsedMs / 60 + truck.bobPhase);
    ctx.fillStyle = `rgba(255,${140 + Math.floor(flick * 60)},60,${0.55 + flick * 0.3})`;
    ctx.beginPath();
    ctx.moveTo(-w * 0.22, l * 0.46);
    ctx.lineTo(0, l * 0.46 + 14 * flick);
    ctx.lineTo(w * 0.22, l * 0.46);
    ctx.closePath();
    ctx.fill();
  }

  const wheelR = 6.5 * v.wheelSize;
  const wheelInsetX = w * 0.46;

  // 스타일별 실루엣
  switch (v.cabinStyle) {
    case 'cart': {
      drawWheel(ctx, -wheelInsetX * 0.7, l * 0.3, wheelR);
      drawWheel(ctx, wheelInsetX * 0.7, l * 0.3, wheelR);
      ctx.fillStyle = v.bodyColor;
      roundRect(ctx, -w * 0.4, -l * 0.32, w * 0.8, l * 0.62, 4);
      ctx.fill();
      ctx.strokeStyle = v.accentColor;
      ctx.lineWidth = v.outline;
      ctx.stroke();
      break;
    }
    case 'trike': {
      drawWheel(ctx, 0, -l * 0.4, wheelR * 0.9);
      drawWheel(ctx, -wheelInsetX * 0.7, l * 0.32, wheelR);
      drawWheel(ctx, wheelInsetX * 0.7, l * 0.32, wheelR);
      ctx.fillStyle = v.bodyColor;
      roundRect(ctx, -w * 0.42, -l * 0.36, w * 0.84, l * 0.72, 5);
      ctx.fill();
      ctx.strokeStyle = v.accentColor;
      ctx.lineWidth = v.outline;
      ctx.stroke();
      ctx.fillStyle = v.accentColor;
      roundRect(ctx, -w * 0.24, -l * 0.3, w * 0.48, l * 0.22, 3);
      ctx.fill();
      break;
    }
    default: {
      drawWheel(ctx, -wheelInsetX, -l * 0.24, wheelR);
      drawWheel(ctx, wheelInsetX, -l * 0.24, wheelR);
      drawWheel(ctx, -wheelInsetX, l * 0.3, wheelR);
      drawWheel(ctx, wheelInsetX, l * 0.3, wheelR);

      // 트레일러 (세미 이상)
      if (v.cabinStyle === 'semi' || v.cabinStyle === 'monster' || v.cabinStyle === 'armored' || v.cabinStyle === 'mecha' || v.cabinStyle === 'titan' || v.cabinStyle === 'cosmic') {
        ctx.fillStyle = v.accentColor;
        roundRect(ctx, -w * 0.46, l * 0.02, w * 0.92, l * 0.46, 5);
        ctx.fill();
      }

      // 본체
      ctx.fillStyle = v.bodyColor;
      roundRect(ctx, -w * 0.44, -l * 0.42, w * 0.88, l * 0.72, 6);
      ctx.fill();
      ctx.strokeStyle = v.accentColor;
      ctx.lineWidth = v.outline;
      ctx.stroke();

      // 후면 캐빈 창(백뷰 카메라가 살짝 위에서 넘겨보는 뒤창) — 이 트럭의 "위"는 도로 저 앞쪽(전방), "아래"는 카메라와 가장 가까운 후미다.
      ctx.fillStyle = 'rgba(210,235,255,0.85)';
      roundRect(ctx, -w * 0.3, -l * 0.38, w * 0.6, l * 0.2, 3);
      ctx.fill();

      // 테일램프 — 후미(카메라 쪽, 아래)에 위치해 "뒤에서 쫓아가는" 느낌을 강화
      ctx.fillStyle = '#ff3b3b';
      roundRect(ctx, -w * 0.46, l * 0.32, w * 0.14, l * 0.12, 2);
      ctx.fill();
      roundRect(ctx, w * 0.32, l * 0.32, w * 0.14, l * 0.12, 2);
      ctx.fill();

      // 박스/적재함
      if (v.cabinStyle === 'box' || v.cabinStyle === 'pickup') {
        ctx.fillStyle = v.accentColor;
        roundRect(ctx, -w * 0.4, -l * 0.1, w * 0.8, l * 0.42, 4);
        ctx.fill();
      }

      // 장갑판
      if (v.hasArmorPlates) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        roundRect(ctx, -w * 0.52, -l * 0.1, w * 0.16, l * 0.4, 3);
        ctx.fill();
        roundRect(ctx, w * 0.36, -l * 0.1, w * 0.16, l * 0.4, 3);
        ctx.fill();
      }

      // 사이드 캐논
      if (v.hasCannons) {
        ctx.fillStyle = '#222';
        roundRect(ctx, -w * 0.6, -l * 0.05, w * 0.14, l * 0.28, 3);
        ctx.fill();
        roundRect(ctx, w * 0.46, -l * 0.05, w * 0.14, l * 0.28, 3);
        ctx.fill();
      }

      // 스포일러
      if (v.hasSpoiler) {
        ctx.fillStyle = v.accentColor;
        ctx.beginPath();
        ctx.moveTo(-w * 0.5, l * 0.44);
        ctx.lineTo(w * 0.5, l * 0.44);
        ctx.lineTo(w * 0.38, l * 0.56);
        ctx.lineTo(-w * 0.38, l * 0.56);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
  }

  // 피격 플래시
  if (truck.hitFlashMs > 0) {
    ctx.globalAlpha = Math.min(0.6, truck.hitFlashMs / 400);
    ctx.fillStyle = '#ff3b3b';
    roundRect(ctx, -w * 0.5, -l * 0.44, w, l * 0.9, 6);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
