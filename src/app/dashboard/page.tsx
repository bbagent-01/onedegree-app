import { UserButton } from "@clerk/nextjs";

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-surface-light">
      <nav className="bg-white border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">One Degree BNB</h1>
        <UserButton afterSignOutUrl="/" />
      </nav>
      <div className="max-w-4xl mx-auto p-8">
        <h2 className="text-2xl font-semibold text-text-primary mb-2">
          Dashboard
        </h2>
        <p className="text-text-secondary">
          Welcome to One Degree BNB. Features coming soon.
        </p>
      </div>
    </main>
  );
}
