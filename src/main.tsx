import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { LayoutActionProvider } from './context/LayoutActionContext.tsx';
import { HeaderProvider } from './context/HeaderContext.tsx'; // Import HeaderProvider
import 'react-loading-skeleton/dist/skeleton.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <HeaderProvider> {/* Add HeaderProvider */}
          <LayoutActionProvider>
            <App />
            <Toaster position="bottom-center" />
          </LayoutActionProvider>
        </HeaderProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
