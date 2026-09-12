const express = require('express');
const { getSupabaseClientForUser } = require('../lib/supabase');
const { askAmolyAssistant } = require('../lib/claude');

const router = express.Router();

router.post('/chat', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const accessToken = authHeader.replace(/^Bearer\s+/i, '');

  if (!accessToken) {
    return res.status(401).json({
      error: 'Falta el token de autenticación. Enviá el access_token de Supabase del usuario logueado en el header Authorization: Bearer <token>.',
    });
  }

  const { message, history } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Falta el campo "message" (string) en el body.' });
  }

  try {
    const supabase = getSupabaseClientForUser(accessToken);

    // Chequeo rápido de que el token sea válido antes de gastar una
    // llamada a Claude si el usuario ya no tiene sesión activa.
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Token inválido o expirado.' });
    }

    const { reply, messages } = await askAmolyAssistant(message, supabase, history || []);
    res.json({ reply, history: messages });
  } catch (err) {
    console.error('Error en /chat:', err);
    res.status(500).json({ error: 'Error interno procesando la consulta.' });
  }
});

module.exports = router;
