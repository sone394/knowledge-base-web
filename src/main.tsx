import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { AuthProvider } from './context/AuthContext'
import { EncryptionProvider } from './context/EncryptionContext'
import { ThemeProvider } from './context/ThemeContext'
import { getRouterBasename } from './lib/getRouterBasename'
import { initOutboxSync } from './lib/outbox'
import { queryKeys } from './hooks/queryKeys'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

initOutboxSync(() => {
  void queryClient.invalidateQueries({ queryKey: queryKeys.notes.all })
})

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    void updateSW(true)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={getRouterBasename()}>
        <ThemeProvider>
          <AuthProvider>
            <EncryptionProvider>
              <App />
            </EncryptionProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
