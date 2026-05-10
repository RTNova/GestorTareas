// ============================================================
// PUNTO DE ENTRADA DEL SERVIDOR
// ============================================================
const express = require('express');
const mongoose = require('mongoose');

const app = express();

// Permite que Express lea JSON en las peticiones
app.use(express.json());

// Permite peticiones desde el frontend React (CORS)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  // Las peticiones OPTIONS son "preflight" que manda el navegador antes de cada llamada
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ---- Rutas ----
app.use('/auth',      require('./routes/auth'));
app.use('/lists',     require('./routes/lists'));
app.use('/tasks',     require('./routes/tasks'));
app.use('/reminders', require('./routes/reminders'));

// ---- Conexión a MongoDB ----
mongoose
  .connect('mongodb://127.0.0.1:27017/gestion-tareas')
  .then(() => {
    console.log('Conectado a MongoDB');
    // Arrancar el servidor solo cuando la BD esté lista
    app.listen(3000, () => console.log('Servidor en http://localhost:3000'));
  })
  .catch((err) => console.error('Error al conectar MongoDB:', err));