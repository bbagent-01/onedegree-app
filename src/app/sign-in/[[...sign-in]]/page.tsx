import { SignIn } from "@clerk/nextjs";

export const runtime = "edge";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-6 text-center">
        <h1 className="font-display text-3xl text-foreground">One Degree</h1>
        <p className="text-sm text-foreground-secondary mt-1">
          Welcome back to One Degree BNB
        </p>
      </div>
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "rounded-2xl border border-border shadow-lg",
          },
        }}
      />
    </div>
  );
}
