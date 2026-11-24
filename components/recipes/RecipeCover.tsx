"use client";
import { useState } from "react";
import type { Recipe } from "@/types/recipe";
import { cn } from "@/lib/utils";

/**
 * Food photos for the recipe library (free photos from Unsplash, Unsplash License).
 * Recipes without a photo (for example AI recipes) use the illustrated plate below,
 * and so does any photo that fails to load.
 */
const PHOTOS: Record<string, string> = {
  "egg-fried-rice": "photo-1512058564366-18510be2db19",
  "chicken-spinach-wrap": "photo-1626700051175-6818013e1d4f",
  "greek-yogurt-bowl": "photo-1494390248081-4e521a5940db",
  "tuna-pasta": "photo-1603220026645-e0fdf221b1e8",
  "vegetable-omelette": "photo-1510693206972-df098062cb71",
  "spinach-chicken-omelette": "photo-1677844592730-ce9c936d8f1a",
  "chicken-rice-bowl": "photo-1546069901-ba9599a7e63c",
  "banana-oat-pancakes": "photo-1528207776546-365bb710ee93",
  "tomato-egg-stir-fry": "photo-1759216280661-e785edc3922e",
  "cheesy-spinach-toast": "photo-1528736235302-52922df5c122",
  "black-bean-burrito-bowl": "photo-1658346368601-869ae3ded6d1",
  "chickpea-spinach-curry": "photo-1585937421612-70a008356fbe",
  "tofu-veggie-stir-fry": "photo-1601226809816-b8c32440158a",
  "salmon-rice-bowl": "photo-1771154141872-e5ad3905a385",
  "peanut-butter-banana-toast": "photo-1528945522327-7032b0774637",
  "chicken-tomato-pasta": "photo-1751022910692-d0a1c3198d52",
  "overnight-oats": "photo-1497888329096-51c27beff665",
  "potato-egg-hash": "photo-1717568511286-09f24660363d"
};

const photoUrl = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=70`;

export function RecipeCover({ recipe, className, rounded = "rounded-2xl" }: { recipe: Recipe; className?: string; rounded?: string }) {
  const [failed, setFailed] = useState(false);
  const photo = PHOTOS[recipe.id];
  if (photo && !failed) {
    return (
      <div className={cn("relative overflow-hidden bg-ice", rounded, className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl(photo)} alt={recipe.name} loading="lazy" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      </div>
    );
  }
  return <IllustratedCover recipe={recipe} className={className} rounded={rounded} />;
}

/** Illustrated recipe cover: a plate seen from above with the recipe's colors. */
function IllustratedCover({ recipe, className, rounded }: { recipe: Recipe; className?: string; rounded: string }) {
  const [a, b] = recipe.palette;
  const seed = [...recipe.id].reduce((s, c) => s + c.charCodeAt(0), 0);
  const dots = Array.from({ length: 9 }, (_, i) => {
    const ang = ((seed * (i + 3)) % 360) * (Math.PI / 180);
    const r = 14 + ((seed * (i + 7)) % 18);
    return { x: 100 + Math.cos(ang) * r, y: 62 + Math.sin(ang) * r * 0.8, s: 4 + ((seed + i * 5) % 6), c: i % 3 === 0 ? b : i % 3 === 1 ? a : "#FFFFFF" };
  });
  return (
    <div className={cn("relative overflow-hidden bg-ice", rounded, className)} aria-hidden>
      <svg viewBox="0 0 200 124" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
        <rect width="200" height="124" fill={b} opacity="0.22" />
        <circle cx="30" cy="20" r="26" fill={a} opacity="0.18" />
        <circle cx="178" cy="108" r="34" fill={b} opacity="0.2" />
        <ellipse cx="100" cy="66" rx="52" ry="44" fill="#000" opacity="0.06" />
        <ellipse cx="100" cy="62" rx="52" ry="44" fill="#FFFFFF" />
        <ellipse cx="100" cy="62" rx="40" ry="33" fill="#F7F9F8" stroke="#E6ECE9" strokeWidth="1.5" />
        <ellipse cx="100" cy="62" rx="30" ry="24" fill={a} opacity="0.9" />
        {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.s} fill={d.c} opacity={0.95} />)}
        <path d="M100 52 c6 -8 16 -6 14 2 c-2 6 -10 8 -14 4 Z" fill={b} />
        <rect x="160" y="22" width="5" height="70" rx="2.5" fill="#FFFFFF" opacity="0.9" />
        <rect x="35" y="22" width="5" height="70" rx="2.5" fill="#FFFFFF" opacity="0.9" />
      </svg>
    </div>
  );
}
