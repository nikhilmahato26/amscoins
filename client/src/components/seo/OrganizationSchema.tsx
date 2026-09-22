import { useEffect } from 'react'

/**
 * Injects the sitewide Organization/FinancialService JSON-LD once.
 * Place this inside App or the landing layout so it appears on every page.
 *
 * Operator-specific fields are marked with TODO placeholders — fill these
 * before going live.
 */

const ORGANIZATION_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FinancialService',
  name: 'ASM Asset Management',
  /* TODO: operator fills in registered legal name */
  legalName: '[REGISTERED LEGAL NAME]',
  url: 'https://www.asmcoins.com',
  logo: 'https://www.asmcoins.com/favicon.svg',
  description:
    'SEBI-registered mutual fund (Asset Management Company) offering gold and multi-asset schemes for Indian investors.',
  /* TODO: operator fills in founding year */
  foundingDate: '[YEAR]',
  address: {
    '@type': 'PostalAddress',
    /* TODO: operator fills in full address */
    streetAddress: '[REGISTERED OFFICE ADDRESS]',
    addressLocality: '[CITY]',
    addressRegion: '[STATE]',
    postalCode: '[PIN CODE]',
    addressCountry: 'IN',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    /* TODO: operator fills in phone */
    telephone: '[PHONE NUMBER]',
    contactType: 'customer service',
    availableLanguage: ['English', 'Hindi'],
  },
  sameAs: [
    /* TODO: operator fills in social profile URLs */
    // 'https://linkedin.com/company/...',
    // 'https://twitter.com/...',
  ],
  hasCredential: {
    '@type': 'GovernmentPermit',
    name: 'SEBI Mutual Fund Registration',
    issuedBy: {
      '@type': 'GovernmentOrganization',
      name: 'Securities and Exchange Board of India',
    },
    /* TODO: operator fills in SEBI registration number */
    identifier: '[MF/XXX]',
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
