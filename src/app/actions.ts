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

export type FoodSuggestion = {
  fdcId: number;
  description: string;
  servingLabel: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

const USDA_NUTRIENT_NUMBERS = {
  kcal: "208",
  protein: "203",
  carbs: "205",
  fat: "204",
} as const;

export async function searchFood(query: string): Promise<FoodSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) return [];

  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("query", trimmed);
  url.searchParams.set("pageSize", "8");
  url.searchParams.set("dataType", "Foundation,SR Legacy");
  url.searchParams.set("api_key", apiKey);

  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    foods?: Array<{
      fdcId: number;
      description: string;
      servingSize?: number;
      servingSizeUnit?: string;
      foodNutrients: Array<{
        nutrientNumber?: string;
        nutrientId?: number;
        value?: number;
      }>;
    }>;
  };

  const nutrientValue = (
    nutrients: Array<{ nutrientNumber?: string; value?: number }>,
    number: string,
  ) => nutrients.find((n) => n.nutrientNumber === number)?.value ?? 0;

  return (data.foods ?? []).map((food) => ({
    fdcId: food.fdcId,
    description: food.description,
    servingLabel: food.servingSize
      ? `per ${food.servingSize}${food.servingSizeUnit ?? "g"}`
      : "per 100g",
    kcal: Math.round(nutrientValue(food.foodNutrients, USDA_NUTRIENT_NUMBERS.kcal)),
    protein: Math.round(nutrientValue(food.foodNutrients, USDA_NUTRIENT_NUMBERS.protein) * 10) / 10,
    carbs: Math.round(nutrientValue(food.foodNutrients, USDA_NUTRIENT_NUMBERS.carbs) * 10) / 10,
    fat: Math.round(nutrientValue(food.foodNutrients, USDA_NUTRIENT_NUMBERS.fat) * 10) / 10,
  }));
}
