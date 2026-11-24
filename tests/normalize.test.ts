import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeName, productKey, sameProduct, guessCategory } from "@/lib/etl/normalize";
import { parseReceiptText } from "@/lib/ocr/parse-text";

test("product names normalize to one key", () => {
  assert.equal(productKey("Eggs"), "egg");
  assert.equal(productKey("  large EGGS "), productKey("egg"));
  assert.equal(productKey("Tomatoes"), "tomato");
  assert.ok(sameProduct("Bananas", "banana"));
  assert.equal(normalizeName("Milk 2%").key, "milk");
});

test("categories are guessed from names", () => {
  assert.equal(guessCategory("chicken breast"), "Meat");
  assert.equal(guessCategory("spinach"), "Vegetables");
});

test("receipt text parsing skips totals and splits quantities", () => {
  const lines = parseReceiptText("Milk 3.49\n2 x Greek yogurt 11.98\nTOTAL 15.47\nTax 0.00");
  assert.equal(lines.length, 2);
  assert.equal(lines[1].quantity, 2);
  assert.equal(lines[1].unit_price, 5.99);
});
