import { Building2, MapPin, ShieldCheck, Users } from 'lucide-react'

import { PageMeta } from '@/components/seo/PageMeta'
import { MutualFundDisclaimer } from '@/components/seo/MutualFundDisclaimer'

import { PublicLayout } from './PublicLayout'

export function AboutPage() {
  return (
    <PublicLayout>
      <PageMeta
        title="About Us"
        description="Learn about ASM Asset Management, a SEBI-registered mutual fund (AMC) offering gold and multi-asset schemes for Indian retail investors."
      />

      {/* Hero */}
      <section className="bg-skin-surface px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-skin-accent">
            About Us
          </p>
          <h1 className="mt-1 font-jakarta text-[32px] font-extrabold leading-tight text-skin-text sm:text-[40px]">
            ASM Asset Management
          </h1>
          <p className="mt-4 text-base leading-relaxed text-skin-body">
            ASM Asset Management is a SEBI-registered Asset Management Company
            (AMC) dedicated to making mutual fund investing accessible and
            transparent for every Indian investor. We manage professionally
            structured schemes that are NAV-based, fully regulated, and open to
            retail participation.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-jakarta text-[22px] font-extrabold text-skin-text">
            Our Mission
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-skin-body">
            To democratise wealth creation for Indian retail investors through
            simple, well-regulated mutual fund products. We believe that
            disciplined, transparent investing — backed by strong compliance and
            clear risk disclosure — is the most reliable path to long-term
            financial security.
          </p>
        </div>
      </section>

      {/* Key Facts */}
      <section className="bg-skin-surface px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 font-jakarta text-[22px] font-extrabold text-skin-text">
            Key Facts
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                Icon: ShieldCheck,
                title: 'SEBI Registered',
                text: 'Registered as a Mutual Fund under SEBI (Mutual Funds) Regulations, 1996. Registration No: MF/879/25/2.',
              },
              {
                Icon: Building2,
                title: 'Registered Office',
                text: '14th Floor, Tower B, Peninsula Business Park, Senapati Bapat Marg, Lower Parel, Mumbai — 400013, Maharashtra.',
              },
              {
                Icon: Users,
                title: 'Leadership',
                text: 'CEO: Nikhil Mahato · CIO: James Carter · Compliance Officer: Sarah Mitchell · Fund Manager: Daniel Brooks.',
              },
              {
                Icon: MapPin,
                title: 'Service Area',
                text: 'Available to investors across India. Mobile-first platform designed for ease of use on any device.',
              },
            ].map(({ Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-skin-line p-5"
              >
                <div className="mb-2 flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-full bg-skin-tint ring-1 ring-skin-line">
                    <Icon
                      className="size-[18px] text-skin-accent"
                      strokeWidth={2.2}
                      aria-hidden
                    />
                  </span>
                  <h3 className="text-[15px] font-extrabold text-skin-text">
                    {title}
                  </h3>
                </div>
                <p className="text-[13px] leading-relaxed text-skin-body">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-4 font-jakarta text-[22px] font-extrabold text-skin-text">
            What We Stand For
          </h2>
          <ul className="space-y-3">
            {[
              {
                title: 'Transparency',
                text: 'Every scheme publishes its NAV daily. No hidden fees, no fine-print surprises.',
              },
              {
                title: 'Compliance First',
                text: 'We operate under SEBI regulations with proper auditing, custodianship, and grievance redressal.',
              },
              {
                title: 'Honest Risk Disclosure',
                text: 'We never promise guaranteed returns. Market risks are disclosed clearly and prominently.',
              },
              {
                title: 'Mobile Accessibility',
                text: 'Designed for India — a phone-first experience that works on any connection, any device.',
              },
            ].map(({ title, text }) => (
              <li
                key={title}
                className="rounded-xl border border-skin-line bg-skin-surface p-4"
              >
                <h3 className="text-[14px] font-bold text-skin-text">
                  {title}
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-skin-body">
                  {text}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 pb-8">
        <MutualFundDisclaimer />
      </div>
    </PublicLayout>
  )
}
