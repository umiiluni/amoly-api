const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY en las variables de entorno.');
}

/**
 * Crea un cliente de Supabase "en nombre del usuario" logueado.
 *
 * IMPORTANTE: usamos la anon key + el access_token del usuario (no la
 * service_role key). Esto hace que TODAS las políticas RLS ya definidas
 * en la base (empleado vs dueño) se apliquen automáticamente, sin que
 * este backend tenga que reimplementar esa lógica de permisos.
 *
 * @param {string} accessToken - El JWT de Supabase del usuario logueado
 *   (FlutterFlow ya lo tiene disponible tras el login; se lo pasamos
 *   al endpoint /chat en el header Authorization).
 */
function getSupabaseClientForUser(accessToken) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

module.exports = { getSupabaseClientForUser };
