import React from 'react'
import ReactDOM from 'react-dom/client'
import { CustomToastProvider } from './components/custom-toast/CustomToast'
import { AuthProvider } from './context/AuthContext.tsx'
import './index.css'
import App from './App.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
     <App/>
     <CustomToastProvider />
    </AuthProvider>
  </React.StrictMode>,
)