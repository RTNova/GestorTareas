// ============================================================
// RUTAS DE LISTAS: /lists
// Todas están protegidas → requieren token JWT
// ============================================================
const express = require('express');
const router  = express.Router();

const List = require('../models/List');
const Task = require('../models/Task');
const { authMiddleware } = require('../middleware/auth');

// Aplicamos el middleware a TODAS las rutas de este archivo
router.use(authMiddleware);

// ---- POST /lists ----
// Crear una lista nueva
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

    const lista = new List({ name, userId: req.userId });
    await lista.save();

    res.status(201).json(lista);
  } catch (err) {
    // Errores de validación de Mongoose (min/max length)
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ---- GET /lists ----
// Devuelve SOLO las listas del usuario autenticado
router.get('/', async (req, res) => {
  try {
    const listas = await List.find({ userId: req.userId });
    res.json(listas);
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ---- PATCH /lists/:id ----
// Renombrar una lista (solo si es del usuario)
router.patch('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

    // findOneAndUpdate busca por _id Y por userId → seguridad: no puede tocar listas ajenas
    const lista = await List.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { name },
      { new: true, runValidators: true } // new:true devuelve el doc actualizado
    );

    if (!lista) return res.status(404).json({ error: 'Lista no encontrada' });
    res.json(lista);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ---- DELETE /lists/:id ----
// Borrar una lista y sus tareas
router.delete('/:id', async (req, res) => {
  try {
    const lista = await List.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!lista) return res.status(404).json({ error: 'Lista no encontrada' });

    // Borrar también todas las tareas de esa lista
    await Task.deleteMany({ listId: req.params.id });

    res.json({ message: 'Lista eliminada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
