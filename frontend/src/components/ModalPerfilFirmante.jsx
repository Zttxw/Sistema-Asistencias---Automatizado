import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import AlertMessage from './AlertMessage';
import client from '../api/client';
import { UserCheck, Save, ShieldCheck } from 'lucide-react';

export default function ModalPerfilFirmante({ isOpen, onClose, currentUser, onProfileUpdated }) {
  const [nombreFirmante, setNombreFirmante] = useState('');
  const [cargoFirmante, setCargoFirmante] = useState('');
  const [colegiaturaFirmante, setColegiaturaFirmante] = useState('');
  const [institucionFirmante, setInstitucionFirmante] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  useEffect(() => {
    if (currentUser) {
      setNombreFirmante(currentUser.nombre_firmante || '');
      setCargoFirmante(currentUser.cargo_firmante || 'Jefe de la Oficina de Tecnologías de la Información');
      setColegiaturaFirmante(currentUser.colegiatura_firmante || '');
      setInstitucionFirmante(currentUser.institucion_firmante || 'Oficina de Tecnologías de la Información - OTI');
    }
  }, [currentUser, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setExito(null);

    try {
      const res = await client.put('/api/auth/perfil', {
        nombre_firmante: nombreFirmante,
        cargo_firmante: cargoFirmante,
        colegiatura_firmante: colegiaturaFirmante,
        institucion_firmante: institucionFirmante,
      });

      setExito('¡Datos de Firma y Credenciales de Jefatura actualizados correctamente!');
      if (onProfileUpdated) {
        onProfileUpdated(res.data);
      }
      setTimeout(() => {
        setExito(null);
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Error al guardar los datos de firma.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Perfil de Firma Digital del Jefe de Oficina">
      <form onSubmit={handleSubmit} className="space-y-4 text-gray-900 dark:text-zinc-100 font-sans">
        <div className="p-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl flex items-center gap-3 shadow-2xs">
          <ShieldCheck className="w-8 h-8 text-sky-400 shrink-0" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-white">Datos Oficiales de Firma y Sello</p>
            <p className="text-[11px] text-slate-300">
              Estos datos figurarán automáticamente al pie de página de los informes PDF emitidos y firmados para los practicantes.
            </p>
          </div>
        </div>

        <AlertMessage message={error} onClose={() => setError(null)} />
        {exito && (
          <div className="p-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 rounded-lg text-xs font-medium border border-emerald-200 dark:border-emerald-900">
            {exito}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
            Nombre Completo del Firmante (Con Título Profesional):
          </label>
          <input
            type="text"
            required
            placeholder="Ej. Ing. Jeanpier Xilander Merma Chura"
            value={nombreFirmante}
            onChange={(e) => setNombreFirmante(e.target.value)}
            className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
            Cargo u Oficina Responsable:
          </label>
          <input
            type="text"
            required
            placeholder="Ej. Jefe de la Oficina de Tecnologías de la Información"
            value={cargoFirmante}
            onChange={(e) => setCargoFirmante(e.target.value)}
            className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary font-medium"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
              Colegiatura CIP / DNI:
            </label>
            <input
              type="text"
              placeholder="Ej. CIP N° 245890 • DNI 73124137"
              value={colegiaturaFirmante}
              onChange={(e) => setColegiaturaFirmante(e.target.value)}
              className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
              Institución / Sede:
            </label>
            <input
              type="text"
              placeholder="Ej. Corte Superior de Justicia"
              value={institucionFirmante}
              onChange={(e) => setInstitucionFirmante(e.target.value)}
              className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary font-medium"
            />
          </div>
        </div>

        {/* Vista previa del recuadro de firma */}
        <div className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800 text-center space-y-1">
          <p className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">Vista Previa de la Firma Impresa en PDF</p>
          <div className="w-48 mx-auto border-b border-slate-400 dark:border-zinc-600 my-2"></div>
          <p className="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono">
            {nombreFirmante || 'NOMBRE DEL FIRMANTE'}
          </p>
          <p className="text-[11px] text-slate-600 dark:text-zinc-300 font-mono">
            {cargoFirmante || 'CARGO INSTITUCIONAL'}
          </p>
          {colegiaturaFirmante && (
            <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">{colegiaturaFirmante}</p>
          )}
          {institucionFirmante && (
            <p className="text-[10px] font-bold text-slate-700 dark:text-zinc-300 font-mono">{institucionFirmante}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Guardando...' : 'Guardar Perfil de Firma'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
