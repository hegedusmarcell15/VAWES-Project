import { useCatalog } from '../CatalogContext.jsx'
import { useLanguage } from '../LanguageContext.jsx'
import Icon from './Icon.jsx'
import { useAuth } from '../AuthContext.jsx'
import { useNavigate } from 'react-router-dom'

export default function FavoriteButton({ song, className = '' }) {
  const { favorites, favoriteError, toggleFavorite } = useCatalog()
  const { user } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const isFavorite = favorites.some((id) => String(id) === String(song.id))
  const label = isFavorite ? t('removeFavorite') : t('addFavorite')
  return (
    <button
      type="button"
      className={`favorite-button ${isFavorite ? 'is-favorite' : ''} ${className}`}
      aria-label={`${label}: ${song.title}`}
      aria-pressed={isFavorite}
      title={!user ? t('signInToSave') : undefined}
      onClick={(event) => {
        event.stopPropagation()
        if (!user) {
          navigate('/login')
          return
        }
        toggleFavorite(song.id)
      }}
    >
      <Icon name="heart" size={17} />
      {favoriteError && <span className="sr-only" role="alert">{favoriteError}</span>}
    </button>
  )
}
