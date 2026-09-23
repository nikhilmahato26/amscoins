import { useEffect } from 'react'

/**
 * Injects the sitewide Organization/FinancialService JSON-LD once.
 * Place this inside App or the landing layout so it appears on every page.
 *
 * Place this inside App or the landing layout so it appears on every page.
 */

const ORGANIZATION_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FinancialService',
  name: 'ASM Asset Management',
  legalName: 'ASM Asset Management Private Limited',
  url: 'https://www.asmcoins.com',
  logo: 'https://www.asmcoins.com/favicon.svg',
  description:
    'SEBI-registered mutual fund (Asset Management Company) offering gold and multi-asset schemes for Indian investors.',
  foundingDate: '2022',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '14th Floor, Tower B, Peninsula Business Park, Senapati Bapat Marg',
    addressLocality: 'Mumbai',
    addressRegion: 'Maharashtra',
    postalCode: '400013',
    addressCountry: 'IN',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+91-22-4890-7600',
    contactType: 'customer service',
    availableLanguage: ['English', 'Hindi'],
  },
  sameAs: [
    'https://linkedin.com/company/asm-asset-management',
    'https://twitter.com/asmcoins',
  ],
  hasCredential: {
    '@type': 'GovernmentPermit',
    name: 'SEBI Mutual Fund Registration',
    issuedBy: {
      '@type': 'GovernmentOrganization',
      name: 'Securities and Exchange Board of India',
    },
    identifier: 'MF/879/25/2',
  },
}

export function OrganizationSchema() {
  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(ORGANIZATION_JSONLD)
    document.head.appendChild(script)
    return () => { script.remove() }
  }, [])

  return null
}
