#!/bin/bash
# ============================================================
# Script de estructura - Sistema de Laboratorios USO2026
# Ejecutar desde la carpeta: frontend/
# Comando: bash setup-estructura.sh
# ============================================================

echo "🚀 Creando estructura del proyecto..."

# ── COMPONENTS ──────────────────────────────────────────────
mkdir -p src/components/ui
mkdir -p src/components/layout
mkdir -p src/components/shared

touch src/components/ui/Button.tsx
touch src/components/ui/Modal.tsx
touch src/components/ui/Badge.tsx
touch src/components/ui/Input.tsx
touch src/components/ui/index.ts

touch src/components/layout/Sidebar.tsx
touch src/components/layout/Navbar.tsx
touch src/components/layout/MainLayout.tsx
touch src/components/layout/index.ts

touch src/components/shared/LabCard.tsx
touch src/components/shared/EvaluacionCard.tsx
touch src/components/shared/ReservacionCard.tsx
touch src/components/shared/index.ts

# ── PAGES ────────────────────────────────────────────────────
mkdir -p src/pages/admin
mkdir -p src/pages/estudiante
mkdir -p src/pages/auth

touch src/pages/admin/Dashboard.tsx
touch src/pages/admin/Laboratorios.tsx
touch src/pages/admin/Reservaciones.tsx
touch src/pages/admin/Evaluaciones.tsx
touch src/pages/admin/Usuarios.tsx
touch src/pages/admin/Reportes.tsx
touch src/pages/admin/index.ts

touch src/pages/estudiante/Dashboard.tsx
touch src/pages/estudiante/Reservar.tsx
touch src/pages/estudiante/Evaluaciones.tsx
touch src/pages/estudiante/Mensajes.tsx
touch src/pages/estudiante/Perfil.tsx
touch src/pages/estudiante/index.ts

touch src/pages/auth/Login.tsx
touch src/pages/auth/index.ts

# ── ROUTES ───────────────────────────────────────────────────
mkdir -p src/routes

touch src/routes/AppRouter.tsx
touch src/routes/AdminRoutes.tsx
touch src/routes/EstudianteRoutes.tsx
touch src/routes/ProtectedRoute.tsx

# ── CONTEXT ──────────────────────────────────────────────────
mkdir -p src/context

touch src/context/AuthContext.tsx
touch src/context/UserContext.tsx

# ── HOOKS ────────────────────────────────────────────────────
mkdir -p src/hooks

touch src/hooks/useAuth.ts
touch src/hooks/useReservaciones.ts
touch src/hooks/useEvaluaciones.ts
touch src/hooks/useLaboratorios.ts

# ── SERVICES ─────────────────────────────────────────────────
mkdir -p src/services

touch src/services/auth.service.ts
touch src/services/laboratorios.service.ts
touch src/services/reservaciones.service.ts
touch src/services/evaluaciones.service.ts
touch src/services/usuarios.service.ts

# ── TYPES ────────────────────────────────────────────────────
mkdir -p src/types

touch src/types/usuario.types.ts
touch src/types/laboratorio.types.ts
touch src/types/reservacion.types.ts
touch src/types/evaluacion.types.ts
touch src/types/auth.types.ts

# ── UTILS ────────────────────────────────────────────────────
mkdir -p src/utils

touch src/utils/formatDate.ts
touch src/utils/roleGuard.ts
touch src/utils/constants.ts

echo ""
echo "✅ Estructura creada exitosamente!"
echo ""
echo "📁 Resumen:"
echo "   src/components/  → ui/, layout/, shared/"
echo "   src/pages/       → admin/, estudiante/, auth/"
echo "   src/routes/      → AppRouter, AdminRoutes, EstudianteRoutes, ProtectedRoute"
echo "   src/context/     → AuthContext, UserContext"
echo "   src/hooks/       → useAuth, useReservaciones, useEvaluaciones, useLaboratorios"
echo "   src/services/    → auth, laboratorios, reservaciones, evaluaciones, usuarios"
echo "   src/types/       → usuario, laboratorio, reservacion, evaluacion, auth"
echo "   src/utils/       → formatDate, roleGuard, constants"
echo ""
echo "👉 Siguiente paso: implementar AppRouter.tsx y AuthContext.tsx"
