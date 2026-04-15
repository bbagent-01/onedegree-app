"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Category = "bug" | "question" | "feedback" | "other";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "bug", label: "Bug" },
  { value: "question", label: "Question" },
  { value: "feedback", label: "Feedback" },
  { value: "other", label: "Other" },
];

export function HelpContactForm() {
  const { user } = useUser();
  const [name, setName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(
    user?.primaryEmailAddress?.emailAddress || ""
  );
  const [category, setCategory] = useState<Category>("question");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Re-hydrate once Clerk finishes loading the current user.
  useEffect(() => {
    if (user?.fullName) setName((n) => n || user.fullName || "");
    if (user?.primaryEmailAddress?.emailAddress) {
      setEmail((e) => e || user.primaryEmailAddress!.emailAddress);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (message.trim().length < 5) {
      toast.error("Please write a longer message");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, category, message }),
      });
      if (!res.ok) {
        const { error } = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        toast.error(error || "Couldn't submit");
        return;
      }
      toast.success("Thanks! We'll get back to you within 24 hours.");
      setMessage("");
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 space-y-4 rounded-2xl border border-border bg-white p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-sm font-semibold">Name</Label>
          <Input
            className="mt-1.5"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={120}
            required
          />
        </div>
        <div>
          <Label className="text-sm font-semibold">Email</Label>
          <Input
            className="mt-1.5"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            maxLength={200}
            required
          />
        </div>
      </div>

      <div>
        <Label className="text-sm font-semibold">Category</Label>
        <Select
          value={category}
          onValueChange={(v) => setCategory(v as Category)}
        >
          <SelectTrigger className="mt-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-semibold">Message</Label>
        <Textarea
          className="mt-1.5 resize-none"
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what's going on…"
          maxLength={4000}
          required
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:bg-foreground/90 disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}
