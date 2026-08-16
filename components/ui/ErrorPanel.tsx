import Link from "next/link";

/**
 * The error state for /ask and /decode.
 *
 * It used to be a single red-bordered sentence with nowhere to go — on the two screens
 * where people are most likely to give up. The message still leads, but an error is never
 * a dead end here: free help is always available, and the step-by-step guide is
 * deterministic, so it keeps working even when a model call is capped or times out.
 */
export function ErrorPanel({ message }: { message: string }) {
  return (
    <div role="alert" className="card mt-5 border-2 border-red">
      <p className="text-[16px] leading-relaxed text-ink">{message}</p>
      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
        <Link href="/help" className="btn btn-help">
          Get free help
        </Link>
        <Link href="/start" className="btn btn-secondary">
          Try the step-by-step guide
        </Link>
      </div>
    </div>
  );
}
