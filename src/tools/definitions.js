/**
 * Definiciones de "tools" (function calling) que le pasamos a Claude.
 * Cada tool tiene: nombre, descripción (para que Claude sepa cuándo usarla)
 * y un JSON Schema de sus inputs.
 *
 * La ejecución real de cada tool vive en ./executors.js — ahí es donde
 * se consulta Supabase usando el cliente del usuario (RLS aplica solo).
 */

const toolDefinitions = [
  {
    name: 'search_products',
    description:
      'Busca productos del negocio por nombre (búsqueda parcial). Devuelve nombre, precio, stock actual y stock mínimo de cada coincidencia. Usar cuando el usuario pregunta por un producto específico o quiere ver una lista de productos que coincidan con algo.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Texto a buscar en el nombre del producto (ej: "coca", "alfajor").',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_low_stock_products',
    description:
      'Devuelve la lista de productos cuyo stock actual está por debajo (o igual) de su stock mínimo configurado. Usar cuando preguntan qué falta reponer, qué está por agotarse, o piden un "reporte de stock bajo".',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_sales_summary',
    description:
      'Devuelve un resumen de ventas (cantidad de ventas y total facturado) para un rango de fechas. Si quien pregunta es un empleado, Supabase automáticamente limita el resultado a sus propias ventas (por las políticas de seguridad de la base) — el empleado nunca ve ventas de otros ni el negocio completo. Usar cuando preguntan cuánto se vendió, cómo viene el día/la semana, etc.',
    input_schema: {
      type: 'object',
      properties: {
        from_date: {
          type: 'string',
          description: 'Fecha de inicio en formato YYYY-MM-DD (inclusive).',
        },
        to_date: {
          type: 'string',
          description: 'Fecha de fin en formato YYYY-MM-DD (inclusive). Si no se especifica, se usa la fecha de hoy.',
        },
      },
      required: ['from_date'],
    },
  },
  {
    name: 'get_employees',
    description:
      'Lista los empleados del negocio con su nombre y rol. Si quien pregunta es un empleado (no dueño), las políticas de seguridad de la base limitan el resultado a su propio registro únicamente. Usar cuando preguntan quiénes son los empleados o piden info de un empleado puntual.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
];

module.exports = { toolDefinitions };
