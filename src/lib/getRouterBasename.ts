const APP_ROUTE_SEGMENTS = new Set(['notes', 'note'])

/** GitHub Pages 项目站子路径；本地开发为 '' */
export function getRouterBasename(): string {
  if (import.meta.env.DEV) return ''

  const segments = window.location.pathname.split('/').filter(Boolean)
  if (segments.length === 0) return ''

  const first = segments[0]
  if (first === 'index.html') {
    return segments.length > 1 ? `/${segments[1]}` : ''
  }
  if (APP_ROUTE_SEGMENTS.has(first)) return ''

  return `/${first}`
}
