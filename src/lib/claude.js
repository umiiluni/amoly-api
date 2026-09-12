const Anthropic = require('@anthropic-ai/sdk');
const { toolDefinitions } = require('../tools/definitions');
const { executeTool } = require('../tools/executors');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Sos el asistente de Amoly, una app de gestión para kioscos y despensas.
Respondés en español rioplatense, de forma breve y directa (esto se muestra en un chat dentro de una app de celular, no hace falta redactar como un informe).
Usá las tools disponibles para consultar datos reales del negocio antes de responder — nunca inventes números de stock, ventas o empleados.
Si una consulta no devuelve datos (por ejemplo, porque el usuario es un empleado y no tiene permiso para ver algo), explicá eso con naturalidad en vez de decir que hubo un error.`;

/**
 * Procesa un mensaje del usuario, dejando que Claude use tools contra
 * Supabase (con el cliente ya autenticado como ese usuario) las veces
 * que necesite, hasta llegar a una respuesta final en texto.
 *
 * @param {string} userMessage
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Array<{role: string, content: any}>} history - turnos previos (opcional)
 */
async function askAmolyAssistant(userMessage, supabase, history = []) {
  const messages = [...history, { role: 'user', content: userMessage }];

  // Tope de vueltas para evitar loops infinitos si algo sale mal.
  for (let turn = 0; turn < 6; turn++) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: toolDefinitions,
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason !== 'tool_use') {
      const textBlock = response.content.find((b) => b.type === 'text');
      return {
        reply: textBlock ? textBlock.text : '',
        messages, // se puede devolver para mantener contexto en el próximo turno
      };
    }

    // Hay uno o más tool_use en la respuesta: los ejecutamos todos y
    // devolvemos los tool_result en el mismo orden.
    const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');
    const toolResults = [];
    for (const block of toolUseBlocks) {
      const result = await executeTool(block.name, block.input, supabase);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }

    messages.push({ role: 'user', content: toolResults });
  }

  return {
    reply: 'Perdón, no pude terminar de procesar tu consulta. Probá de nuevo o reformulala.',
    messages,
  };
}

module.exports = { askAmolyAssistant };
