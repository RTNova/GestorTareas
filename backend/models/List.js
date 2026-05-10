// ============================================================
// MODELO LIST - cada lista pertenece a un usuario
// ============================================================
const mongoose = require('mongoose');

const listSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 30
  },
  // userId apunta al _id del usuario dueño de esta lista
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('List', listSchema);
