// Non-intrusive promotion for Credanta, shown on the homepage below the Coming Soon report
// sheet section. It is a static card (no popup,
// no animation, no auto-expanding behavior, no email capture / login) and is
// hidden when printing via the `.credanta-promo` rule below.

const CREDANTA_URL = "https://credantaapp.com";

/**
 * Print-hiding style for Credanta promotions. Kept alongside the component so the
 * behavior travels with it even if the global stylesheet is not touched. If a
 * global stylesheet is preferred, move this rule there instead.
 */
function CredantaPrintStyle() {
  return (
    <style>{`@media print { .credanta-promo { display: none !important; } }`}</style>
  );
}

export function CredantaPromo() {
  return (
    <section
      className="credanta-promo print-hide mx-auto w-full max-w-3xl px-4 py-8"
      aria-label="Credanta"
    >
      <CredantaPrintStyle />
      <div className="rounded-2xl border border-green-200 bg-green-50/40 p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>
            📁
          </span>
          <span className="text-sm font-semibold uppercase tracking-wide text-green-700">
            Credanta
          </span>
        </div>

        <h3 className="mt-3 text-lg font-semibold text-slate-900 sm:text-xl">
          Still managing licenses, certifications, resumes, and expiration dates manually?
        </h3>

        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Credanta helps nurses organize credentials, track expiration dates, and
          stay ready for new opportunities.
        </p>

        <a
          href={CREDANTA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1 rounded-lg border border-green-600 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
          data-testid="link-credanta-learn-more"
        >
          Learn More <span aria-hidden>→</span>
        </a>
      </div>
    </section>
  );
}

/**
 * Small "Built by NexusGarden" ecosystem section for the site footer. Also treated
 * as a promotion, so it is hidden when printing.
 */
export function NexusGardenFooter() {
  return (
    <div className="credanta-promo print-hide mx-auto w-full max-w-3xl px-4 py-6 text-center">
      <CredantaPrintStyle />
      <p className="text-sm font-semibold text-slate-700">Built by NexusGarden</p>
      <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-slate-500">
        <li>ReportReady</li>
        <li aria-hidden className="text-slate-300">
          ·
        </li>
        <li>
          <a
            href={CREDANTA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-green-700"
          >
            Credanta
          </a>
        </li>
        <li aria-hidden className="text-slate-300">
          ·
        </li>
        <li>Future Tools</li>
      </ul>
    </div>
  );
}

export default CredantaPromo;
