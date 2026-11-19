# Proposal

## Why

FlowSync todavía no tiene tareas: solo hay cuentas y acceso. La promesa del producto es ver en qué anda el equipo sin preguntar a nadie, y para eso hace falta la superficie donde ocurre todo lo demás: una lista compartida en la que crear tareas y mantener su estado al día. Son las cinco primeras historias del orden priorizado del backlog (E3-1, E2-1, E2-3, E2-2 y E2-4).

## What Changes

- Nueva capability `tasks`, full-stack:
  - **API**: exactamente tres operaciones autenticadas. Listar todas las tareas, crear una y actualizarla.
    - No existe leer una tarea suelta, ni borrar, ni endpoints de equipo o de usuarios.
    - Al crear solo se acepta el título: obligatorio, sin contar los espacios, y de 255 caracteres como máximo.
    - Una tarea nueva nace en `pending` y con quien la crea como responsable.
    - Al actualizar se puede cambiar el estado y el responsable. El título no se puede cambiar.
    - Los estados son un conjunto cerrado: `pending`, `in_progress` y `done`. Cualquier otro valor se rechaza con `422`.
    - Se puede pasar de cualquier estado a cualquier otro, incluido volver desde `done`.
  - **Interfaz**: una pantalla de lista compartida, la misma para todos.
    - Cada fila muestra título, nombre del responsable (o «Sin nombre», nunca su correo ni su id) y estado («Pendiente», «En curso», «Hecho»).
    - El estado se cambia desde la propia fila.
    - Un formulario de creación que solo pide el título.
    - Un estado vacío que explica qué es la lista e invita a crear la primera tarea.
  - Sin fechas de vencimiento, sin marcas de vencida, sin vista «mis tareas», sin tareas privadas y sin señales de presencia.
- La lista pasa a ser la pantalla de inicio. Tras registrarse o iniciar sesión, y desde cualquier dirección desconocida, se llega a la lista en lugar de al perfil. El perfil sigue disponible y enlazado desde la lista. Esto modifica la capability `auth`.
- Sin pruebas automáticas en este change. No se monta base de pruebas.

## Capabilities

### New Capabilities

- `tasks`: la lista de tareas compartida del equipo. Cubre crear tareas con solo el título, los valores por defecto de responsable y estado, el conjunto cerrado de estados y el cambio de estado y de responsable, tanto en la API como en la pantalla.

### Modified Capabilities

- `auth`: cambia el destino tras registrarse o iniciar sesión, la redirección de las direcciones desconocidas y lo que ve una persona con sesión al volver a entrar. Pasa a ser la lista en lugar del perfil. La pantalla de perfil gana un enlace a la lista.

## Impact

- **Backend**:
  - Una tabla nueva de tareas, con el responsable referenciado a un usuario, y su modelo.
  - Un validador para crear y otro para actualizar.
  - Un controlador con `index`, `store` y `update`.
  - Un transformer que expone del responsable solo `id` y `fullName`.
  - Tres rutas bajo `/api/v1/tasks`, protegidas con el middleware de auth.
  - Se regeneran `database/schema.ts` y `.adonisjs/`.
- **Frontend**:
  - Tres funciones nuevas en el cliente de la API, con sus tipos.
  - Una página de lista y una ruta protegida `/tasks`.
  - Cambios en las redirecciones de `app-routes` y de `public-only-route`, y un enlace en el perfil.
  - Se reutilizan los componentes de `components/ui/`. No se añaden dependencias. El selector de estado es un `<select>` nativo, porque no hay componente de selección instalado.
- **Datos**: una migración nueva. No toca datos existentes.

## Puntos abiertos

- **Orden de la lista (PA-3).** No hay regla de orden decidida. La API no ordena explícitamente y la interfaz pinta las tareas en el orden en que llegan. Mientras PA-3 siga abierto, la promesa de enumerar el trabajo de cada persona (E3-1 CA-5) no se sostiene con muchas tareas.
- **Umbral del título (PA-9).** 255 caracteres es un umbral provisional que fija este change para poder cumplir E2-2 CA-3 (avisar en vez de recortar). La decisión de producto sigue abierta.
- **Transiciones (PA-7).** Este change las deja libres, de cualquier estado a cualquier otro. Si producto decide restringirlas, será un change aparte.
- **Choques de edición y lista viva (PA-8, E3-2).** La lista es correcta en el momento en que se pide. No se refresca sola con los cambios de otras personas.
- **Reasignar desde la pantalla (E2-7).** La API ya acepta cambiar el responsable, pero la interfaz no lo ofrece todavía. Para elegir a quién asignar haría falta listar a los miembros, y eso es un endpoint de equipo que queda fuera.
