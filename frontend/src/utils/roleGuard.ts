// frontend/src/utils/roleGuard.ts

// Definimos los tipos de roles tal cual están en la base de datos
export type UserRole = 'estudiante' | 'docente' | 'coordinador' | 'administrador' | 'supervisor';

/**
 * Validar si el usuario tiene acceso a las vistas administrativas principales
 * (Dashboard, Inventario, Espacios, Reportes).
 * Reglas: Coordinador, Administrador y Supervisor pueden acceder.
 * Docente y Estudiante no tienen acceso a estas vistas.
 */
export const canViewAdminPages = (role: UserRole): boolean => {
  return ['administrador', 'coordinador', 'supervisor'].includes(role);
};

/**
 * Validar si el usuario puede crear actividades de tipo "Clase" o "Mantenimiento".
 * Reglas: Estudiantes y Docentes solo pueden crear "Reservas". 
 * Coordinadores y Administradores pueden crear clases/mantenimiento.
 */
export const canCreateClassesOrMaintenance = (role: UserRole): boolean => {
  return ['administrador', 'coordinador'].includes(role);
};

/**
 * Validar si el usuario tiene una vista de "Solo Lectura".
 * Reglas: El Supervisor debe tener ocultos los botones de Crear/Editar/Eliminar.
 */
export const isReadOnlyView = (role: UserRole): boolean => {
  return role === 'supervisor';
};

/**
 * Validar si el usuario tiene acceso TOTAL y sin restricciones.
 * Reglas: El Administrador tiene acceso total a todos los laboratorios y sugerencias.
 */
export const isSuperAdmin = (role: UserRole): boolean => {
  return role === 'administrador';
};

/**
 * Validar si el usuario puede asignar responsables al crear un laboratorio.
 * Reglas: Solo el Administrador puede buscar y asignar espacios a coordinadores.
 */
export const canAssignSpaceCoordinator = (role: UserRole): boolean => {
  return role === 'administrador';
};

/**
 * Validar si un usuario sufre de "Filtros de Propiedad" en selectores.
 * Reglas: El Coordinador solo puede ver sus laboratorios en los selectores 
 * de "Clase", "Mantenimiento" y en la bandeja de "Sugerencias".
 */
export const isLimitedToOwnLaboratories = (role: UserRole): boolean => {
  return role === 'coordinador';
};

/**
 * Validar si el usuario requiere aprobación para sus reservas (estado 'pendiente').
 * Reglas: Docentes y Estudiantes siempre entran como pendiente. 
 * Coordinador requiere aprobación solo si el laboratorio es de otro coordinador.
 */
export const requiresReservationApproval = (role: UserRole): boolean => {
  return ['estudiante', 'docente', 'coordinador'].includes(role);
};
