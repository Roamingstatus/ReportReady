import { useRef, useState } from "react";
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
  FEEDBACK_SEVERITIES,
  FEEDBACK_TYPES,
  type FeedbackFeatureArea,
  type FeedbackSeverity,
  type FeedbackType,
} from "@/api/feedback";
import { submitFeedback } from "@/services/feedbackService";
import { cn } from "@/lib/utils";
import { ImagePlus, Loader2 } from "lucide-react";

export interface FeedbackFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function FeedbackForm({ onSuccess, onCancel }: FeedbackFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<FeedbackType>("General Feedback");
  const [featureArea, setFeatureArea] = useState<FeedbackFeatureArea>("Homepage");
  const [severity, setSeverity] = useState<FeedbackSeverity>("Medium");
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScreenshotChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setScreenshot(file);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!message.trim()) {
      setError("Message is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitFeedback({
        type,
        featureArea,
        severity,
        message,
        screenshot,
      });
      onSuccess();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to send feedback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
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
          aria-required="true"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="feedback-screenshot">Attach Screenshot (optional)</Label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            className="justify-start border-slate-200 text-slate-700 hover:bg-slate-50"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
            Choose file
          </Button>
          <span className="truncate text-sm text-slate-500">
            {screenshot?.name ?? "PNG, JPG, JPEG, or WEBP"}
          </span>
        </div>
        <input
          ref={fileInputRef}
          id="feedback-screenshot"
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          className="sr-only"
          onChange={handleScreenshotChange}
        />
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
