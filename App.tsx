
import React, { useState, useCallback, useEffect } from 'react';
import { DEFAULT_PARAMS, DEFAULT_SLAB, FIXED_PLATES, FREE_PLATES, CANVAS_SIZE } from './constants';
import { SimulationParams, SlabState, PlateState, AppMode } from './types';
import Controls from './components/Controls';
import SimulationCanvas from './components/SimulationCanvas';
import { getGradientCSS } from './services/solver';

const App: React.FC = () => {
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);
  const [slab, setSlab] = useState<SlabState>(DEFAULT_SLAB);
  const [appMode, setAppMode] = useState<AppMode>('fixed');
  const [plates, setPlates] = useState<PlateState[]>(FIXED_PLATES);
  const [isRunning, setIsRunning] = useState(false);
  const [resetCount, setResetCount] = useState(0);

  // Sync plates with mode
  const handleModeChange = (mode: AppMode) => {
    setAppMode(mode);
    setPlates(mode === 'fixed' ? FIXED_PLATES : FREE_PLATES);
    setResetCount(c => c + 1);
  };

  const handleToggleRun = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = useCallback(() => {
    setParams(DEFAULT_PARAMS);
    setSlab(DEFAULT_SLAB);
    setAppMode('fixed');
    setPlates(FIXED_PLATES);
    setIsRunning(false);
    setResetCount(c => c + 1);
  }, []);

  const handleParamChange = (newParams: SimulationParams) => {
    setParams(newParams);
    if (
      newParams.voltageTop !== params.voltageTop || 
      newParams.voltageBottom !== params.voltageBottom
    ) {
       setResetCount(c => c + 1);
    }
  };

  const minV = Math.min(params.voltageBottom, params.voltageTop);
  const maxV = Math.max(params.voltageBottom, params.voltageTop);
  const tickCount = 5;
  const tickLabels = [];
  for (let i = 0; i < tickCount; i++) {
    const t = 1 - i / (tickCount - 1);
    const val = minV + (maxV - minV) * t;
    tickLabels.push(val);
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100 font-sans">
      
      <Controls
        params={params}
        onParamChange={handleParamChange}
        isRunning={isRunning}
        onToggleRun={handleToggleRun}
        onReset={handleReset}
        appMode={appMode}
        onModeChange={handleModeChange}
      />

      <div className="flex-1 flex flex-col items-center justify-center relative p-4 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-800 to-neutral-950">
        
        <div className="absolute top-6 text-center z-10 opacity-70 pointer-events-none">
          <h2 className="text-2xl font-light tracking-tight text-white mb-1">Electrostatic Potential</h2>
          <p className="text-sm text-neutral-400">
            Real-time finite difference solver on a {params.gridSize}x{params.gridSize} grid
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6 mt-12">
          
          <div className="relative border-4 border-neutral-800 rounded-xl shadow-2xl">
            <SimulationCanvas
              params={params}
              isRunning={isRunning}
              slab={slab}
              onSlabChange={setSlab}
              plates={plates}
              onPlatesChange={setPlates}
              resetTrigger={resetCount}
              appMode={appMode}
            />
          </div>
          
          <div 
            style={{ height: CANVAS_SIZE }} 
            className="flex flex-col items-stretch gap-3 bg-neutral-900/80 p-4 rounded-xl border border-neutral-700 backdrop-blur-md"
          >
            <div className="flex-1 flex flex-row items-stretch gap-3">
              <div className="relative w-4 h-full rounded-full border border-neutral-600 overflow-hidden shadow-inner">
                <div 
                  className="absolute inset-0" 
                  style={{ background: getGradientCSS(params.colorMap, 'to top') }}
                />
              </div>
              
              <div className="flex flex-col justify-between h-full py-[1px]">
                  {tickLabels.map((val, i) => (
                      <div key={i} className="flex items-center gap-2">
                          <div className="w-2 h-px bg-neutral-500 shadow-sm"></div>
                          <span className="text-xs font-mono text-neutral-300 min-w-[3ch]">
                              {val.toFixed(0)}V
                          </span>
                      </div>
                  ))}
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="absolute bottom-6 text-center z-10 opacity-80 pointer-events-auto">
          <p className="text-xs text-neutral-300">
            Made with <span className="text-red-500">❤</span> by{' '}
            <a href="https://www.mdshahriar.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors underline">
              Md. Shahriar Hasan
            </a>
            {' '}| © 2025 All Rights Reserved
          </p>
        </div>

      </div>

    </div>
  );
};

export default App;
