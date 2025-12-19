
import { GRID_SIZE, ITERATIONS_PER_FRAME } from '../constants';
import { SimulationParams, SlabState, ColorMapType, PlateState } from '../types';

/**
 * Maps grid coordinates to an array index.
 */
export const idx = (x: number, y: number): number => y * GRID_SIZE + x;

/**
 * Initializes the Permittivity (Epsilon) grid based on the slab position.
 */
export const updateEpsilonGrid = (
  epsGrid: Float32Array,
  slab: SlabState,
  params: SimulationParams
) => {
  const { epsilonSlab, epsilonBg } = params;
  
  // Reset grid
  epsGrid.fill(epsilonBg);

  // Rasterize slab (simple bounding box check)
  const startX = Math.max(0, Math.floor(slab.x));
  const endX = Math.min(GRID_SIZE, Math.ceil(slab.x + slab.width));
  const startY = Math.max(0, Math.floor(slab.y));
  const endY = Math.min(GRID_SIZE, Math.ceil(slab.y + slab.height));

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      epsGrid[idx(x, y)] = epsilonSlab;
    }
  }
};

/**
 * Enforces Dirichlet boundary conditions from plates onto the potential grid.
 * This overwrites the potential values at plate locations.
 */
export const embedPlates = (
  potGrid: Float64Array,
  plates: PlateState[],
  params: SimulationParams
) => {
  for (const plate of plates) {
    const voltage = params[plate.voltageParam];
    
    const startX = Math.max(0, Math.floor(plate.x));
    const endX = Math.min(GRID_SIZE, Math.ceil(plate.x + plate.width));
    const startY = Math.max(0, Math.floor(plate.y));
    const endY = Math.min(GRID_SIZE, Math.ceil(plate.y + plate.height));

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        // Bounds check to be safe
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
           potGrid[idx(x, y)] = voltage;
        }
      }
    }
  }
};

/**
 * Performs one iteration of the solver using Finite Difference Method.
 * We are solving Del . (Epsilon * Del V) = 0
 */
export const solveStep = (
  potGrid: Float64Array,
  epsGrid: Float32Array,
  plates: PlateState[],
  params: SimulationParams
) => {
  
  for (let iter = 0; iter < ITERATIONS_PER_FRAME; iter++) {
    
    // 1. Enforce Edge Boundaries (Outer Box)
    // Top Edge
    for (let x = 0; x < GRID_SIZE; x++) {
      if (params.boundaryTop === 'neumann') potGrid[idx(x, 0)] = potGrid[idx(x, 1)];
      else potGrid[idx(x, 0)] = 0; // Grounded if Dirichlet (unless plate overrides)
    }
    // Bottom Edge
    for (let x = 0; x < GRID_SIZE; x++) {
      if (params.boundaryBottom === 'neumann') potGrid[idx(x, GRID_SIZE - 1)] = potGrid[idx(x, GRID_SIZE - 2)];
      else potGrid[idx(x, GRID_SIZE - 1)] = 0;
    }
    // Left Edge
    for (let y = 0; y < GRID_SIZE; y++) {
      if (params.boundaryLeft === 'neumann') potGrid[idx(0, y)] = potGrid[idx(1, y)];
      else potGrid[idx(0, y)] = 0;
    }
    // Right Edge
    for (let y = 0; y < GRID_SIZE; y++) {
      if (params.boundaryRight === 'neumann') potGrid[idx(GRID_SIZE - 1, y)] = potGrid[idx(GRID_SIZE - 2, y)];
      else potGrid[idx(GRID_SIZE - 1, y)] = 0;
    }

    // 2. Relaxation Loop (Interior)
    for (let y = 1; y < GRID_SIZE - 1; y++) {
      for (let x = 1; x < GRID_SIZE - 1; x++) {
        
        const i = idx(x, y);
        
        const iU = idx(x, y - 1);
        const iD = idx(x, y + 1);
        const iL = idx(x - 1, y);
        const iR = idx(x + 1, y);

        // Permittivities at half-steps
        const epsU = (epsGrid[i] + epsGrid[iU]) * 0.5;
        const epsD = (epsGrid[i] + epsGrid[iD]) * 0.5;
        const epsL = (epsGrid[i] + epsGrid[iL]) * 0.5;
        const epsR = (epsGrid[i] + epsGrid[iR]) * 0.5;

        const sumEps = epsU + epsD + epsL + epsR;

        const newPot = (
          epsU * potGrid[iU] +
          epsD * potGrid[iD] +
          epsL * potGrid[iL] +
          epsR * potGrid[iR]
        ) / sumEps;

        potGrid[i] = newPot;
      }
    }

    // 3. Enforce Plates (Dirichlet overrides)
    // This happens after relaxation to strictly enforce the source voltages
    embedPlates(potGrid, plates, params);
  }
};

// --- Color Map Logic ---

interface RGB { r: number; g: number; b: number; }

const lerpRGB = (c1: RGB, c2: RGB, t: number): RGB => ({
  r: Math.round(c1.r + (c2.r - c1.r) * t),
  g: Math.round(c1.g + (c2.g - c1.g) * t),
  b: Math.round(c1.b + (c2.b - c1.b) * t),
});

const getMultiStopColor = (t: number, stops: { pos: number; color: RGB }[]): RGB => {
  if (t <= 0) return stops[0].color;
  if (t >= 1) return stops[stops.length - 1].color;

  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].pos && t <= stops[i+1].pos) {
      const range = stops[i+1].pos - stops[i].pos;
      const localT = (t - stops[i].pos) / range;
      return lerpRGB(stops[i].color, stops[i+1].color, localT);
    }
  }
  return stops[stops.length - 1].color;
};

const COLOR_MAPS: Record<string, { pos: number, color: RGB }[]> = {
  jet: [
    { pos: 0, color: { r: 0, g: 0, b: 128 } },
    { pos: 0.125, color: { r: 0, g: 0, b: 255 } },
    { pos: 0.375, color: { r: 0, g: 255, b: 255 } },
    { pos: 0.625, color: { r: 255, g: 255, b: 0 } },
    { pos: 0.875, color: { r: 255, g: 0, b: 0 } },
    { pos: 1, color: { r: 128, g: 0, b: 0 } }
  ],
  hot: [
    { pos: 0, color: { r: 0, g: 0, b: 0 } },
    { pos: 0.33, color: { r: 255, g: 0, b: 0 } },
    { pos: 0.66, color: { r: 255, g: 255, b: 0 } },
    { pos: 1, color: { r: 255, g: 255, b: 255 } }
  ],
  magma: [
    { pos: 0, color: { r: 0, g: 0, b: 4 } },
    { pos: 0.25, color: { r: 80, g: 18, b: 123 } },
    { pos: 0.5, color: { r: 182, g: 54, b: 121 } },
    { pos: 0.75, color: { r: 251, g: 135, b: 97 } },
    { pos: 1, color: { r: 252, g: 253, b: 191 } }
  ],
  gray: [
    { pos: 0, color: { r: 0, g: 0, b: 0 } },
    { pos: 1, color: { r: 255, g: 255, b: 255 } }
  ]
};

const getTurboColor = (t: number): RGB => {
  let r = 0, g = 0, b = 0;
  if (t < 0.25) { 
    b = 255; g = Math.floor(255 * (t / 0.25)); 
  } else if (t < 0.5) { 
    b = Math.floor(255 * (1 - (t - 0.25) / 0.25)); g = 255; 
  } else if (t < 0.75) { 
    g = 255; r = Math.floor(255 * ((t - 0.5) / 0.25)); 
  } else { 
    r = 255; g = Math.floor(255 * (1 - (t - 0.75) / 0.25)); 
  }
  return { r, g, b };
};

const getColor = (t: number, type: ColorMapType): RGB => {
  if (type === 'turbo') return getTurboColor(t);
  return getMultiStopColor(t, COLOR_MAPS[type] || COLOR_MAPS['jet']);
};

export const getGradientCSS = (type: ColorMapType, direction: string = 'to right'): string => {
  if (type === 'turbo') {
    return `linear-gradient(${direction}, rgb(0,0,255), rgb(0,255,255), rgb(0,255,0), rgb(255,255,0), rgb(255,0,0))`;
  }
  if (!COLOR_MAPS[type]) return `linear-gradient(${direction}, black, white)`;
  const stops = COLOR_MAPS[type];
  const cssStops = stops.map(s => `rgb(${s.color.r},${s.color.g},${s.color.b}) ${s.pos * 100}%`).join(', ');
  return `linear-gradient(${direction}, ${cssStops})`;
};

export const generateHeatmapData = (
  potGrid: Float64Array,
  params: SimulationParams
): ImageData => {
  const imgData = new ImageData(GRID_SIZE, GRID_SIZE);
  const data = imgData.data;
  
  const minV = Math.min(params.voltageBottom, params.voltageTop);
  const maxV = Math.max(params.voltageBottom, params.voltageTop);
  const range = maxV - minV || 1;

  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    const val = potGrid[i];
    let t = (val - minV) / range;
    t = Math.max(0, Math.min(1, t));

    const { r, g, b } = getColor(t, params.colorMap);

    const px = i * 4;
    data[px] = r;
    data[px + 1] = g;
    data[px + 2] = b;
    data[px + 3] = 255; 
  }

  return imgData;
};

export const renderVectorField = (
  ctx: CanvasRenderingContext2D,
  potGrid: Float64Array,
  canvasWidth: number,
  canvasHeight: number,
  params: SimulationParams
) => {
  const { vectorColor, vectorWidth, vectorOpacity } = params;
  const STRIDE = 5; 
  const SCALE_FACTOR = canvasWidth / GRID_SIZE; 
  
  ctx.save();
  ctx.strokeStyle = vectorColor;
  ctx.fillStyle = vectorColor;
  ctx.lineWidth = vectorWidth;
  ctx.globalAlpha = vectorOpacity;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let y = 2; y < GRID_SIZE - 2; y += STRIDE) {
    for (let x = 2; x < GRID_SIZE - 2; x += STRIDE) {
      const dVdx = (potGrid[idx(x + 1, y)] - potGrid[idx(x - 1, y)]) / 2;
      const dVdy = (potGrid[idx(x, y + 1)] - potGrid[idx(x, y - 1)]) / 2;
      const Ex = -dVdx;
      const Ey = -dVdy;
      const mag = Math.sqrt(Ex * Ex + Ey * Ey);
      
      if (mag < 0.01) continue;

      const px = (x + 0.5) * SCALE_FACTOR;
      const py = (y + 0.5) * SCALE_FACTOR;

      const maxLen = STRIDE * SCALE_FACTOR * 0.9; 
      const visualMag = Math.min(mag * 8, maxLen); 

      const dx = (Ex / mag) * visualMag;
      const dy = (Ey / mag) * visualMag;

      drawArrow(ctx, px, py, dx, dy);
    }
  }
  ctx.restore();
};

function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number) {
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length < 3) return; 

  const angle = Math.atan2(dy, dx);
  const endX = x + dx;
  const endY = y + dy;
  const headLength = Math.min(12, Math.max(5, length * 0.35)); 
  const headAngle = Math.PI / 6; 

  ctx.beginPath();
  ctx.moveTo(x, y);
  const shaftTipX = endX - (headLength * 0.7) * Math.cos(angle);
  const shaftTipY = endY - (headLength * 0.7) * Math.sin(angle);
  ctx.lineTo(shaftTipX, shaftTipY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - headLength * Math.cos(angle - headAngle),
    endY - headLength * Math.sin(angle - headAngle)
  );
  ctx.lineTo(
    endX - headLength * Math.cos(angle + headAngle),
    endY - headLength * Math.sin(angle + headAngle)
  );
  ctx.closePath();
  ctx.fill();
}
