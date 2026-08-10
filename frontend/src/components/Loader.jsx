import React from 'react';

export default function Loader({ inline = false, text = 'Cargando...' }) {
  if (inline) {
    return (
      <div className="flex items-center justify-center space-x-2 py-4 font-mono">
        <div className="w-4 h-4 border-2 border-[#3484A5] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-500 dark:text-zinc-400">{text}</span>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-white/90 dark:bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center space-y-3 font-sans">
      {/* Ring Spinner Minimalista Institucional */}
      <div className="flex items-center space-x-2.5">
        <div className="w-5 h-5 border-2 border-[#3484A5] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono font-bold tracking-widest text-slate-700 dark:text-zinc-300 uppercase">
          {text}
        </span>
      </div>
    </div>
  );
}
