import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { FeedbackModal } from "@/components/feedback/FeedbackModal";

export function FeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="feedback-floating-button print-hide fixed flex h-14 items-center gap-2 rounded-full px-6 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(22,163,74,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-[0_14px_36px_rgba(22,163,74,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
        style={{
          background: "linear-gradient(135deg, #16a34a, #22c55e)",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
        }}
        aria-label="Open feedback form"
        data-testid="button-feedback-floating"
      >
        <MessageCircle className="h-5 w-5" aria-hidden />
        Feedback
      </button>

      <FeedbackModal open={open} onOpenChange={setOpen} />
    </>
  );
}
