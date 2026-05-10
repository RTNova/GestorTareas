// ============================================================
// RUTAS DE RECORDATORIOS: /reminders
// ============================================================
const express = require('express');
const router  = express.Router();

const Task = require('../models/Task');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// ---- GET /reminders/pending ----
// Devuelve tareas con recordatorio vencido y aún no notificado
router.get('/pending', async (req, res) => {
  try {
    const tareas = await Task.find({
      userId:       req.userId,
      reminderAt:   { $lte: new Date() }, // recordatorio <= ahora (ya pasó la hora)
      reminderSent: false,                 // aún no se notificó
      completed:    false                  // y la tarea no está completada
    });

    res.json(tareas);
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ---- POST /reminders/:taskId/mark-sent ----
// Marca el recordatorio como ya enviado (el frontend ya lo mostró)
router.post('/:taskId/mark-sent', async (req, res) => {
  try {
    const tarea = await Task.findOneAndUpdate(
      { _id: req.params.taskId, userId: req.userId },
      { reminderSent: true },
      { new: true }
    );

    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json({ message: 'Recordatorio marcado como enviado', tarea });

  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
