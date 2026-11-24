"use client";
import { useMemo } from "react";
import type { AppData } from "@/types/database";
import type { Recipe } from "@/types/recipe";
import { RECIPES } from "./library";
import { rankRecipes, type RankOptions } from "./engine";

export function allRecipes(data: AppData): Recipe[] {
  return [...data.user_recipes, ...RECIPES];
}

export function findRecipe(data: AppData, id: string): Recipe | null {
  return allRecipes(data).find((r) => r.id === id) ?? null;
}

export function useRankedRecipes(data: AppData, opts: RankOptions = {}) {
  const key = JSON.stringify(opts);
  return useMemo(
    () => rankRecipes(allRecipes(data), data.products, data.preferences, data.recipe_ratings, opts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.products, data.preferences, data.recipe_ratings, data.user_recipes, key]
  );
}
