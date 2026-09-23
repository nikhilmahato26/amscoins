import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Link } from 'react-router'

import { PageMeta } from '@/components/seo/PageMeta'
import { MutualFundDisclaimer } from '@/components/seo/MutualFundDisclaimer'
import { cn } from '@/lib/utils'

import { PublicLayout } from './PublicLayout'

interface FaqItem {
  question: string
  answer: string
}

const FAQ_DATA: FaqItem[] = [
  {
    question: 'Is ASM Asset Management a legitimate, regulated company?',
    answer:
      'Yes. ASM Asset Management is registered with the Securities and Exchange Board of India (SEBI) as a Mutual Fund under the SEBI (Mutual Funds) Regulations, 1996. Registration No: MF/879/25/2. You can verify this independently on SEBI\'s website at sebi.gov.in under Intermediaries → Mutual Funds.',
  },
  {
    question: 'Who regulates ASM Asset Management?',
    answer:
      'ASM Asset Management is regulated by the Securities and Exchange Board of India (SEBI). All our mutual fund schemes comply with SEBI regulations, and we are subject to regular audits and inspections.',
  },
  {
    question: 'Are mutual fund returns guaranteed?',
    answer:
      'No. Mutual fund investments are subject to market risks. Returns are variable and depend on market conditions. Past performance does not guarantee future results. We never promise fixed or guaranteed returns. Read all scheme-related documents carefully before investing.',
  },
  {
    question: 'What schemes does ASM offer?',
    answer:
      'We currently offer two SEBI-compliant schemes: (1) ASM Gold Fund — an open-ended gold fund that invests in gold ETFs for long-term capital appreciation, and (2) ASM Multi-Asset Fund — an open-ended multi-asset allocation fund investing in equity, debt, and gold (minimum 10% each).',
  },
  {
    question: 'What is the minimum investment amount?',
    answer:
      'You can start a Systematic Investment Plan (SIP) from as low as ₹5000 per month. Lumpsum investments have a minimum of ₹5,000 per scheme. Check individual scheme pages for specific details.',
  },
  {
    question: 'How do I complete KYC?',
    answer:
      'KYC (Know Your Customer) verification is mandatory before your first investment, as required by SEBI. You need your PAN card, Aadhaar, and bank account details. The process is entirely online and typically takes a few minutes.',
  },
  {
    question: 'How do I redeem (withdraw) my investment?',
    answer:
      'You can place a redemption request through the app at any time for open-ended schemes. Redemption proceeds are credited to your registered bank account within T+1 to T+3 business days, depending on the scheme. Exit loads may apply — check the scheme documents.',
  },
  {
    question: 'How is NAV calculated?',
    answer:
      'Net Asset Value (NAV) is calculated daily based on the market value of the scheme\'s underlying assets, minus liabilities and expenses, divided by the total number of units outstanding. NAV is published daily after market hours.',
  },
  {
    question: 'How do I file a complaint?',
    answer:
      'Contact our Grievance Officer Daniel Brooks at grievance@asmcoins.com or +91-22-4890-7602. If your complaint is not resolved within 30 days, you may escalate it to SEBI\'s SCORES portal at scores.sebi.gov.in.',
  },
  {
    question: 'Is my investment safe?',
    answer:
      'Your investments are held by a SEBI-registered custodian, not by ASM directly. Fund assets are segregated from company assets. However, all mutual fund investments carry market risk — the value of your investment can go up or down based on market conditions.',
  },
]

function FaqAccordion({ item, open, onToggle }: { item: FaqItem; open: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-skin-line">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left text-[14px] font-bold text-skin-text transition-colors hover:bg-skin-tint/50"
      >
        <span>{item.question}</span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-skin-muted transition-transform duration-200',
            open && 'rotate-180'
          )}
          aria-hidden
        />
      </button>
      {open && (
        <div className="px-4 pb-4 text-[13px] leading-relaxed text-skin-body">
          {item.answer}
        </div>
      )}
    </div>
  )
}

export function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqJsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_DATA.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    }),
    []
  )

  return (
    <PublicLayout>
      <PageMeta
        title="Frequently Asked Questions"
        description="Common questions about ASM Asset Management mutual fund schemes, KYC, redemption, risk disclosures, and SEBI regulatory status."
        jsonLd={faqJsonLd}
      />

      <section className="bg-skin-surface px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-skin-accent">
            FAQ
          </p>
          <h1 className="mt-1 font-jakarta text-[32px] font-extrabold leading-tight text-skin-text sm:text-[40px]">
            Frequently Asked Questions
          </h1>
          <p className="mt-4 text-base leading-relaxed text-skin-body">
            Everything you need to know about investing with ASM Asset
            Management. Can't find what you're looking for? Contact our support
            team.
          </p>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-skin-line bg-skin-surface">
          {FAQ_DATA.map((item, i) => (
            <FaqAccordion
              key={item.question}
              item={item}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </section>

      <section className="px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[14px] text-skin-body">
            Have more questions? Visit our{' '}
            <Link
              to="/compliance"
              className="font-semibold text-skin-accent underline decoration-skin-accent/30 hover:decoration-skin-accent"
            >
              Compliance page
            </Link>{' '}
            for full regulatory disclosures, or{' '}
            <Link
              to="/contact"
              className="font-semibold text-skin-accent underline decoration-skin-accent/30 hover:decoration-skin-accent"
            >
              contact us
            </Link>{' '}
            directly.
          </p>
          <div className="mt-6">
            <MutualFundDisclaimer className="text-center" />
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
