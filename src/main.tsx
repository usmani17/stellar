import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import './index.css'
import App from './App.tsx'

const domain = import.meta.env.VITE_AUTH0_DOMAIN || 'dev-ref1nkyj5ron62lv.us.auth0.com'
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID || 'n3XpJ44mcNUUM5doxy5CB1rWCGRH0M25'
const audience = import.meta.env.VITE_AUTH0_AUDIENCE || undefined
const redirectUri = import.meta.env.VITE_AUTH0_REDIRECT_URI || `${window.location.origin}/callback`

// Build authorization params - only include audience if it's set
const authorizationParams: { redirect_uri: string; audience?: string } = {
  redirect_uri: redirectUri,
}
if (audience) {
  authorizationParams.audience = audience
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={authorizationParams}
      useRefreshTokens={true}
      cacheLocation="localstorage"
    >
      <App />
    </Auth0Provider>
  </StrictMode>,
)
