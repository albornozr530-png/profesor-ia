// Búsqueda web gratuita sin API keys: DuckDuckGo + Wikipedia (fallback)

async function fetchWithTimeout(url, opts = {}, ms = 10000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...opts, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function duckduckgo(query) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
  const res = await fetchWithTimeout(url)
  if (!res.ok) return null
  const data = await res.json()
  const results = []
  if (data.AbstractText) {
    results.push({ title: data.Heading || query, snippet: data.AbstractText, url: data.AbstractURL })
  }
  for (const t of (data.RelatedTopics || [])) {
    if (t.Text && t.FirstURL) {
      results.push({ title: t.Text.slice(0, 80), snippet: t.Text, url: t.FirstURL })
    }
    if (results.length >= 5) break
  }
  return results.length ? results : null
}

async function wikipedia(query) {
  const url = `https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=3&origin=*`
  const res = await fetchWithTimeout(url)
  if (!res.ok) return null
  const data = await res.json()
  const hits = data?.query?.search || []
  return hits.length
    ? hits.map((h) => ({
        title: h.title,
        snippet: (h.snippet || '').replace(/<[^>]+>/g, ''),
        url: `https://es.wikipedia.org/wiki/${encodeURIComponent(h.title.replace(/ /g, '_'))}`,
      }))
    : null
}

export async function webSearch(query) {
  const errors = []
  try {
    const ddg = await duckduckgo(query)
    if (ddg) return { engine: 'duckduckgo', results: ddg }
  } catch (e) { errors.push(`ddg: ${e.message}`) }
  try {
    const wiki = await wikipedia(query)
    if (wiki) return { engine: 'wikipedia', results: wiki }
  } catch (e) { errors.push(`wiki: ${e.message}`) }
  if (errors.length) console.warn('[search] fallos:', errors.join(' | '))
  return null
}
