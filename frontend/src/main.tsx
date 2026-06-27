import React from 'react'
import ReactDOM from 'react-dom/client'

import './index.css' // ¡Crucial para que se vean los estilos de Tailwind!
import { AuthProvider } from './context/AuthContext.tsx'

import App from './App.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
     <App/>
    </AuthProvider>
  </React.StrictMode>,
)