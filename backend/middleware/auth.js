// ============================================================
// MIDDLEWARE DE AUTENTICACIÓN
// Comprueba que el token JWT sea válido antes de entrar a rutas protegidas
// ============================================================
const jwt = require('jsonwebtoken');

const SECRET = 'mi_clave_secreta_123'; // En producción usaría una variable de entorno

function authMiddleware(req, res, next) {
  // El token viene en la cabecera: Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Token no proporcionado' });

  const token = authHeader.split(' ')[1]; // separamos "Bearer" del token
  if (!token) return res.status(401).json({ error: 'Token mal formado' });

  try {
    // Verificamos el token y sacamos los datos del usuario
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.userId; // guardamos el id para usarlo en las rutas
    next(); // seguimos hacia la ruta
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

module.exports = { authMiddleware, SECRET };
