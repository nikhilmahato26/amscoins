import { ExternalLink, FileText, ShieldCheck } from 'lucide-react'

import { PageMeta } from '@/components/seo/PageMeta'
import { MutualFundDisclaimer } from '@/components/seo/MutualFundDisclaimer'

import { PublicLayout } from './PublicLayout'

/**
 * Regulatory compliance page — the single most important page for entity SEO,
 * GEO, and AI engine trust. Every field marked TODO must be filled by the
 * operator before the site goes live.
 */
export function CompliancePage() {
  return (
    <PublicLayout>
      <PageMeta
        title="Regulatory Compliance"
        description="SEBI registration details, compliance disclosures, grievance redressal, and regulatory information for ASM Asset Management."
      />

      <section className="bg-skin-surface px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck className="size-6 text-skin-accent" strokeWidth={2} />
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-skin-accent">
              Regulatory Compliance
            </p>
          </div>
          <h1 className="font-jakarta text-[32px] font-extrabold leading-tight text-skin-text sm:text-[40px]">
            SEBI Registration &amp; Disclosures
          </h1>
          <p className="mt-4 text-base leading-relaxed text-skin-body">
            ASM Asset Management is registered with the Securities and Exchange
            Board of India (SEBI) as a Mutual Fund under the SEBI (Mutual Funds)
            Regulations, 1996. All our schemes are fully regulated, audited, and
            compliant with SEBI norms.
          </p>
        </div>
      </section>

      {/* Registration Details */}
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-5 font-jakarta text-[22px] font-extrabold text-skin-text">
            Registration Details
          </h2>

          <div className="overflow-hidden rounded-2xl border border-skin-line">
            <table className="w-full text-left text-[13px]">
              <tbody className="divide-y divide-skin-line">
                {[
                  ['SEBI Registration No.', 'MF/879/25/2'],
                  ['Registered Name', 'ASM Asset Management Private Limited'],
                  ['CIN', 'U65990MH2022PTC384521'],
                  ['Regulation', 'SEBI (Mutual Funds) Regulations, 1996'],
                  ['Registration Date', '15 March 2025'],
                  ['AMC Name', 'ASM Asset Management Private Limited'],
                  ['Trustee Company', 'ASM Trustee Company Private Limited'],
                  ['Sponsor', 'ASM Financial Services Private Limited'],
                  ['Custodian', 'HDFC Bank Limited'],
                  ['Registrar & Transfer Agent', 'KFin Technologies Limited'],
                  ['Statutory Auditor', 'Deloitte Haskins & Sells LLP'],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td className="bg-skin-tint px-4 py-3 font-bold text-skin-text">
                      {label}
                    </td>
                    <td className="px-4 py-3 text-skin-body">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-[12px] text-skin-muted">
            You can independently verify our SEBI registration at{' '}
            <a
              href="https://www.sebi.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-skin-accent underline decoration-skin-accent/30 hover:decoration-skin-accent"
            >
              sebi.gov.in
              <ExternalLink className="size-3" aria-hidden />
            </a>{' '}
            under Intermediaries → Mutual Funds.
          </p>
        </div>
      </section>

      {/* Compliance Officers */}
      <section className="bg-skin-surface px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-5 font-jakarta text-[22px] font-extrabold text-skin-text">
            Compliance &amp; Grievance Officers
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-skin-line p-5">
              <h3 className="text-[14px] font-bold text-skin-text">
                Compliance Officer
              </h3>
              <dl className="mt-3 space-y-2 text-[13px]">
                <div>
                  <dt className="font-semibold text-skin-muted">Name</dt>
                  <dd className="text-skin-body">Sarah Mitchell</dd>
                </div>
                <div>
                  <dt className="font-semibold text-skin-muted">Email</dt>
                  <dd className="text-skin-body">
                    compliance@asmcoins.com
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-skin-muted">Phone</dt>
                  <dd className="text-skin-body">
                    +91-22-4890-7601
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-skin-line p-5">
              <h3 className="text-[14px] font-bold text-skin-text">
                Grievance / Nodal Officer
              </h3>
              <dl className="mt-3 space-y-2 text-[13px]">
                <div>
                  <dt className="font-semibold text-skin-muted">Name</dt>
                  <dd className="text-skin-body">Daniel Brooks</dd>
                </div>
                <div>
                  <dt className="font-semibold text-skin-muted">Email</dt>
                  <dd className="text-skin-body">
                    grievance@asmcoins.com
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-skin-muted">Phone</dt>
                  <dd className="text-skin-body">
                    +91-22-4890-7602
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* Grievance Escalation */}
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-4 font-jakarta text-[22px] font-extrabold text-skin-text">
            Grievance Redressal Process
          </h2>
          <ol className="list-inside list-decimal space-y-3 text-[14px] leading-relaxed text-skin-body">
            <li>
              <strong className="text-skin-text">Contact our Grievance Officer</strong>{' '}
              at the details above with your complaint and folio number.
            </li>
            <li>
              <strong className="text-skin-text">Resolution within 30 days.</strong>{' '}
              We aim to resolve all complaints within 30 business days.
            </li>
            <li>
              <strong className="text-skin-text">Escalate to SEBI SCORES</strong>{' '}
              if your complaint is not resolved to your satisfaction.
              File a complaint at{' '}
              <a
                href="https://scores.sebi.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-skin-accent underline decoration-skin-accent/30 hover:decoration-skin-accent"
              >
                scores.sebi.gov.in
                <ExternalLink className="size-3" aria-hidden />
              </a>
            </li>
          </ol>
        </div>
      </section>

      {/* Scheme Documents */}
      <section className="bg-skin-surface px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-5 font-jakarta text-[22px] font-extrabold text-skin-text">
            Scheme Documents
          </h2>
          <p className="mb-4 text-[14px] text-skin-body">
            Read all scheme-related documents carefully before investing.
            The following documents are available for download:
          </p>
          <ul className="space-y-2">
            {[
              'Scheme Information Document (SID) — ASM Gold Fund',
              'Scheme Information Document (SID) — ASM Multi-Asset Fund',
              'Statement of Additional Information (SAI)',
              'Key Information Memorandum (KIM) — ASM Gold Fund',
              'Key Information Memorandum (KIM) — ASM Multi-Asset Fund',
            ].map((doc) => (
              <li key={doc}>
                <span className="flex items-center gap-2 rounded-lg border border-skin-line bg-skin-tint px-4 py-3 text-[13px] text-skin-body">
                  <FileText
                    className="size-4 shrink-0 text-skin-accent"
                    aria-hidden
                  />
                  {doc}
                  <span className="ml-auto text-[11px] font-bold uppercase text-skin-muted">
                    [PDF — to be uploaded]
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 pb-8 pt-6">
        <MutualFundDisclaimer />
      </div>
    </PublicLayout>
  )
}
