#!/bin/bash
# ============================================================
# Script de estructura - Backend SmartLabs (Node.js + Express + PostgreSQL)
# Ejecutar desde la raíz del proyecto (fuera de frontend/)
# Comando: bash setup-backend.sh
# ============================================================

echo "🚀 Inicializando el backend..."

# Crear y entrar a la carpeta
mkdir -p backend
cd backend

# Inicializar proyecto Node
npm init -y

# Instalar dependencias principales (Express, PostgreSQL, CORS, Variables de entorno)
echo "📦 Instalando dependencias principales..."
npm install express pg cors dotenv

# Instalar dependencias de desarrollo para TypeScript
echo "🛠️ Instalando dependencias de desarrollo..."
npm install -D typescript ts-node nodemon @types/node @types/express @types/cors @types/pg

# Inicializar configuración de TypeScript
npx tsc --init

# Crear estructura de directorios
echo "📂 Creando carpetas..."
mkdir -p src/config
mkdir -p src/controllers
mkdir -p src/routes
mkdir -p src/middlewares
mkdir -p src/models
mkdir -p src/utils

# Crear archivos principales
touch src/index.ts
touch src/config/db.ts
touch .env
touch .gitignore

# Llenar el .gitignore básico
echo "node_modules/
dist/
.env" > .gitignore

echo ""
echo "✅ Estructura del backend creada exitosamente!"
echo "👉 Siguiente paso: Configurar la conexión a la base de datos y el servidor."