import React, { useState } from 'react';
import { useStore } from './store';
import { PenTool, MousePointer2, Trash2, AppWindow, DoorOpen, Download, Upload, Share2 } from 'lucide-react';
import { exportToJSON, importFromJSON, generateShareURL } from './persistence';
import clsx from 'clsx';

export default function UI() {
  const { mode, setMode, reset, selectedWallId, addOpening, nodes, walls, openings, setAll } = useStore();
  const [shareUrl, setShareUrl] = useState(null);
  const [shareError, setShareError] = useState(false);

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    importFromJSON(file).then(data => {
      setAll(data);
    }).catch(err => alert("Failed to import: " + err.message));
    e.target.value = ''; // Reset input
  };

  const handleShare = () => {
    const url = generateShareURL({ nodes, walls, openings });
    if (url) {
      navigator.clipboard.writeText(url);
      setShareUrl("Copied!");
      setTimeout(() => setShareUrl(null), 2000);
      setShareError(false);
    } else {
      setShareError(true);
    }
  };

  const isTooLarge = !generateShareURL({ nodes, walls, openings });

  return (
    <div className="absolute top-4 left-4 z-50 flex flex-col gap-2">
      <div className="bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-lg border border-white/20 flex flex-col gap-2">
        <ToolButton 
          active={mode === 'IDLE' || mode === 'DRAGGING'} 
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
      
      {selectedWallId && (
        <div className="bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-lg border border-white/20 flex flex-col gap-2 animate-in fade-in slide-in-from-left-4 duration-200">
           <ToolButton 
            onClick={() => addOpening(selectedWallId, 'window')}
            icon={<AppWindow size={20} />}
            label="Add Window"
          />
          <ToolButton 
            onClick={() => addOpening(selectedWallId, 'door')}
            icon={<DoorOpen size={20} />}
            label="Add Door"
          />
        </div>
      )}

      <div className="bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-lg border border-white/20 flex flex-col gap-2">
        <ToolButton 
          onClick={() => exportToJSON({ nodes, walls, openings })}
          icon={<Download size={20} />}
          label="Export JSON"
        />
        <label className="cursor-pointer">
           <input type="file" accept=".json" onChange={handleImport} className="hidden" />
           <ToolButton 
            onClick={() => {}} // Dummy, click handled by label
            icon={<Upload size={20} />}
            label="Import JSON"
            as="div"
           />
        </label>
        
        <div className="relative group">
           <ToolButton 
            onClick={handleShare}
            icon={<Share2 size={20} />}
            label={shareUrl || "Share URL"}
            disabled={isTooLarge}
            className={isTooLarge ? "opacity-50 cursor-not-allowed" : ""}
          />
          {isTooLarge && (
            <div className="absolute left-full top-0 ml-2 px-3 py-2 bg-red-800 text-white text-xs rounded shadow-lg w-32 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
              Plan is too large to share via URL. Use JSON Export.
            </div>
          )}
        </div>

        <div className="h-px bg-gray-200 my-1" />

         <ToolButton 
          onClick={reset}
          icon={<Trash2 size={20} />}
          label="Reset"
          danger
        />
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
        active ? "bg-blue-500 text-white shadow-md" : (disabled ? "bg-gray-100 text-gray-400" : "hover:bg-gray-100 text-gray-700"),
        danger && !disabled && "hover:bg-red-50 text-red-500 hover:text-red-600",
        className
      )}
      title={typeof label === 'string' ? label : ''}
    >
      {icon}
      <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        {label}
      </span>
    </Component>
  );
}
