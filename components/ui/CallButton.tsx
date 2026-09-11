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
  withName = false,
  variant = "help",
  className = "",
}: {
  phone: string;
  /** Who is being called — read out to screen readers, e.g. "Victoria Legal Aid". */
  label?: string;
  /**
   * Show the service's name ON the button.
   *
   * Set it wherever the number stands alone. The name was passed for `aria-label` only, so a
   * screen reader heard "Call Victoria Legal Aid on 1300 792 387" while everyone else saw a
   * bare 1300 number with nothing saying who answers it. On the urgent banner — which is the
   * first thing a frightened person meets, and sometimes the only thing they act on — that
   * meant being told to ring a stranger.
   *
   * Left off in the help lists, where the service name and what it does are already the two
   * lines directly above the button.
   */
  withName?: boolean;
  variant?: "help" | "plain";
  className?: string;
}) {
  const tone =
    variant === "help"
      ? "border-help bg-help text-paper hover:bg-help-ink"
      : "border-ink bg-paper text-ink hover:bg-cream";
  const showName = withName && !!label;
  return (
    <a
      href={`tel:${phone.replace(/[^\d+]/g, "")}`}
      aria-label={label ? `Call ${label} on ${phone}` : `Call ${phone}`}
      className={`inline-flex min-h-[44px] items-center gap-2.5 rounded-button border-2 px-3.5 font-display ${
        showName ? "py-2" : ""
      } ${tone} ${className}`}
    >
      <Icon.Phone className="h-[17px] w-[17px] shrink-0" strokeWidth={2.2} aria-hidden="true" />
      {showName ? (
        <span className="text-left leading-tight">
          <span className="block text-[13px] font-extrabold uppercase tracking-[0.06em] opacity-90">
            {label}
          </span>
          <span className="block text-[17px] font-black">{phone}</span>
        </span>
      ) : (
        <span className="text-[16px] font-black">{phone}</span>
      )}
    </a>
  );
}
