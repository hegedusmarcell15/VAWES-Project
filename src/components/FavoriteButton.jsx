import { useCatalog } from '../CatalogContext.jsx'
import { useLanguage } from '../LanguageContext.jsx'
import Icon from './Icon.jsx'

export default function FavoriteButton({ song, className = '' }) {
  const { favorites, toggleFavorite } = useCatalog()
  const { t } = useLanguage()
  const isFavorite = favorites.includes(song.id)
  const label = isFavorite ? t('removeFavorite') : t('addFavorite')
  return (
    <button
      type="button"
      className={`favorite-button ${isFavorite ? 'is-favorite' : ''} ${className}`}
      aria-label={`${label}: ${song.title}`}
      aria-pressed={isFavorite}
      onClick={(event) => {
        event.stopPropagation()
        toggleFavorite(song.id)
      }}
    >
      <Icon name="heart" size={17} />
    </button>
  )
}
