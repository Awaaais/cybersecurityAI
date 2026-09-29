import Link from "next/link";

export function BackButton({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-xl border border-[#f4c65a]/30 bg-[#f4c65a]/10 px-3 py-2 text-sm font-medium text-[#f7d97d] transition hover:bg-[#f4c65a]/15"
    >
      <span aria-hidden="true">←</span>
      <span>Back</span>
    </Link>
  );
}
