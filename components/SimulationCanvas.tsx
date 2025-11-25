
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CANVAS_SIZE, GRID_SIZE } from '../constants';
import { SimulationParams, SlabState } from '../types';
import {
  generateHeatmapData,
  updateEpsilonGrid,
  solveStep,
  applyBoundaries,
  renderVectorField,
} from '../services/solver';
import { GripVertical } from 'lucide-react';

interface SimulationCanvasProps {
  params: SimulationParams;
  isRunning: boolean;
  slab: SlabState;
  onSlabChange: (newSlab: SlabState) => void;
  // Triggered when params change externally to reset solver
  resetTrigger: number; 
}

const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  params,
  isRunning,
  slab,
  onSlabChange,
  resetTrigger,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // Simulation memory (Ref to avoid re-renders)
  const potGridRef = useRef<Float64Array>(new Float64Array(GRID_SIZE * GRID_SIZE));
  const epsGridRef = useRef<Float32Array>(new Float32Array(GRID_SIZE * GRID_SIZE));
  const reqIdRef = useRef<number | null>(null);

  // Slab Interaction State
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [activeHandle, setActiveHandle] = useState<string | null>(null);

  // Initialize or Reset Solver
  const initSolver = useCallback(() => {
    // Fill potential with 0 (or linear gradient guess for faster convergence)
    potGridRef.current.fill(0);
    applyBoundaries(potGridRef.current, params);
    updateEpsilonGrid(epsGridRef.current, slab, params);
  }, [params, slab]);

  // Handle Full Reset when params change drastically
  useEffect(() => {
    initSolver();
  }, [resetTrigger]);

  // Handle Slab Geometry Change
  // When slab moves, we update epsilon grid immediately
  // We do NOT clear potential grid completely, we let it relax to new state (smoother physics)
  useEffect(() => {
    updateEpsilonGrid(epsGridRef.current, slab, params);
  }, [slab, params.epsilonSlab, params.epsilonBg]);

  // The Game Loop
  useEffect(() => {
    const loop = () => {
      if (isRunning && !isDragging) {
        solveStep(potGridRef.current, epsGridRef.current, params);
      }
      
      // Always draw, even if paused, to show updates or slab movement
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          // 1. Draw Heatmap
          // Generate small image data
          const imgData = generateHeatmapData(potGridRef.current, params);
          
          // Draw to an offscreen bitmap or temp canvas to scale up
          // A simple way to scale up pixel art is create a temp canvas
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = GRID_SIZE;
          tempCanvas.height = GRID_SIZE;
          const tempCtx = tempCanvas.getContext('2d');
          tempCtx?.putImageData(imgData, 0, 0);

          // Draw scaled up to main canvas
          ctx.imageSmoothingEnabled = false; // Nearest neighbor for retro grid look
          ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
          ctx.drawImage(tempCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

          // 2. Draw Vector Field (Quiver Plot) if enabled
          if (params.showVectors) {
            renderVectorField(ctx, potGridRef.current, CANVAS_SIZE, CANVAS_SIZE, params);
          }
        }
      }

      reqIdRef.current = requestAnimationFrame(loop);
    };

    reqIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
    };
  }, [isRunning, params, isDragging]);


  // --- Interaction Handlers (Mouse/Touch) ---

  const getGridPos = (e: React.MouseEvent | React.TouchEvent) => {
    if (!wrapperRef.current) return { x: 0, y: 0 };
    const rect = wrapperRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    // Map pixels to 0-100 grid
    const x = ((clientX - rect.left) / rect.width) * GRID_SIZE;
    const y = ((clientY - rect.top) / rect.height) * GRID_SIZE;
    return { x, y };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent, handleType: string | null = null) => {
    e.preventDefault();
    const pos = getGridPos(e);
    
    if (handleType) {
      setActiveHandle(handleType);
      setIsDragging(true);
    } else {
      // Check if clicking inside slab
      if (
        pos.x >= slab.x &&
        pos.x <= slab.x + slab.width &&
        pos.y >= slab.y &&
        pos.y <= slab.y + slab.height
      ) {
        setDragOffset({ x: pos.x - slab.x, y: pos.y - slab.y });
        setIsDragging(true);
      }
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    
    const pos = getGridPos(e);
    let newSlab = { ...slab };

    if (activeHandle === 'se') { // South-East Resize
      newSlab.width = Math.max(5, pos.x - slab.x);
      newSlab.height = Math.max(5, pos.y - slab.y);
    } else if (activeHandle === null) { // Move
      const newX = Math.max(0, Math.min(GRID_SIZE - slab.width, pos.x - dragOffset.x));
      const newY = Math.max(0, Math.min(GRID_SIZE - slab.height, pos.y - dragOffset.y));
      newSlab.x = newX;
      newSlab.y = newY;
    }

    onSlabChange(newSlab);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setActiveHandle(null);
  };

  // --- Styles for Slab Overlay ---
  
  // Convert Grid Coords to CSS Percentages
  const slabStyle: React.CSSProperties = {
    left: `${(slab.x / GRID_SIZE) * 100}%`,
    top: `${(slab.y / GRID_SIZE) * 100}%`,
    width: `${(slab.width / GRID_SIZE) * 100}%`,
    height: `${(slab.height / GRID_SIZE) * 100}%`,
  };

  return (
    <div 
      className="relative select-none shadow-2xl rounded-lg overflow-hidden bg-black"
      style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
      ref={wrapperRef}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
    >
      {/* 1. Heatmap & Vectors Layer */}
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="absolute inset-0 pointer-events-none"
      />

      {/* 2. Interactive Slab Layer */}
      <div
        className={`absolute border-2 border-white/50 bg-white/10 backdrop-blur-[1px] cursor-move group hover:border-white transition-colors ${
          isDragging ? 'border-white bg-white/20' : ''
        }`}
        style={slabStyle}
        onMouseDown={(e) => handlePointerDown(e, null)}
        onTouchStart={(e) => handlePointerDown(e, null)}
      >
        {/* Center Grip Icon */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
           <GripVertical className="text-white/80 drop-shadow-md" />
        </div>

        {/* Resize Handle (Bottom Right) */}
        <div
          className="absolute bottom-0 right-0 w-6 h-6 bg-white/50 hover:bg-white cursor-nwse-resize rounded-tl-lg"
          onMouseDown={(e) => {
            e.stopPropagation();
            handlePointerDown(e, 'se');
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            handlePointerDown(e, 'se');
          }}
        />
        
        {/* Label */}
        <div className="absolute -top-6 left-0 text-xs font-mono text-white/80 bg-black/50 px-1 rounded pointer-events-none whitespace-nowrap">
           ε = {params.epsilonSlab}
        </div>
      </div>
      
      {/* Overlay Instructions (Fades out when running) */}
      {!isRunning && !isDragging && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded text-xs pointer-events-none backdrop-blur-sm border border-white/10">
          Drag box to move dielectric • Drag corner to resize
        </div>
      )}
    </div>
  );
};

export default SimulationCanvas;
