"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateUser } from "./actions";
import { getSession, setSession } from "@/lib/session";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (session) {
      router.replace("/log");
    } else {
      setCheckingSession(false);
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const user = await getOrCreateUser(name);
      setSession({ id: user.id, name: user.name });
      router.push("/log");
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (checkingSession) return null;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Nub Cal</h1>
        <p className="mt-2 text-sm text-gray-500">
          Track your daily kcal, protein, carbs, and fat.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-3"
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name to continue"
          autoFocus
          className="rounded-md border border-gray-300 px-4 py-2 text-base outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-transparent"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {submitting ? "Continuing..." : "Continue"}
        </button>
      </form>
      <p className="max-w-sm text-center text-xs text-gray-400">
        No password needed. If you&apos;ve used this name before, we&apos;ll
        resume your log. Anyone who types the same name can see and add to
        that log.
      </p>
    </main>
  );
}
