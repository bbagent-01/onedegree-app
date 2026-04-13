import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface py-6 pb-20 md:pb-6">
      <div className="mx-auto max-w-container px-5 md:px-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} One Degree BNB. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
          <Link href="/help" className="hover:text-foreground transition-colors">
            Help
          </Link>
        </div>
      </div>
    </footer>
  );
}
