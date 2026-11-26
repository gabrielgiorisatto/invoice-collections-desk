import { createRoot } from 'react-dom/client'
import './styles/app.css'
import DeskPage from './features/desk/DeskPage.tsx'

createRoot(document.getElementById('root')!).render(<DeskPage />)
