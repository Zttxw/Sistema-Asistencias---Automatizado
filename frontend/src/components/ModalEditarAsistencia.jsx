import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import AlertMessage from './AlertMessage';
import client from '../api/client';
import { Lock, Clock, FileText, AlertTriangle } from 'lucide-react';

export default function ModalEditarAsistencia({ isOpen, onClose, asistencia, onSuccess }) {
  const [horaEntrada, setHoraEntrada] = useState('');
  const [horaSalida, setHoraSalida] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (asistencia) {
      // Si la hora viene en HH:MM:SS o ISO, recortar a HH:MM para el input
      const formatTime = (timeStr) => {
        if (!timeStr || timeStr === '--:--' || timeStr === '-') return '';
        const parts = timeStr.split(':');
        if (parts.length >= 2) {
          return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
        }
        return timeStr;
      };

      setHoraEntrada(formatTime(asistencia.hora_entrada));
      setHoraSalida(formatTime(asistencia.hora_salida));
      setMotivo(asistencia.motivo || '');
      setError(null);
    }
  }, [asistencia, isOpen]);

  if (!asistencia) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await client.put(`/api/asistencias/${asistencia.id}`, {
        hora_entrada: horaEntrada || null,
        hora_salida: horaSalida || null,
        motivo: motivo || undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 'No se pudo actualizar el registro de asistencia.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Modificar Registro de Asistencia">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AlertMessage message={error} onClose={() => setError(null)} />

        {asistencia.esta_firmado && (
          <div className="flex items-start space-x-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-amber-800 dark:text-amber-200 text-xs">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Registro Bloqueado por Firma</span>
              Este día pertenece a un informe mensual que ya ha sido firmado digitalmente por la Jefatura. Las asistencias firmadas son inmutables para garantizar el control oficial.
            </div>
          </div>
        )}

        {/* Ficha Informativa del Registro */}
        <div className="bg-gray-50 dark:bg-zinc-900 p-3 rounded-xl border border-gray-100 dark:border-zinc-800 space-y-1 text-xs">
          <div className="flex justify-between text-gray-700 dark:text-zinc-300 font-medium">
            <span>Practicante:</span>
            <span className="font-semibold text-gray-900 dark:text-white">{asistencia.empleado}</span>
          </div>
          <div className="flex justify-between text-gray-500 dark:text-zinc-400">
            <span>Fecha del registro:</span>
            <span className="font-mono text-gray-700 dark:text-zinc-300">{asistencia.fecha}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">
              Hora de Entrada (HH:MM)
            </label>
            <div className="relative">
              <input
                type="time"
                value={horaEntrada}
                disabled={asistencia.esta_firmado}
                onChange={(e) => setHoraEntrada(e.target.value)}
                className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-white font-mono disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">
              Hora de Salida (HH:MM)
            </label>
            <div className="relative">
              <input
                type="time"
                value={horaSalida}
                disabled={asistencia.esta_firmado}
                onChange={(e) => setHoraSalida(e.target.value)}
                className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-white font-mono disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">
            Motivo / Justificación del Ajuste
          </label>
          <textarea
            rows={2}
            value={motivo}
            disabled={asistencia.esta_firmado}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej. Corrección manual de marcación por comisión de servicio"
            className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:border-primary dark:focus:border-white disabled:opacity-50"
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting || asistencia.esta_firmado}
            className="px-4 py-2 bg-primary text-white dark:bg-white dark:text-black text-sm font-medium rounded-lg hover:bg-primary/90 dark:hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
