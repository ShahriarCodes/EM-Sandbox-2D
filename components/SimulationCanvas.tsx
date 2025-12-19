
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CANVAS_SIZE, GRID_SIZE } from '../constants';
import { SimulationParams, SlabState, PlateState, AppMode } from '../types';
import {
  generateHeatmapData,
  updateEpsilonGrid,
  solveStep,
  embedPlates,
  renderVectorField,
} from '../services/solver';
import { GripVertical } from 'lucide-react';

interface SimulationCanvasProps {
  params: SimulationParams;
  isRunning: boolean;
  slab: SlabState;
  onSlabChange: (newSlab: SlabState) => void;
  plates: PlateState[];
  onPlatesChange: (newPlates: PlateState[]) => void;
  resetTrigger: number; 
  appMode: AppMode;
}

const isInRect = (x: number, y: number, rect: {x:number, y:number, width:number, height:number}) => {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
};

const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  params,
  isRunning,
  slab,
  onSlabChange,
  plates,
  onPlatesChange,
  resetTrigger,
  appMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // Simulation memory
  const potGridRef = useRef<Float64Array>(new Float64Array(GRID_SIZE * GRID_SIZE));
  const epsGridRef = useRef<Float32Array>(new Float32Array(GRID_SIZE * GRID_SIZE));
  const reqIdRef = useRef<number | null>(null);

  // Interaction State
  const [dragTarget, setDragTarget] = useState<{ type: 'slab' | 'plate', index?: number, action: 'move' | 'resize' } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const initSolver = useCallback(() => {
    potGridRef.current.fill(0);
    // Initial embed to set up potentials
    embedPlates(potGridRef.current, plates, params);
    updateEpsilonGrid(epsGridRef.current, slab, params);
  }, [params, slab, plates]);

  useEffect(() => {
    initSolver();
  }, [resetTrigger]);

  useEffect(() => {
    updateEpsilonGrid(epsGridRef.current, slab, params);
  }, [slab, params.epsilonSlab, params.epsilonBg]);

  // The Game Loop
  useEffect(() => {
    const loop = () => {
      // Only run the solver if the simulation is explicitly running
      if (isRunning) {
        solveStep(potGridRef.current, epsGridRef.current, plates, params);
      }
      
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          const imgData = generateHeatmapData(potGridRef.current, params);
          
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = GRID_SIZE;
          tempCanvas.height = GRID_SIZE;
          const tempCtx = tempCanvas.getContext('2d');
          tempCtx?.putImageData(imgData, 0, 0);

          ctx.imageSmoothingEnabled = false; 
          ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
          ctx.drawImage(tempCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

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
  }, [isRunning, params, dragTarget, plates]);


  // --- Interaction Handlers ---

  const getGridPos = (e: React.MouseEvent | React.TouchEvent) => {
    if (!wrapperRef.current) return { x: 0, y: 0 };
    const rect = wrapperRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const x = ((clientX - rect.left) / rect.width) * GRID_SIZE;
    const y = ((clientY - rect.top) / rect.height) * GRID_SIZE;
    return { x, y };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getGridPos(e);
    
    // Check Plates (Only in Free Mode)
    if (appMode === 'free') {
      const hitPlateIdx = plates.findIndex(p => isInRect(pos.x, pos.y, p));
      if (hitPlateIdx >= 0) {
        setDragTarget({ type: 'plate', index: hitPlateIdx, action: 'move' });
        setDragOffset({ x: pos.x - plates[hitPlateIdx].x, y: pos.y - plates[hitPlateIdx].y });
        return;
      }
    }

    // Check Slab
    if (isInRect(pos.x, pos.y, slab)) {
      setDragTarget({ type: 'slab', action: 'move' });
      setDragOffset({ x: pos.x - slab.x, y: pos.y - slab.y });
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragTarget) return;
    
    const pos = getGridPos(e);
    
    if (dragTarget.type === 'slab') {
      const newSlab = { ...slab };
      if (dragTarget.action === 'resize') {
        newSlab.width = Math.max(5, pos.x - slab.x);
        newSlab.height = Math.max(5, pos.y - slab.y);
      } else {
        const newX = Math.max(0, Math.min(GRID_SIZE - slab.width, pos.x - dragOffset.x));
        const newY = Math.max(0, Math.min(GRID_SIZE - slab.height, pos.y - dragOffset.y));
        newSlab.x = newX;
        newSlab.y = newY;
      }
      onSlabChange(newSlab);
    } 
    else if (dragTarget.type === 'plate' && dragTarget.index !== undefined) {
      const plateIndex = dragTarget.index;
      const plate = plates[plateIndex];
      const newPlates = [...plates];
      
      if (dragTarget.action === 'resize') {
         newPlates[plateIndex] = {
             ...plate,
             width: Math.max(2, pos.x - plate.x),
             height: Math.max(1, pos.y - plate.y)
         };
      } else {
         const newX = Math.max(0, Math.min(GRID_SIZE - plate.width, pos.x - dragOffset.x));
         const newY = Math.max(0, Math.min(GRID_SIZE - plate.height, pos.y - dragOffset.y));
         newPlates[plateIndex] = { ...plate, x: newX, y: newY };
      }
      onPlatesChange(newPlates);
    }
  };

  const handlePointerUp = () => {
    setDragTarget(null);
  };

  const getStyle = (obj: {x:number, y:number, width:number, height:number}) => ({
    left: `${(obj.x / GRID_SIZE) * 100}%`,
    top: `${(obj.y / GRID_SIZE) * 100}%`,
    width: `${(obj.width / GRID_SIZE) * 100}%`,
    height: `${(obj.height / GRID_SIZE) * 100}%`,
  });

  return (
    <div 
      className="relative select-none shadow-2xl rounded-lg overflow-hidden bg-black touch-none"
      style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
      ref={wrapperRef}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Plates Layer */}
      {plates.map((plate, idx) => (
        <div
          key={plate.id}
          className={`absolute border border-white/60 transition-colors z-20 
             ${appMode === 'free' ? 'cursor-move hover:border-white' : ''}
          `}
          style={{
             ...getStyle(plate),
             backgroundColor: params[plate.voltageParam] > 0 ? 'rgba(239, 68, 68, 0.5)' : 'rgba(59, 130, 246, 0.5)' 
          }}
          onMouseDown={(e) => { 
             if(appMode !== 'free') return;
             e.stopPropagation(); 
             setDragTarget({ type: 'plate', index: idx, action: 'move' }); 
             setDragOffset({ x: getGridPos(e).x - plate.x, y: getGridPos(e).y - plate.y}); 
          }}
          onTouchStart={(e) => { 
             if(appMode !== 'free') return;
             e.stopPropagation(); 
             setDragTarget({ type: 'plate', index: idx, action: 'move' }); 
             setDragOffset({ x: getGridPos(e).x - plate.x, y: getGridPos(e).y - plate.y}); 
          }}
        >
           {/* Plate Resize Handle (Only in free mode) */}
           {appMode === 'free' && (
             <div
              className="absolute bottom-0 right-0 w-4 h-4 bg-white/50 hover:bg-white cursor-nwse-resize opacity-0 hover:opacity-100"
              onMouseDown={(e) => { e.stopPropagation(); setDragTarget({ type: 'plate', index: idx, action: 'resize' }); }}
              onTouchStart={(e) => { e.stopPropagation(); setDragTarget({ type: 'plate', index: idx, action: 'resize' }); }}
            />
           )}
        </div>
      ))}

      {/* Slab Layer */}
      <div
        className={`absolute border-2 border-white/50 bg-white/10 backdrop-blur-[1px] cursor-move group hover:border-white transition-colors z-10
          ${dragTarget?.type === 'slab' ? 'border-white bg-white/20' : ''}
        `}
        style={getStyle(slab)}
        onMouseDown={(e) => { e.stopPropagation(); setDragTarget({ type: 'slab', action: 'move' }); setDragOffset({ x: getGridPos(e).x - slab.x, y: getGridPos(e).y - slab.y}); }}
        onTouchStart={(e) => { e.stopPropagation(); setDragTarget({ type: 'slab', action: 'move' }); setDragOffset({ x: getGridPos(e).x - slab.x, y: getGridPos(e).y - slab.y}); }}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
           <GripVertical className="text-white/80 drop-shadow-md" />
        </div>
        <div
          className="absolute bottom-0 right-0 w-6 h-6 bg-white/50 hover:bg-white cursor-nwse-resize rounded-tl-lg"
          onMouseDown={(e) => { e.stopPropagation(); setDragTarget({ type: 'slab', action: 'resize' }); }}
          onTouchStart={(e) => { e.stopPropagation(); setDragTarget({ type: 'slab', action: 'resize' }); }}
        />
        <div className="absolute -top-6 left-0 text-xs font-mono text-white/80 bg-black/50 px-1 rounded pointer-events-none whitespace-nowrap">
           ε = {params.epsilonSlab}
        </div>
      </div>
      
      {!isRunning && !dragTarget && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded text-xs pointer-events-none backdrop-blur-sm border border-white/10 text-center w-max">
          Drag dielectric or plates to move • Drag corners to resize
        </div>
      )}
    </div>
  );
};

export default SimulationCanvas;
