import React from 'react'
import ReactDOM from 'react-dom/client'
import { CustomToastProvider } from './components/custom-toast/CustomToast'
import { AuthProvider } from './context/AuthContext.tsx'
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from './config/authConfig';
import './index.css'
import App from './App.tsx'

const msalInstance = new PublicClientApplication(msalConfig);

msalInstance.initialize().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <AuthProvider>
          <App/>
          <CustomToastProvider />
        </AuthProvider>
      </MsalProvider>
    </React.StrictMode>,
  )
});