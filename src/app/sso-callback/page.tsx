"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

/**
 * Clerk OAuth redirect landing. Social sign-in (Google) redirects
 * the user to this page after authenticating with the provider;
 * the component transparently completes the signUp/signIn flow and
 * then pushes them to the configured completion URL.
 */
export default function SSOCallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-foreground" />
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
