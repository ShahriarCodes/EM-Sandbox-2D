
import { SimulationParams, SlabState } from './types';

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
  vectorOpacity: 1.0,
  vectorWidth: 1.0,
  colorMap: 'turbo',
};

export const DEFAULT_SLAB: SlabState = {
  x: 25,
  y: 35,
  width: 50,
  height: 30,
};

export const ITERATIONS_PER_FRAME = 40; // Speed of solver
