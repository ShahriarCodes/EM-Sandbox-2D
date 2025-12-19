
import React from 'react';
import { SimulationParams, AppMode } from '../types';
import { Play, Pause, RotateCcw, Activity, Palette, Move, Lock, ShieldCheck } from 'lucide-react';

interface ControlsProps {
  params: SimulationParams;
  onParamChange: (newParams: SimulationParams) => void;
  isRunning: boolean;
  onToggleRun: () => void;
  onReset: () => void;
  appMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

const Controls: React.FC<ControlsProps> = ({
  params,
  onParamChange,
  isRunning,
  onToggleRun,
  onReset,
  appMode,
  onModeChange,
}) => {
  const handleChange = (key: keyof SimulationParams, value: any) => {
    onParamChange({ ...params, [key]: value });
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 bg-neutral-900 text-neutral-200 w-full md:w-80 border-b md:border-b-0 md:border-r border-neutral-700 h-auto md:h-full overflow-y-auto shrink-0 scrollbar-thin scrollbar-thumb-neutral-700">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-white tracking-tight">EM Sandbox</h1>
        <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">Poisson Solver (100x100)</p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={onToggleRun}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold transition-all shadow-lg active:scale-95 ${
            isRunning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {isRunning ? <><Pause size={20} /> Pause</> : <><Play size={20} /> Run Simulation</>}
        </button>
        <button onClick={onReset} className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 font-semibold border border-neutral-700 text-sm">
          <RotateCcw size={16} /> Reset
        </button>
      </div>

      <div className="space-y-6">
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-500">
             <Move size={14} /> Interaction Mode
          </h2>
          <div className="grid grid-cols-2 gap-2 bg-neutral-800/50 p-1 rounded-lg border border-neutral-700">
            <button
              onClick={() => onModeChange('fixed')}
              className={`flex flex-col items-center py-2 rounded-md text-[10px] uppercase font-bold transition-all ${
                appMode === 'fixed' 
                ? 'bg-neutral-600 text-white shadow-md' 
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700/50'
              }`}
            >
              <Lock size={16} className="mb-1" /> Fixed Plates
            </button>
            <button
              onClick={() => onModeChange('free')}
              className={`flex flex-col items-center py-2 rounded-md text-[10px] uppercase font-bold transition-all ${
                appMode === 'free' 
                ? 'bg-neutral-600 text-white shadow-md' 
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700/50'
              }`}
            >
              <Move size={16} className="mb-1" /> Free Move
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-500">
            <Activity size={14} /> Physics Settings
          </h2>
          <div className="space-y-4 bg-neutral-800/50 p-3 rounded-lg border border-neutral-700">
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[10px] font-medium text-neutral-400">Slab ε</label>
                    <input type="number" step="0.1" min="1" value={params.epsilonSlab} onChange={(e) => handleChange('epsilonSlab', parseFloat(e.target.value))} className="w-full bg-neutral-700 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500 transition-all" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-medium text-neutral-400">Background ε</label>
                    <input type="number" step="0.1" min="1" value={params.epsilonBg} onChange={(e) => handleChange('epsilonBg', parseFloat(e.target.value))} className="w-full bg-neutral-700 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500 transition-all" />
                </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-400">Top Plate (V+)</label>
              <input type="number" value={params.voltageTop} onChange={(e) => handleChange('voltageTop', parseFloat(e.target.value))} className="w-full bg-neutral-700 rounded px-2 py-1.5 text-sm outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-400">Bottom Plate (V-)</label>
              <input type="number" value={params.voltageBottom} onChange={(e) => handleChange('voltageBottom', parseFloat(e.target.value))} className="w-full bg-neutral-700 rounded px-2 py-1.5 text-sm outline-none" />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-500">
            <ShieldCheck size={14} /> Boundaries
          </h2>
          <div className="grid grid-cols-2 gap-2 bg-neutral-800/50 p-3 rounded-lg border border-neutral-700">
            {(['Top', 'Bottom', 'Left', 'Right'] as const).map(side => {
              const key = `boundary${side}` as keyof SimulationParams;
              return (
                <div key={side} className="space-y-1">
                  <label className="text-[10px] text-neutral-500 font-bold">{side}</label>
                  <select 
                    value={params[key] as string} 
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="w-full bg-neutral-700 rounded text-[10px] p-1 uppercase appearance-none text-center cursor-pointer"
                  >
                    <option value="dirichlet">Grounded</option>
                    <option value="neumann">Insulated</option>
                  </select>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-500">
            <Palette size={14} /> Visualization
          </h2>
          <div className="space-y-3 bg-neutral-800/50 p-3 rounded-lg border border-neutral-700">
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-400">Potential Map</label>
              <select value={params.colorMap} onChange={(e) => handleChange('colorMap', e.target.value)} className="w-full bg-neutral-700 rounded px-2 py-1.5 text-sm outline-none cursor-pointer">
                <option value="turbo">Turbo</option>
                <option value="jet">Jet</option>
                <option value="magma">Magma</option>
                <option value="hot">Hot</option>
                <option value="gray">Grayscale</option>
              </select>
            </div>

            <div className="pt-2 border-t border-neutral-700">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs">Show E-Field</span>
                    <input type="checkbox" checked={params.showVectors} onChange={(e) => handleChange('showVectors', e.target.checked)} className="w-4 h-4 accent-emerald-500" />
                </div>
                
                {params.showVectors && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center justify-between gap-2">
                            <label className="text-[10px] text-neutral-400">Color</label>
                            <div className="flex items-center gap-2 bg-neutral-700 rounded-md p-1 pr-2">
                                <input type="color" value={params.vectorColor} onChange={(e) => handleChange('vectorColor', e.target.value)} className="w-4 h-4 rounded cursor-pointer bg-transparent border-none p-0" />
                                <span className="text-[10px] font-mono uppercase">{params.vectorColor}</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                           <div className="flex justify-between">
                             <label className="text-[10px] text-neutral-400">Opacity</label>
                             <span className="text-[10px] text-neutral-500">{Math.round(params.vectorOpacity * 100)}%</span>
                           </div>
                           <input type="range" min="0.1" max="1" step="0.1" value={params.vectorOpacity} onChange={(e) => handleChange('vectorOpacity', parseFloat(e.target.value))} className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-neutral-400" />
                        </div>
                    </div>
                )}
            </div>

          </div>
        </section>
      </div>
    </div>
  );
};

export default Controls;
