import { useEffect } from 'react'
import { useLocation } from 'react-router'

const SITE_NAME = 'ASM Asset Management'
const BASE_URL = 'https://www.asmcoins.com'

interface PageMetaProps {
  title: string
  description: string
  /** Additional JSON-LD structured data to inject (object or array of objects) */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

/**
 * Sets `<title>`, `<meta name="description">`, and `<link rel="canonical">`
 * for the current page. Optionally injects JSON-LD structured data.
 *
 * Uses direct DOM manipulation so it works without a head manager dependency
 * (react-helmet-async, etc.). Cleans up on unmount.
 */
export function PageMeta({ title, description, jsonLd }: PageMetaProps) {
  const { pathname } = useLocation()
  const fullTitle = `${title} — ${SITE_NAME}`
  const canonicalUrl = `${BASE_URL}${pathname}`

  useEffect(() => {
    // Title
    document.title = fullTitle

    // Description
    let metaDesc = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]'
    )
    if (metaDesc) {
      metaDesc.content = description
    } else {
      metaDesc = document.createElement('meta')
      metaDesc.name = 'description'
      metaDesc.content = description
      document.head.appendChild(metaDesc)
    }

    // Canonical
    let canonical = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]'
    )
    if (canonical) {
      canonical.href = canonicalUrl
    } else {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      canonical.href = canonicalUrl
      document.head.appendChild(canonical)
    }

    // JSON-LD
    const scripts: HTMLScriptElement[] = []
    if (jsonLd) {
      const items = Array.isArray(jsonLd) ? jsonLd : [jsonLd]
      for (const item of items) {
        const script = document.createElement('script')
        script.type = 'application/ld+json'
        script.textContent = JSON.stringify(item)
        document.head.appendChild(script)
        scripts.push(script)
      }
    }

    return () => {
      for (const s of scripts) s.remove()
    }
  }, [fullTitle, description, canonicalUrl, jsonLd])

  return null
}
