/** Standard wrapper for non-landing app pages */
export default function AppPage({ children, className = '', style }) {
  return (
    <div className={`app-shell page ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}
