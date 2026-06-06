/**
 * Cloudflare Pages SPA 回退：子路径（/graph、/note/xxx 等）刷新时返回 index.html。
 * 与 public/_redirects 互为备份；_redirects 未生效时由本函数兜底。
 */
export const onRequest: PagesFunction = async (context) => {
  const response = await context.next()

  if (response.status !== 404) {
    return response
  }

  const url = new URL('/index.html', context.request.url)
  return context.env.ASSETS.fetch(url)
}
