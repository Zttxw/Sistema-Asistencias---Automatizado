import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import AlertMessage from './AlertMessage';
import client from '../api/client';
import { Save, ShieldCheck } from 'lucide-react';

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

      setExito('Datos de firma actualizados correctamente.');
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

        {/* Banner Institucional Minimalista */}
        <div className="p-3.5 bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 rounded-xl flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-primary dark:text-sky-400 shrink-0" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary dark:text-sky-400">
              Datos Oficiales de Firma y Sello
            </p>
            <p className="text-[11px] text-gray-600 dark:text-zinc-400">
              Estos datos figurarán automáticamente al pie de página de los informes PDF emitidos y firmados.
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
          <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
            Nombre Completo del Firmante (con título profesional):
          </label>
          <input
            type="text"
            required
            placeholder="Ej. Ing. Adrián Adel Valer Bellota"
            value={nombreFirmante}
            onChange={(e) => setNombreFirmante(e.target.value)}
            className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs bg-gray-50/50 dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
            Cargo u Oficina Responsable:
          </label>
          <input
            type="text"
            required
            placeholder="Ej. Jefe de la Oficina de Tecnologías de la Información"
            value={cargoFirmante}
            onChange={(e) => setCargoFirmante(e.target.value)}
            className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs bg-gray-50/50 dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
              Colegiatura CIP / DNI:
            </label>
            <input
              type="text"
              placeholder="Ej. CIP N° 245890 • DNI 73124137"
              value={colegiaturaFirmante}
              onChange={(e) => setColegiaturaFirmante(e.target.value)}
              className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs bg-gray-50/50 dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
              Institución / Sede:
            </label>
            <input
              type="text"
              placeholder="Ej. Oficina de Tecnologías de la Información"
              value={institucionFirmante}
              onChange={(e) => setInstitucionFirmante(e.target.value)}
              className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs bg-gray-50/50 dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium transition-all"
            />
          </div>
        </div>

        {/* Vista previa del recuadro de firma */}
        <div className="p-4 bg-gray-50/80 dark:bg-zinc-900/60 rounded-xl border border-gray-200 dark:border-zinc-800 text-center space-y-1.5">
          <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 font-mono uppercase tracking-wider">
            Vista previa de la firma impresa en PDF
          </p>
          <div className="w-48 mx-auto border-b border-gray-300 dark:border-zinc-700 my-2"></div>
          <p className="text-xs font-bold text-gray-900 dark:text-white uppercase font-mono">
            {nombreFirmante || 'NOMBRE DEL FIRMANTE'}
          </p>
          <p className="text-[11px] text-gray-600 dark:text-zinc-300 font-mono">
            {cargoFirmante || 'CARGO INSTITUCIONAL'}
          </p>
          {colegiaturaFirmante && (
            <p className="text-[10px] text-gray-500 dark:text-zinc-400 font-mono">{colegiaturaFirmante}</p>
          )}
          {institucionFirmante && (
            <p className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 font-mono">{institucionFirmante}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-primary text-white dark:bg-white dark:text-black rounded-lg text-xs font-semibold hover:bg-primary/90 dark:hover:bg-zinc-200 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Guardando...' : 'Guardar Perfil de Firma'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
