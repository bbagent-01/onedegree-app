export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { SignInButton, UserButton } from "@clerk/nextjs";

export default async function Home() {
  const { userId } = await auth();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 bg-surface-light">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-text-primary mb-2">
          One Degree BNB
        </h1>
        <p className="text-text-secondary text-lg">
          Private home rentals through trusted connections
        </p>
      </div>

      {!userId ? (
        <SignInButton mode="modal">
          <button className="px-6 py-3 bg-brand-purple text-white rounded-lg font-medium hover:bg-brand-purple-dark transition-colors">
            Sign In
          </button>
        </SignInButton>
      ) : (
        <div className="flex items-center gap-4">
          <UserButton />
          <p className="text-text-secondary">You&apos;re signed in!</p>
        </div>
      )}
    </main>
  );
}
