import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  FEEDBACK_FEATURE_AREAS,
  FEEDBACK_MESSAGE_MAX_LENGTH,
  FEEDBACK_MESSAGE_MIN_LENGTH,
  FEEDBACK_SEVERITIES,
  FEEDBACK_TYPES,
  type FeedbackFeatureArea,
  type FeedbackSeverity,
  type FeedbackType,
} from "@/api/feedback";
import { submitFeedback } from "@/services/feedbackService";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface FeedbackFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function FeedbackForm({ onSuccess, onCancel }: FeedbackFormProps) {
  const [type, setType] = useState<FeedbackType>("General Feedback");
  const [featureArea, setFeatureArea] = useState<FeedbackFeatureArea>("Homepage");
  const [severity, setSeverity] = useState<FeedbackSeverity>("Medium");
  const [message, setMessage] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setError("Message is required.");
      return;
    }
    if (trimmedMessage.length < FEEDBACK_MESSAGE_MIN_LENGTH) {
      setError("Message must be at least 5 characters.");
      return;
    }
    if (trimmedMessage.length > FEEDBACK_MESSAGE_MAX_LENGTH) {
      setError("Message is too long.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitFeedback({
        type,
        featureArea,
        severity,
        message: trimmedMessage,
        companyWebsite,
      });
      trackEvent("feedback_submit");
      onSuccess();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Feedback could not be sent. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="relative space-y-5" onSubmit={handleSubmit} noValidate>
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="feedback-company-website">Company website</label>
        <input
          id="feedback-company-website"
          name="companyWebsite"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={companyWebsite}
          onChange={(event) => setCompanyWebsite(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="feedback-type">Type</Label>
        <Select value={type} onValueChange={(value) => setType(value as FeedbackType)}>
          <SelectTrigger id="feedback-type" aria-label="Feedback type">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {FEEDBACK_TYPES.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="feedback-feature-area">Feature Area</Label>
        <Select
          value={featureArea}
          onValueChange={(value) => setFeatureArea(value as FeedbackFeatureArea)}
        >
          <SelectTrigger id="feedback-feature-area" aria-label="Feature area">
            <SelectValue placeholder="Select feature area" />
          </SelectTrigger>
          <SelectContent>
            {FEEDBACK_FEATURE_AREAS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium leading-none text-slate-900">Severity</legend>
        <RadioGroup
          value={severity}
          onValueChange={(value) => setSeverity(value as FeedbackSeverity)}
          className="flex flex-wrap gap-4"
        >
          {FEEDBACK_SEVERITIES.map((option) => (
            <div key={option} className="flex items-center gap-2">
              <RadioGroupItem value={option} id={`feedback-severity-${option.toLowerCase()}`} />
              <Label htmlFor={`feedback-severity-${option.toLowerCase()}`}>{option}</Label>
            </div>
          ))}
        </RadioGroup>
      </fieldset>

      <p className="text-xs text-slate-500">Please do not include patient information.</p>

      <div className="space-y-2">
        <Label htmlFor="feedback-message">
          Message <span className="text-red-600">*</span>
        </Label>
        <Textarea
          id="feedback-message"
          required
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Tell us what you think..."
          rows={5}
          maxLength={FEEDBACK_MESSAGE_MAX_LENGTH}
          aria-required="true"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="feedback-screenshot">Attach Screenshot (optional)</Label>
        <p className="text-sm text-slate-500">Screenshot uploads are temporarily unavailable.</p>
        <Button
          id="feedback-screenshot"
          type="button"
          variant="outline"
          disabled
          className="justify-start border-slate-200 text-slate-400"
        >
          Choose file
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <p className="text-xs text-slate-500">
        Beta feedback helps shape future ReportReady templates.
      </p>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "border-0 text-white shadow-sm",
            "bg-[linear-gradient(135deg,#16a34a,#22c55e)] hover:brightness-105",
          )}
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Send Feedback
        </Button>
      </div>
    </form>
  );
}
