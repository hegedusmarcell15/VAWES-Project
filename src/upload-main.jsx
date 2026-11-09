import { createRoot } from 'react-dom/client'
import UploadPage from './UploadPage.jsx'
import { CatalogProvider } from './CatalogContext.jsx'
import { LanguageProvider } from './LanguageContext.jsx'
import './glass.css'
import './upload.css'

createRoot(document.getElementById('root')).render(
  <CatalogProvider>
    <LanguageProvider>
      <UploadPage />
    </LanguageProvider>
  </CatalogProvider>
)
