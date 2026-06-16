"use client";

/**
 * Optional BYO-key input (PRD §6.9). The user's own key is held in component state
 * (in memory only — never persisted), and sent per request to bypass the cost cap.
 */
export function ByoKeyField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <details className="mt-3 text-sm text-ink-soft">
      <summary className="cursor-pointer">Use your own key (optional)</summary>
      <p className="mt-2">
        If you have your own provider key, you can paste it here to continue past the free limit.
        It is used only for your requests and is never stored.
      </p>
      <input
        type="password"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Your API key (optional)"
        className="mt-2 w-full rounded-card border border-line px-3 py-2"
      />
    </details>
  );
}
