"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addEntry,
  deleteEntry,
  getEntries,
  searchLoggedFoods,
  type Entry,
  type FoodHistorySuggestion,
} from "../actions";
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
  const [adding, setAdding] = useState(false);
  const [suggestions, setSuggestions] = useState<FoodHistorySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (!session || !date || adding) return;
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
    setAdding(true);
    try {
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
      await loadEntries();
    } catch (err) {
      if (err instanceof Error && err.message === "SESSION_INVALID") {
        clearSession();
        router.replace("/");
        return;
      }
      setError("Failed to add entry. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  function handleFoodNameChange(value: string) {
    setForm({ ...form, foodName: value });
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      const results = await searchLoggedFoods(value);
      setSuggestions(results);
      setShowSuggestions(true);
    }, 300);
  }

  function handleSelectSuggestion(s: FoodHistorySuggestion) {
    setForm({
      foodName: s.foodName,
      quantity: s.quantity ?? "",
      kcal: String(s.kcal),
      protein: String(s.protein),
      carbs: String(s.carbs),
      fat: String(s.fat),
    });
    setShowSuggestions(false);
  }

  async function handleDelete(id: string) {
    const removed = entries.find((e) => e.id === id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    try {
      await deleteEntry(id);
    } catch {
      if (removed) {
        setEntries((prev) =>
          [...prev, removed].sort((a, b) =>
            a.createdAt.localeCompare(b.createdAt),
          ),
        );
      }
      setError("Failed to delete entry. Please try again.");
    }
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
          <div className="relative col-span-2">
            <input
              placeholder="Food name"
              value={form.foodName}
              onChange={(e) => handleFoodNameChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() =>
                setTimeout(() => setShowSuggestions(false), 150)
              }
              autoComplete="off"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-transparent"
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-gray-200 bg-white text-sm shadow-lg dark:border-gray-700 dark:bg-black">
                {suggestions.map((s) => (
                  <li key={s.foodName}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectSuggestion(s)}
                      className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-900"
                    >
                      <span>
                        {s.foodName}
                        {s.quantity ? (
                          <span className="text-gray-500"> · {s.quantity}</span>
                        ) : null}
                      </span>
                      <span className="text-xs text-gray-500">
                        {s.kcal} kcal · {s.protein}g P · {s.carbs}g C ·{" "}
                        {s.fat}g F
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
          disabled={adding}
          className="mt-1 rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {adding ? "Adding..." : "Add entry"}
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
