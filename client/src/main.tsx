import { ConfigProvider, App } from 'antd'
import { createRoot } from 'react-dom/client'
import './styles/app.css'
import { deskTheme } from './theme.ts'
import DeskPage from './features/desk/DeskPage.tsx'

createRoot(document.getElementById('root')!).render(
  <ConfigProvider theme={deskTheme}>
    <App>
      <DeskPage />
    </App>
  </ConfigProvider>,
)
