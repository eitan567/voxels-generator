
import React, { useRef } from 'react';
import { GenerationStatus, VoxelModel, AnimationType, ModelCategory } from '../types';

interface UIOverlayProps {
  prompt: string;
  setPrompt: (v: string) => void;
  category: ModelCategory;
  setCategory: (c: ModelCategory) => void;
  onGenerate: (img?: string) => void;
  onGenerateImage: () => void;
  status: GenerationStatus;
  error: string | null;
  model: VoxelModel | null;
  conceptImage: string | null;
  setConceptImage: (img: string | null) => void;
  onReset: () => void;
  onSave: () => void;
  savedModels: VoxelModel[];
  onLoad: (m: VoxelModel) => void;
  onDelete: (id: string) => void;
  onSetAnimation: (anim: AnimationType) => void;
  isEditMode: boolean;
  setIsEditMode: (v: boolean) => void;
  isPhysicsEnabled: boolean;
  setIsPhysicsEnabled: (v: boolean) => void;
  editTool: 'paint' | 'erase';
  setEditTool: (v: 'paint' | 'erase') => void;
  brushColor: string;
  setBrushColor: (v: string) => void;
  genOptions: { style: string, density: string };
  setGenOptions: (v: { style: string, density: string }) => void;
  jointStiffness: number;
  setJointStiffness: (v: number) => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ 
  prompt, setPrompt, category, setCategory, onGenerate, onGenerateImage, status, error, model, 
  conceptImage, setConceptImage, onReset, 
  onSave, savedModels, onLoad, onDelete, onSetAnimation,
  isEditMode, setIsEditMode, isPhysicsEnabled, setIsPhysicsEnabled,
  editTool, setEditTool, brushColor, setBrushColor, genOptions, setGenOptions,
  jointStiffness, setJointStiffness
}) => {
  const [showLibrary, setShowLibrary] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isGenerating = status === GenerationStatus.THINKING || status === GenerationStatus.GENERATING;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setConceptImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const categories: {id: ModelCategory, icon: string, label: string}[] = [
    { id: 'character', icon: 'fa-user-astronaut', label: 'CHAR' },
    { id: 'animal', icon: 'fa-paw', label: 'BEAST' },
    { id: 'object', icon: 'fa-cube', label: 'ITEM' },
  ];

  const getAnimationsForCategory = (cat: ModelCategory): {id: AnimationType, icon: string, label: string}[] => {
    const common: {id: AnimationType, icon: string, label: string}[] = [{id: 'idle', icon: 'fa-wind', label: 'IDLE'}];
    
    if (cat === 'object') {
        return [
            ...common,
            { id: 'spin' as AnimationType, icon: 'fa-sync', label: 'SPIN' },
            { id: 'float' as AnimationType, icon: 'fa-ghost', label: 'FLOAT' }
        ];
    }
    
    return [
      ...common,
      { id: 'walk' as AnimationType, icon: 'fa-person-walking', label: 'WALK' },
      { id: 'run' as AnimationType, icon: 'fa-person-running', label: 'RUN' },
      { id: 'jump' as AnimationType, icon: 'fa-arrow-up', label: 'JUMP' },
      { id: 'attack' as AnimationType, icon: 'fa-fist-raised', label: 'ATK' }
    ];
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between overflow-hidden">
      {/* Top Bar */}
      <div className="p-4 flex justify-between items-center pointer-events-auto bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowLibrary(!showLibrary)} 
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-slate-800/90 border border-slate-700 rounded-xl text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <i className={`fas ${showLibrary ? 'fa-times' : 'fa-th-large'}`}></i>
          </button>
          <div className="flex flex-col min-w-0">
            <h1 className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 leading-none truncate">
              VOXEL STUDIO
            </h1>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1 truncate">Concept Suite v3.2</span>
          </div>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          {model && (
            <>
              <button 
                onClick={() => { setIsPhysicsEnabled(!isPhysicsEnabled); if(!isPhysicsEnabled) onSetAnimation('none'); }}
                className={`w-10 h-10 flex items-center justify-center border rounded-xl transition-all ${isPhysicsEnabled ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-500/20' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                title="Gravity Mode"
              >
                <i className="fas fa-meteor"></i>
              </button>
              <button 
                onClick={() => { setIsEditMode(!isEditMode); if (!isEditMode) onSetAnimation('none'); }}
                className={`w-10 h-10 flex items-center justify-center border rounded-xl transition-all ${isEditMode ? 'bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/20' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                title="Toggle Edit Mode"
              >
                <i className="fas fa-edit"></i>
              </button>
              <button onClick={onSave} className="w-10 h-10 flex items-center justify-center bg-blue-600 border border-blue-500 rounded-xl text-white shadow-lg hover:bg-blue-500 transition-colors"><i className="fas fa-save"></i></button>
              <button onClick={onReset} className="w-10 h-10 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors"><i className="fas fa-power-off"></i></button>
            </>
          )}
        </div>
      </div>

      {/* Concept Image Preview */}
      {conceptImage && (
        <div className="absolute right-6 top-24 pointer-events-auto group">
          <div className="relative w-48 h-48 sm:w-64 sm:h-64 bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in slide-in-from-right-4 duration-500">
            <img src={conceptImage} alt="Concept Sheet" className="w-full h-full object-contain bg-slate-800" />
            <button 
              onClick={() => setConceptImage(null)}
              className="absolute top-3 right-3 w-7 h-7 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center text-xs transition-colors backdrop-blur-md"
            >
              <i className="fas fa-times"></i>
            </button>
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
              <button 
                onClick={() => onGenerate(conceptImage)}
                disabled={isGenerating}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-white py-2 rounded-xl font-black text-[10px] uppercase tracking-wider shadow-xl transition-transform active:scale-95 disabled:bg-slate-700 disabled:cursor-not-allowed"
              >
                Voxelize Concept Sheet
              </button>
            </div>
          </div>
          <p className="text-center text-[10px] text-cyan-500/80 mt-3 font-bold uppercase tracking-[0.2em]">Multi-View Sheet Ready</p>
        </div>
      )}

      {/* Options Sidebar */}
      {!isGenerating && (
        <div className="absolute left-6 top-24 flex flex-col gap-4 p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl pointer-events-auto shadow-2xl animate-in fade-in slide-in-from-left-4 max-w-[180px]">
          {/* Category Selector */}
          {!model && (
             <div className="w-full">
                <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block tracking-widest">Type</label>
                <div className="grid grid-cols-3 gap-1">
                   {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${category === cat.id ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-slate-800 border-transparent text-slate-500 hover:text-slate-300'}`}
                      >
                         <i className={`fas ${cat.icon} text-sm mb-1`}></i>
                         <span className="text-[8px] font-black">{cat.label}</span>
                      </button>
                   ))}
                </div>
                <div className="h-px bg-slate-800/50 my-3"></div>
             </div>
          )}

          {/* Always show style/density before model is finalized */}
          {!model && (
            <>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block tracking-widest">Visual Style</label>
                <div className="flex flex-col gap-1">
                  {['Modern', 'Retro', 'Cyberpunk', 'Nature'].map(s => (
                    <button 
                      key={s}
                      onClick={() => setGenOptions({ ...genOptions, style: s })}
                      className={`text-[11px] font-bold px-4 py-1.5 rounded-xl text-left transition-all ${genOptions.style === s ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-px bg-slate-800/50"></div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block tracking-widest">Grid Density</label>
                <div className="flex gap-1.5">
                  {['Low', 'Medium', 'High'].map(d => (
                    <button 
                      key={d}
                      onClick={() => setGenOptions({ ...genOptions, density: d })}
                      className={`text-[10px] font-black flex-1 px-3 py-1.5 rounded-xl text-center transition-all ${genOptions.density === d ? 'bg-blue-500 text-white shadow-lg' : 'bg-slate-800/50 text-slate-500 hover:text-slate-400'}`}
                    >
                      {d.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-px bg-slate-800/50"></div>
            </>
          )}

          {/* Joint Stiffness Control */}
          <div className="w-full">
            <label className="text-[10px] font-black text-slate-500 uppercase mb-3 block tracking-widest flex justify-between">
              Stiffness <span>{Math.round(jointStiffness * 100)}%</span>
            </label>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={jointStiffness} 
              onChange={(e) => setJointStiffness(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[8px] text-slate-600 font-black mt-1 uppercase tracking-tighter">
              <span>Loose</span>
              <span>Rigid</span>
            </div>
          </div>
        </div>
      )}

      {/* Animation Selector */}
      {!isEditMode && !isPhysicsEnabled && model && (
        <div className={`absolute right-6 ${conceptImage ? 'top-96' : 'top-24'} flex flex-col gap-2 pointer-events-auto max-h-[50vh] overflow-y-auto overflow-x-hidden p-2 pb-4 transition-all duration-300`}>
          {getAnimationsForCategory(model.category || 'character').map(anim => (
            <button
              key={anim.id}
              onClick={() => onSetAnimation(anim.id as AnimationType)}
              className={`w-14 h-14 flex flex-col items-center justify-center rounded-2xl border transition-all duration-300 flex-shrink-0 ${model.animation === anim.id ? 'bg-gradient-to-br from-cyan-400 to-blue-600 border-white/20 text-white shadow-xl scale-105' : 'bg-slate-900/60 backdrop-blur border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'}`}
            >
              <i className={`fas ${anim.icon} text-lg`}></i>
              <span className="text-[7px] mt-1 font-black uppercase tracking-widest">{anim.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Bottom Input Area */}
      <div className="p-4 sm:p-6 md:p-8 pointer-events-auto w-full flex justify-center bg-gradient-to-t from-black/95 via-black/40 to-transparent">
        <div className="w-full max-w-4xl flex flex-col gap-3">
          {error && (
            <div className="text-red-400 text-[10px] font-bold text-center bg-red-500/10 py-2 px-4 rounded-xl border border-red-500/20 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
              <i className="fas fa-exclamation-triangle mr-2"></i>{error.toUpperCase()}
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 bg-slate-900/90 backdrop-blur-2xl border border-white/5 p-2.5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] focus-within:border-cyan-500/30 transition-all">
            <div className="flex-1 flex items-center min-w-0">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-11 h-11 flex-shrink-0 flex items-center justify-center text-slate-500 hover:text-white transition-colors hover:bg-white/5 rounded-2xl"
                title="Reference Image"
              >
                <i className="fas fa-image text-lg"></i>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
              
              <input 
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isGenerating}
                onKeyDown={(e) => e.key === 'Enter' && !isGenerating && (conceptImage ? onGenerate() : onGenerateImage())}
                placeholder="Describe: Alien soldier, Robot dog, Sword..."
                className="flex-1 bg-transparent px-3 text-[14px] font-medium text-white focus:outline-none placeholder:text-slate-600 disabled:opacity-50"
              />
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <button 
                onClick={onGenerateImage}
                disabled={isGenerating || !prompt.trim()}
                className={`px-5 py-3 rounded-2xl font-black text-[11px] tracking-widest transition-all ${isGenerating ? 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50' : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-white/5'}`}
              >
                SHEET
              </button>
              <button 
                onClick={() => onGenerate()}
                disabled={isGenerating || (!prompt.trim() && !conceptImage)}
                className={`min-w-[140px] px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-3 transition-all ${isGenerating ? 'bg-slate-800 text-slate-600 cursor-wait' : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 hover:brightness-110'}`}
              >
                {isGenerating ? (
                  <>
                    <i className="fas fa-atom fa-spin text-sm"></i>
                    <span className="text-[11px] tracking-widest uppercase">BUILDING</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-cube text-sm"></i>
                    <span className="text-[11px] tracking-widest uppercase whitespace-nowrap">VOXELIZE</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showLibrary && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-12 pointer-events-auto">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md" 
            onClick={() => setShowLibrary(false)}
          />
          <div className="relative w-full max-w-5xl h-full max-h-[800px] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3">
                  <span className="bg-gradient-to-r from-cyan-400 to-blue-500 w-8 h-8 rounded-lg flex items-center justify-center text-xs shadow-lg">
                    <i className="fas fa-th-large text-white"></i>
                  </span>
                  ASSET LIBRARY
                </h2>
                <p className="text-xs text-slate-500 font-bold tracking-widest mt-1 ml-11">LOCAL STORAGE • {savedModels.length} MODELS</p>
              </div>
              <button 
                onClick={() => setShowLibrary(false)}
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-all"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-[#0B1120]">
              {savedModels.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4 opacity-50">
                  <i className="fas fa-box-open text-6xl mb-2"></i>
                  <p className="font-black tracking-widest text-sm">NO SAVED ASSETS</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {savedModels.map((m) => (
                    <div 
                      key={m.id} 
                      className="group relative bg-slate-800/50 border border-white/5 rounded-2xl p-3 hover:border-cyan-500/50 transition-all hover:bg-slate-800 hover:shadow-xl hover:-translate-y-1"
                    >
                      <div className="aspect-square rounded-xl bg-slate-900/80 mb-3 flex items-center justify-center overflow-hidden relative">
                         <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/50 to-transparent"></div>
                         <i className={`fas ${m.category === 'object' ? 'fa-cube' : m.category === 'animal' ? 'fa-paw' : 'fa-user'} text-3xl text-slate-700 group-hover:text-cyan-500/50 transition-colors`}></i>
                         
                         <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-slate-800 border border-white/10 text-[8px] font-black text-slate-400 uppercase tracking-wider">
                           {m.metadata?.density || 'UNK'}
                         </div>
                      </div>
                      
                      <h3 className="font-bold text-slate-200 text-xs truncate mb-1 px-1">{m.name || 'Untitled'}</h3>
                      <p className="text-[9px] text-slate-500 px-1 font-medium truncate">{new Date(m.metadata?.createdAt || Date.now()).toLocaleDateString()}</p>
                      
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 rounded-2xl">
                        <button 
                          onClick={() => { onLoad(m); setShowLibrary(false); }}
                          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white text-[10px] font-black rounded-lg uppercase tracking-wider shadow-lg transform transition-transform hover:scale-105 w-24"
                        >
                          Load
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDelete(m.id); }}
                          className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/50 text-[10px] font-black rounded-lg uppercase tracking-wider transition-all w-24"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UIOverlay;
