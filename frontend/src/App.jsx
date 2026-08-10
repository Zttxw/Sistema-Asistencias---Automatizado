import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Asistencias from './pages/Asistencias';
import Empleados from './pages/Empleados';
import InformesSemanales from './pages/InformesSemanales';
import DispositivosNuevos from './pages/DispositivosNuevos';
import Usuarios from './pages/Usuarios';
import Agente from './pages/Agente';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Asistencias />} />
              <Route
                path="empleados"
                element={
                  <ProtectedRoute codigo="empleados.ver">
                    <Empleados />
                  </ProtectedRoute>
                }
              />
              <Route
                path="informes"
                element={
                  <ProtectedRoute codigo="asistencias.exportar">
                    <InformesSemanales />
                  </ProtectedRoute>
                }
              />
              <Route
                path="dispositivos"
                element={
                  <ProtectedRoute codigo="dispositivos.ver">
                    <DispositivosNuevos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="usuarios"
                element={
                  <ProtectedRoute codigo="usuarios.gestionar">
                    <Usuarios />
                  </ProtectedRoute>
                }
              />
              <Route
                path="agente"
                element={
                  <ProtectedRoute codigo="agente.gestionar">
                    <Agente />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

