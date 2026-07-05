// Non-floating, non-intrusive "Buy Me a Coffee" support button for ReportReady.
// ReportReady stays free forever; this is a purely optional support link.
//
// Behavior:
//   - Reads the payment link from the VITE_BUY_ME_COFFEE_URL env variable
//     (recommended: a Stripe Payment Link). No Stripe/checkout/backend code here.
//   - If the env variable is missing, the component renders nothing.
//   - Opens the link in a new tab (target="_blank", rel="noopener noreferrer").
//   - Hidden when printing via the `.support-reportready` / `.buy-me-coffee-button`
//     rule below.

const BUY_ME_COFFEE_URL = import.meta.env.VITE_BUY_ME_COFFEE_URL as
  | string
  | undefined;

export function BuyMeCoffeeButton() {
  // Don't render anything if no payment link is configured.
  if (!BUY_ME_COFFEE_URL) {
    return null;
  }

  return (
    <section
      className="support-reportready print-hide mx-auto w-full max-w-3xl px-4 py-8 text-center"
      aria-label="Support ReportReady"
    >
      <style>{`@media print { .support-reportready, .buy-me-coffee-button { display: none !important; } }`}</style>

      <a
        href={BUY_ME_COFFEE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="buy-me-coffee-button inline-flex items-center gap-2 rounded-full bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
        data-testid="link-buy-me-coffee"
      >
        <span aria-hidden>☕</span>
        Buy Me a Coffee
      </a>

      <p className="mt-3 text-sm text-slate-600">
        ReportReady is free. Support future nurse-made tools.
      </p>
    </section>
  );
}

export default BuyMeCoffeeButton;
