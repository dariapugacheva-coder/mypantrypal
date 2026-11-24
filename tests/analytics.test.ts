import { test } from "node:test";
import assert from "node:assert/strict";
import { budgetStatus, expiringSoon, wasteStats } from "@/lib/analytics";
import { demoData } from "@/lib/demo/seed";
import { toDateKey } from "@/lib/utils";

test("budget warning levels at 75, 90 and 100 percent", () => {
  const d = demoData("t");
  const mk = (amount: number) => ({ ...d, preferences: { ...d.preferences, budget_settings: { weekly: 100, monthly: 400 } }, transactions: [{ id: "x", user_id: "t", store_name: "s", total_amount: amount, purchase_date: toDateKey(), receipt_image_url: null, created_at: new Date().toISOString() }] });
  assert.equal(budgetStatus(mk(50)).levelWeek, 0);
  assert.equal(budgetStatus(mk(76)).levelWeek, 75);
  assert.equal(budgetStatus(mk(91)).levelWeek, 90);
  assert.equal(budgetStatus(mk(100)).levelWeek, 100);
});

test("demo data has items expiring soon and waste stats", () => {
  const d = demoData("t");
  assert.ok(expiringSoon(d.products, 3).length >= 3);
  const w = wasteStats(d);
  assert.ok(w.usedBeforeExpiry > 0);
  assert.ok(w.wasteRate >= 0 && w.wasteRate <= 1);
});
