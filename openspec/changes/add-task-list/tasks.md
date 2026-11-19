# Tasks

> Este change no lleva tests por decisión explícita. Cada tarea se verifica con un comando o con un recorrido manual.

## 1. Datos

- [ ] 1.1 Crear la migración de la tabla `tasks`: `title` string(255) no nulo, `status` string no nulo con default `pending`, `assignee_id` con FK a `users`, y timestamps. Ejecutar `node ace migration:run` y verificar que `database/schema.ts` contiene `TaskSchema` sin columna de fecha de vencimiento.
- [ ] 1.2 Crear el modelo `Task` que extiende `TaskSchema`, con `belongsTo` `assignee` (`foreignKey: 'assigneeId'`) y `Task.STATUSES`. Verificar con `npm run typecheck` en `backend/`.

## 2. API

- [ ] 2.1 Crear los validadores de crear (título con trim, de 1 a 255) y de actualizar (`status` con enum opcional y `assigneeId` con exists opcional). Verificar con `npm run typecheck`.
- [ ] 2.2 Crear `TaskTransformer`, que expone `id`, `title`, `status` y `assignee: { id, fullName }`, sin email ni fechas. Verificar con `npm run typecheck`.
- [ ] 2.3 Crear `TasksController` con `index` (sin `orderBy`), `store` (`201`, `pending` y quien crea como responsable) y `update` (`findOrFail`, aplica solo `status` y `assigneeId`). Verificar con `npm run typecheck`.
- [ ] 2.4 Registrar `GET /api/v1/tasks`, `POST /api/v1/tasks` y `PATCH /api/v1/tasks/:id` con `middleware.auth()`. Verificar con `node ace list:routes` que hay exactamente esas tres rutas de tareas, y commitear los ficheros regenerados en `.adonisjs/`.
- [ ] 2.5 Verificar la API con curl contra el servidor de desarrollo, recorriendo los escenarios de la spec `tasks`. Borrar al final los usuarios y tareas de prueba.
  - 401 sin token.
  - 201 con título, comprobando los espacios recortados y que `status` y `assigneeId` del cuerpo se ignoran.
  - 422 con título vacío, en blanco y de 256 caracteres. 201 con 255.
  - 200 al cambiar el estado de una tarea ajena, incluido volver desde `done`.
  - 422 con `blocked`, con `Hecho` y con un `assigneeId` inexistente.
  - 404 con un id inexistente, con `GET /tasks/:id` y con `DELETE`.
  - Comprobar que ninguna respuesta lleva email ni fechas.
- [ ] 2.6 Pasar `npm run lint` y `npm run typecheck` en `backend/` sin errores.

## 3. Cliente de la API y sesión

- [ ] 3.1 Añadir los tipos `TaskStatus` y `Task` en `lib/types.ts`, y `listTasks`, `createTask` y `updateTask` en `lib/api.ts`. Permitir `PATCH` y añadir la etiqueta `title`. Verificar con `npm run build` en `frontend/`.
- [ ] 3.2 Exponer `expireSession(message)` en el contexto de auth, que olvida la sesión y fija el aviso. Verificar con `npm run build`.

## 4. Pantalla de la lista

- [ ] 4.1 Crear la página de tareas con la cabecera y un enlace a «Mi perfil», un indicador de carga, el aviso de error de carga y la lista. Cada fila lleva título, nombre o «Sin nombre», y un `<select>` con «Pendiente», «En curso» y «Hecho». Debe tener el estado vacío explicativo. Verificar en el navegador con 0 tareas y con varias, incluida una de un usuario sin nombre.
- [ ] 4.2 Añadir el formulario de creación con solo el título: validación en cliente (vacío, en blanco y más de 255 caracteres, con los textos de la spec), botón desactivado mientras se envía, la tarea añadida a la lista sin recargar y el campo vaciado. Verificar en el navegador cada escenario de «Crear una tarea desde la lista» y de «Errores de título en pantalla».
- [ ] 4.3 Cambiar el estado desde la fila de forma optimista, con reversión y aviso si falla. Verificar en el navegador que el cambio persiste al recargar, y que con el backend parado la fila revierte y aparece el aviso.
- [ ] 4.4 Llevar a `/login` con «Tu sesión ha caducado. Vuelve a iniciar sesión.» ante un 401 en cualquier operación de tareas. Verificar en el navegador revocando el token con logout desde curl y luego cambiando un estado.

## 5. Navegación (delta de auth)

- [ ] 5.1 Añadir la ruta protegida `/tasks`, hacer que `*` y `PublicOnlyRoute` lleven a `/tasks`, y añadir en el perfil un enlace a la lista. Verificar en el navegador que el login, el registro, `/` y una ruta desconocida llevan a `/tasks` con sesión y a `/login` sin ella, y que se navega entre la lista y el perfil.
- [ ] 5.2 Pasar `npm run lint` y `npm run build` en `frontend/` sin errores.

## 6. Cierre

- [ ] 6.1 Ejecutar `openspec validate add-task-list --strict` sin errores, y recorrer una vez con dos usuarios distintos en dos navegadores que ven la misma lista y pueden cambiar el estado de las tareas del otro.

## Workflow follow-up

- Consolidar la migración en el script de despliegue para Ubuntu Server, con su artifact paso a paso, al cerrar el Gitflow de la implementación.
- Archivar el change cuando esté implementado y revisado, para que `tasks` pase a `openspec/specs/` y la spec `auth` quede actualizada.
