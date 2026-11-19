# Design

## Context

Para la motivación, ver la sección «Why» de `proposal.md`. Hoy solo existe el vertical de cuentas: usuarios, tokens de acceso opacos, transformers que envuelven la respuesta en `{ data }` y, en el frontend, el patrón de página más ruta protegida más `lib/api.ts` como único punto de contacto con el backend.

Restricciones del change:
- Exactamente tres operaciones de API.
- Sin dependencias nuevas, sin design system nuevo y sin tests.
- Sin fecha de vencimiento, ni siquiera preparada.

## Goals / Non-Goals

**Goals:**
- Cumplir las specs `tasks` y `auth` (delta) siguiendo los patrones que ya existen en el repo, sin capas nuevas.

**Non-Goals:**
- Refresco en vivo (E3-2).
- Ordenación o agrupación de la lista (PA-3).
- Reasignar desde la interfaz (E2-7).
- Paginación.
- Concurrencia optimista o versiones para detectar choques (PA-8).

## Decisions

### Modelo de datos

- Una tabla `tasks` con estas columnas:
  - `id`
  - `title`, de tipo `string(255)` y no nula
  - `status`, de tipo string, no nula y con default `pending`
  - `assignee_id`, de tipo entero, no nulo, con FK a `users.id`
  - `created_at` y `updated_at`
- **El estado es un string validado en la aplicación, no un enum de base de datos.** SQLite no tiene enum nativo, y un `CHECK` en la migración obliga a reescribir la tabla para cambiar el conjunto. VineJS `enum` en el validador ya da el `422`.
  - Alternativa descartada: un `CHECK` constraint.
- **`assignee_id` con `ON DELETE` restrictivo** (el default). No hay borrado de usuarios, así que no hace falta decidir qué pasa con las tareas huérfanas.
- **Sin columna de creador.** La spec no la necesita: el responsable inicial es quien crea, y luego puede cambiar. Si se añade ahora sería un dato que nadie lee.
- **Sin columna de fecha de vencimiento.** La restricción 1 dice que no se deje preparada.
- Los timestamps existen como en `users`, pero el transformer no los expone.

### API

- Las rutas van en un grupo `/api/v1/tasks` con `.use(middleware.auth())`:
  - `router.get('', [controllers.Tasks, 'index'])`
  - `router.post('', [controllers.Tasks, 'store'])`
  - `router.patch(':id', [controllers.Tasks, 'update'])`
- No se usa `router.resource()`, para que no aparezcan `show` ni `destroy`.
- **`index`**: `Task.query().preload('assignee')`, sin `orderBy` (PA-3). Se documenta con un comentario que el orden no está garantizado.
- **`store`**: valida `{ title: vine.string().trim().minLength(1).maxLength(255) }`.
  - VineJS descarta las claves no declaradas, así que `status` y `assigneeId` desaparecen solos.
  - `status` toma el default y `assigneeId` es `auth.user.id`.
  - Responde con `response.status(201)` y después `serialize(...)`.
  - Título vacío o ausente: `convertEmptyStringsToNull` convierte `""` en `null`, y eso da `required`. Un título solo de espacios pasa el trim y falla en `minLength(1)`. La spec solo exige «un error sobre `title`» en ese caso.
- **`update`**: valida `{ status: vine.enum(['pending','in_progress','done']).optional(), assigneeId: vine.number().exists({ table: 'users', column: 'id' }).optional() }`.
  - Usa `Task.findOrFail(params.id)`, que lanza la excepción de Lucid y da `404`.
  - Aplica solo las claves presentes, guarda, carga el responsable y serializa.
  - Un `title` en el cuerpo se descarta en la validación.
  - Un cuerpo vacío no cambia nada y devuelve `200` con la tarea tal cual. Es lo más simple, y la spec no lo prohíbe.
- **`TaskTransformer`** con `id`, `title`, `status` y `assignee`. El responsable pasa por un transformer que solo hace `pick` de `id` y `fullName`. No se reutiliza `UserTransformer`, que expone el email: es la advertencia de la nota de E3-1.
- Las constantes de estado viven en el modelo como `Task.STATUSES`. Las usan el validador y el tipo.

### Frontend

- En `lib/types.ts`: `TaskStatus = 'pending' | 'in_progress' | 'done'` y `Task = { id, title, status, assignee: { id, fullName } }`.
- En `lib/api.ts`: `listTasks(token)`, `createTask(token, title)` y `updateTask(token, id, patch)`.
  - En `translate()` se añade la etiqueta `title: 'el título'`.
  - Los mensajes específicos del título se pintan desde la página para que coincidan con la spec: «Escribe un título para la tarea.» y «El título no puede superar los 255 caracteres.».
  - `method` admite `'PATCH'`.
- **Página `pages/tasks-page.tsx`**:
  - Una cabecera con «FlowSync» y un enlace a «Mi perfil».
  - El formulario de creación usa `Input`, `Button` y `FieldError`, igual que el login.
  - La lista es una `Card` con una fila por tarea: título, nombre del responsable (o «Sin nombre») y un `<select>` nativo con las tres opciones.
  - El `<select>` lleva las clases del `Input` de shadcn para que no desentone. Es nativo porque no hay componente de selección instalado y añadir el de shadcn traería Radix, una dependencia nueva.
  - El estado vacío es un texto dentro de la `Card`.
  - Mientras carga se muestra el spinner de `full-screen-loader`, en versión inline o reutilizando el componente.
- **Validación en cliente antes de enviar**: título vacío tras `trim()`, o más de 255 caracteres. Evita el viaje al servidor, igual que ya hace el registro con las contraseñas, y el backend sigue siendo la fuente de verdad. Si el servidor devuelve un `422` sobre `title`, se mapea al mismo texto según la regla.
- **Cambio de estado optimista**: se actualiza la fila al momento y se llama a `updateTask`. Si falla, se restaura el estado anterior y se muestra un `Alert` destructivo arriba de la lista con «No se pudo guardar el cambio de estado. Inténtalo de nuevo.».
  - Alternativa descartada: esperar a la respuesta para pintar. Se nota más lento, y E2-4 CA-1 pide reflejo inmediato.
- **Tarea creada**: se añade al final del array local con la respuesta del servidor, sin volver a pedir la lista. Al final, porque es donde la deja el orden natural de inserción.
- **401 en operaciones de tareas**: el `AuthProvider` expone una función `expireSession(message)`, que hace `clearSession()` y fija `sessionError`. La página la llama cuando un `ApiError` tiene `status === 401`, y `ProtectedRoute` lleva a `/login`, donde ya se pinta `sessionError`.
- **Rutas**: se añade `/tasks` dentro de `ProtectedRoute`. El comodín `*` y `PublicOnlyRoute` pasan a llevar a `/tasks`. El perfil gana un `Link` a `/tasks`.

## Risks / Trade-offs

- **Sin orden explícito, el orden de la lista depende del motor** (SQLite devuelve por rowid en la práctica). → Se deja documentado y sin garantía, a la espera de PA-3. La interfaz no reordena.
- **Sin tests, las regresiones solo se detectan a mano.** → Cada tarea de `tasks.md` lleva su verificación manual: curl contra la API o recorrido en el navegador, más `typecheck`, `lint` y `build`.
- **Actualizaciones concurrentes: gana la última escritura** (PA-8). → Aceptado en este change. La lista no es viva.
- **`assigneeId` acepta cualquier usuario existente, y no hay espacios ni equipos.** → Coherente con un único espacio compartido.
- **El cambio optimista puede parpadear si el servidor rechaza.** → La fila revierte y aparece un aviso. Es un caso raro, porque las opciones del selector siempre son válidas.

## Migration Plan

- Una migración que crea la tabla, con `down` que la elimina. No toca datos existentes.
- Despliegue: `node ace migration:run`. Reversión: `node ace migration:rollback`.
- Esta migración es el único script que escribe en la base de datos. Al cerrar el Gitflow de la implementación se consolida en el script de despliegue que pide la regla global.
