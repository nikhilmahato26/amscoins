import { BookOpen, ExternalLink } from 'lucide-react'
import { Link } from 'react-router'

import { PageMeta } from '@/components/seo/PageMeta'
import { MutualFundDisclaimer } from '@/components/seo/MutualFundDisclaimer'

import { PublicLayout } from './PublicLayout'

interface Article {
  title: string
  slug: string
  summary: string
  content: string[]
}

const ARTICLES: Article[] = [
  {
    title: 'How Mutual Funds Work in India',
    slug: 'how-mutual-funds-work',
    summary:
      'A mutual fund pools money from many investors and invests it in a diversified portfolio of securities, managed by professional fund managers.',
    content: [
      'A mutual fund is a professionally managed investment vehicle that pools money from multiple investors to purchase a diversified portfolio of stocks, bonds, gold, or other securities. In India, all mutual funds are regulated by the Securities and Exchange Board of India (SEBI).',
      'When you invest in a mutual fund, you buy "units" at the fund\'s Net Asset Value (NAV). The NAV is calculated daily based on the market value of the fund\'s total holdings, minus expenses, divided by the total units outstanding.',
      'Mutual funds offer several advantages: professional management, diversification, liquidity, and accessibility (you can start with as little as ₹500/month via SIP). However, returns are not guaranteed and are subject to market risks.',
      'In India, mutual funds are structured with three entities: the Sponsor (who sets up the fund), the Trustee (who oversees it on behalf of investors), and the Asset Management Company or AMC (who manages the investments). SEBI regulates all three.',
    ],
  },
  {
    title: 'Understanding KYC for Mutual Funds',
    slug: 'what-is-kyc',
    summary:
      'KYC (Know Your Customer) is a one-time verification process mandatory for all mutual fund investments in India.',
    content: [
      'KYC stands for "Know Your Customer." It is a SEBI-mandated identity verification process that every investor must complete before making their first mutual fund investment in India.',
      'The KYC process requires: (1) a valid PAN card, (2) proof of address (Aadhaar, passport, or utility bill), (3) a recent photograph, and (4) bank account details for linking redemptions.',
      'Once KYC is completed through a SEBI-registered KYC Registration Agency (KRA), it is valid across all mutual fund companies — you do not need to repeat it for each AMC.',
      'Modern platforms offer e-KYC using Aadhaar-based verification, which can be completed entirely online in a few minutes. After KYC is verified, you can start investing immediately.',
    ],
  },
  {
    title: 'Investing in Gold Through Mutual Funds',
    slug: 'gold-investment-india',
    summary:
      'Gold mutual funds let you invest in gold without buying, storing, or insuring physical gold.',
    content: [
      'Gold has been a trusted store of value in India for centuries. Gold mutual funds (Gold ETF Fund of Funds) allow you to gain exposure to gold prices without the hassles of buying, storing, and insuring physical gold.',
      'A Gold Fund of Funds invests in Gold ETFs (Exchange Traded Funds) that, in turn, hold physical gold of 99.5% purity. The fund\'s NAV moves in line with domestic gold prices.',
      'Advantages over physical gold: no making charges, no storage risk, no purity concerns, easy to buy/sell in small amounts, and better liquidity. Returns are variable and linked to gold price movements.',
      'Gold is commonly recommended as 5–15% of a diversified portfolio, serving as a hedge against inflation and currency depreciation. However, gold prices can also decline — there are no guaranteed returns.',
    ],
  },
  {
    title: 'What Is a SIP (Systematic Investment Plan)?',
    slug: 'what-is-sip',
    summary:
      'A SIP allows you to invest a fixed amount regularly into a mutual fund, promoting discipline and rupee-cost averaging.',
    content: [
      'A Systematic Investment Plan (SIP) is a method of investing a fixed amount at regular intervals (usually monthly) in a mutual fund scheme. It\'s the most popular way Indians invest in mutual funds.',
      'SIP offers two key benefits: (1) Rupee Cost Averaging — by investing a fixed amount regularly, you buy more units when NAV is low and fewer when it\'s high, reducing the average cost per unit over time. (2) Discipline — automated monthly investments remove the temptation to time the market.',
      'You can start a SIP with as little as ₹500 per month. SIPs can be paused, increased, decreased, or stopped at any time for open-ended schemes.',
      'Important: SIP does not guarantee profits or protect against losses. It is an investment method, not a return strategy. The value of your SIP investment will fluctuate with market conditions.',
    ],
  },
]

export function InvestorEducationPage() {
  return (
    <PublicLayout>
      <PageMeta
        title="Investor Education"
        description="Learn about mutual funds, KYC, SIP investing, gold funds, and risk management. Educational resources from ASM Asset Management."
      />

      <section className="bg-skin-surface px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-2 flex items-center gap-2">
            <BookOpen className="size-5 text-skin-accent" aria-hidden />
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-skin-accent">
              Learn
            </p>
          </div>
          <h1 className="font-jakarta text-[32px] font-extrabold leading-tight text-skin-text sm:text-[40px]">
            Investor Education
          </h1>
          <p className="mt-4 text-base leading-relaxed text-skin-body">
            Understanding your investments is the first step toward smart
            investing. These resources explain how mutual funds work, your
            rights as an investor, and how to make informed decisions.
          </p>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-10">
          {ARTICLES.map((article) => (
            <article
              key={article.slug}
              id={article.slug}
              className="scroll-mt-20"
            >
              <h2 className="font-jakarta text-[20px] font-extrabold text-skin-text sm:text-[24px]">
                {article.title}
              </h2>
              <p className="mt-2 text-[14px] font-semibold italic text-skin-muted">
                {article.summary}
              </p>
              <div className="mt-4 space-y-3">
                {article.content.map((para, i) => (
                  <p
                    key={i}
                    className="text-[14px] leading-relaxed text-skin-body"
                  >
                    {para}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* External Resources */}
      <section className="bg-skin-surface px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-4 font-jakarta text-[20px] font-extrabold text-skin-text">
            Useful External Resources
          </h2>
          <ul className="space-y-2">
            {[
              {
                label: 'SEBI — Securities and Exchange Board of India',
                url: 'https://www.sebi.gov.in',
              },
              {
                label: 'AMFI — Association of Mutual Funds in India',
                url: 'https://www.amfiindia.com',
              },
              {
                label: 'SEBI Investor Education',
                url: 'https://investor.sebi.gov.in',
              },
              {
                label: 'SCORES — SEBI Complaints Redressal System',
                url: 'https://scores.sebi.gov.in',
              },
            ].map(({ label, url }) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-skin-line px-4 py-3 text-[13px] font-semibold text-skin-accent transition-colors hover:bg-skin-tint"
                >
                  {label}
                  <ExternalLink className="ml-auto size-3.5 shrink-0" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 pb-8 pt-6">
        <p className="mb-4 text-[13px] text-skin-body">
          Ready to start investing?{' '}
          <Link
            to="/schemes"
            className="font-semibold text-skin-accent underline decoration-skin-accent/30 hover:decoration-skin-accent"
          >
            View our schemes
          </Link>{' '}
          or{' '}
          <Link
            to="/faq"
            className="font-semibold text-skin-accent underline decoration-skin-accent/30 hover:decoration-skin-accent"
          >
            read the FAQ
          </Link>
          .
        </p>
        <MutualFundDisclaimer />
      </div>
    </PublicLayout>
  )
}
