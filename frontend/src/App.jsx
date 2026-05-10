// ============================================================
// APP.JSX - Enrutador principal de la aplicación
// ============================================================
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/Register.jsx';
import Login    from './pages/Login.jsx';
import Panel    from './pages/Panel.jsx';

// Componente que protege rutas: si no hay token redirige al login
function RutaProtegida({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública: registro */}
        <Route path="/register" element={<Register />} />

        {/* Ruta pública: login */}
        <Route path="/login" element={<Login />} />

        {/* Ruta protegida: panel principal */}
        <Route
          path="/panel"
          element={
            <RutaProtegida>
              <Panel />
            </RutaProtegida>
          }
        />

        {/* Por defecto, redirigir al login */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
