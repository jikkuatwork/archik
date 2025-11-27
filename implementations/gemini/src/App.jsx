import React, { useEffect } from 'react';
import UI from './UI';
import Editor2D from './Editor2D';
import Viewport3D from './Viewport3D';
import { loadFromURL } from './persistence';
import { useStore } from './store';

export default function App() {
  const setAll = useStore(state => state.setAll);
  const theme = useStore(state => state.theme);

  useEffect(() => {
    const data = loadFromURL();
    if (data) {
      setAll(data);
      // Remove hash to clean URL? optional.
      // window.history.replaceState(null, null, ' ');
    }
  }, []);

  return (
    <div className={theme}>
      <div className="flex w-screen h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 text-slate-900 dark:text-slate-100">
        {/* Left Pane: 2D Editor */}
        <div className="w-1/2 h-full relative border-r border-gray-200 dark:border-gray-800 shadow-xl z-10">
          <Editor2D />
          <UI />
        </div>

        {/* Right Pane: 3D Viewport */}
        <div className="w-1/2 h-full relative">
          <Viewport3D />
        </div>
      </div>
    </div>
  );
}