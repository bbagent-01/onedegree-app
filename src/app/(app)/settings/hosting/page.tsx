import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";
import { parsePolicy } from "@/lib/cancellation";
import { parsePaymentMethods } from "@/lib/payment-methods";
import { CancellationPolicyForm } from "@/components/settings/cancellation-policy-form";
import { PaymentMethodsForm } from "@/components/settings/payment-methods-form";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function HostingSettingsPage() {
  const { userId: clerkId } = await effectiveAuth();
  if (!clerkId) redirect("/sign-in?redirect_url=/settings/hosting");

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("users")
    .select("cancellation_policy, payment_methods")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  const policy = parsePolicy(data?.cancellation_policy);
  const methods = parsePaymentMethods(data?.payment_methods);

  return (
    <div className="mx-auto w-full max-w-[880px] px-4 py-6 md:px-6 md:py-10">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to settings
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-semibold md:text-3xl">Hosting policies</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Default terms that apply to all your listings. You can override
          any setting on a specific listing or reservation later.
        </p>
      </header>

      <section className="mt-8">
        <h2 className="text-base font-semibold">
          Cancellation &amp; payment schedule
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          When guests pay you and how much at each step. Guests see
          this on the listing and again when the request is approved.
        </p>
        <div className="mt-5">
          <CancellationPolicyForm initial={policy} />
        </div>
      </section>

      <section className="mt-12 border-t border-border pt-10">
        <h2 className="text-base font-semibold">Payment methods</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Where guests send money once you&apos;ve approved a stay. These
          stay private on your listing and only appear after a request is
          approved. Receive-only identifiers — never share bank routing
          numbers here.
        </p>
        <div className="mt-5">
          <PaymentMethodsForm initial={methods} />
        </div>
      </section>
    </div>
  );
}
