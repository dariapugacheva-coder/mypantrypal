import { test } from "node:test";
import assert from "node:assert/strict";
import { RECIPES } from "@/lib/recipes/library";
import { rankRecipes, violatesAllergies } from "@/lib/recipes/engine";
import { demoData, defaultPreferences } from "@/lib/demo/seed";

test("allergies are strict exclusions", () => {
  const data = demoData("t");
  const prefs = { ...defaultPreferences("t"), allergies: ["Eggs", "Dairy"] };
  const ranked = rankRecipes(RECIPES, data.products, prefs, []);
  assert.ok(ranked.length > 0);
  for (const r of ranked) {
    assert.equal(violatesAllergies(r.recipe, ["Eggs", "Dairy"]), false, r.recipe.name);
    assert.ok(!r.recipe.ingredients.some((i) => /egg|milk|cheese|yogurt|butter/.test(i.key)), r.recipe.name);
  }
});

test("vegan preference only returns vegan recipes", () => {
  const prefs = { ...defaultPreferences("t"), dietary_preferences: ["Vegan"] };
  for (const r of rankRecipes(RECIPES, [], prefs, [])) assert.ok(r.recipe.tags.includes("vegan"));
});

test("recipes using expiring food rank higher", () => {
  const data = demoData("t");
  const top = rankRecipes(RECIPES, data.products, data.preferences, [])[0];
  assert.ok(top.expiringUsed.length > 0);
});
