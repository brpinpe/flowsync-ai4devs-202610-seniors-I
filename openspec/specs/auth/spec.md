# auth Specification

## Purpose

Permitir que una persona cree su cuenta en FlowSync, inicie y cierre sesión, y consulte su propio perfil, de modo que solo quien tiene una sesión válida acceda a las zonas privadas de la aplicación.

## Requirements

### Requirement: Registro de cuenta

El sistema SHALL permitir crear una cuenta nueva enviando nombre completo (opcional, pero la clave debe estar presente, con texto o `null`), email, contraseña y confirmación de contraseña a `POST /api/v1/auth/signup`. Si todo es válido, el sistema SHALL responder `200` con `{ data: { user, token } }`: el usuario creado y un token de acceso con el que la persona ya tiene la sesión iniciada.

#### Scenario: Registro correcto

- **WHEN** se envía un nombre, un email que no está registrado, una contraseña de entre 8 y 32 caracteres y la misma contraseña como confirmación
- **THEN** la respuesta es `200` con `data.user` (id, nombre, email, fechas de alta y última modificación, iniciales) y `data.token`, un token que empieza por `oat_`

#### Scenario: Registro sin nombre

- **WHEN** se envía `fullName: null` junto con un email, una contraseña y una confirmación válidos
- **THEN** la cuenta se crea y `data.user.fullName` es `null`

#### Scenario: Falta la clave del nombre

- **WHEN** el cuerpo de la petición no incluye la clave `fullName`
- **THEN** la respuesta es `422` con un error de regla `required` sobre el campo `fullName`

### Requirement: Validación de los datos de registro

El sistema SHALL rechazar un registro con datos inválidos con `422` y un cuerpo `{ errors: [...] }` en el que cada error indica `field`, `rule` y `message` (y `meta` cuando la regla tiene límites). Cuando varios campos fallan, el sistema SHALL devolver todos los errores a la vez, y como mucho uno por campo. No se crea ninguna cuenta.

#### Scenario: Email ya registrado

- **WHEN** se intenta registrar un email que ya pertenece a otra cuenta
- **THEN** la respuesta es `422` con un error de regla `database.unique` sobre `email`

#### Scenario: Email con formato inválido

- **WHEN** el email no tiene formato de dirección de correo o supera los 254 caracteres
- **THEN** la respuesta es `422` con un error de regla `email` o `maxLength` sobre `email`

#### Scenario: Contraseña fuera de longitud

- **WHEN** la contraseña tiene menos de 8 caracteres o más de 32
- **THEN** la respuesta es `422` con un error de regla `minLength` (`meta.min: 8`) o `maxLength` (`meta.max: 32`) sobre `password`

#### Scenario: Confirmación que no coincide

- **WHEN** la confirmación tiene una longitud válida pero no es igual a la contraseña
- **THEN** la respuesta es `422` con un error de regla `sameAs` sobre `passwordConfirmation`

#### Scenario: Varios campos inválidos a la vez

- **WHEN** el email ya está registrado y la contraseña y la confirmación tienen menos de 8 caracteres
- **THEN** la respuesta es `422` con un error por cada uno de esos campos en la misma respuesta

### Requirement: Inicio de sesión

El sistema SHALL permitir iniciar sesión enviando email y contraseña a `POST /api/v1/auth/login`. Con credenciales correctas SHALL responder `200` con `{ data: { user, token } }`, con la misma forma que el registro. Cada inicio de sesión SHALL emitir un token nuevo sin invalidar los tokens anteriores del mismo usuario.

#### Scenario: Credenciales correctas

- **WHEN** se envían el email y la contraseña de una cuenta existente
- **THEN** la respuesta es `200` con `data.user` y un `data.token` nuevo

#### Scenario: Sesiones simultáneas

- **WHEN** el mismo usuario inicia sesión dos veces
- **THEN** los dos tokens emitidos siguen sirviendo para acceder a las rutas protegidas

#### Scenario: Faltan campos

- **WHEN** el cuerpo no incluye email o contraseña
- **THEN** la respuesta es `422` con un error de regla `required` por cada campo que falta

### Requirement: Credenciales incorrectas sin revelar qué falló

Ante un inicio de sesión fallido, el sistema SHALL responder `400` con `{ errors: [{ message: "Invalid user credentials" }] }`, sin indicar campo y sin distinguir entre un email que no existe y una contraseña equivocada. El email se compara exactamente como se escribió, distinguiendo mayúsculas de minúsculas.

#### Scenario: Contraseña incorrecta

- **WHEN** el email existe pero la contraseña no es la suya
- **THEN** la respuesta es `400` con el mensaje `Invalid user credentials`

#### Scenario: Email desconocido

- **WHEN** el email no pertenece a ninguna cuenta
- **THEN** la respuesta es `400` con el mismo mensaje y la misma forma que con una contraseña incorrecta

#### Scenario: Email con mayúsculas distintas

- **WHEN** se escribe en mayúsculas un email que se registró en minúsculas, con la contraseña correcta
- **THEN** la respuesta es `400` con el mensaje `Invalid user credentials`

### Requirement: Acceso protegido por token

Las rutas bajo `/api/v1/account/` SHALL exigir la cabecera `Authorization: Bearer <token>` con un token vigente. Sin token, con un token desconocido o con uno revocado, el sistema SHALL responder `401` con `{ errors: [{ message: "Unauthorized access" }] }`. Los tokens SHALL seguir siendo válidos hasta que se cierre la sesión con ellos: no caducan por tiempo.

#### Scenario: Sin cabecera de autorización

- **WHEN** se pide `GET /api/v1/account/profile` sin cabecera `Authorization`
- **THEN** la respuesta es `401` con el mensaje `Unauthorized access`

#### Scenario: Token inválido

- **WHEN** se envía un token inventado o mal formado
- **THEN** la respuesta es `401` con el mensaje `Unauthorized access`

### Requirement: Consulta del perfil propio

El sistema SHALL devolver en `GET /api/v1/account/profile` los datos del usuario dueño del token, envueltos en `{ data: ... }`: id, nombre completo, email, fecha de alta, fecha de última modificación e iniciales. El sistema SHALL NOT devolver nunca la contraseña, ni aquí ni en el registro ni en el inicio de sesión.

#### Scenario: Perfil con token válido

- **WHEN** se pide el perfil con un token vigente
- **THEN** la respuesta es `200` con `data` conteniendo `id`, `fullName`, `email`, `createdAt`, `updatedAt` e `initials`, y sin ningún campo de contraseña

#### Scenario: Iniciales a partir del nombre

- **WHEN** el usuario tiene un nombre de dos o más palabras, como "Ada Lovelace"
- **THEN** `initials` son la primera letra de las dos primeras palabras, en mayúsculas: `AL`

#### Scenario: Iniciales con una sola palabra

- **WHEN** el nombre es una sola palabra, como "Ada"
- **THEN** `initials` son sus dos primeras letras en mayúsculas: `AD`

#### Scenario: Iniciales sin nombre

- **WHEN** el usuario no tiene nombre y su email es `ada@example.com`
- **THEN** `initials` son la primera letra de la parte anterior a la arroba y la primera de la parte posterior, en mayúsculas: `AE`

### Requirement: Cierre de sesión en el servidor

El sistema SHALL revocar el token con el que se hace la petición cuando se llama a `POST /api/v1/account/logout`, y SHALL responder `200` con `{ message: "Logged out successfully" }`, sin el envoltorio `data`. El resto de tokens del mismo usuario no se ven afectados.

#### Scenario: Cerrar sesión

- **WHEN** se llama a logout con un token vigente
- **THEN** la respuesta es `200` con `{ message: "Logged out successfully" }`

#### Scenario: Token usado tras cerrar sesión

- **WHEN** se usa para pedir el perfil un token con el que ya se ha cerrado sesión
- **THEN** la respuesta es `401` con el mensaje `Unauthorized access`

#### Scenario: Logout sin token

- **WHEN** se llama a logout sin cabecera `Authorization`
- **THEN** la respuesta es `401` con el mensaje `Unauthorized access`

### Requirement: Pantalla de registro

La aplicación web SHALL ofrecer en `/register` un formulario con los campos "Nombre completo (opcional)", "Email", "Contraseña" (con la pista "Entre 8 y 32 caracteres.") y "Repite la contraseña", un botón "Crear cuenta" y un enlace "Inicia sesión" que lleva a `/login`. Si el registro tiene éxito, la persona SHALL quedar con la sesión iniciada y ver su perfil.

#### Scenario: Registro desde la pantalla

- **WHEN** la persona rellena el formulario con datos válidos y pulsa "Crear cuenta"
- **THEN** el botón muestra "Creando cuenta…" y queda desactivado mientras espera, y después la persona ve su perfil en `/profile`

#### Scenario: Contraseñas distintas detectadas antes de enviar

- **WHEN** la contraseña y su repetición no coinciden y se pulsa "Crear cuenta"
- **THEN** bajo "Repite la contraseña" aparece "Las contraseñas no coinciden." y no se envía nada al servidor

#### Scenario: Nombre en blanco

- **WHEN** el nombre se deja vacío o solo con espacios
- **THEN** la cuenta se crea sin nombre y el perfil muestra "Sin nombre"

### Requirement: Pantalla de inicio de sesión

La aplicación web SHALL ofrecer en `/login` un formulario con "Email" y "Contraseña", un botón "Entrar" y un enlace "Crea una" que lleva a `/register`. Si el inicio de sesión tiene éxito, la persona SHALL ver su perfil.

#### Scenario: Entrar desde la pantalla

- **WHEN** la persona escribe credenciales correctas y pulsa "Entrar"
- **THEN** el botón muestra "Entrando…" y queda desactivado mientras espera, y después la persona ve su perfil en `/profile`

#### Scenario: Credenciales incorrectas en pantalla

- **WHEN** la persona escribe un email o una contraseña que no son correctos
- **THEN** aparece arriba del formulario el aviso "El email o la contraseña no son correctos." y sigue en `/login`

### Requirement: Errores comprensibles en castellano

La aplicación web SHALL mostrar los errores del servidor traducidos al castellano. Los errores que corresponden a un campo visible SHALL aparecer bajo ese campo; cualquier error que no tenga un campo visible donde colocarse SHALL aparecer como aviso general arriba del formulario, para que ninguno se quede sin mostrar.

#### Scenario: Email ya registrado en pantalla

- **WHEN** la persona intenta registrarse con un email que ya existe
- **THEN** bajo "Email" aparece "Ese email ya está registrado. Inicia sesión en su lugar."

#### Scenario: Errores de longitud y formato en pantalla

- **WHEN** el servidor rechaza el registro por un email inválido o una contraseña demasiado corta o larga
- **THEN** bajo el campo correspondiente aparece "Introduce una dirección de email válida.", "la contraseña debe tener al menos 8 caracteres." o "la contraseña no puede superar los 32 caracteres."

#### Scenario: Servidor inaccesible

- **WHEN** el servidor no responde al enviar un formulario
- **THEN** aparece el aviso "No se pudo conectar con el servidor. Comprueba que el backend está arrancado."

#### Scenario: Error inesperado del servidor

- **WHEN** el servidor responde con un error distinto de validación, credenciales o autorización
- **THEN** aparece el aviso "Algo ha ido mal en el servidor. Inténtalo de nuevo en un momento."

### Requirement: Sesión persistente en el navegador

La aplicación web SHALL recordar la sesión en el navegador entre recargas y visitas. Al abrir la aplicación con una sesión recordada, SHALL comprobar con el servidor que sigue siendo válida antes de mostrar contenido protegido, y mientras lo comprueba SHALL mostrar una pantalla de carga en lugar de redirigir.

#### Scenario: Recargar con sesión válida

- **WHEN** una persona con sesión iniciada recarga la página del perfil
- **THEN** ve brevemente la pantalla de carga y después su perfil, sin pasar por `/login`

#### Scenario: Sesión rechazada por el servidor

- **WHEN** se abre la aplicación con una sesión recordada que el servidor ya no reconoce
- **THEN** la sesión se olvida, la persona acaba en `/login` y ve el aviso "Tu sesión ha caducado. Vuelve a iniciar sesión."

#### Scenario: Servidor caído al restaurar la sesión

- **WHEN** se abre la aplicación con una sesión recordada y el servidor no responde
- **THEN** la persona acaba en `/login` con el aviso "No se pudo conectar con el servidor. Comprueba que el backend está arrancado.", y la sesión recordada se conserva, de modo que al recargar con el servidor ya arrancado vuelve a entrar sin escribir credenciales

#### Scenario: El aviso desaparece al volver a entrar

- **WHEN** la persona ve un aviso de sesión perdida en `/login` e inicia sesión correctamente
- **THEN** el aviso desaparece y la persona ve su perfil

### Requirement: Protección de pantallas según la sesión

La aplicación web SHALL permitir ver `/profile` solo con una sesión iniciada; sin ella, SHALL llevar a la persona a `/login`. Con la sesión iniciada, `/login` y `/register` SHALL llevar a `/profile`. Cualquier otra dirección SHALL llevar a `/profile`, y desde ahí se aplican las mismas reglas.

#### Scenario: Perfil sin sesión

- **WHEN** una persona sin sesión abre `/profile`
- **THEN** acaba en `/login`

#### Scenario: Login con sesión

- **WHEN** una persona con sesión iniciada abre `/login` o `/register`
- **THEN** acaba en `/profile`

#### Scenario: Dirección desconocida

- **WHEN** se abre una dirección que no existe, como `/` o `/cualquier-cosa`
- **THEN** la persona acaba en `/profile` si tiene sesión, o en `/login` si no

### Requirement: Pantalla de perfil

La aplicación web SHALL mostrar en `/profile` las iniciales del usuario en un círculo, su nombre completo (o "Sin nombre" si no tiene), su email, la fecha de alta como "Miembro desde" en formato largo en castellano (por ejemplo, "18 de noviembre de 2026") y un botón "Cerrar sesión".

#### Scenario: Ver el perfil

- **WHEN** una persona con sesión iniciada está en `/profile`
- **THEN** ve sus iniciales, su nombre, su email y "Miembro desde" con la fecha de alta

### Requirement: Cerrar sesión desde la aplicación

Al pulsar "Cerrar sesión", la aplicación web SHALL olvidar la sesión en el navegador y llevar a la persona a `/login` aunque el servidor no pueda revocar el token, y SHALL pedir al servidor que lo revoque.

#### Scenario: Cerrar sesión

- **WHEN** la persona pulsa "Cerrar sesión" en su perfil
- **THEN** acaba en `/login`, sin ningún aviso de error, y al recargar sigue sin sesión

#### Scenario: Cerrar sesión con el servidor caído

- **WHEN** la persona pulsa "Cerrar sesión" y el servidor no responde
- **THEN** acaba igualmente en `/login` sin ver ningún error
