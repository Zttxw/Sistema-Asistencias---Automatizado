import React from 'react';
import Modal from './Modal';

export default function ModalViewerPdf({ isOpen, onClose, pdfUrl, title }) {
  if (!isOpen || !pdfUrl) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || 'Vista Previa de Informe PDF'}
      maxWidth="max-w-5xl"
    >
      <div className="space-y-3">
        {/* Visor Iframe Limpio e Ultra-Minimalista */}
        <div className="relative w-full h-[78vh] rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-950 shadow-inner">
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=0`}
            title="Previsualización de Documento PDF"
            className="w-full h-full border-0"
          />
        </div>

        {/* Botón de Cierre */}
        <div className="flex items-center justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            Cerrar Vista Previa
          </button>
        </div>
      </div>
    </Modal>
  );
}
