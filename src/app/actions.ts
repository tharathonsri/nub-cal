"use server";

import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { entries, users } from "@/db/schema";

export type Entry = typeof entries.$inferSelect;

export async function getOrCreateUser(rawName: string) {
  const name = rawName.trim();
  if (!name) throw new Error("Name is required");

  const existing = await db.query.users.findMany();
  const match = existing.find(
    (u) => u.name.toLowerCase() === name.toLowerCase(),
  );
  if (match) return match;

  const user = {
    id: randomUUID(),
    name,
    createdAt: new Date().toISOString(),
  };
  await db.insert(users).values(user);
  return user;
}

export async function getUserById(id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id));
  return rows[0] ?? null;
}

export async function getEntries(userId: string, loggedDate: string) {
  return db
    .select()
    .from(entries)
    .where(
      and(eq(entries.userId, userId), eq(entries.loggedDate, loggedDate)),
    )
    .orderBy(entries.createdAt);
}

export async function addEntry(input: {
  userId: string;
  loggedDate: string;
  foodName: string;
  quantity?: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}) {
  const user = await getUserById(input.userId);
  if (!user) throw new Error("SESSION_INVALID");

  const entry = {
    id: randomUUID(),
    userId: input.userId,
    loggedDate: input.loggedDate,
    foodName: input.foodName,
    quantity: input.quantity ?? null,
    kcal: input.kcal,
    protein: input.protein,
    carbs: input.carbs,
    fat: input.fat,
    createdAt: new Date().toISOString(),
  };
  await db.insert(entries).values(entry);
  return entry;
}

export async function deleteEntry(entryId: string) {
  await db.delete(entries).where(eq(entries.id, entryId));
}
