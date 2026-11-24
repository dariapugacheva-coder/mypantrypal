import type { Recipe, RecipeIngredient, RecipeStep } from "@/types/recipe";
import type { Category } from "@/types/product";

/** Compact ingredient helper: [name, key, amount, unit, category, cost, optional?] */
type I = [string, string, number, string, Category, number, boolean?];
const ing = (rows: I[]): RecipeIngredient[] =>
  rows.map(([name, key, amount, unit, category, cost, optional]) => ({ name, key, amount, unit, category, cost, optional: optional || undefined }));
const steps = (rows: (string | [string, number])[]): RecipeStep[] =>
  rows.map((r) => (typeof r === "string" ? { text: r } : { text: r[0], timer_seconds: r[1] }));

/** The local recipe database. Used directly in demo mode and seeded into the shared recipes table. */
export const RECIPES: Recipe[] = [
  {
    id: "egg-fried-rice", name: "High-Protein Egg Fried Rice", cuisine: "Asian", source: "library",
    description: "Leftover rice, eggs and a handful of greens turned into a 15-minute dinner.",
    preparation_time: 15, difficulty: "Easy", servings: 1, calories: 480, protein: 22, carbohydrates: 62, fat: 15,
    ingredients: ing([
      ["Cooked rice", "rice", 1, "cup", "Grains", 0.4], ["Eggs", "egg", 2, "pcs", "Eggs", 0.6],
      ["Frozen peas", "peas", 0.5, "cup", "Frozen Food", 0.4, true], ["Spinach", "spinach", 1, "cup", "Vegetables", 0.5, true],
      ["Soy sauce", "soy sauce", 1, "tbsp", "Other", 0.1]
    ]),
    instructions: steps([
      "Heat a pan with a little oil over medium-high heat.",
      ["Scramble the eggs until just set, then push them to the side.", 120],
      ["Add the rice and peas and stir-fry until hot.", 240],
      "Stir in the spinach and soy sauce, mix with the eggs and serve."
    ]),
    tags: ["high-protein", "quick", "budget"], allergens: ["eggs", "soy"], palette: ["#F2C94C", "#8BCFB0"]
  },
  {
    id: "chicken-spinach-wrap", name: "Chicken and Spinach Wrap", cuisine: "American", source: "library",
    description: "A filling lunch wrap with chicken, spinach, tomato and a yogurt sauce.",
    preparation_time: 20, difficulty: "Easy", servings: 1, calories: 520, protein: 45, carbohydrates: 40, fat: 18,
    ingredients: ing([
      ["Large tortilla", "tortilla", 1, "pcs", "Bread", 0.5], ["Chicken breast", "chicken breast", 120, "g", "Meat", 1.6],
      ["Spinach", "spinach", 1, "cup", "Vegetables", 0.5], ["Tomato", "tomato", 1, "pcs", "Vegetables", 0.4],
      ["Greek yogurt", "greek yogurt", 2, "tbsp", "Dairy", 0.3], ["Cheese", "cheese", 20, "g", "Dairy", 0.4, true]
    ]),
    instructions: steps([
      "Slice the chicken into thin strips and season with salt and pepper.",
      ["Cook the chicken in a hot pan until golden and cooked through.", 480],
      "Mix the yogurt with a pinch of salt and a squeeze of lemon if you have it.",
      "Fill the tortilla with spinach, tomato, chicken and sauce, then roll it up."
    ]),
    tags: ["high-protein", "quick", "healthy"], allergens: ["gluten", "dairy"], palette: ["#E8A87C", "#8BCFB0"]
  },
  {
    id: "greek-yogurt-bowl", name: "Greek Yogurt Protein Bowl", cuisine: "Breakfast", source: "library",
    description: "Creamy yogurt with banana and oats. Breakfast in five minutes.",
    preparation_time: 5, difficulty: "Easy", servings: 1, calories: 380, protein: 24, carbohydrates: 58, fat: 5,
    ingredients: ing([
      ["Greek yogurt", "greek yogurt", 1, "cup", "Dairy", 1.2], ["Banana", "banana", 1, "pcs", "Fruits", 0.3],
      ["Oats", "oats", 0.25, "cup", "Grains", 0.15], ["Honey", "honey", 1, "tsp", "Other", 0.1, true]
    ]),
    instructions: steps(["Spoon the yogurt into a bowl.", "Slice the banana on top.", "Sprinkle with oats and drizzle with honey."]),
    tags: ["high-protein", "quick", "vegetarian", "healthy", "few-ingredients", "budget"], allergens: ["dairy", "gluten"], palette: ["#F2C94C", "#D9E8F5"]
  },
  {
    id: "tuna-pasta", name: "Tuna Pasta", cuisine: "Italian", source: "library",
    description: "Pantry pasta with canned tuna, tomato and spinach.",
    preparation_time: 20, difficulty: "Easy", servings: 1, calories: 560, protein: 42, carbohydrates: 70, fat: 10,
    ingredients: ing([
      ["Pasta", "pasta", 100, "g", "Grains", 0.3], ["Canned tuna", "tuna", 1, "can", "Seafood", 1.3],
      ["Tomato", "tomato", 2, "pcs", "Vegetables", 0.8], ["Spinach", "spinach", 1, "cup", "Vegetables", 0.5, true],
      ["Cheese", "cheese", 15, "g", "Dairy", 0.3, true]
    ]),
    instructions: steps([
      ["Boil the pasta in salted water until al dente.", 600],
      "Chop the tomatoes and warm them in a pan with a little oil until soft.",
      "Add the drained tuna and spinach and stir for one minute.",
      "Toss with the pasta and top with cheese."
    ]),
    tags: ["high-protein", "budget"], allergens: ["fish", "gluten"], palette: ["#EF8A6F", "#F2C94C"]
  },
  {
    id: "vegetable-omelette", name: "Vegetable Omelette", cuisine: "French", source: "library",
    description: "Three eggs with whatever vegetables need using up.",
    preparation_time: 12, difficulty: "Easy", servings: 1, calories: 360, protein: 25, carbohydrates: 7, fat: 26,
    ingredients: ing([
      ["Eggs", "egg", 3, "pcs", "Eggs", 0.9], ["Spinach", "spinach", 1, "cup", "Vegetables", 0.5],
      ["Tomato", "tomato", 1, "pcs", "Vegetables", 0.4], ["Cheese", "cheese", 20, "g", "Dairy", 0.4],
      ["Bell pepper", "bell pepper", 0.5, "pcs", "Vegetables", 0.5, true]
    ]),
    instructions: steps([
      "Whisk the eggs with a pinch of salt.",
      "Chop the vegetables and soften them in a pan for two minutes.",
      ["Pour in the eggs and cook on medium-low until almost set.", 180],
      "Add the cheese, fold the omelette in half and serve."
    ]),
    tags: ["high-protein", "quick", "vegetarian", "healthy", "few-ingredients"], allergens: ["eggs", "dairy"], palette: ["#F2C94C", "#EF8A6F"]
  },
  {
    id: "spinach-chicken-omelette", name: "Spinach and Chicken Omelette", cuisine: "American", source: "library",
    description: "Uses up spinach and leftover chicken. 38 g of protein.",
    preparation_time: 15, difficulty: "Easy", servings: 1, calories: 420, protein: 38, carbohydrates: 4, fat: 27,
    ingredients: ing([
      ["Eggs", "egg", 3, "pcs", "Eggs", 0.9], ["Chicken breast", "chicken breast", 60, "g", "Meat", 0.8],
      ["Spinach", "spinach", 1, "cup", "Vegetables", 0.5], ["Cheese", "cheese", 15, "g", "Dairy", 0.3, true]
    ]),
    instructions: steps([
      ["Dice the chicken and cook it in a pan until hot all the way through.", 300],
      "Add the spinach and stir until it wilts.",
      ["Pour over the whisked eggs and cook until set.", 180],
      "Sprinkle with cheese, fold and serve."
    ]),
    tags: ["high-protein", "quick", "few-ingredients"], allergens: ["eggs", "dairy"], palette: ["#8BCFB0", "#F2C94C"]
  },
  {
    id: "chicken-rice-bowl", name: "Chicken Rice Bowl", cuisine: "Asian", source: "library",
    description: "Garlicky chicken over rice with greens. Good for meal prep.",
    preparation_time: 25, difficulty: "Easy", servings: 1, calories: 610, protein: 52, carbohydrates: 65, fat: 12,
    ingredients: ing([
      ["Chicken breast", "chicken breast", 150, "g", "Meat", 2], ["Rice", "rice", 0.5, "cup", "Grains", 0.3],
      ["Spinach", "spinach", 1, "cup", "Vegetables", 0.5], ["Soy sauce", "soy sauce", 1, "tbsp", "Other", 0.1],
      ["Garlic", "garlic", 1, "clove", "Vegetables", 0.1, true]
    ]),
    instructions: steps([
      ["Cook the rice.", 900],
      ["Cut the chicken into cubes and cook with garlic until golden.", 480],
      "Add soy sauce and the spinach and toss until the spinach wilts.",
      "Serve the chicken over the rice."
    ]),
    tags: ["high-protein", "budget", "healthy"], allergens: ["soy"], palette: ["#E8A87C", "#D9E8F5"]
  },
  {
    id: "banana-oat-pancakes", name: "Banana Oat Pancakes", cuisine: "Breakfast", source: "library",
    description: "Three-ingredient pancakes that rescue overripe bananas.",
    preparation_time: 15, difficulty: "Easy", servings: 1, calories: 390, protein: 17, carbohydrates: 55, fat: 11,
    ingredients: ing([
      ["Banana", "banana", 1, "pcs", "Fruits", 0.3], ["Eggs", "egg", 2, "pcs", "Eggs", 0.6],
      ["Oats", "oats", 0.5, "cup", "Grains", 0.3], ["Milk", "milk", 2, "tbsp", "Dairy", 0.1, true]
    ]),
    instructions: steps([
      "Mash the banana and mix with the eggs and oats.",
      ["Rest the batter so the oats soften.", 300],
      ["Cook small pancakes on a lightly oiled pan, two minutes per side.", 240]
    ]),
    tags: ["quick", "vegetarian", "budget", "few-ingredients"], allergens: ["eggs", "gluten"], palette: ["#F2C94C", "#E8A87C"]
  },
  {
    id: "tomato-egg-stir-fry", name: "Tomato and Egg Stir-Fry", cuisine: "Chinese", source: "library",
    description: "A classic home dish: soft eggs in a sweet-savory tomato sauce over rice.",
    preparation_time: 15, difficulty: "Easy", servings: 1, calories: 470, protein: 21, carbohydrates: 58, fat: 17,
    ingredients: ing([
      ["Eggs", "egg", 3, "pcs", "Eggs", 0.9], ["Tomato", "tomato", 2, "pcs", "Vegetables", 0.8],
      ["Rice", "rice", 0.5, "cup", "Grains", 0.3], ["Sugar", "sugar", 1, "tsp", "Other", 0.02]
    ]),
    instructions: steps([
      ["Cook the rice.", 900],
      "Scramble the eggs softly and set them aside.",
      ["Cook the chopped tomatoes with sugar and a pinch of salt until saucy.", 240],
      "Return the eggs to the pan, stir gently and serve over rice."
    ]),
    tags: ["vegetarian", "quick", "budget", "few-ingredients"], allergens: ["eggs"], palette: ["#EF5350", "#F2C94C"]
  },
  {
    id: "cheesy-spinach-toast", name: "Cheesy Spinach Toast", cuisine: "American", source: "library",
    description: "Crispy toast with melted cheese, spinach and tomato.",
    preparation_time: 10, difficulty: "Easy", servings: 1, calories: 380, protein: 20, carbohydrates: 32, fat: 19,
    ingredients: ing([
      ["Bread", "bread", 2, "slices", "Bread", 0.4], ["Cheese", "cheese", 40, "g", "Dairy", 0.8],
      ["Spinach", "spinach", 1, "cup", "Vegetables", 0.5], ["Tomato", "tomato", 1, "pcs", "Vegetables", 0.4, true]
    ]),
    instructions: steps(["Toast the bread lightly.", "Top with spinach, tomato slices and cheese.", ["Grill or bake until the cheese melts.", 240]]),
    tags: ["vegetarian", "quick", "few-ingredients", "budget"], allergens: ["gluten", "dairy"], palette: ["#F2C94C", "#8BCFB0"]
  },
  {
    id: "black-bean-burrito-bowl", name: "Black Bean Burrito Bowl", cuisine: "Mexican", source: "library",
    description: "Rice, beans and fresh tomato salsa. Plant-based and cheap.",
    preparation_time: 20, difficulty: "Easy", servings: 1, calories: 520, protein: 18, carbohydrates: 92, fat: 9,
    ingredients: ing([
      ["Rice", "rice", 0.5, "cup", "Grains", 0.3], ["Black beans", "beans", 1, "can", "Grains", 0.9],
      ["Tomato", "tomato", 1, "pcs", "Vegetables", 0.4], ["Onion", "onion", 0.5, "pcs", "Vegetables", 0.2],
      ["Avocado", "avocado", 0.5, "pcs", "Fruits", 0.6, true]
    ]),
    instructions: steps([["Cook the rice.", 900], "Warm the beans with cumin and salt.", "Dice the tomato and onion for a quick salsa.", "Layer rice, beans, salsa and avocado in a bowl."]),
    tags: ["vegan", "vegetarian", "budget", "healthy"], allergens: [], palette: ["#4B3B2F", "#8BCFB0"]
  },
  {
    id: "chickpea-spinach-curry", name: "Chickpea and Spinach Curry", cuisine: "Indian", source: "library",
    description: "A mild one-pot curry that uses a whole bag of spinach.",
    preparation_time: 30, difficulty: "Medium", servings: 2, calories: 540, protein: 19, carbohydrates: 82, fat: 15,
    ingredients: ing([
      ["Chickpeas", "chickpeas", 1, "can", "Grains", 0.9], ["Spinach", "spinach", 2, "cup", "Vegetables", 1],
      ["Tomato", "tomato", 2, "pcs", "Vegetables", 0.8], ["Onion", "onion", 1, "pcs", "Vegetables", 0.3],
      ["Garlic", "garlic", 2, "clove", "Vegetables", 0.2], ["Rice", "rice", 1, "cup", "Grains", 0.6]
    ]),
    instructions: steps([
      ["Cook the rice.", 900],
      ["Soften the onion and garlic with curry powder.", 300],
      ["Add tomatoes and chickpeas and simmer.", 600],
      "Stir in the spinach until it wilts and serve over rice."
    ]),
    tags: ["vegan", "vegetarian", "healthy", "budget"], allergens: [], palette: ["#F2C94C", "#4B9B79"]
  },
  {
    id: "tofu-veggie-stir-fry", name: "Tofu Veggie Stir-Fry", cuisine: "Asian", source: "library",
    description: "Crispy tofu with peppers and soy sauce over rice.",
    preparation_time: 25, difficulty: "Medium", servings: 1, calories: 500, protein: 26, carbohydrates: 60, fat: 17,
    ingredients: ing([
      ["Firm tofu", "tofu", 150, "g", "Other", 1.2], ["Bell pepper", "bell pepper", 1, "pcs", "Vegetables", 1],
      ["Rice", "rice", 0.5, "cup", "Grains", 0.3], ["Soy sauce", "soy sauce", 2, "tbsp", "Other", 0.2],
      ["Garlic", "garlic", 1, "clove", "Vegetables", 0.1, true]
    ]),
    instructions: steps([["Cook the rice.", 900], ["Fry cubed tofu until golden on all sides.", 480], ["Add sliced pepper and garlic and stir-fry.", 180], "Splash in soy sauce, toss and serve."]),
    tags: ["vegan", "vegetarian", "high-protein", "healthy"], allergens: ["soy"], palette: ["#E8A87C", "#EF5350"]
  },
  {
    id: "salmon-rice-bowl", name: "Salmon Rice Bowl", cuisine: "Japanese", source: "library",
    description: "Pan-seared salmon with rice, cucumber and soy.",
    preparation_time: 25, difficulty: "Medium", servings: 1, calories: 590, protein: 34, carbohydrates: 58, fat: 23,
    ingredients: ing([
      ["Salmon fillet", "salmon", 120, "g", "Seafood", 3.5], ["Rice", "rice", 0.5, "cup", "Grains", 0.3],
      ["Cucumber", "cucumber", 0.5, "pcs", "Vegetables", 0.4], ["Soy sauce", "soy sauce", 1, "tbsp", "Other", 0.1]
    ]),
    instructions: steps([["Cook the rice.", 900], ["Sear the salmon skin-side down, then flip.", 420], "Slice the cucumber.", "Serve salmon over rice with cucumber and soy sauce."]),
    tags: ["high-protein", "healthy"], allergens: ["fish", "soy"], palette: ["#EF8A6F", "#D9E8F5"]
  },
  {
    id: "peanut-butter-banana-toast", name: "Peanut Butter Banana Toast", cuisine: "Breakfast", source: "library",
    description: "The fastest breakfast that still keeps you full.",
    preparation_time: 5, difficulty: "Easy", servings: 1, calories: 420, protein: 14, carbohydrates: 55, fat: 17,
    ingredients: ing([
      ["Bread", "bread", 2, "slices", "Bread", 0.4], ["Peanut butter", "peanut butter", 2, "tbsp", "Other", 0.3],
      ["Banana", "banana", 1, "pcs", "Fruits", 0.3]
    ]),
    instructions: steps(["Toast the bread.", "Spread with peanut butter.", "Top with sliced banana."]),
    tags: ["vegan", "vegetarian", "quick", "budget", "few-ingredients"], allergens: ["peanuts", "gluten"], palette: ["#C68B59", "#F2C94C"]
  },
  {
    id: "chicken-tomato-pasta", name: "Chicken Tomato Pasta", cuisine: "Italian", source: "library",
    description: "Weeknight pasta with chicken, tomato and garlic.",
    preparation_time: 25, difficulty: "Easy", servings: 1, calories: 640, protein: 48, carbohydrates: 72, fat: 15,
    ingredients: ing([
      ["Pasta", "pasta", 100, "g", "Grains", 0.3], ["Chicken breast", "chicken breast", 120, "g", "Meat", 1.6],
      ["Tomato", "tomato", 2, "pcs", "Vegetables", 0.8], ["Garlic", "garlic", 1, "clove", "Vegetables", 0.1],
      ["Cheese", "cheese", 15, "g", "Dairy", 0.3, true]
    ]),
    instructions: steps([["Boil the pasta.", 600], ["Cook diced chicken with garlic.", 420], ["Add chopped tomatoes and simmer into a sauce.", 300], "Toss with the pasta and top with cheese."]),
    tags: ["high-protein"], allergens: ["gluten"], palette: ["#EF5350", "#E8A87C"]
  },
  {
    id: "overnight-oats", name: "Overnight Oats", cuisine: "Breakfast", source: "library",
    description: "Make it tonight, eat it tomorrow. Uses up milk before it expires.",
    preparation_time: 5, difficulty: "Easy", servings: 1, calories: 410, protein: 22, carbohydrates: 60, fat: 8,
    ingredients: ing([
      ["Oats", "oats", 0.5, "cup", "Grains", 0.3], ["Milk", "milk", 0.5, "cup", "Dairy", 0.3],
      ["Greek yogurt", "greek yogurt", 0.5, "cup", "Dairy", 0.6], ["Banana", "banana", 0.5, "pcs", "Fruits", 0.15, true]
    ]),
    instructions: steps(["Mix the oats, milk and yogurt in a jar.", "Refrigerate overnight.", "Top with banana in the morning."]),
    tags: ["vegetarian", "quick", "healthy", "few-ingredients", "budget"], allergens: ["dairy", "gluten"], palette: ["#D9E8F5", "#F2C94C"]
  },
  {
    id: "potato-egg-hash", name: "Potato and Egg Hash", cuisine: "American", source: "library",
    description: "Crispy potatoes and onions topped with fried eggs.",
    preparation_time: 25, difficulty: "Medium", servings: 1, calories: 450, protein: 19, carbohydrates: 45, fat: 21,
    ingredients: ing([
      ["Potato", "potato", 1, "pcs", "Vegetables", 0.4], ["Eggs", "egg", 2, "pcs", "Eggs", 0.6],
      ["Onion", "onion", 0.5, "pcs", "Vegetables", 0.2], ["Bell pepper", "bell pepper", 0.5, "pcs", "Vegetables", 0.5, true]
    ]),
    instructions: steps([["Dice the potato and fry until crisp.", 720], ["Add the onion and pepper and cook until soft.", 240], ["Make two wells and crack in the eggs; cover until set.", 240]]),
    tags: ["vegetarian", "budget"], allergens: ["eggs"], palette: ["#E8A87C", "#F2C94C"]
  }
];

export const getLibraryRecipe = (id: string) => RECIPES.find((r) => r.id === id) ?? null;
