
import { GRID_SIZE, ITERATIONS_PER_FRAME } from '../constants';
import { SimulationParams, SlabState, ColorMapType } from '../types';

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
  // We use floor/ceil to cover partial cells reasonably well
  const startX = Math.max(0, Math.floor(slab.x));
  const endX = Math.min(GRID_SIZE - 1, Math.ceil(slab.x + slab.width));
  const startY = Math.max(0, Math.floor(slab.y));
  const endY = Math.min(GRID_SIZE - 1, Math.ceil(slab.y + slab.height));

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      epsGrid[idx(x, y)] = epsilonSlab;
    }
  }
};

/**
 * Initializes boundary conditions for the Potential grid.
 */
export const applyBoundaries = (
  potGrid: Float64Array,
  params: SimulationParams
) => {
  const { voltageTop, voltageBottom } = params;

  // Top row (Fixed Voltage)
  for (let x = 0; x < GRID_SIZE; x++) {
    potGrid[idx(x, 0)] = voltageTop;
  }

  // Bottom row (Fixed Voltage)
  for (let x = 0; x < GRID_SIZE; x++) {
    potGrid[idx(x, GRID_SIZE - 1)] = voltageBottom;
  }
};

/**
 * Performs one iteration of the solver using Finite Difference Method.
 * We are solving Del . (Epsilon * Del V) = 0
 */
export const solveStep = (
  potGrid: Float64Array,
  epsGrid: Float32Array,
  params: SimulationParams
) => {
  // Use a temporary buffer or update in place (Gauss-Seidel). 
  // Gauss-Seidel is in-place and generally converges faster for this than Jacobi.
  
  // We skip the top and bottom rows (Dirichlet boundaries)
  // We handle left and right as Neumann (dV/dx = 0) by copying neighbors
  
  for (let iter = 0; iter < ITERATIONS_PER_FRAME; iter++) {
    for (let y = 1; y < GRID_SIZE - 1; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        
        // Handle Left/Right Neumann boundaries
        if (x === 0) {
          potGrid[idx(x, y)] = potGrid[idx(x + 1, y)];
          continue;
        }
        if (x === GRID_SIZE - 1) {
          potGrid[idx(x, y)] = potGrid[idx(x - 1, y)];
          continue;
        }

        const i = idx(x, y);
        
        // Neighbors indices
        const iU = idx(x, y - 1);
        const iD = idx(x, y + 1);
        const iL = idx(x - 1, y);
        const iR = idx(x + 1, y);

        // Permittivities at half-steps (average between cells)
        const epsU = (epsGrid[i] + epsGrid[iU]) * 0.5;
        const epsD = (epsGrid[i] + epsGrid[iD]) * 0.5;
        const epsL = (epsGrid[i] + epsGrid[iL]) * 0.5;
        const epsR = (epsGrid[i] + epsGrid[iR]) * 0.5;

        const sumEps = epsU + epsD + epsL + epsR;

        // Discrete Poisson equation update
        const newPot = (
          epsU * potGrid[iU] +
          epsD * potGrid[iD] +
          epsL * potGrid[iL] +
          epsR * potGrid[iR]
        ) / sumEps;

        potGrid[i] = newPot;
      }
    }
  }
};

// --- Color Map Logic ---

interface RGB { r: number; g: number; b: number; }

// Simple linear interpolation between two colors
const lerpRGB = (c1: RGB, c2: RGB, t: number): RGB => ({
  r: Math.round(c1.r + (c2.r - c1.r) * t),
  g: Math.round(c1.g + (c2.g - c1.g) * t),
  b: Math.round(c1.b + (c2.b - c1.b) * t),
});

// Helper to get color from multi-stop gradients
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

// Gradient Definitions
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
  // Procedural approximation of Turbo
  // t: 0..1
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

/**
 * Generates a CSS gradient string for the Legend based on the selected colormap.
 */
export const getGradientCSS = (type: ColorMapType, direction: string = 'to right'): string => {
  if (type === 'turbo') {
    return `linear-gradient(${direction}, rgb(0,0,255), rgb(0,255,255), rgb(0,255,0), rgb(255,255,0), rgb(255,0,0))`;
  }
  
  if (!COLOR_MAPS[type]) return `linear-gradient(${direction}, black, white)`;

  const stops = COLOR_MAPS[type];
  const cssStops = stops.map(s => `rgb(${s.color.r},${s.color.g},${s.color.b}) ${s.pos * 100}%`).join(', ');
  return `linear-gradient(${direction}, ${cssStops})`;
};

/**
 * Fast renderer: Creates a 100x100 ImageData and returns it.
 * The canvas component will then draw this scaled up.
 */
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
    data[px + 3] = 255; // Alpha
  }

  return imgData;
};


/**
 * Draws a quiver plot of the Electric Field (E = -grad V)
 */
export const renderVectorField = (
  ctx: CanvasRenderingContext2D,
  potGrid: Float64Array,
  canvasWidth: number,
  canvasHeight: number,
  params: SimulationParams
) => {
  const { vectorColor, vectorWidth, vectorOpacity } = params;
  const STRIDE = 5; // Draw an arrow every 5 grid cells
  const SCALE_FACTOR = canvasWidth / GRID_SIZE; // Pixels per grid cell
  
  ctx.save();
  ctx.strokeStyle = vectorColor;
  ctx.fillStyle = vectorColor;
  ctx.lineWidth = vectorWidth;
  ctx.globalAlpha = vectorOpacity;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // We loop through the grid with a stride
  for (let y = 2; y < GRID_SIZE - 2; y += STRIDE) {
    for (let x = 2; x < GRID_SIZE - 2; x += STRIDE) {
      // Calculate Gradient (-dV/dx, -dV/dy)
      // E = - grad V
      // Using central difference for better accuracy
      const dVdx = (potGrid[idx(x + 1, y)] - potGrid[idx(x - 1, y)]) / 2;
      const dVdy = (potGrid[idx(x, y + 1)] - potGrid[idx(x, y - 1)]) / 2;

      const Ex = -dVdx;
      const Ey = -dVdy;

      const mag = Math.sqrt(Ex * Ex + Ey * Ey);
      
      // If field is negligible, skip
      if (mag < 0.01) continue;

      // Arrow position in canvas pixels
      // Shift by 0.5 to center in the cell
      const px = (x + 0.5) * SCALE_FACTOR;
      const py = (y + 0.5) * SCALE_FACTOR;

      // Arrow visual length
      // We clamp the length so it doesn't overlap neighbors too much
      // A magnitude of 1.0 (approx 1V/cell) is a reasonable reference
      const maxLen = STRIDE * SCALE_FACTOR * 0.9; 
      const visualMag = Math.min(mag * 8, maxLen); 

      // Normalize direction
      const dx = (Ex / mag) * visualMag;
      const dy = (Ey / mag) * visualMag;

      drawArrow(ctx, px, py, dx, dy);
    }
  }

  ctx.restore();
};

function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number) {
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length < 3) return; // Too small to render nicely

  const angle = Math.atan2(dy, dx);
  const endX = x + dx;
  const endY = y + dy;

  // Arrowhead configuration
  // Dynamic size based on vector length
  const headLength = Math.min(12, Math.max(5, length * 0.35)); 
  const headAngle = Math.PI / 6; // 30 degrees

  // Draw Shaft
  // We stop the shaft slightly before the end so it doesn't poke through the tip if we were using transparency,
  // but mostly to separate concerns. Here we just draw it to the "base" of the arrow head.
  ctx.beginPath();
  ctx.moveTo(x, y);
  // Shorten shaft to sit inside the filled head
  const shaftTipX = endX - (headLength * 0.7) * Math.cos(angle);
  const shaftTipY = endY - (headLength * 0.7) * Math.sin(angle);
  ctx.lineTo(shaftTipX, shaftTipY);
  ctx.stroke();

  // Draw Filled Arrowhead
  ctx.beginPath();
  ctx.moveTo(endX, endY); // Tip
  
  // Right wing
  ctx.lineTo(
    endX - headLength * Math.cos(angle - headAngle),
    endY - headLength * Math.sin(angle - headAngle)
  );
  
  // Left wing
  ctx.lineTo(
    endX - headLength * Math.cos(angle + headAngle),
    endY - headLength * Math.sin(angle + headAngle)
  );
  
  ctx.closePath();
  ctx.fill();
}
