// ============================================================
// MODELO TASK - cada tarea pertenece a una lista y a un usuario
// ============================================================
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  listId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'List',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 120
  },
  completed:    { type: Boolean, default: false },
  priority:     { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  reminderAt:   { type: Date, default: null },      // fecha/hora del recordatorio (opcional)
  reminderSent: { type: Boolean, default: false },   // true cuando el frontend ya avisó
  createdFrom:  { type: String, required: true },    // debe valer "web-react"
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', taskSchema);
