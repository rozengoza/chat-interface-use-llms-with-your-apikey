import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './landing.css'
import Root from './Root'
import { Analytics } from "@vercel/analytics/react"


// Apply saved theme before first paint to avoid flash
const savedTheme = localStorage.getItem('arc_theme') ?? 'dark'
document.documentElement.setAttribute('data-theme', savedTheme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Analytics />
      <Root />
    </BrowserRouter>
  </StrictMode>,
)
