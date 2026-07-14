"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addEntry, deleteEntry, getEntries, type Entry } from "../actions";
import { clearSession, getSession, todayLocalDate, type Session } from "@/lib/session";

const emptyForm = {
  foodName: "",
  quantity: "",
  kcal: "",
  protein: "",
  carbs: "",
  fat: "",
};

function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function LogPage() {
  const router = useRouter();
  const [session, setSessionState] = useState<Session | null>(null);
  const [date, setDate] = useState<string>("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.replace("/");
      return;
    }
    setSessionState(s);
    setDate(todayLocalDate());
  }, [router]);

  const loadEntries = useCallback(async () => {
    if (!session || !date) return;
    setLoading(true);
    const rows = await getEntries(session.id, date);
    setEntries(rows);
    setLoading(false);
  }, [session, date]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !date) return;
    const kcal = Number(form.kcal);
    const protein = Number(form.protein);
    const carbs = Number(form.carbs);
    const fat = Number(form.fat);
    if (!form.foodName.trim()) {
      setError("Food name is required.");
      return;
    }
    if ([kcal, protein, carbs, fat].some((n) => Number.isNaN(n) || n < 0)) {
      setError("Macro values must be non-negative numbers.");
      return;
    }
    setError(null);
    await addEntry({
      userId: session.id,
      loggedDate: date,
      foodName: form.foodName.trim(),
      quantity: form.quantity.trim() || undefined,
      kcal,
      protein,
      carbs,
      fat,
    });
    setForm(emptyForm);
    loadEntries();
  }

  async function handleDelete(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await deleteEntry(id);
  }

  function handleSwitchUser() {
    clearSession();
    router.replace("/");
  }

  if (!session || !date) return null;

  const totals = entries.reduce(
    (acc, e) => ({
      kcal: acc.kcal + e.kcal,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Hi, {session.name}</h1>
          <p className="text-sm text-gray-500">Your daily nutrition log</p>
        </div>
        <button
          onClick={handleSwitchUser}
          className="text-sm text-gray-500 underline"
        >
          Not you? Switch user
        </button>
      </header>

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setDate((d) => shiftDate(d, -1))}
          className="rounded-md border border-gray-300 px-3 py-1 dark:border-gray-700"
        >
          ← Prev
        </button>
        <span className="font-medium">{date}</span>
        <button
          onClick={() => setDate((d) => shiftDate(d, 1))}
          className="rounded-md border border-gray-300 px-3 py-1 dark:border-gray-700"
        >
          Next →
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 rounded-md border border-gray-200 p-4 text-center dark:border-gray-800">
        <div>
          <div className="text-lg font-semibold">{totals.kcal}</div>
          <div className="text-xs text-gray-500">kcal</div>
        </div>
        <div>
          <div className="text-lg font-semibold">{totals.protein}g</div>
          <div className="text-xs text-gray-500">protein</div>
        </div>
        <div>
          <div className="text-lg font-semibold">{totals.carbs}g</div>
          <div className="text-xs text-gray-500">carbs</div>
        </div>
        <div>
          <div className="text-lg font-semibold">{totals.fat}g</div>
          <div className="text-xs text-gray-500">fat</div>
        </div>
      </div>

      <form
        onSubmit={handleAdd}
        className="flex flex-col gap-2 rounded-md border border-gray-200 p-4 dark:border-gray-800"
      >
        <h2 className="text-sm font-medium">Add entry</h2>
        <div className="grid grid-cols-2 gap-2">
          <input
            placeholder="Food name"
            value={form.foodName}
            onChange={(e) => setForm({ ...form, foodName: e.target.value })}
            className="col-span-2 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-transparent"
          />
          <input
            placeholder="Quantity (e.g. 1 cup)"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            className="col-span-2 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-transparent"
          />
          <input
            placeholder="kcal"
            inputMode="decimal"
            value={form.kcal}
            onChange={(e) => setForm({ ...form, kcal: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-transparent"
          />
          <input
            placeholder="protein (g)"
            inputMode="decimal"
            value={form.protein}
            onChange={(e) => setForm({ ...form, protein: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-transparent"
          />
          <input
            placeholder="carbs (g)"
            inputMode="decimal"
            value={form.carbs}
            onChange={(e) => setForm({ ...form, carbs: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-transparent"
          />
          <input
            placeholder="fat (g)"
            inputMode="decimal"
            value={form.fat}
            onChange={(e) => setForm({ ...form, fat: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-transparent"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          className="mt-1 rounded-md bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
        >
          Add entry
        </button>
      </form>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Entries</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-gray-500">No entries yet for this day.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm dark:border-gray-800"
              >
                <div>
                  <div className="font-medium">
                    {e.foodName}
                    {e.quantity ? (
                      <span className="text-gray-500"> · {e.quantity}</span>
                    ) : null}
                  </div>
                  <div className="text-xs text-gray-500">
                    {e.kcal} kcal · {e.protein}g protein · {e.carbs}g carbs ·{" "}
                    {e.fat}g fat
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(e.id)}
                  className="text-xs text-red-500"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
