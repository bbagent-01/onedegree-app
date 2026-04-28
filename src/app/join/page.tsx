import Link from "next/link";
import { Lock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export const runtime = "edge";

export default function JoinNoTokenPage() {
  return (
    <div className="mx-auto mt-16 w-full max-w-[480px] rounded-2xl border border-border bg-white p-8 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <Lock className="h-5 w-5" />
      </div>
      <h1 className="mt-4 text-xl font-semibold text-foreground">
        Trustead is invite-only
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Members vouch for the people they invite, so the network grows along
        real relationships. If someone sent you an invite, the link they shared
        already includes your token — open that link directly and we&rsquo;ll
        finish setting you up.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link href="/sign-in" className={buttonVariants()}>
          Already a member? Sign in
        </Link>
        <Link
          href="/"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
