import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";

export interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!open) {
      setShowSuccess(false);
    }
  }, [open]);

  const handleSuccess = () => {
    setShowSuccess(true);
    window.setTimeout(() => {
      onOpenChange(false);
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-[10050] flex max-h-[90vh] w-[95vw] max-w-lg flex-col overflow-hidden p-0 sm:w-full"
        overlayClassName="z-[10040]"
      >
        <DialogHeader className="border-b border-slate-200 px-5 py-4 text-left">
          <DialogTitle className="text-xl text-slate-950">ReportReady Feedback</DialogTitle>
          <DialogDescription>Help improve ReportReady</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-5 py-4">
          {showSuccess ? (
            <div
              className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center"
              role="status"
              aria-live="polite"
            >
              <p className="text-lg font-semibold text-slate-900">
                Thanks — your feedback was sent.
              </p>
            </div>
          ) : (
            <FeedbackForm onSuccess={handleSuccess} onCancel={() => onOpenChange(false)} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
