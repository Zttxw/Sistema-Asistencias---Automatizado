import React from 'react';
import Modal from './Modal';
import { ExternalLink, Download } from 'lucide-react';

export default function ModalViewerPdf({ isOpen, onClose, pdfUrl, title, filename, onDownload }) {
  if (!isOpen || !pdfUrl) return null;

  // Sanitizar URL removiendo fragmentos en blob URLs que fallan en Chromium
  const cleanPdfUrl = pdfUrl.split('#')[0];

  const handleOpenNewTab = () => {
    window.open(cleanPdfUrl, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || 'Vista Previa de Informe PDF'}
      maxWidth="max-w-5xl"
    >
      <div className="space-y-3 font-sans">
        {/* Visor PDF Nivel Navegador */}
        <div className="relative w-full h-[76vh] rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-950 shadow-inner">
          <object
            data={cleanPdfUrl}
            type="application/pdf"
            className="w-full h-full rounded-xl"
          >
            <iframe
              src={cleanPdfUrl}
              title="Previsualización de Documento PDF"
              className="w-full h-full border-0"
            />
          </object>
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 font-mono text-xs">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleOpenNewTab}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#3484A5]" />
              <span>Abrir en Pestaña Completa</span>
            </button>

            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#3484A5] text-white rounded-lg text-xs font-semibold hover:bg-[#2b6f8b] transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Guardar Copia PDF</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer self-end sm:self-auto"
          >
            Cerrar Vista Previa
          </button>
        </div>
      </div>
    </Modal>
  );
}
