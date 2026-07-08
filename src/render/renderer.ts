import { BiomePalette } from '../data/stages';
import { VIEWPORT } from '../data/balance';
import { TrackSegment } from '../entities/segment';
import { Truck } from '../entities/truck';
import { JuiceSystem } from '../systems/juice';
import { drawRoad } from './drawRoad';
import { drawAllSegments } from './drawSegments';
import { drawTruck } from './drawTruck';
import { drawEffects } from './drawEffects';
import { drawHUD, HudParams } from './drawUI';

export interface RenderParams {
  truck: Truck;
  segments: readonly TrackSegment[];
  palette: BiomePalette;
  juice: JuiceSystem;
  elapsedMs: number;
  hud: HudParams;
}

export function renderFrame(ctx: CanvasRenderingContext2D, p: RenderParams) {
  ctx.clearRect(0, 0, VIEWPORT.width, VIEWPORT.height);

  ctx.save();
  ctx.translate(p.juice.shakeX, p.juice.shakeY);

  drawRoad(ctx, p.palette, p.truck.distance);
  drawAllSegments(ctx, p.segments, p.truck.distance);
  drawTruck(ctx, p.truck, p.truck.tier, p.elapsedMs);
  drawEffects(ctx, p.juice.effects);

  ctx.restore();

  // HUD는 흔들림의 영향을 받지 않도록 별도로 그린다.
  drawHUD(ctx, p.hud);
}
