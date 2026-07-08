import { VIEWPORT } from '../data/balance';
import { JuiceSystem } from '../systems/juice';
import { HORIZON_Y, VANISH_X } from './layout';

/**
 * 부스트 중 소실점에서 바깥으로 뻗는 속도선(스피드 라인). 강도(speedLineIntensity)에 비례해
 * 개수·길이·불투명도가 커져 "빨라진다"는 체감을 강화한다. 결정적이지 않아도 되므로 Math.random 사용.
 */
export function drawSpeedLines(ctx: CanvasRenderingContext2D, juice: JuiceSystem, elapsedMs: number) {
  const intensity = juice.speedLineIntensity;
  if (intensity <= 0.02) return;

  const count = Math.floor(10 + intensity * 26);
  const maxR = Math.hypot(VIEWPORT.width, VIEWPORT.height);
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    // 각도는 시간+인덱스 기반으로 흩뿌려 매 프레임 아른거리게
    const seed = i * 12.9898 + Math.floor(elapsedMs / 40) * 3.233;
    const rnd = (Math.sin(seed) * 43758.5453) % 1;
    const angle = (rnd < 0 ? rnd + 1 : rnd) * Math.PI * 2;
    const inner = 40 + Math.random() * 60;
    const len = (60 + Math.random() * 120) * (0.5 + intensity);
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const x0 = VANISH_X + ca * inner;
    const y0 = HORIZON_Y + sa * inner;
    const x1 = VANISH_X + ca * Math.min(maxR, inner + len);
    const y1 = HORIZON_Y + sa * Math.min(maxR, inner + len);
    ctx.globalAlpha = (0.15 + Math.random() * 0.35) * intensity;
    ctx.lineWidth = 1 + Math.random() * 2.2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  ctx.restore();
}

/** 전체 화면 컬러 플래시(큰 곱셈/잭팟). */
export function drawFlash(ctx: CanvasRenderingContext2D, juice: JuiceSystem) {
  const a = juice.flashAlpha;
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = juice.flashColor;
  ctx.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
  ctx.restore();
}

/** 화면 중앙 대형 배너(×N / JACKPOT). 팝(오버슈트) 스케일 인 → 유지 → 페이드/상승 아웃. */
export function drawBanner(ctx: CanvasRenderingContext2D, juice: JuiceSystem) {
  const b = juice.banner;
  if (!b) return;
  const t = b.age / b.duration; // 0~1
  // 스케일: 초반 25%에 오버슈트(1.35) 후 1.0로 정착
  let scale: number;
  let alpha: number;
  let yOffset = 0;
  if (t < 0.22) {
    const p = t / 0.22;
    scale = 0.4 + p * (1.35 - 0.4);
    alpha = p;
  } else if (t < 0.72) {
    const p = (t - 0.22) / 0.5;
    scale = 1.35 - p * 0.35;
    alpha = 1;
  } else {
    const p = (t - 0.72) / 0.28;
    scale = 1.0;
    alpha = 1 - p;
    yOffset = -p * 40;
  }

  const cx = VIEWPORT.width / 2;
  const cy = VIEWPORT.height * 0.42 + yOffset;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 64px "Segoe UI", sans-serif';

  // 외곽선(가독성) + 글로우
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.strokeText(b.text, 0, 0);
  ctx.shadowColor = b.color;
  ctx.shadowBlur = 24;
  ctx.fillStyle = b.color;
  ctx.fillText(b.text, 0, 0);
  ctx.restore();
}
