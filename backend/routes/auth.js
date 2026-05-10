// ============================================================
// RUTAS DE AUTENTICACIÓN: /auth/register, /auth/login, /auth/me
// ============================================================
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');

const User = require('../models/User');
const { authMiddleware, SECRET } = require('../middleware/auth');

// ---- POST /auth/register ----
// Crea un usuario nuevo con contraseña encriptada
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Comprobaciones básicas
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    // Comprobar si el email ya existe
    const existe = await User.findOne({ email });
    if (existe) return res.status(400).json({ error: 'El email ya está registrado' });

    // Encriptamos la contraseña (10 = nivel de seguridad)
    const hash = await bcrypt.hash(password, 10);

    // Guardamos el usuario en MongoDB
    const usuario = new User({ name, email, password: hash });
    await usuario.save();

    // Devolvemos el usuario SIN la contraseña
    res.status(201).json({ _id: usuario._id, name: usuario.name, email: usuario.email });

  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ---- POST /auth/login ----
// Comprueba credenciales y devuelve un token JWT
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar el usuario por email
    const usuario = await User.findOne({ email });
    if (!usuario) return res.status(401).json({ error: 'Credenciales incorrectas' });

    // Comparar la contraseña con el hash guardado
    const coincide = await bcrypt.compare(password, usuario.password);
    if (!coincide) return res.status(401).json({ error: 'Credenciales incorrectas' });

    // Crear el token JWT (caduca en 8 horas)
    const token = jwt.sign({ userId: usuario._id }, SECRET, { expiresIn: '8h' });

    res.json({ token });

  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ---- GET /auth/me ----
// Devuelve los datos del usuario que está logueado (requiere token)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    // req.userId lo pone el middleware después de verificar el token
    const usuario = await User.findById(req.userId).select('-password'); // sin contraseña
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json(usuario);
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
