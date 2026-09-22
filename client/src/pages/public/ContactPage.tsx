import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react'

import { PageMeta } from '@/components/seo/PageMeta'
import { MutualFundDisclaimer } from '@/components/seo/MutualFundDisclaimer'

import { PublicLayout } from './PublicLayout'

export function ContactPage() {
  return (
    <PublicLayout>
      <PageMeta
        title="Contact Us"
        description="Get in touch with ASM Asset Management. Reach our support team via phone, email, or WhatsApp."
      />

      <section className="bg-skin-surface px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-skin-accent">
            Get In Touch
          </p>
          <h1 className="mt-1 font-jakarta text-[32px] font-extrabold leading-tight text-skin-text sm:text-[40px]">
            Contact Us
          </h1>
          <p className="mt-4 text-base leading-relaxed text-skin-body">
            Our support team is available every day via WhatsApp and email.
            We aim to respond to all queries within 24 hours.
          </p>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                Icon: Phone,
                title: 'Phone',
                detail: '[PHONE NUMBER — operator fills in]',
                sub: 'Mon–Sat, 9 AM – 7 PM IST',
              },
              {
                Icon: Mail,
                title: 'Email',
                detail: '[EMAIL — operator fills in]',
                sub: 'We respond within 24 hours',
              },
              {
                Icon: MessageCircle,
                title: 'WhatsApp',
                detail: '[WHATSAPP NUMBER — operator fills in]',
                sub: 'Available every day',
              },
              {
                Icon: MapPin,
                title: 'Registered Office',
                detail: '[FULL ADDRESS — operator fills in]',
                sub: 'Visit by appointment',
              },
            ].map(({ Icon, title, detail, sub }) => (
              <div
                key={title}
                className="rounded-2xl border border-skin-line bg-skin-surface p-5"
              >
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-full bg-skin-tint ring-1 ring-skin-line">
                    <Icon
                      className="size-[18px] text-skin-accent"
                      strokeWidth={2.2}
                      aria-hidden
                    />
                  </span>
                  <h2 className="text-[15px] font-extrabold text-skin-text">
                    {title}
                  </h2>
                </div>
                <p className="text-[14px] font-semibold text-skin-text">
                  {detail}
                </p>
                <p className="mt-1 text-[12px] text-skin-muted">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 pb-8">
        <MutualFundDisclaimer />
      </div>
    </PublicLayout>
  )
}
