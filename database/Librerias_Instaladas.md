# Librerías y Dependencias del Proyecto

A continuación, se detalla el listado de las librerías adicionales que se han integrado al proyecto para añadir nuevas funcionalidades (como el inicio de sesión con Microsoft y la exportación de reportes a Excel), indicando el entorno donde deben instalarse y el comando respectivo.

---

## 1. Entorno Frontend (Carpeta `/frontend`)

Estas librerías deben instalarse abriendo una terminal directamente dentro de la carpeta `frontend` de tu proyecto.

### A. Librerías de Microsoft SSO (Single Sign-On)
- **Nombres:** `@azure/msal-browser` y `@azure/msal-react`
- **¿Para qué sirven?** Se encargan de toda la conexión segura, el flujo de redirección y el manejo del estado de la sesión (cookies/tokens) para permitir a los usuarios iniciar sesión con sus cuentas institucionales de Microsoft (Azure AD).
- **Comando de instalación:**
  ```bash
  npm install @azure/msal-browser @azure/msal-react
  ```

### B. Librería para Exportación a Excel
- **Nombre:** `xlsx` (también conocida como SheetJS)
- **¿Para qué sirve?** Permite convertir dinámicamente cualquier tabla o listado de datos JSON (como la información filtrada en la sección de Reportes) en un archivo físico `.xlsx` para que el usuario lo pueda descargar.
- **Comando de instalación:**
  ```bash
  npm install xlsx
  ```

---

## 2. Entorno Backend (Carpeta `/backend`)

Estas librerías deben instalarse abriendo una terminal directamente dentro de la carpeta `backend` de tu proyecto.

### A. Librería para Peticiones HTTP de Servidor
- **Nombre:** `axios`
- **¿Para qué sirve?** Permite realizar consultas seguras de servidor a servidor. En este proyecto se utiliza específicamente para conectarse a la *Microsoft Graph API* y validar la autenticidad de los tokens de Microsoft sin depender exclusivamente de lo que envíe el cliente (frontend), añadiendo una capa de seguridad Zero-Trust.
- **Comando de instalación:**
  ```bash
  npm install axios
  ```
