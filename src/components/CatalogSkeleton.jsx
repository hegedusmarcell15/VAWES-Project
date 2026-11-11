export default function CatalogSkeleton({ rows = 5 }) {
  return (
    <div className="catalog-skeleton" aria-hidden="true">
      <span className="skeleton-line skeleton-heading" />
      {Array.from({ length: rows }, (_, index) => (
        <span className="skeleton-line skeleton-row" key={index} />
      ))}
    </div>
  )
}
