import { HelpContactForm } from "@/components/help/help-contact-form";
import { HelpFaq, FAQS } from "@/components/help/help-faq";

export const runtime = "edge";

export default function HelpPage() {
  return (
    <div className="mx-auto w-full max-w-[880px] px-4 py-6 md:px-6 md:py-10">
      <header>
        <h1 className="font-serif text-2xl font-semibold md:text-3xl">Help Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Answers to common questions, or send us a note and we&apos;ll get back
          to you within 24 hours.
        </p>
      </header>

      <section className="mt-8">
        <h2 className="text-lg font-semibold md:text-xl">
          Frequently asked questions
        </h2>
        <HelpFaq items={FAQS} />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold md:text-xl">
          Contact us / report a problem
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Found a bug? Have feedback? We read every message.
        </p>
        <HelpContactForm />
      </section>
    </div>
  );
}
