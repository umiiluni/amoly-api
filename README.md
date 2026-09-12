# Amoly API — chatbot de stock y empleados

Backend en Node/Express que expone un endpoint `/chat`. Recibe la pregunta
del usuario (dueño o empleado) + su token de sesión de Supabase, deja que
Claude use "tools" para consultar la base, y devuelve una respuesta en
lenguaje natural.

**Punto clave de seguridad:** el backend NO reimplementa los permisos de
dueño/empleado. Usa el `access_token` de Supabase del usuario logueado para
consultar la base, así que las políticas RLS que ya están armadas en el
proyecto deciden qué puede ver cada quien. Si un empleado pregunta por las
ganancias del mes, Supabase le devuelve cero filas — no hace falta chequear
el rol acá.

## 1. Probarlo en local

```bash
npm install
cp .env.example .env
# completar .env con tu ANTHROPIC_API_KEY y la SUPABASE_ANON_KEY del proyecto
npm run dev
```

Health check: `GET http://localhost:3000/health` → `{ "status": "ok" }`

Probar el chat (necesitás un access_token real — se puede sacar de
Supabase Auth logueando a un usuario de prueba):

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_ACCESS_TOKEN" \
  -d '{"message": "¿qué productos tengo con poco stock?"}'
```

## 2. Deploy a Railway

1. Subí esta carpeta a un repo de GitHub (nuevo repo, ej. `amoly-api`).
2. En [railway.app](https://railway.app), **New Project → Deploy from GitHub repo**
   y elegí ese repo.
3. Railway detecta que es Node automáticamente. Andá a **Variables** y
   cargá:
   - `SUPABASE_URL` = `https://afbakszqpjmrhickpdqp.supabase.co`
   - `SUPABASE_ANON_KEY` = (la key pública/anon del proyecto, la que ya usa FlutterFlow)
   - `ANTHROPIC_API_KEY` = tu key de [console.anthropic.com](https://console.anthropic.com)
4. Railway te da una URL pública tipo `https://amoly-api-production.up.railway.app`.
   Esa es la URL que vas a usar desde FlutterFlow.

No hace falta configurar `PORT` — Railway lo inyecta solo y el código ya lo lee de `process.env.PORT`.

## 3. Conectarlo desde FlutterFlow

En FlutterFlow: **API Calls → Add API Call**

- Method: `POST`
- URL: `https://<tu-url-de-railway>/chat`
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer [[Authenticated User -> ID Token]]` (o el
    campo que uses para el access_token de Supabase — es el mismo token
    que ya se usa para las llamadas autenticadas a Supabase desde la app)
- Body (JSON):
  ```json
  { "message": "[[chat_input]]" }
  ```
- Response: la respuesta trae `{ "reply": "...", "history": [...] }`.
  Mostrá `reply` en la burbuja de chat. Si querés que el bot recuerde el
  contexto de la conversación, guardá `history` en una variable de página
  y mandalo de vuelta en el próximo request (campo `history` del body).

## Cómo agregar una nueva capacidad al chatbot

1. Sumar la tool en `src/tools/definitions.js` (nombre + descripción +
   schema de inputs — la descripción es lo que Claude lee para decidir
   cuándo usarla, así que conviene ser bien específico).
2. Implementar la consulta real en `src/tools/executors.js`.
3. Listo — no hace falta tocar nada más, `claude.js` ya sabe ejecutar
   cualquier tool que esté en la lista.
