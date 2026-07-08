import { BiomePalette } from '../data/stages';
import { VIEWPORT } from '../data/balance';
import { TrackSegment } from '../entities/segment';
import { Truck } from '../entities/truck';
import { JuiceSystem } from '../systems/juice';
import { drawRoad } from './drawRoad';
import { drawRoadside } from './drawRoadside';
import { drawAllSegments } from './drawSegments';
import { drawTruck } from './drawTruck';
import { drawParticles, drawPopups } from './drawEffects';
import { drawBanner, drawFlash, drawSpeedLines } from './drawJuice';
import { drawHUD, HudParams } from './drawUI';

export interface RenderParams {
  truck: Truck;
  segments: readonly TrackSegment[];
  palette: BiomePalette;
  juice: JuiceSystem;
  elapsedMs: number;
  hud: HudParams;
}

/**
 * 세계 레이어 — 저해상도 픽셀 버퍼에 그린다(레트로 도트 룩).
 * 배경/도로/게이트 박스/트럭/파티클/속도선/플래시 등 "도형"만 포함하고, 텍스트는 제외한다.
 */
export function renderWorld(ctx: CanvasRenderingContext2D, p: RenderParams) {
  ctx.save();
  ctx.translate(p.juice.shakeX, p.juice.shakeY);

  drawRoad(ctx, p.palette, p.truck.distance);
  drawRoadside(ctx, p.palette, p.truck.distance);
  drawAllSegments(ctx, p.segments, p.truck.distance, 'shape');
  drawSpeedLines(ctx, p.juice, p.elapsedMs);
  drawTruck(ctx, p.truck, p.truck.tier, p.elapsedMs);
  drawParticles(ctx, p.juice.effects);

  ctx.restore();

  // 전체 화면 플래시는 흔들림과 무관하게 화면 전체에 덮는다.
  drawFlash(ctx, p.juice);
}

/**
 * 오버레이 레이어 — 풀 해상도 캔버스에 선명하게 그린다(가독성).
 * 게이트/보스 라벨, 숫자 팝업, HUD, 대형 배너 등 모든 "텍스트"를 담당한다.
 * 세그먼트 라벨/팝업은 세계와 같은 흔들림을 적용해 박스와 정렬을 맞춘다.
 */
export function renderOverlay(ctx: CanvasRenderingContext2D, p: RenderParams) {
  ctx.save();
  ctx.translate(p.juice.shakeX, p.juice.shakeY);
  drawAllSegments(ctx, p.segments, p.truck.distance, 'label');
  drawPopups(ctx, p.juice.effects);
  ctx.restore();

  // HUD와 배너는 흔들림의 영향을 받지 않는다.
  drawHUD(ctx, p.hud);
  drawBanner(ctx, p.juice);
}

/** 단일 컨텍스트용 통합 렌더(비-픽셀 경로가 필요할 때의 폴백). */
export function renderFrame(ctx: CanvasRenderingContext2D, p: RenderParams) {
  ctx.clearRect(0, 0, VIEWPORT.width, VIEWPORT.height);
  renderWorld(ctx, p);
  renderOverlay(ctx, p);
}
