/**
 * Acá vive la ejecución real de cada tool. Todas reciben `supabase`
 * (el cliente ya autenticado como el usuario que preguntó) y devuelven
 * un objeto plano que después se serializa como tool_result para Claude.
 *
 * A propósito NO hay chequeos de rol acá adentro (ej. "if role === owner").
 * Las políticas RLS de la base ya deciden qué filas puede ver cada quien;
 * si un empleado pregunta algo que no le corresponde, Supabase le va a
 * devolver simplemente menos filas (o ninguna), no un error.
 */

async function searchProducts(supabase, { query }) {
  const { data, error } = await supabase
    .from('products')
    .select('name, sale_price, cost_price, stock, min_stock')
    .ilike('name', `%${query}%`)
    .limit(20);

  if (error) return { error: error.message };
  return { count: data.length, products: data };
}

async function getLowStockProducts(supabase) {
  // Supabase-js no permite comparar dos columnas directamente en .filter(),
  // así que lo resolvemos client-side sobre el resultado ya filtrado por RLS.
  const { data, error } = await supabase
    .from('products')
    .select('name, stock, min_stock');

  if (error) return { error: error.message };

  const lowStock = data.filter((p) => p.stock <= p.min_stock);
  return { count: lowStock.length, products: lowStock };
}

async function getSalesSummary(supabase, { from_date, to_date }) {
  const end = to_date || new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('sales')
    .select('id, total_amount, created_at, payment_method')
    .gte('created_at', `${from_date}T00:00:00`)
    .lte('created_at', `${end}T23:59:59`);

  if (error) return { error: error.message };

  const totalAmount = data.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  return {
    from_date,
    to_date: end,
    sales_count: data.length,
    total_amount: totalAmount,
  };
}

async function getEmployees(supabase) {
  const { data, error } = await supabase
    .from('employees')
    .select('name, role');

  if (error) return { error: error.message };
  return { count: data.length, employees: data };
}

const executors = {
  search_products: searchProducts,
  get_low_stock_products: getLowStockProducts,
  get_sales_summary: getSalesSummary,
  get_employees: getEmployees,
};

async function executeTool(name, input, supabase) {
  const fn = executors[name];
  if (!fn) return { error: `Tool desconocida: ${name}` };
  try {
    return await fn(supabase, input);
  } catch (err) {
    return { error: err.message || 'Error inesperado ejecutando la tool.' };
  }
}

module.exports = { executeTool };
