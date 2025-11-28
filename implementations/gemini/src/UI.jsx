import React, { useState, useEffect } from 'react';
import { useStore } from './store';
import { 
  PenTool, MousePointer2, Trash2, AppWindow, DoorOpen, Download, Upload, Share2, 
  Sun, Moon, Lock, LockOpen, Repeat, Layers, Plus, Eye, EyeOff, ChevronUp, ChevronDown, Copy 
} from 'lucide-react';
import { exportToJSON, importFromJSON, generateShareURL } from './persistence';
import clsx from 'clsx';

export default function UI() {
  const { 
    mode, setMode, reset, 
    selectedWallIds, selectedNodeIds, deleteSelection, setWallOpening, toggleOpeningStatus, flipOpening,
    layers, activeLayerId, setAll,
    contextMenuData, theme, toggleTheme,
    setSelection, setContextMenuData
  } = useStore();
  
  const activeLayer = layers.find(l => l.id === activeLayerId) || { nodes: [], walls: [], openings: [] };
  // const { nodes, walls, openings } = activeLayer; // Not strictly needed here unless we use lengths?
  // Actually we need openings for context menu check
  const { openings } = activeLayer;

  const [shareUrl, setShareUrl] = useState(null);
  // const [shareError, setShareError] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (mode !== 'IDLE') {
           setMode('IDLE');
        }
        if (mode === 'IDLE') {
           setSelection({ nodes: [], walls: [] });
           setContextMenuData(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, setMode, setSelection, setContextMenuData]);

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    importFromJSON(file).then(data => {
      setAll(data);
    }).catch(err => alert("Failed to import: " + err.message));
    e.target.value = ''; 
  };

  const handleShare = () => {
    const url = generateShareURL({ layers, activeLayerId });
    if (url) {
      navigator.clipboard.writeText(url);
      setShareUrl("Copied!");
      setTimeout(() => setShareUrl(null), 2000);
      setShareError(false);
    } else {
      setShareError(true);
    }
  };

  const isTooLarge = !generateShareURL({ layers, activeLayerId });
  
  const hasSelection = selectedNodeIds.length > 0 || selectedWallIds.length > 0;
  
  const handleDelete = () => {
    if (hasSelection) {
      deleteSelection();
    } else {
      if (confirm("Are you sure you want to clear the entire plan?")) {
        reset();
      }
    }
  };

  // Determine active state for context menu
  let hasWindow = false;
  let hasDoor = false;
  let isOpen = false;
  if (selectedWallIds.length === 1) {
    const wallId = selectedWallIds[0];
    const wallOpenings = openings.filter(o => o.wallId === wallId);
    hasWindow = wallOpenings.some(o => o.type === 'window');
    hasDoor = wallOpenings.some(o => o.type === 'door');
    if (wallOpenings.length > 0) isOpen = wallOpenings[0].isOpen;
  }

  return (
    <>
      {/* Left Sidebar: Tools & Context */}
      <div className="absolute top-4 left-4 z-50 flex flex-col gap-2">
        {/* Modes */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-2 rounded-xl shadow-lg border border-white/20 dark:border-white/10 flex flex-col gap-2 transition-colors">
          <ToolButton 
            active={mode === 'IDLE' || mode === 'DRAGGING' || mode === 'SELECTING_RECT'} 
            onClick={() => setMode('IDLE')}
            icon={<MousePointer2 size={20} />}
            label="Select"
          />
          <ToolButton 
            active={mode === 'DRAWING'} 
            onClick={() => setMode('DRAWING')}
            icon={<PenTool size={20} />}
            label="Draw Wall"
          />
        </div>

        {/* Contextual Modifiers (Vertical) */}
        {selectedWallIds.length === 1 && (
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-2 rounded-xl shadow-lg border border-white/20 dark:border-white/10 flex flex-col gap-2 transition-colors animate-in slide-in-from-left-2 duration-200">
            <ToolButton 
              active={hasWindow}
              onClick={() => setWallOpening(selectedWallIds[0], hasWindow ? null : 'window')}
              icon={<AppWindow size={20} />}
              label="Window"
            />
            <ToolButton 
              active={hasDoor}
              onClick={() => setWallOpening(selectedWallIds[0], hasDoor ? null : 'door')}
              icon={<DoorOpen size={20} />}
              label="Door"
            />
            
            {(hasWindow || hasDoor) && (
              <>
                <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                <ToolButton 
                  onClick={() => toggleOpeningStatus(selectedWallIds[0])}
                  icon={isOpen ? <LockOpen size={20} /> : <Lock size={20} />}
                  label={isOpen ? "Close" : "Open"}
                  active={isOpen}
                />
                <ToolButton 
                  onClick={() => flipOpening(selectedWallIds[0])}
                  icon={<Repeat size={20} />}
                  label="Flip Dir"
                />
              </>
            )}
          </div>
        )}

        {/* Delete / Clear */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-2 rounded-xl shadow-lg border border-white/20 dark:border-white/10 flex flex-col gap-2 transition-colors">
           <ToolButton 
            onClick={handleDelete}
            icon={<Trash2 size={20} />}
            label={hasSelection ? "Delete" : "Reset"}
            danger
          />
        </div>
      </div>

      {/* Layer Manager */}
      <div className="absolute bottom-4 left-4 z-50">
        <LayerManager />
      </div>

      {/* Top Right Bar: System Actions */}
      <div className="absolute top-4 right-4 z-50 flex flex-row gap-2">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-2 rounded-xl shadow-lg border border-white/20 dark:border-white/10 flex flex-row gap-2 transition-colors">
          <label className="cursor-pointer">
             <input type="file" accept=".json" onChange={handleImport} className="hidden" />
             <ToolButton 
              onClick={() => {}} 
              icon={<Upload size={20} />}
              label="Import JSON"
              as="div"
             />
          </label>
          <ToolButton 
            onClick={() => exportToJSON({ layers, activeLayerId })}
            icon={<Download size={20} />}
            label="Export JSON"
          />
          <div className="relative group">
             <ToolButton 
              onClick={handleShare}
              icon={<Share2 size={20} />}
              label={shareUrl || "Share URL"}
              disabled={isTooLarge}
              className={isTooLarge ? "opacity-50 cursor-not-allowed" : ""}
            />
            {isTooLarge && (
              <div className="absolute right-0 top-full mt-2 px-3 py-2 bg-red-800 text-white text-xs rounded shadow-lg w-32 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                Plan is too large to share via URL. Use JSON Export.
              </div>
            )}
          </div>
          
          <div className="w-px bg-gray-200 dark:bg-gray-700 mx-1" />
          
          <ToolButton 
            onClick={toggleTheme}
            icon={theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            label={theme === 'dark' ? "Light Mode" : "Dark Mode"}
          />
        </div>
      </div>

      {/* Floating Context Menu (In addition to sidebar) */}
      {contextMenuData && selectedWallIds.length === 1 && (
        <div 
          className="absolute z-50 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-2 rounded-xl shadow-xl border border-white/20 dark:border-white/10 flex flex-row items-center gap-2 animate-in fade-in zoom-in-95 duration-150 transition-colors"
          style={{ top: contextMenuData.y + 10, left: contextMenuData.x + 10 }}
        >
          <div className="flex flex-row gap-1">
            <ToolButton 
              active={hasWindow}
              onClick={() => setWallOpening(selectedWallIds[0], hasWindow ? null : 'window')}
              icon={<AppWindow size={16} />}
              label="Window"
              className="text-sm"
            />
            <ToolButton 
              active={hasDoor}
              onClick={() => setWallOpening(selectedWallIds[0], hasDoor ? null : 'door')}
              icon={<DoorOpen size={16} />}
              label="Door"
              className="text-sm"
            />
          </div>
          
          {(hasWindow || hasDoor) && (
            <>
              <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
              <div className="flex flex-row gap-1">
                <ToolButton 
                  onClick={() => toggleOpeningStatus(selectedWallIds[0])}
                  icon={isOpen ? <LockOpen size={16} /> : <Lock size={16} />}
                  label={isOpen ? "Close" : "Open"}
                  className="text-sm"
                  active={isOpen}
                />
                <ToolButton 
                  onClick={() => flipOpening(selectedWallIds[0])}
                  icon={<Repeat size={16} />}
                  label="Flip Dir"
                  className="text-sm"
                />
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

function LayerManager() {
  const { 
    layers, activeLayerId, setActiveLayer, 
    addLayer, removeLayer, toggleLayerVisibility, duplicateLayer 
  } = useStore();
  const [expanded, setExpanded] = useState(false);

  // Invert layers for display so stack order is bottom-up visually (like standard CAD/Photo)
  // Store: Index 0 is bottom. Display: Index 0 at bottom.
  // Actually, standard list is Top = Top Layer.
  // So we should reverse the array for rendering if we want "Top" at the top of the UI list.
  const displayLayers = [...layers].reverse();

  return (
    <div className="flex flex-col items-start gap-2">
      <div 
        className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-2 rounded-xl shadow-lg border border-white/20 dark:border-white/10 transition-all duration-300 overflow-hidden"
        style={{ width: expanded ? '240px' : 'auto' }}
      >
        <button 
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 w-full text-left p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Layers size={20} className="text-blue-500" />
          {expanded && <span className="text-sm font-semibold flex-1">Layers</span>}
          {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>

        {expanded && (
          <div className="mt-2 flex flex-col gap-1 max-h-60 overflow-y-auto">
            {displayLayers.map((layer) => {
              const isActive = layer.id === activeLayerId;
              const isWall = layer.type === 'wall';
              
              const activeClass = isWall 
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600";

              return (
                <div 
                  key={layer.id}
                  className={clsx(
                    "flex items-center gap-2 p-2 rounded-lg text-sm group transition-colors cursor-pointer border",
                    isActive ? activeClass : "border-transparent hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                  onClick={() => setActiveLayer(layer.id)}
                >
                   {/* Visibility */}
                   <button 
                     onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); }}
                     className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                   >
                     {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                   </button>
                   
                   {/* Type Icon */}
                   <span className={clsx("text-lg leading-none select-none", isWall ? "text-blue-500" : "text-slate-500")}>
                     {isWall ? '🧱' : '⬜'}
                   </span>
                   
                   {/* Name */}
                   <span className="flex-1 truncate">{layer.name}</span>

                   {/* Actions (visible on hover) */}
                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); duplicateLayer(layer.id); }}
                        title="Duplicate"
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                      >
                         <Copy size={12} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }}
                        title="Delete"
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded"
                      >
                         <Trash2 size={12} />
                      </button>
                   </div>
                </div>
              );
            })}
            
            <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
            
            <div className="flex gap-1">
               <button 
                 onClick={() => addLayer('wall')}
                 className="flex-1 flex items-center justify-center gap-1 p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-xs"
               >
                 <Plus size={14} /> Wall
               </button>
               <button 
                 onClick={() => addLayer('floor')}
                 className="flex-1 flex items-center justify-center gap-1 p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-xs"
               >
                 <Plus size={14} /> Floor
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolButton({ active, onClick, icon, label, danger, disabled, className, as }) {
  const Component = as || 'button';
  return (
    <Component
      onClick={!disabled ? onClick : undefined}
      className={clsx(
        "p-2 rounded-lg transition-all duration-200 flex items-center justify-center group relative",
        active ? "bg-blue-500 text-white shadow-md" : (disabled ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600" : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"),
        danger && !disabled && "hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 hover:text-red-600 dark:text-red-400",
        className
      )}
      title={typeof label === 'string' ? label : ''}
    >
      {icon}
      <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        {label}
      </span>
    </Component>
  );
}
