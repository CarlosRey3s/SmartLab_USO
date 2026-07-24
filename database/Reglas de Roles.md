# Reglas de Roles en SmartLab_USO

A continuación se listan los roles requeridos para el sistema y cuáles ya se encuentran implementados a nivel de base de datos (en el tipo `rol_usuario_enum`):

- [x] Estudiante
- [x] Docente / Instructor
- [x] Coordinador
- [x] Administrador
- [x] Supervisor

---

## Detalles de Implementación

### Roles Implementados ✅
Estos roles ya existen en la base de datos y pueden ser asignados a los usuarios:
* **Estudiante**
* **Docente / Instructor**
* **Coordinador**
* **Administrador**
* **Supervisor**

---

## Especificación de Reglas por Rol (Frontend vs Backend)

A continuación se detalla cómo debe comportarse el sistema para cada rol, tanto en la capa visual (Frontend) como en la capa de seguridad (Backend).

### Coordinador
**Reglas del frontend**
- Puede acceder a las vistas de Dashboard, Calendario, Inventario, Espacios y Reportes.
- Al intentar crear una "Clase" o "Mantenimiento", la lista de laboratorios se filtra para mostrar **solo** los laboratorios que le pertenecen (donde su ID coincide con el dueño del laboratorio).
- Al crear una "Reserva", se le permite ver y seleccionar laboratorios de otros coordinadores.
- Puede crear y administrar nuevos espacios (laboratorios), asignándose visualmente a sí mismo como coordinador.
- Puede crear y agregar nuevos items al inventario, vinculándolos a sus laboratorios.
- En el buzón de sugerencias, la lista se filtra para mostrar únicamente los reportes o sugerencias relacionados a los laboratorios bajo su coordinación.

**Reglas en backend**
- Validar que, en peticiones para crear "Clase" o "Mantenimiento", el ID del usuario coincida estrictamente con el `coordinador_id` del laboratorio solicitado. Si no coincide, rechazar la petición.
- Si envía una petición de "Reserva" para un laboratorio que no es suyo, la actividad debe insertarse obligatoriamente con el estado `'pendiente'`, a la espera de la aprobación del coordinador dueño de ese espacio.
- Permitir la creación y edición de laboratorios (espacios), forzando o validando que el `coordinador_id` sea el del usuario actual (o de otro, si la lógica lo autoriza).
- Permitir agregar y editar items al inventario, validando que el laboratorio al que pertenecen dichos items esté bajo su coordinación.
- Al consultar el endpoint de sugerencias (GET), devolver únicamente los registros que correspondan a laboratorios donde el solicitante sea el `coordinador_id`.

### Administrador
**Reglas del frontend**
- Acceso total a absolutamente todas las vistas del sistema.
- En los formularios de creación y gestión, puede ver y seleccionar cualquier laboratorio o recurso sin filtros de propiedad.
- Al crear un nuevo espacio (laboratorio), tiene la capacidad de buscar y asignarle dicho espacio a cualquier usuario con rol de "Coordinador".
- Tiene acceso total a la bandeja de sugerencias, pudiendo visualizar los reportes de todos los espacios y laboratorios de la universidad sin ninguna restricción.

**Reglas en backend**
- Acceso total a todos los endpoints (`GET`, `POST`, `PUT`, `DELETE`).
- Sus acciones de creación o reserva se guardan automáticamente como `'aprobada'` y se ejecutan sin restricciones de pertenencia de laboratorios.
- Permitir la creación de laboratorios recibiendo el parámetro `coordinador_id` y validando que el usuario asignado tenga efectivamente el rol de `coordinador`.
- Al consultar el endpoint de sugerencias (GET), devolver absolutamente todos los registros sin aplicar ningún filtro por coordinador o laboratorio.

### Docente / Instructor
**Reglas del frontend**
- Acceso a las vistas de Calendario para ver horarios y solicitar espacios.
- No puede ver ni acceder a las opciones de administración de Espacios, Inventario o Reportes avanzados.
- Solo puede crear solicitudes para sus materias asignadas.
- Tiene habilitada la opción para enviar sugerencias y reportes mediante el buzón.

**Reglas en backend**
- Bloquear el acceso a endpoints de gestión de laboratorios (crear, editar, eliminar) y gestión de inventario (solo puede consumirlos, no administrarlos).
- Las reservas que intente crear deben ingresar siempre en estado `'pendiente'` y requerir aprobación del coordinador de ese laboratorio.
- Permitir acceso (POST) al endpoint de creación de sugerencias y reportes.

### Estudiante
**Reglas del frontend**
- Acceso restringido únicamente a vistas públicas como el Calendario y su vista de "Mis Reservas" o sugerencias.
- Solo puede enviar formularios para peticiones de tipo "Reserva" (se le ocultan las opciones de Clase o Mantenimiento).
- Tiene habilitada la opción para enviar sugerencias y reportes mediante el buzón.

**Reglas en backend**
- Rechazar cualquier petición a endpoints de administración (laboratorios, usuarios, reportes, inventario).
- Validar que el tipo de actividad que intente crear sea estrictamente `'reserva'`.
- Asignar automáticamente el estado `'pendiente'` a todas sus reservas insertadas en la base de datos.
- Permitir acceso (POST) al endpoint de creación de sugerencias y reportes.

### Supervisor
**Reglas del frontend**
- Visualización de áreas clave como Reportes, Calendario y estado de Mantenimientos.
- Todos los botones de "Crear", "Editar" o "Eliminar" en el sistema deben estar ocultos o deshabilitados (Vista de solo lectura).

**Reglas en backend**
- Restringir todos los endpoints que modifiquen datos (`POST`, `PUT`, `DELETE`).
- Permitir únicamente peticiones de tipo `GET` (lectura de datos) para propósitos de auditoría y monitoreo, validando su token de acceso.

---

## Tareas Pendientes por Rol (Checklist)

### Coordinador
- [x] **Frontend:** Ocultar en el selector de espacios los laboratorios que no le pertenecen (al crear clases o mantenimientos).
- [x] **Frontend:** Filtrar el buzón de sugerencias para mostrar solo los de sus laboratorios.
- [x] **Backend:** Validar que al crear clases o mantenimientos, el ID de usuario coincida con el `coordinador_id` del laboratorio.
- [x] **Backend:** Validar que las reservas en laboratorios ajenos queden en estado `'pendiente'`.
- [x] **Backend:** Filtrar peticiones GET de sugerencias según el `coordinador_id`.

### Administrador
- [x] **Frontend:** Habilitar la asignación de usuarios (rol coordinador) al momento de crear nuevos espacios.
- [x] **Backend:** Implementar la lógica para guardar correctamente el `coordinador_id` al crear laboratorios.
- [x] **Backend:** Eliminar cualquier restricción de filtrado al consultar sugerencias (acceso total).

### Docente / Instructor
- [x] **Frontend:** Ocultar las vistas de administración (Espacios, Inventarios).
- [x] **Frontend:** Habilitar el buzón de sugerencias en su interfaz.
- [x] **Backend:** Restringir el acceso a endpoints de modificación de laboratorios e inventarios.
- [x] **Backend:** Asegurar que todas sus reservas entren con estado `'pendiente'`.

### Estudiante
- [x] **Frontend:** Ocultar opciones de crear Clase o Mantenimiento (solo dejar Reserva).
- [x] **Frontend:** Habilitar el buzón de sugerencias en su interfaz.
- [x] **Backend:** Bloquear el acceso a cualquier endpoint de gestión administrativa.
- [x] **Backend:** Asegurar que toda actividad enviada sea tipo `'reserva'` y estado `'pendiente'`.

### Supervisor
- [x] **Base de Datos:** Añadir el rol de 'supervisor' al enumerado `rol_usuario_enum` en PostgreSQL.
- [x] **Frontend:** Construir o adaptar las vistas para que funcionen 100% en modo "solo lectura" (ocultar botones de crear/editar/eliminar).
- [x] **Backend:** Configurar los middlewares para rechazar peticiones POST, PUT y DELETE provenientes de este rol.

---

## Elementos y Tareas Faltantes (Checklist)

A continuación se listan características adicionales que aún deben desarrollarse o perfeccionarse en el sistema:

- [ ] **Alertas de ítems**: Implementar sistema de avisos para el inventario (ej. stock bajo o equipos dañados).
- [ ] **Notificaciones de reportes**: Envío de alertas cuando ingrese una nueva sugerencia o reporte al buzón.
- [ ] **Dar vida a los dashboards**: Conectar los paneles y gráficos del frontend con datos reales provenientes del backend para hacerlos dinámicos.
- [ ] **Calendario Responsive**: Adaptar la vista del calendario para que funcione y se visualice correctamente en dispositivos móviles.
- [ ] **Implementar Reglas de Roles en Backend**: Programar la seguridad y restricciones descritas en este documento dentro de Node.js.
- [ ] **Auditoría UI/UX**: Supervisar y probar correctamente el funcionamiento visual de todo el frontend para asegurar una experiencia de usuario fluida.

### Salvador Realizo estos cambios
- **Reportes - Nomenclatura**: Se sustituyó el término "Laboratorio" por "Espacio" en las métricas de uso.
- **Reportes - Años Dinámicos**: Se configuró la lista de años para generarse de forma dinámica (desde 2024 hasta dos años en el futuro).
- **Reportes - Filtro Multi-selección**: Se reemplazó el menú tradicional por un dropdown interactivo con *checkboxes*, permitiendo filtrar e integrar estadísticas de varios espacios al mismo tiempo.
- **Bandeja de Sugerencias - Mejoras Visuales**: Se actualizó el diseño de la lista añadiendo *hover effects*, avatares con iniciales de usuario y limpieza de emojis innecesarios.
- **Estandarización de Filtros (UI)**: Se estandarizó el menú de filtros en la Bandeja y Reportes al formato utilizado en Inventario (Botón flotante con dropdown). Se incluyó lógica de cierre al hacer clic fuera (*click-outside*).
- **Inventario - Limpieza**: Se removió el filtro de "Letra Inicial" para optimizar la interfaz y evitar redundancia.
- **Correcciones**: Se solventaron conflictos CSS de la clase `.btn-filter` y se reparó un *Type Mismatch* en TypeScript respecto a la validación de roles y espacios.
- **Seguridad en Rutas**: Se bloqueó el acceso manual a la vista de `/admin/usuarios` protegiéndola en `AppRouter.tsx` de forma exclusiva para el rol de administrador.
- **Inventario - Limpieza UI**: Se removió el encabezado de título redundante, y se trasladó el botón de ordenamiento (Asc/Desc) al interior del menú desplegable de "Filtros" para compactar la barra de búsqueda.
- **Seguridad UI (Supervisor)**: Se implementó la restricción `readOnly` para ocultar automáticamente los botones "+ Item" en las vistas de **Inventario** y **Espacios** al navegar bajo el rol de Supervisor.
# Reglas de Roles en SmartLab_USO

A continuación se listan los roles requeridos para el sistema y cuáles ya se encuentran implementados a nivel de base de datos (en el tipo `rol_usuario_enum`):

- [x] Estudiante
- [x] Docente / Instructor
- [x] Coordinador
- [x] Administrador
- [x] Supervisor

---

## Detalles de Implementación

### Roles Implementados ✅
Estos roles ya existen en la base de datos y pueden ser asignados a los usuarios:
* **Estudiante**
* **Docente / Instructor**
* **Coordinador**
* **Administrador**
* **Supervisor**

---

## Especificación de Reglas por Rol (Frontend vs Backend)

A continuación se detalla cómo debe comportarse el sistema para cada rol, tanto en la capa visual (Frontend) como en la capa de seguridad (Backend).

### Coordinador
**Reglas del frontend**
- Puede acceder a las vistas de Dashboard, Calendario, Inventario, Espacios y Reportes.
- Al intentar crear una "Clase" o "Mantenimiento", la lista de laboratorios se filtra para mostrar **solo** los laboratorios que le pertenecen (donde su ID coincide con el dueño del laboratorio).
- Al crear una "Reserva", se le permite ver y seleccionar laboratorios de otros coordinadores.
- Puede crear y administrar nuevos espacios (laboratorios), asignándose visualmente a sí mismo como coordinador.
- Puede crear y agregar nuevos items al inventario, vinculándolos a sus laboratorios.
- En el buzón de sugerencias, la lista se filtra para mostrar únicamente los reportes o sugerencias relacionados a los laboratorios bajo su coordinación.

**Reglas en backend**
- Validar que, en peticiones para crear "Clase" o "Mantenimiento", el ID del usuario coincida estrictamente con el `coordinador_id` del laboratorio solicitado. Si no coincide, rechazar la petición.
- Si envía una petición de "Reserva" para un laboratorio que no es suyo, la actividad debe insertarse obligatoriamente con el estado `'pendiente'`, a la espera de la aprobación del coordinador dueño de ese espacio.
- Permitir la creación y edición de laboratorios (espacios), forzando o validando que el `coordinador_id` sea el del usuario actual (o de otro, si la lógica lo autoriza).
- Permitir agregar y editar items al inventario, validando que el laboratorio al que pertenecen dichos items esté bajo su coordinación.
- Al consultar el endpoint de sugerencias (GET), devolver únicamente los registros que correspondan a laboratorios donde el solicitante sea el `coordinador_id`.

### Administrador
**Reglas del frontend**
- Acceso total a absolutamente todas las vistas del sistema.
- En los formularios de creación y gestión, puede ver y seleccionar cualquier laboratorio o recurso sin filtros de propiedad.
- Al crear un nuevo espacio (laboratorio), tiene la capacidad de buscar y asignarle dicho espacio a cualquier usuario con rol de "Coordinador".
- Tiene acceso total a la bandeja de sugerencias, pudiendo visualizar los reportes de todos los espacios y laboratorios de la universidad sin ninguna restricción.

**Reglas en backend**
- Acceso total a todos los endpoints (`GET`, `POST`, `PUT`, `DELETE`).
- Sus acciones de creación o reserva se guardan automáticamente como `'aprobada'` y se ejecutan sin restricciones de pertenencia de laboratorios.
- Permitir la creación de laboratorios recibiendo el parámetro `coordinador_id` y validando que el usuario asignado tenga efectivamente el rol de `coordinador`.
- Al consultar el endpoint de sugerencias (GET), devolver absolutamente todos los registros sin aplicar ningún filtro por coordinador o laboratorio.

### Docente / Instructor
**Reglas del frontend**
- Acceso a las vistas de Calendario para ver horarios y solicitar espacios.
- No puede ver ni acceder a las opciones de administración de Espacios, Inventario o Reportes avanzados.
- Solo puede crear solicitudes para sus materias asignadas.
- Tiene habilitada la opción para enviar sugerencias y reportes mediante el buzón.

**Reglas en backend**
- Bloquear el acceso a endpoints de gestión de laboratorios (crear, editar, eliminar) y gestión de inventario (solo puede consumirlos, no administrarlos).
- Las reservas que intente crear deben ingresar siempre en estado `'pendiente'` y requerir aprobación del coordinador de ese laboratorio.
- Permitir acceso (POST) al endpoint de creación de sugerencias y reportes.

### Estudiante
**Reglas del frontend**
- Acceso restringido únicamente a vistas públicas como el Calendario y su vista de "Mis Reservas" o sugerencias.
- Solo puede enviar formularios para peticiones de tipo "Reserva" (se le ocultan las opciones de Clase o Mantenimiento).
- Tiene habilitada la opción para enviar sugerencias y reportes mediante el buzón.

**Reglas en backend**
- Rechazar cualquier petición a endpoints de administración (laboratorios, usuarios, reportes, inventario).
- Validar que el tipo de actividad que intente crear sea estrictamente `'reserva'`.
- Asignar automáticamente el estado `'pendiente'` a todas sus reservas insertadas en la base de datos.
- Permitir acceso (POST) al endpoint de creación de sugerencias y reportes.

### Supervisor
**Reglas del frontend**
- Visualización de áreas clave como Reportes, Calendario y estado de Mantenimientos.
- Todos los botones de "Crear", "Editar" o "Eliminar" en el sistema deben estar ocultos o deshabilitados (Vista de solo lectura).

**Reglas en backend**
- Restringir todos los endpoints que modifiquen datos (`POST`, `PUT`, `DELETE`).
- Permitir únicamente peticiones de tipo `GET` (lectura de datos) para propósitos de auditoría y monitoreo, validando su token de acceso.

---

## Tareas Pendientes por Rol (Checklist)

### Coordinador
- [x] **Frontend:** Ocultar en el selector de espacios los laboratorios que no le pertenecen (al crear clases o mantenimientos).
- [x] **Frontend:** Filtrar el buzón de sugerencias para mostrar solo los de sus laboratorios.
- [x] **Backend:** Validar que al crear clases o mantenimientos, el ID de usuario coincida con el `coordinador_id` del laboratorio.
- [x] **Backend:** Validar que las reservas en laboratorios ajenos queden en estado `'pendiente'`.
- [x] **Backend:** Filtrar peticiones GET de sugerencias según el `coordinador_id`.

### Administrador
- [x] **Frontend:** Habilitar la asignación de usuarios (rol coordinador) al momento de crear nuevos espacios.
- [x] **Backend:** Implementar la lógica para guardar correctamente el `coordinador_id` al crear laboratorios.
- [x] **Backend:** Eliminar cualquier restricción de filtrado al consultar sugerencias (acceso total).

### Mejoras Adicionales Recientes
- [x] **Frontend (Inventario):** Inclusión de botón de cierre y unidades de medida dinámicas según la categoría en modal "Agregar Ítem".
- [x] **Frontend (Usuarios):** Restricción del campo Expediente a solo números, inclusión de placeholders y ajustes de contraste CSS en el modal "Agregar Usuario".
- [x] **Frontend (Reportes):** Implementación de la funcionalidad "Exportar a Excel" utilizando la librería `xlsx`, reemplazando la generación de PDF.

### Docente / Instructor
- [x] **Frontend:** Ocultar las vistas de administración (Espacios, Inventarios).
- [x] **Frontend:** Habilitar el buzón de sugerencias en su interfaz.
- [x] **Backend:** Restringir el acceso a endpoints de modificación de laboratorios e inventarios.
- [x] **Backend:** Asegurar que todas sus reservas entren con estado `'pendiente'`.

### Estudiante
- [x] **Frontend:** Ocultar opciones de crear Clase o Mantenimiento (solo dejar Reserva).
- [x] **Frontend:** Habilitar el buzón de sugerencias en su interfaz.
- [x] **Backend:** Bloquear el acceso a cualquier endpoint de gestión administrativa.
- [x] **Backend:** Asegurar que toda actividad enviada sea tipo `'reserva'` y estado `'pendiente'`.

### Supervisor
- [x] **Base de Datos:** Añadir el rol de 'supervisor' al enumerado `rol_usuario_enum` en PostgreSQL.
- [x] **Frontend:** Construir o adaptar las vistas para que funcionen 100% en modo "solo lectura" (ocultar botones de crear/editar/eliminar).
- [x] **Backend:** Configurar los middlewares para rechazar peticiones POST, PUT y DELETE provenientes de este rol.

---

## Elementos y Tareas Faltantes (Checklist)

A continuación se listan características adicionales que aún deben desarrollarse o perfeccionarse en el sistema:

- [ ] **Alertas de ítems**: Implementar sistema de avisos para el inventario (ej. stock bajo o equipos dañados).
- [ ] **Notificaciones de reportes**: Envío de alertas cuando ingrese una nueva sugerencia o reporte al buzón.
- [ ] **Dar vida a los dashboards**: Conectar los paneles y gráficos del frontend con datos reales provenientes del backend para hacerlos dinámicos.
- [ ] **Calendario Responsive**: Adaptar la vista del calendario para que funcione y se visualice correctamente en dispositivos móviles.
- [ ] **Implementar Reglas de Roles en Backend**: Programar la seguridad y restricciones descritas en este documento dentro de Node.js.
- [ ] **Auditoría UI/UX**: Supervisar y probar correctamente el funcionamiento visual de todo el frontend para asegurar una experiencia de usuario fluida.

### Salvador Realizo estos cambios
- **Reportes - Nomenclatura**: Se sustituyó el término "Laboratorio" por "Espacio" en las métricas de uso.
- **Reportes - Años Dinámicos**: Se configuró la lista de años para generarse de forma dinámica (desde 2024 hasta dos años en el futuro).
- **Reportes - Filtro Multi-selección**: Se reemplazó el menú tradicional por un dropdown interactivo con *checkboxes*, permitiendo filtrar e integrar estadísticas de varios espacios al mismo tiempo.
- **Bandeja de Sugerencias - Mejoras Visuales**: Se actualizó el diseño de la lista añadiendo *hover effects*, avatares con iniciales de usuario y limpieza de emojis innecesarios.
- **Estandarización de Filtros (UI)**: Se estandarizó el menú de filtros en la Bandeja y Reportes al formato utilizado en Inventario (Botón flotante con dropdown). Se incluyó lógica de cierre al hacer clic fuera (*click-outside*).
- **Inventario - Limpieza**: Se removió el filtro de "Letra Inicial" para optimizar la interfaz y evitar redundancia.
- **Correcciones**: Se solventaron conflictos CSS de la clase `.btn-filter` y se reparó un *Type Mismatch* en TypeScript respecto a la validación de roles y espacios.
- **Seguridad en Rutas**: Se bloqueó el acceso manual a la vista de `/admin/usuarios` protegiéndola en `AppRouter.tsx` de forma exclusiva para el rol de administrador.
- **Inventario - Limpieza UI**: Se removió el encabezado de título redundante, y se trasladó el botón de ordenamiento (Asc/Desc) al interior del menú desplegable de "Filtros" para compactar la barra de búsqueda.
- **Seguridad UI (Supervisor)**: Se implementó la restricción `readOnly` para ocultar automáticamente los botones "+ Item" en las vistas de **Inventario** y **Espacios** al navegar bajo el rol de Supervisor.
- **Reportes - Resolución de Conflictos CSS**: Se independizó la clase de menú desplegable en la bandeja creando `.reports-filter-dropdown-menu` para evitar desbordes en los bordes de la pantalla.
- **Reportes - Optimización Móvil**: Se corrigió el apilamiento roto de los avatares e información de usuarios en pantallas de celular, y se redujeron significativamente los `paddings` (márgenes blancos) de los contenedores para aprovechar toda la pantalla.
- **Integración de Autenticación con Microsoft (SSO)**: Se implementó un flujo completo de inicio de sesión con cuentas institucionales de Microsoft.
  - El sistema detecta automáticamente si el usuario ya existe (lo inicia sesión directamente) o si es nuevo (le pide completar su `Expediente` y `Rol` antes de registrarlo).
  - Se configuró la modalidad de redirección completa (`loginRedirect` y `logoutRedirect`) para evitar bloqueos por ventanas emergentes (popups) en el navegador.
- **Librerías utilizadas para Microsoft SSO**: 
  - En el **Frontend** (directorio `/frontend`), se instalaron `@azure/msal-browser` y `@azure/msal-react` mediante `npm install @azure/msal-browser @azure/msal-react`. Estas manejan toda la conexión segura y el estado de la sesión con Azure AD.
  - En el **Backend** (directorio `/backend`), se instaló `axios` mediante `npm install axios` para realizar consultas de servidor a servidor hacia la *Microsoft Graph API* y validar la autenticidad de los tokens de forma segura.

---

## Seguridad (Implementación Microsoft SSO)

El nivel de seguridad de la integración del Single Sign-On (SSO) con Microsoft es de **Nivel Institucional/Empresarial**, construido bajo los estándares más estrictos de ciberseguridad:

1. **Doble Verificación (Zero-Trust Backend)**
   - El sistema no confía en el token proporcionado por el frontend. El Backend (Node.js) intercepta el token y realiza una consulta directa de servidor a servidor hacia la **Microsoft Graph API**. Si el token fue manipulado o inventado, Microsoft lo rechaza instantáneamente y nuestro servidor deniega el acceso.
2. **Cero Almacenamiento de Contraseñas**
   - El sistema jamás tiene acceso, ni visualiza, ni almacena las contraseñas institucionales de los usuarios. Toda la autenticación ocurre de forma nativa en los servidores de Microsoft (`login.microsoftonline.com`), garantizando que ante cualquier vulneración de nuestra base de datos, las credenciales permanecerán a salvo.
3. **Protocolo OAuth 2.0 con PKCE**
   - Se utiliza el estándar OAuth 2.0 con encriptación **PKCE** (Proof Key for Code Exchange) a través de la librería `@azure/msal-browser`, previniendo ataques de interceptación de sesión.
4. **Emisión de JWT Propio (Autonomía)**
   - Tras la verificación exitosa de Microsoft, el sistema corta la dependencia externa para esa sesión y emite su propio token de seguridad encriptado (`jsonwebtoken`). Esto permite que la aplicación continúe funcionando sin interrupciones incluso si los servicios de validación de Microsoft sufren caídas momentáneas.
5. **Protección Cross-Origin (SSO Redireccional)**
   - Se implementó la modalidad `loginRedirect` en lugar de *popups*, aislando todo el proceso en el entorno seguro del navegador y mitigando vulnerabilidades de inyección de código (ataques Cross-Origin).
6. **Hardcoding Seguro de Privilegios (Nivel Admin)**
   - El backend contiene un escudo anti-escalada de privilegios ("Doble Candado"). Durante el registro de Microsoft SSO, el servidor obliga estrictamente el rol de **Administrador** a las cuentas: `pg21i04001@usonsonate.edu.sv`, `rc21i04001@usonsonate.edu.sv` y `dm18i04001@usonsonate.edu.sv`. Si cualquier otro usuario intenta inyectar el rol "administrador" desde el frontend modificando el código de la página, el backend detecta el correo no autorizado y cancela la operación lanzando un error de privilegios.
