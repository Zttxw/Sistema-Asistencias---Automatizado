import React, { useState } from 'react';
import { CalendarCheck, LogIn, ShieldCheck, HelpCircle, X } from 'lucide-react';

function InfoModal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 text-sm text-gray-600 leading-relaxed">{children}</div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VisitanteHome({ onVerAsistencias, onOpenLogin }) {
  const [acercaOpen, setAcercaOpen] = useState(false);
  const [contactoOpen, setContactoOpen] = useState(false);

  const cards = [
    {
      id: 'asistencias',
      title: 'Asistencias de Hoy',
      description: 'Consulta la presencia del personal en tiempo real para el día de hoy.',
      icon: CalendarCheck,
      highlighted: true,
      onClick: onVerAsistencias,
    },
    {
      id: 'login',
      title: 'Iniciar Sesión',
      description: 'Accede al sistema con tu cuenta para gestionar asistencias y reportes.',
      icon: LogIn,
      highlighted: false,
      onClick: onOpenLogin,
      accentColor: 'text-secondary',
    },
    {
      id: 'acerca',
      title: 'Acerca del Sistema',
      description: 'Conoce más sobre el Sistema de Control de Asistencias de la OTI.',
      icon: ShieldCheck,
      highlighted: false,
      onClick: () => setAcercaOpen(true),
      accentColor: 'text-accent',
    },
    {
      id: 'contacto',
      title: 'Contacto y Soporte',
      description: 'Encuentra información de contacto para soporte técnico.',
      icon: HelpCircle,
      highlighted: false,
      onClick: () => setContactoOpen(true),
      accentColor: 'text-primary',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Sistema de Control de Asistencias
        </h1>
        <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
          Oficina de Tecnologías de la Información — Gestión y Control del Personal
        </p>
      </div>

      {/* Grid 2x2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={card.onClick}
              className={`group text-left rounded-xl p-6 transition-all cursor-pointer ${
                card.highlighted
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'bg-white border border-gray-200 text-gray-900 hover:border-primary/40'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${
                  card.highlighted
                    ? 'bg-white/20'
                    : 'bg-gray-50 group-hover:bg-primary/5'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    card.highlighted ? 'text-white' : card.accentColor || 'text-gray-600'
                  }`}
                />
              </div>
              <h3
                className={`text-sm font-semibold mb-1 ${
                  card.highlighted ? 'text-white' : 'text-gray-900'
                }`}
              >
                {card.title}
              </h3>
              <p
                className={`text-xs leading-relaxed ${
                  card.highlighted ? 'text-white/80' : 'text-gray-500'
                }`}
              >
                {card.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-10 text-[11px] text-gray-400 font-medium">
        v1.0.0 &bull; OTI
      </div>

      {/* Modal: Acerca del Sistema */}
      <InfoModal isOpen={acercaOpen} onClose={() => setAcercaOpen(false)} title="Acerca del Sistema">
        <p className="mb-3">
          El <strong>Sistema de Control de Asistencias</strong> es una herramienta desarrollada por la
          Oficina de Tecnologías de la Información (OTI) para automatizar el registro de presencia
          del personal mediante dispositivos biométricos y control de acceso por MAC.
        </p>
        <p>
          Permite consultar asistencias en tiempo real, generar reportes exportables en Excel y PDF,
          y administrar el personal con roles diferenciados (Administrador, Jefe de Oficina, Empleado).
        </p>
      </InfoModal>

      {/* Modal: Contacto y Soporte */}
      <InfoModal isOpen={contactoOpen} onClose={() => setContactoOpen(false)} title="Contacto y Soporte">
        <p className="mb-3">
          Si presentas problemas con el sistema o necesitas soporte técnico, comunícate con
          la Oficina de Tecnologías de la Información:
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start space-x-2">
            <span className="font-semibold text-gray-700 shrink-0">Correo:</span>
            <span>soporte@oti.gob.pe</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="font-semibold text-gray-700 shrink-0">Teléfono:</span>
            <span>(01) 000-0000 Anexo 100</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="font-semibold text-gray-700 shrink-0">Horario:</span>
            <span>Lunes a Viernes, 08:00 – 17:00</span>
          </li>
        </ul>
      </InfoModal>
    </div>
  );
}
