/**
 * Provides a standard page wrapper applying the app-shell and page CSS classes for non-landing views. Used by shop, vendor, and driver pages for consistent layout.
 * @name Shivum Arora
 * @date 2026-06-11
 */
export default function AppPage({ children, className = '', style }) {
  return (
    <div className={`app-shell page ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}
