# Spec Delta

## MODIFIED Requirements

### Requirement: Pantalla de registro

La aplicación web SHALL ofrecer en `/register` un formulario con los campos "Nombre completo (opcional)", "Email", "Contraseña" (con la pista "Entre 8 y 32 caracteres.") y "Repite la contraseña", un botón "Crear cuenta" y un enlace "Inicia sesión" que lleva a `/login`. Si el registro tiene éxito, la persona SHALL quedar con la sesión iniciada y ver la lista de tareas.

#### Scenario: Registro desde la pantalla

- **WHEN** la persona rellena el formulario con datos válidos y pulsa "Crear cuenta"
- **THEN** el botón muestra "Creando cuenta…" y queda desactivado mientras espera, y después la persona ve la lista de tareas en `/tasks`

#### Scenario: Contraseñas distintas detectadas antes de enviar

- **WHEN** la contraseña y su repetición no coinciden y se pulsa "Crear cuenta"
- **THEN** bajo "Repite la contraseña" aparece "Las contraseñas no coinciden." y no se envía nada al servidor

#### Scenario: Nombre en blanco

- **WHEN** el nombre se deja vacío o solo con espacios
- **THEN** la cuenta se crea sin nombre y el perfil muestra "Sin nombre"

### Requirement: Pantalla de inicio de sesión

La aplicación web SHALL ofrecer en `/login` un formulario con "Email" y "Contraseña", un botón "Entrar" y un enlace "Crea una" que lleva a `/register`. Si el inicio de sesión tiene éxito, la persona SHALL ver la lista de tareas.

#### Scenario: Entrar desde la pantalla

- **WHEN** la persona escribe credenciales correctas y pulsa "Entrar"
- **THEN** el botón muestra "Entrando…" y queda desactivado mientras espera, y después la persona ve la lista de tareas en `/tasks`

#### Scenario: Credenciales incorrectas en pantalla

- **WHEN** la persona escribe un email o una contraseña que no son correctos
- **THEN** aparece arriba del formulario el aviso "El email o la contraseña no son correctos." y sigue en `/login`

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
- **THEN** el aviso desaparece y la persona ve la lista de tareas

### Requirement: Protección de pantallas según la sesión

La aplicación web SHALL permitir ver `/tasks` y `/profile` solo con una sesión iniciada; sin ella, SHALL llevar a la persona a `/login`. Con la sesión iniciada, `/login` y `/register` SHALL llevar a `/tasks`. Cualquier otra dirección SHALL llevar a `/tasks`, y desde ahí se aplican las mismas reglas.

#### Scenario: Perfil sin sesión

- **WHEN** una persona sin sesión abre `/profile` o `/tasks`
- **THEN** acaba en `/login`

#### Scenario: Login con sesión

- **WHEN** una persona con sesión iniciada abre `/login` o `/register`
- **THEN** acaba en `/tasks`

#### Scenario: Dirección desconocida

- **WHEN** se abre una dirección que no existe, como `/` o `/cualquier-cosa`
- **THEN** la persona acaba en `/tasks` si tiene sesión, o en `/login` si no

### Requirement: Pantalla de perfil

La aplicación web SHALL mostrar en `/profile` las iniciales del usuario en un círculo, su nombre completo (o "Sin nombre" si no tiene), su email, la fecha de alta como "Miembro desde" en formato largo en castellano (por ejemplo, "18 de noviembre de 2026"), un enlace para volver a la lista de tareas y un botón "Cerrar sesión".

#### Scenario: Ver el perfil

- **WHEN** una persona con sesión iniciada está en `/profile`
- **THEN** ve sus iniciales, su nombre, su email y "Miembro desde" con la fecha de alta

#### Scenario: Volver a la lista

- **WHEN** la persona pulsa el enlace a la lista de tareas desde su perfil
- **THEN** ve la lista de tareas en `/tasks`
