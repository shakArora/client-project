/**
 * Minimal page wrapper applying the standard app-shell layout class to non-landing views.
 * Keeps authenticated and transactional pages visually consistent with the main application chrome.
 * @author Shivum Arora
 * @date 6/11/2026
 */
export default function AppPage({ children, className = '', style }) {
  return (
    <div className={`app-shell page ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}
