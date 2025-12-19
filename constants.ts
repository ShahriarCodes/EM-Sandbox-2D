
import { SimulationParams, SlabState, PlateState } from './types';

export const GRID_SIZE = 100; // 100x100 grid
export const CANVAS_SIZE = 600; // Visual size in pixels

export const DEFAULT_PARAMS: SimulationParams = {
  gridSize: GRID_SIZE,
  epsilonSlab: 4.0,
  epsilonBg: 1.0,
  voltageTop: 100,
  voltageBottom: -100,
  showVectors: true,
  vectorColor: '#000000',
  vectorOpacity: 0.8,
  vectorWidth: 1.0,
  colorMap: 'turbo',
  boundaryTop: 'neumann',
  boundaryBottom: 'neumann',
  boundaryLeft: 'neumann',
  boundaryRight: 'neumann',
};

export const DEFAULT_SLAB: SlabState = {
  x: 35,
  y: 40,
  width: 30,
  height: 20,
};

// Fixed Mode: Full width at edges (acting as standard capacitor plates)
export const FIXED_PLATES: PlateState[] = [
  { id: 'top', x: 0, y: 0, width: 100, height: 4, voltageParam: 'voltageTop' },
  { id: 'bottom', x: 0, y: 96, width: 100, height: 4, voltageParam: 'voltageBottom' },
];

// Free Mode: 40x3 draggable blocks
export const FREE_PLATES: PlateState[] = [
  { id: 'top', x: 30, y: 20, width: 40, height: 3, voltageParam: 'voltageTop' },
  { id: 'bottom', x: 30, y: 75, width: 40, height: 3, voltageParam: 'voltageBottom' },
];

export const ITERATIONS_PER_FRAME = 40; // Speed of solver
