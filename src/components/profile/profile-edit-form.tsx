"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  userId: string;
  initial: {
    name: string;
    bio: string;
    location: string;
    occupation: string;
    languages: string; // comma-separated
  };
}

const BIO_MAX = 300;

export function ProfileEditForm({ userId, initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [bio, setBio] = useState(initial.bio);
  const [location, setLocation] = useState(initial.location);
  const [occupation, setOccupation] = useState(initial.occupation);
  const [languages, setLanguages] = useState(initial.languages);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);

    const langs = languages
      .split(",")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          bio,
          location,
          occupation,
          languages: langs,
        }),
      });
      if (!res.ok) {
        const { error } = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        toast.error(error || "Couldn't save profile");
        return;
      }
      toast.success("Profile updated");
      router.push(`/profile/${userId}`);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 space-y-5 rounded-2xl border border-border bg-white p-6"
    >
      <Field label="Name">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          maxLength={80}
          required
        />
      </Field>

      <Field
        label="About you"
        hint={`${bio.length}/${BIO_MAX}`}
      >
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
          placeholder="Tell guests and hosts a bit about yourself…"
          rows={5}
          className="resize-none"
        />
      </Field>

      <Field label="Location">
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="City, State"
          maxLength={120}
        />
      </Field>

      <Field label="Work">
        <Input
          value={occupation}
          onChange={(e) => setOccupation(e.target.value)}
          placeholder="Occupation (optional)"
          maxLength={120}
        />
      </Field>

      <Field
        label="Languages"
        hint="Comma-separated (e.g., English, Spanish)"
      >
        <Input
          value={languages}
          onChange={(e) => setLanguages(e.target.value)}
          placeholder="English"
          maxLength={300}
        />
      </Field>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:bg-foreground/90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <Label className="text-sm font-semibold">{label}</Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
