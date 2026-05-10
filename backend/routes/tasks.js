// ============================================================
// RUTAS DE TAREAS: /tasks
// Todas están protegidas → requieren token JWT
// ============================================================
const express = require('express');
const router  = express.Router();

const Task = require('../models/Task');
const List = require('../models/List');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// ---- POST /tasks ----
// Crear una tarea nueva
router.post('/', async (req, res) => {
  try {
    const { listId, text, priority, reminderAt, createdFrom } = req.body;

    // Validaciones básicas
    if (!listId || !text || !createdFrom) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    if (createdFrom !== 'web-react') {
      return res.status(400).json({ error: 'createdFrom debe ser "web-react"' });
    }

    // Comprobar que la lista existe y le pertenece al usuario
    const lista = await List.findOne({ _id: listId, userId: req.userId });
    if (!lista) return res.status(404).json({ error: 'Lista no encontrada o no es tuya' });

    // Si hay recordatorio, comprobar que la fecha es futura
    if (reminderAt && new Date(reminderAt) <= new Date()) {
      return res.status(400).json({ error: 'La fecha del recordatorio debe ser futura' });
    }

    const tarea = new Task({
      listId,
      userId: req.userId, // siempre se toma del token, no del body
      text,
      priority: priority || 'medium',
      reminderAt: reminderAt || null,
      createdFrom
    });

    await tarea.save();
    res.status(201).json(tarea);

  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ---- GET /tasks?listId=...&status=... ----
// Devuelve tareas filtradas por lista y estado
router.get('/', async (req, res) => {
  try {
    const { listId, status } = req.query;

    if (!listId) return res.status(400).json({ error: 'listId es obligatorio' });

    // Filtro base: lista + usuario
    const filtro = { listId, userId: req.userId };

    // Añadir filtro de estado si se indica
    if (status === 'pending')   filtro.completed = false;
    if (status === 'completed') filtro.completed = true;
    // Si status es 'all' o no viene → no filtramos por completed

    const tareas = await Task.find(filtro).sort({ createdAt: -1 }); // más recientes primero
    res.json(tareas);

  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ---- PATCH /tasks/:id ----
// Actualizar campos de una tarea (solo los permitidos)
router.patch('/:id', async (req, res) => {
  try {
    // Campos que SÍ se pueden modificar
    const { text, priority, reminderAt, completed } = req.body;

    const cambios = { updatedAt: new Date() };
    if (text      !== undefined) cambios.text      = text;
    if (priority  !== undefined) cambios.priority  = priority;
    if (completed !== undefined) cambios.completed = completed;

    // Recordatorio: si se cambia, comprobar que sea futuro
    if (reminderAt !== undefined) {
      if (reminderAt && new Date(reminderAt) <= new Date()) {
        return res.status(400).json({ error: 'La fecha del recordatorio debe ser futura' });
      }
      cambios.reminderAt   = reminderAt || null;
      cambios.reminderSent = false; // si se cambia el recordatorio, reseteamos el flag
    }

    const tarea = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId }, // solo puede editar la suya
      cambios,
      { new: true, runValidators: true }
    );

    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json(tarea);

  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ---- DELETE /tasks/:id ----
// Borrar una tarea
router.delete('/:id', async (req, res) => {
  try {
    const tarea = await Task.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });

    res.json({ message: 'Tarea eliminada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
