import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Asistencias from './pages/Asistencias';
import Empleados from './pages/Empleados';
import DispositivosNuevos from './pages/DispositivosNuevos';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Asistencias />} />
          <Route path="empleados" element={<Empleados />} />
          <Route path="dispositivos" element={<DispositivosNuevos />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
