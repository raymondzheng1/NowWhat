import { Icon } from "@/components/ui/icons";

/**
 * A tap-to-call button.
 *
 * The people using this are usually on a phone, often frightened, and calling is the
 * fastest route to a person — so a number is a button, not prose. The numbers themselves
 * come from the verified corpus / curated directory; this only renders them.
 *
 * `variant` matches the surface it sits on: "help" for the green free-help panels,
 * "plain" for the paper cards.
 */
export function CallButton({
  phone,
  label,
  variant = "help",
  className = "",
}: {
  phone: string;
  /** Who is being called — read out to screen readers, e.g. "Victoria Legal Aid". */
  label?: string;
  variant?: "help" | "plain";
  className?: string;
}) {
  const tone =
    variant === "help"
      ? "border-help bg-help text-paper hover:bg-help-ink"
      : "border-ink bg-paper text-ink hover:bg-cream";
  return (
    <a
      href={`tel:${phone.replace(/[^\d+]/g, "")}`}
      aria-label={label ? `Call ${label} on ${phone}` : `Call ${phone}`}
      className={`inline-flex min-h-[44px] items-center gap-2 rounded-button border-2 px-3.5 font-display text-[16px] font-black ${tone} ${className}`}
    >
      <Icon.Phone className="h-[17px] w-[17px] shrink-0" strokeWidth={2.2} aria-hidden="true" />
      {phone}
    </a>
  );
}
