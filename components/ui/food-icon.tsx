import { Apple, Beef, Carrot, Cookie, CupSoda, Croissant, Egg, Fish, Milk, Package, Snowflake, Wheat, type LucideIcon } from "lucide-react";
import type { Category } from "@/types/product";
import { cn } from "@/lib/utils";

const ICONS: Record<Category, LucideIcon> = {
  Fruits: Apple, Vegetables: Carrot, Dairy: Milk, Meat: Beef, Seafood: Fish, Eggs: Egg, Grains: Wheat, Bread: Croissant,
  "Frozen Food": Snowflake, Snacks: Cookie, Drinks: CupSoda, Other: Package
};

const TINTS: Record<Category, string> = {
  Fruits: "bg-sun-soft text-sun-ink", Vegetables: "bg-mint-soft text-mint-ink", Dairy: "bg-sky-soft text-sky-ink", Meat: "bg-danger-soft text-danger-ink",
  Seafood: "bg-sky-soft text-sky-ink", Eggs: "bg-sun-soft text-sun-ink", Grains: "bg-sun-soft text-sun-ink", Bread: "bg-sun-soft text-sun-ink",
  "Frozen Food": "bg-sky-soft text-sky-ink", Snacks: "bg-danger-soft text-danger-ink", Drinks: "bg-sky-soft text-sky-ink", Other: "bg-ice text-muted"
};

export function FoodIcon({ category, imageUrl, size = 48, className, name }: { category: Category; imageUrl?: string | null; size?: number; className?: string; name?: string }) {
  if (imageUrl && imageUrl.startsWith("data:")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt={name ?? ""} width={size} height={size} className={cn("shrink-0 rounded-xl object-cover", className)} style={{ width: size, height: size }} />;
  }
  const Icon = ICONS[category] ?? Package;
  return (
    <div className={cn("flex shrink-0 items-center justify-center rounded-xl", TINTS[category], className)} style={{ width: size, height: size }} aria-hidden>
      <Icon style={{ width: size * 0.48, height: size * 0.48 }} strokeWidth={1.8} />
    </div>
  );
}
