# Spec Delta

## Purpose

Dar al equipo una única lista de tareas compartida, la misma para todos, donde crear una tarea cueste solo escribir su título y donde se vea y se cambie de un vistazo quién lleva cada tarea y en qué estado está.

## ADDED Requirements

### Requirement: Solo personas con sesión acceden a las tareas

Todas las operaciones de tareas de la API SHALL exigir la cabecera `Authorization: Bearer <token>` con un token vigente. Sin token, o con uno inválido o revocado, SHALL responder `401` con `{ errors: [{ message: "Unauthorized access" }] }` y no devolver ni modificar ninguna tarea.

#### Scenario: Listar sin sesión

- **WHEN** se pide `GET /api/v1/tasks` sin cabecera `Authorization`
- **THEN** la respuesta es `401` y no incluye ninguna tarea

#### Scenario: Crear sin sesión

- **WHEN** se envía `POST /api/v1/tasks` con un título válido pero sin token
- **THEN** la respuesta es `401` y no se crea ninguna tarea

### Requirement: La API de tareas tiene exactamente tres operaciones

La API SHALL ofrecer solo tres operaciones sobre tareas: listar todas (`GET /api/v1/tasks`), crear una (`POST /api/v1/tasks`) y actualizar una (`PATCH /api/v1/tasks/:id`). No SHALL existir lectura de una tarea suelta, ni borrado, ni operaciones sobre el equipo o sus miembros. Cualquier otra combinación de método y ruta responde `404`.

#### Scenario: No hay lectura individual

- **WHEN** se pide `GET /api/v1/tasks/1` con un token vigente
- **THEN** la respuesta es `404`

#### Scenario: No hay borrado

- **WHEN** se envía `DELETE /api/v1/tasks/1` con un token vigente
- **THEN** la respuesta es `404` y la tarea sigue existiendo

### Requirement: Representación de una tarea

Cada tarea que devuelve la API SHALL tener exactamente `id`, `title`, `status` y `assignee`. `assignee` contiene solo el `id` y el `fullName` del responsable (`fullName` puede ser `null`). La API SHALL NOT exponer el correo ni ningún otro dato de cuenta del responsable, ni fechas de ningún tipo.

#### Scenario: Forma de una tarea

- **WHEN** se lista o se crea una tarea cuyo responsable es "Ada Lovelace"
- **THEN** la tarea tiene `id`, `title`, `status` y `assignee: { id, fullName: "Ada Lovelace" }`, y no hay ningún campo `email`, de fecha ni de vencimiento

#### Scenario: Responsable sin nombre

- **WHEN** el responsable de una tarea no tiene nombre puesto
- **THEN** `assignee.fullName` es `null` y sigue sin aparecer su correo

### Requirement: Listar todas las tareas del espacio

`GET /api/v1/tasks` SHALL responder `200` con `{ data: [...] }` y todas las tareas existentes, sin importar quién las creó, quién es su responsable o quién pregunta. No existen tareas privadas ni filtros por persona. La respuesta no tiene un orden garantizado.

#### Scenario: Dos personas ven lo mismo

- **WHEN** dos usuarios distintos piden la lista sin que nadie cambie nada entre medias
- **THEN** los dos reciben exactamente el mismo conjunto de tareas

#### Scenario: Las tareas de otros aparecen

- **WHEN** otra persona crea una tarea y luego yo pido la lista
- **THEN** esa tarea está en la respuesta, con esa persona como responsable

#### Scenario: Sin tareas todavía

- **WHEN** se pide la lista y no se ha creado ninguna tarea
- **THEN** la respuesta es `200` con `{ data: [] }`

#### Scenario: Listar no cambia nada

- **WHEN** se pide la lista varias veces seguidas
- **THEN** ninguna tarea cambia de estado ni de responsable

### Requirement: Crear una tarea con solo el título

`POST /api/v1/tasks` SHALL crear una tarea a partir de un `title` y responder `201` con `{ data: <tarea> }`. El título se guarda sin los espacios del principio y del final. El título es el único dato que se tiene en cuenta: cualquier otro campo del cuerpo, como `status` o `assigneeId`, se ignora.

#### Scenario: Crear con un título

- **WHEN** se envía `{ "title": "Revisar el informe" }` con un token vigente
- **THEN** la respuesta es `201` con la tarea creada, cuyo `title` es "Revisar el informe"

#### Scenario: Espacios alrededor del título

- **WHEN** se envía `{ "title": "  Revisar el informe  " }`
- **THEN** la tarea se crea con `title` "Revisar el informe"

#### Scenario: Otros campos se ignoran

- **WHEN** se envía un título junto con `status: "done"` y el `assigneeId` de otra persona
- **THEN** la tarea se crea en `pending` y con quien la crea como responsable

### Requirement: Una tarea nueva nace pendiente y de quien la crea

Toda tarea recién creada SHALL tener estado `pending` y SHALL tener como responsable al usuario dueño del token con el que se creó.

#### Scenario: Valores de una tarea nueva

- **WHEN** un usuario crea una tarea indicando solo el título
- **THEN** la tarea creada tiene `status: "pending"` y `assignee.id` igual al id de ese usuario

### Requirement: El título es obligatorio y tiene un límite

El sistema SHALL rechazar con `422` la creación de una tarea sin título, con un título formado solo por espacios o con un título de más de 255 caracteres sin contar los espacios de los extremos. El cuerpo de error indica `field: "title"` y la regla incumplida, y no se crea ninguna tarea. Un título largo SHALL NOT recortarse nunca en silencio.

#### Scenario: Sin título

- **WHEN** se envía un cuerpo sin `title` o con `title: ""`
- **THEN** la respuesta es `422` con un error de regla `required` sobre `title`, y no se crea ninguna tarea

#### Scenario: Título en blanco

- **WHEN** se envía `title` formado solo por espacios
- **THEN** la respuesta es `422` con un error sobre `title`, y no se crea ninguna tarea

#### Scenario: Título demasiado largo

- **WHEN** se envía un `title` de 256 caracteres
- **THEN** la respuesta es `422` con un error de regla `maxLength` sobre `title` y `meta.max: 255`, y no se guarda ninguna versión recortada

#### Scenario: Título en el límite

- **WHEN** se envía un `title` de exactamente 255 caracteres
- **THEN** la tarea se crea con el título completo

### Requirement: Los estados son un conjunto cerrado

Una tarea SHALL estar siempre en exactamente uno de tres estados, que viajan por la API como `pending`, `in_progress` y `done`. Cualquier otro valor, incluidos los nombres en castellano, SHALL rechazarse con `422`. No existe ninguna forma de añadir, renombrar o eliminar estados.

#### Scenario: Valor de estado desconocido

- **WHEN** se intenta actualizar una tarea con `status: "blocked"`
- **THEN** la respuesta es `422` con un error sobre `status`, y la tarea conserva su estado anterior

#### Scenario: Nombre en castellano como valor

- **WHEN** se intenta actualizar una tarea con `status: "Hecho"`
- **THEN** la respuesta es `422` con un error sobre `status`

### Requirement: Actualizar el estado y el responsable de cualquier tarea

`PATCH /api/v1/tasks/:id` SHALL aceptar `status` y `assigneeId`, juntos o por separado, aplicar los que lleguen y responder `200` con `{ data: <tarea actualizada> }`. Cualquier persona con sesión SHALL poder actualizar cualquier tarea, sea suya o no. Se puede pasar de cualquier estado a cualquier otro. El título no se puede cambiar por esta vía: un `title` en el cuerpo se ignora.

#### Scenario: Cambiar el estado

- **WHEN** se envía `{ "status": "in_progress" }` sobre una tarea en `pending`
- **THEN** la respuesta es `200` con la tarea en `in_progress`, y una lista pedida después la muestra así

#### Scenario: Tarea de otra persona

- **WHEN** un usuario cambia el estado de una tarea cuyo responsable es otro usuario
- **THEN** el cambio se aplica igual que en una tarea propia, con `200`

#### Scenario: Volver atrás desde hecho

- **WHEN** se envía `{ "status": "pending" }` sobre una tarea en `done`
- **THEN** la respuesta es `200` con la tarea en `pending`

#### Scenario: Cambiar el responsable

- **WHEN** se envía `{ "assigneeId": <id de otro usuario existente> }`
- **THEN** la respuesta es `200` y `assignee` es ese usuario, con su `id` y su `fullName`

#### Scenario: El título no cambia

- **WHEN** se envía `{ "title": "Otro título", "status": "done" }`
- **THEN** la tarea pasa a `done` y su título sigue siendo el anterior

### Requirement: Errores al actualizar una tarea

Al actualizar, el sistema SHALL responder `404` si la tarea no existe y `422` si `assigneeId` no corresponde a ningún usuario. En ambos casos ninguna tarea cambia.

#### Scenario: Tarea inexistente

- **WHEN** se envía `PATCH /api/v1/tasks/999999` con un estado válido
- **THEN** la respuesta es `404`

#### Scenario: Responsable inexistente

- **WHEN** se envía un `assigneeId` que no pertenece a ningún usuario
- **THEN** la respuesta es `422` con un error sobre `assigneeId`, y la tarea conserva su responsable

### Requirement: Pantalla de la lista compartida

La aplicación web SHALL mostrar en `/tasks`, solo con sesión iniciada, todas las tareas en una única lista. Cada fila muestra el título, el nombre del responsable y el estado. Las tareas se pintan en el orden en que las devuelve la API, sin reordenarlas. No hay ninguna otra vista de tareas, como una de «mis tareas».

#### Scenario: Ver quién está en qué

- **WHEN** una persona con sesión abre `/tasks` y hay tareas
- **THEN** cada fila muestra el título, el nombre del responsable y su estado, sin tener que abrir ninguna tarea

#### Scenario: Responsable sin nombre en pantalla

- **WHEN** el responsable de una tarea no tiene nombre puesto
- **THEN** la fila muestra «Sin nombre» y nunca su correo ni su id

#### Scenario: Estados en castellano

- **WHEN** hay tareas en cada uno de los tres estados
- **THEN** se muestran como «Pendiente», «En curso» y «Hecho»

#### Scenario: Lista sin sesión

- **WHEN** una persona sin sesión abre `/tasks`
- **THEN** acaba en `/login` y no ve ninguna tarea

#### Scenario: Cargando la lista

- **WHEN** la lista todavía se está pidiendo al servidor
- **THEN** se muestra un indicador de carga en lugar de la lista

### Requirement: La lista no muestra fechas ni presencia

La pantalla de la lista SHALL NOT mostrar fechas de ningún tipo, marcas de vencida, ni señales de quién está conectado o de la actividad de cada persona.

#### Scenario: Sin fechas ni presencia

- **WHEN** una persona mira la lista mientras otras personas usan la aplicación
- **THEN** no ve fechas, marcas de vencida, indicadores de en línea ni actividad por persona

### Requirement: Lista vacía

Si no hay ninguna tarea, la pantalla SHALL explicar que esta es la lista compartida del equipo e invitar a crear la primera tarea, en lugar de mostrar una lista vacía sin más.

#### Scenario: Espacio sin tareas

- **WHEN** una persona con sesión abre `/tasks` y no existe ninguna tarea
- **THEN** ve un mensaje que explica qué es la lista y la invita a crear la primera tarea, junto al formulario de creación

### Requirement: Crear una tarea desde la lista

La pantalla de la lista SHALL ofrecer un formulario de creación con un único campo de título y un botón para crear. El formulario SHALL NOT ofrecer ni sugerir responsable, estado, fecha ni ningún otro dato. Al crearla, la tarea SHALL aparecer en la lista sin recargar ni navegar, y el campo se vacía.

#### Scenario: Crear desde la pantalla

- **WHEN** la persona escribe un título y pulsa el botón de crear
- **THEN** la tarea aparece en la lista con su nombre como responsable y en «Pendiente», sin recargar la página, y el campo queda vacío

#### Scenario: El formulario solo pide el título

- **WHEN** la persona recorre el formulario de creación
- **THEN** solo hay un campo de título y el botón, sin selectores ni sugerencias de responsable, estado o fecha

#### Scenario: Mientras se crea

- **WHEN** la persona pulsa el botón de crear y el servidor aún no ha respondido
- **THEN** el botón queda desactivado hasta que llega la respuesta

### Requirement: Errores de título en pantalla

Si el título falta, está en blanco o supera los 255 caracteres, la pantalla SHALL explicarlo junto al propio campo, en lenguaje corriente y en castellano, y SHALL NOT crear ninguna tarea ni añadir ninguna fila a la lista.

#### Scenario: Título vacío o en blanco

- **WHEN** la persona pulsa crear con el campo vacío o solo con espacios
- **THEN** bajo el campo aparece «Escribe un título para la tarea.» y no aparece ninguna fila nueva

#### Scenario: Título demasiado largo en pantalla

- **WHEN** la persona intenta crear una tarea con un título de más de 255 caracteres
- **THEN** bajo el campo aparece «El título no puede superar los 255 caracteres.», el texto escrito se conserva entero y no se crea la tarea

### Requirement: Cambiar el estado desde la fila

Cada fila SHALL ofrecer un control para cambiar el estado entre «Pendiente», «En curso» y «Hecho», y ningún otro destino. El cambio SHALL reflejarse en la fila de inmediato, sin abrir la tarea, sin confirmaciones y sin rellenar campos, sea quien sea el responsable. Si el servidor rechaza el cambio, la fila vuelve a su estado anterior y se muestra un aviso.

#### Scenario: Cambiar el estado

- **WHEN** la persona elige «En curso» en el control de estado de una tarea en «Pendiente»
- **THEN** la fila muestra «En curso» al momento, sin diálogo de confirmación, y al recargar la página sigue en «En curso»

#### Scenario: Tarea de otra persona en pantalla

- **WHEN** la persona cambia el estado de una tarea cuyo responsable es otra persona
- **THEN** el cambio se aplica igual, sin advertencias ni permisos adicionales

#### Scenario: Solo tres destinos

- **WHEN** la persona abre el control de estado de una fila
- **THEN** las únicas opciones son «Pendiente», «En curso» y «Hecho»

#### Scenario: El servidor rechaza el cambio

- **WHEN** la persona cambia el estado y el servidor no puede aplicarlo
- **THEN** la fila vuelve al estado que tenía y aparece un aviso explicando que no se pudo guardar el cambio

### Requirement: Errores al cargar o perder la sesión en la lista

Si la lista no se puede cargar, la pantalla SHALL mostrar un aviso con el motivo en castellano en lugar de la lista. Si el servidor rechaza la sesión durante cualquier operación de tareas, la aplicación SHALL olvidar la sesión y llevar a la persona a `/login` con el aviso «Tu sesión ha caducado. Vuelve a iniciar sesión.».

#### Scenario: Servidor inaccesible al cargar

- **WHEN** la persona abre `/tasks` y el servidor no responde
- **THEN** ve el aviso «No se pudo conectar con el servidor. Comprueba que el backend está arrancado.» en lugar de la lista

#### Scenario: Sesión rechazada en la lista

- **WHEN** el token de la persona deja de ser válido y la lista o una operación sobre ella recibe un rechazo de sesión
- **THEN** la persona acaba en `/login` con el aviso «Tu sesión ha caducado. Vuelve a iniciar sesión.»

### Requirement: Navegar entre la lista y el perfil

La pantalla de la lista SHALL ofrecer un enlace al perfil de la persona.

#### Scenario: Ir al perfil

- **WHEN** la persona pulsa el enlace al perfil desde la lista
- **THEN** ve su perfil en `/profile`
