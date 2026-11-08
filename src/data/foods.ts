// Food database. Nutrition is per 100 g of the food as you buy/weigh it
// (raw meat & fish, dry grains & pasta, drained canned food). Values are rounded
// averages checked against USDA FoodData Central; a few (milk, svježi sir, šunka)
// use typical Croatian supermarket values instead.

export type Allergen = 'gluten' | 'milk' | 'eggs' | 'fish' | 'shellfish' | 'peanuts' | 'treeNuts' | 'soy' | 'sesame';
export const ALLERGENS: Allergen[] = ['gluten', 'milk', 'eggs', 'fish', 'shellfish', 'peanuts', 'treeNuts', 'soy', 'sesame'];

/** Animal-origin flags used by diet styles (vegetarian, vegan, …). */
export type Origin = 'meat' | 'pork' | 'fish' | 'dairy' | 'egg' | 'honey';

export type FoodCategory = 'protein' | 'dairy' | 'grain' | 'vegetable' | 'fruit' | 'fat' | 'treat' | 'other';
export const FOOD_CATEGORIES: FoodCategory[] = ['protein', 'dairy', 'grain', 'vegetable', 'fruit', 'fat', 'treat', 'other'];

export interface Nutrients {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface Food {
  id: string;
  name: { en: string; hr: string };
  category: FoodCategory;
  per100: Nutrients;
  /** Allowed portion in grams: min, max and the step to round to. */
  portion: { min: number; max: number; step: number };
  /** Weight of one piece (egg, banana, tortilla…) — shown as "2×". */
  unitG?: number;
  allergens?: Allergen[];
  origin?: Origin[];
  /** Ingredient name on TheMealDB for the photo. */
  img?: string;
}

const n = (kcal: number, protein: number, carbs: number, fat: number, fiber = 0): Nutrients => ({
  kcal,
  protein,
  carbs,
  fat,
  fiber,
});
const p = (min: number, max: number, step: number) => ({ min, max, step });

export const FOODS: Food[] = [
  /* ---------- Protein ---------- */
  { id: 'chicken_breast', name: { en: 'Chicken breast', hr: 'Pileća prsa' }, category: 'protein', per100: n(120, 22.5, 0, 2.6), portion: p(80, 250, 10), origin: ['meat'], img: 'Chicken Breast' },
  { id: 'turkey_breast', name: { en: 'Turkey breast', hr: 'Pureća prsa' }, category: 'protein', per100: n(114, 23.7, 0, 1.5), portion: p(80, 250, 10), origin: ['meat'], img: 'Turkey Mince' },
  { id: 'beef_mince', name: { en: 'Lean beef mince', hr: 'Mljevena junetina' }, category: 'protein', per100: n(137, 21, 0, 5.5), portion: p(80, 220, 10), origin: ['meat'], img: 'Lean Minced Beef' },
  { id: 'pork_loin', name: { en: 'Pork loin', hr: 'Svinjski lungić' }, category: 'protein', per100: n(109, 21, 0, 2.2), portion: p(80, 220, 10), origin: ['meat', 'pork'], img: 'Pork' },
  { id: 'salmon', name: { en: 'Salmon', hr: 'Losos' }, category: 'protein', per100: n(208, 20, 0, 13.4), portion: p(80, 200, 10), allergens: ['fish'], origin: ['fish'], img: 'Salmon' },
  { id: 'hake', name: { en: 'Hake', hr: 'Oslić' }, category: 'protein', per100: n(86, 18.3, 0, 1.3), portion: p(100, 280, 10), allergens: ['fish'], origin: ['fish'], img: 'White Fish Fillets' },
  { id: 'tuna', name: { en: 'Tuna (canned in water)', hr: 'Tuna u vlastitom soku' }, category: 'protein', per100: n(116, 25.5, 0, 1), portion: p(60, 180, 20), allergens: ['fish'], origin: ['fish'], img: 'Tuna' },
  { id: 'sardines', name: { en: 'Sardines (canned)', hr: 'Sardine (konzerva)' }, category: 'protein', per100: n(208, 24.6, 0, 11.5), portion: p(50, 150, 10), allergens: ['fish'], origin: ['fish'], img: 'Sardines' },
  { id: 'eggs', name: { en: 'Egg', hr: 'Jaje' }, category: 'protein', per100: n(143, 12.6, 0.7, 9.5), portion: p(55, 220, 55), unitG: 55, allergens: ['eggs'], origin: ['egg'], img: 'Eggs' },
  { id: 'tofu', name: { en: 'Tofu', hr: 'Tofu' }, category: 'protein', per100: n(144, 17.3, 2.8, 8.7, 2.3), portion: p(80, 250, 10), allergens: ['soy'], img: 'Tofu' },
  { id: 'chickpeas', name: { en: 'Chickpeas (canned)', hr: 'Slanutak (konzerva)' }, category: 'protein', per100: n(139, 7, 22.5, 2.6, 6.4), portion: p(80, 300, 20), img: 'Chickpeas' },
  { id: 'lentils', name: { en: 'Red lentils (dry)', hr: 'Crvena leća (suha)' }, category: 'protein', per100: n(358, 24, 63, 2.2, 10.8), portion: p(40, 120, 10), img: 'Lentils' },
  { id: 'beans', name: { en: 'Red beans (canned)', hr: 'Crveni grah (konzerva)' }, category: 'protein', per100: n(127, 8.7, 22.8, 0.5, 6.4), portion: p(100, 300, 20), img: 'Kidney Beans' },
  { id: 'ham', name: { en: 'Ham', hr: 'Šunka' }, category: 'protein', per100: n(110, 18, 1.5, 3.5), portion: p(30, 100, 10), origin: ['meat', 'pork'], img: 'Ham' },
  { id: 'turkey_ham', name: { en: 'Turkey ham', hr: 'Pureća šunka' }, category: 'protein', per100: n(104, 18, 2, 2.5), portion: p(30, 100, 10), origin: ['meat'], img: 'Ham' },

  /* ---------- Dairy ---------- */
  { id: 'cottage_cheese', name: { en: 'Cottage cheese', hr: 'Svježi sir' }, category: 'dairy', per100: n(100, 12, 3.5, 4.3), portion: p(100, 300, 25), allergens: ['milk'], origin: ['dairy'], img: 'Ricotta' },
  { id: 'greek_yogurt', name: { en: 'Greek yogurt 2%', hr: 'Grčki jogurt 2%' }, category: 'dairy', per100: n(73, 10, 3.9, 2), portion: p(100, 300, 25), allergens: ['milk'], origin: ['dairy'], img: 'Greek Yogurt' },
  { id: 'skyr', name: { en: 'Skyr', hr: 'Skyr' }, category: 'dairy', per100: n(63, 11, 4, 0.2), portion: p(100, 300, 25), allergens: ['milk'], origin: ['dairy'], img: 'Natural Yoghurt' },
  { id: 'yogurt', name: { en: 'Plain yogurt', hr: 'Jogurt' }, category: 'dairy', per100: n(61, 3.5, 4.7, 3.2), portion: p(150, 300, 50), allergens: ['milk'], origin: ['dairy'], img: 'Yogurt' },
  { id: 'milk', name: { en: 'Milk 2.8%', hr: 'Mlijeko 2,8%' }, category: 'dairy', per100: n(60, 3.3, 4.8, 2.8), portion: p(150, 400, 50), allergens: ['milk'], origin: ['dairy'], img: 'Milk' },
  { id: 'gouda', name: { en: 'Gouda cheese', hr: 'Sir gauda' }, category: 'dairy', per100: n(356, 25, 2.2, 27.4), portion: p(20, 60, 10), allergens: ['milk'], origin: ['dairy'], img: 'Gouda Cheese' },
  { id: 'feta', name: { en: 'Feta', hr: 'Feta sir' }, category: 'dairy', per100: n(264, 14.2, 4, 21.3), portion: p(20, 80, 10), allergens: ['milk'], origin: ['dairy'], img: 'Feta' },
  { id: 'soy_drink', name: { en: 'Soy drink', hr: 'Sojin napitak' }, category: 'dairy', per100: n(39, 3.3, 2.5, 1.8, 0.5), portion: p(150, 300, 50), allergens: ['soy'], img: 'Soya Milk' },

  /* ---------- Grains & starches ---------- */
  { id: 'oats', name: { en: 'Oat flakes', hr: 'Zobene pahuljice' }, category: 'grain', per100: n(379, 13.2, 67.7, 6.5, 10.1), portion: p(30, 130, 10), allergens: ['gluten'], img: 'Rolled Oats' },
  { id: 'bread_whole', name: { en: 'Wholegrain bread', hr: 'Integralni kruh' }, category: 'grain', per100: n(247, 13, 41, 3.4, 7), portion: p(40, 200, 20), allergens: ['gluten'], img: 'Wholegrain Bread' },
  { id: 'bread_white', name: { en: 'White bread', hr: 'Bijeli kruh' }, category: 'grain', per100: n(265, 9, 49, 3.2, 2.7), portion: p(40, 200, 20), allergens: ['gluten'], img: 'Bread' },
  { id: 'rice', name: { en: 'White rice (dry)', hr: 'Bijela riža (suha)' }, category: 'grain', per100: n(360, 6.6, 79, 0.6, 1.3), portion: p(40, 170, 10), img: 'Rice' },
  { id: 'brown_rice', name: { en: 'Brown rice (dry)', hr: 'Smeđa riža (suha)' }, category: 'grain', per100: n(367, 7.5, 76, 2.7, 3.5), portion: p(40, 170, 10), img: 'Brown Rice' },
  { id: 'pasta', name: { en: 'Pasta (dry)', hr: 'Tjestenina (suha)' }, category: 'grain', per100: n(371, 13, 75, 1.5, 3.2), portion: p(50, 170, 10), allergens: ['gluten'], img: 'Penne Rigate' },
  { id: 'pasta_whole', name: { en: 'Wholegrain pasta (dry)', hr: 'Integralna tjestenina (suha)' }, category: 'grain', per100: n(348, 14.6, 66, 2.5, 8), portion: p(50, 170, 10), allergens: ['gluten'], img: 'Spaghetti' },
  { id: 'potatoes', name: { en: 'Potatoes', hr: 'Krumpir' }, category: 'grain', per100: n(77, 2, 17, 0.1, 2.2), portion: p(100, 500, 50), img: 'Potatoes' },
  { id: 'sweet_potato', name: { en: 'Sweet potato', hr: 'Batat' }, category: 'grain', per100: n(86, 1.6, 20, 0.1, 3), portion: p(150, 400, 50), img: 'Sweet Potatoes' },
  { id: 'buckwheat', name: { en: 'Buckwheat (dry)', hr: 'Heljda (suha)' }, category: 'grain', per100: n(343, 13.3, 71.5, 3.4, 10), portion: p(40, 120, 10), img: 'Buckwheat' },
  { id: 'polenta', name: { en: 'Polenta (dry)', hr: 'Palenta (suha)' }, category: 'grain', per100: n(362, 8.1, 76.9, 3.6, 7.3), portion: p(40, 120, 10), img: 'White Cornmeal' },
  { id: 'quinoa', name: { en: 'Quinoa (dry)', hr: 'Kvinoja (suha)' }, category: 'grain', per100: n(368, 14.1, 64.2, 6.1, 7), portion: p(40, 120, 10), img: 'Quinoa' },
  { id: 'couscous', name: { en: 'Couscous (dry)', hr: 'Kus-kus (suhi)' }, category: 'grain', per100: n(376, 12.8, 77.4, 0.6, 5), portion: p(40, 120, 10), allergens: ['gluten'], img: 'Couscous' },
  { id: 'tortilla', name: { en: 'Wheat tortilla', hr: 'Pšenična tortilja' }, category: 'grain', per100: n(304, 8.2, 51, 7.5, 3.5), portion: p(60, 120, 60), unitG: 60, allergens: ['gluten'], img: 'Flour Tortilla' },
  { id: 'rice_cakes', name: { en: 'Rice cakes', hr: 'Rižini krekeri' }, category: 'grain', per100: n(387, 8.2, 81.5, 2.8, 4.2), portion: p(18, 54, 9), unitG: 9 },

  /* ---------- Vegetables ---------- */
  { id: 'lettuce', name: { en: 'Green salad', hr: 'Zelena salata' }, category: 'vegetable', per100: n(15, 1.4, 2.9, 0.2, 1.3), portion: p(50, 200, 25), img: 'Lettuce' },
  { id: 'tomato', name: { en: 'Tomato', hr: 'Rajčica' }, category: 'vegetable', per100: n(18, 0.9, 3.9, 0.2, 1.2), portion: p(50, 250, 50), img: 'Tomatoes' },
  { id: 'cucumber', name: { en: 'Cucumber', hr: 'Krastavac' }, category: 'vegetable', per100: n(15, 0.7, 3.6, 0.1, 0.5), portion: p(50, 250, 50), img: 'Cucumber' },
  { id: 'pepper', name: { en: 'Red pepper', hr: 'Crvena paprika' }, category: 'vegetable', per100: n(26, 1, 6, 0.3, 2.1), portion: p(50, 200, 50), img: 'Red Pepper' },
  { id: 'broccoli', name: { en: 'Broccoli', hr: 'Brokula' }, category: 'vegetable', per100: n(34, 2.8, 6.6, 0.4, 2.6), portion: p(100, 300, 50), img: 'Broccoli' },
  { id: 'zucchini', name: { en: 'Zucchini', hr: 'Tikvica' }, category: 'vegetable', per100: n(17, 1.2, 3.1, 0.3, 1), portion: p(100, 300, 50), img: 'Zucchini' },
  { id: 'carrot', name: { en: 'Carrot', hr: 'Mrkva' }, category: 'vegetable', per100: n(41, 0.9, 9.6, 0.2, 2.8), portion: p(50, 200, 50), img: 'Carrots' },
  { id: 'spinach', name: { en: 'Spinach', hr: 'Špinat' }, category: 'vegetable', per100: n(23, 2.9, 3.6, 0.4, 2.2), portion: p(50, 250, 50), img: 'Spinach' },
  { id: 'chard', name: { en: 'Swiss chard', hr: 'Blitva' }, category: 'vegetable', per100: n(19, 1.8, 3.7, 0.2, 1.6), portion: p(100, 300, 50), img: 'Kale' },
  { id: 'green_beans', name: { en: 'Green beans', hr: 'Mahune' }, category: 'vegetable', per100: n(31, 1.8, 7, 0.2, 2.7), portion: p(100, 300, 50), img: 'Green Beans' },
  { id: 'cabbage', name: { en: 'Cabbage', hr: 'Kupus' }, category: 'vegetable', per100: n(25, 1.3, 5.8, 0.1, 2.5), portion: p(100, 300, 50), img: 'Cabbage' },
  { id: 'mushrooms', name: { en: 'Mushrooms', hr: 'Šampinjoni' }, category: 'vegetable', per100: n(22, 3.1, 3.3, 0.3, 1), portion: p(50, 250, 50), img: 'Mushrooms' },
  { id: 'mixed_veg', name: { en: 'Mixed vegetables (frozen)', hr: 'Miješano povrće (smrznuto)' }, category: 'vegetable', per100: n(65, 3.3, 13, 0.5, 4), portion: p(100, 300, 50), img: 'Stir-fry Vegetables' },
  { id: 'passata', name: { en: 'Tomato passata', hr: 'Pasirana rajčica' }, category: 'vegetable', per100: n(38, 1.7, 9, 0.2, 1.9), portion: p(100, 250, 50), img: 'Passata' },

  /* ---------- Fruit ---------- */
  { id: 'banana', name: { en: 'Banana', hr: 'Banana' }, category: 'fruit', per100: n(89, 1.1, 22.8, 0.3, 2.6), portion: p(60, 180, 60), unitG: 120, img: 'Banana' },
  { id: 'apple', name: { en: 'Apple', hr: 'Jabuka' }, category: 'fruit', per100: n(52, 0.3, 13.8, 0.2, 2.4), portion: p(90, 180, 90), unitG: 180, img: 'Apples' },
  { id: 'orange', name: { en: 'Orange', hr: 'Naranča' }, category: 'fruit', per100: n(47, 0.9, 11.8, 0.1, 2.4), portion: p(80, 240, 80), unitG: 160, img: 'Orange' },
  { id: 'pear', name: { en: 'Pear', hr: 'Kruška' }, category: 'fruit', per100: n(57, 0.4, 15.2, 0.1, 3.1), portion: p(90, 180, 90), unitG: 180, img: 'Pears' },
  { id: 'mandarin', name: { en: 'Mandarin', hr: 'Mandarina' }, category: 'fruit', per100: n(53, 0.8, 13.3, 0.3, 1.8), portion: p(80, 240, 80), unitG: 80, img: 'Orange' },
  { id: 'kiwi', name: { en: 'Kiwi', hr: 'Kivi' }, category: 'fruit', per100: n(61, 1.1, 14.7, 0.5, 3), portion: p(75, 225, 75), unitG: 75, img: 'Kiwi' },
  { id: 'berries', name: { en: 'Berries (frozen)', hr: 'Bobičasto voće (smrznuto)' }, category: 'fruit', per100: n(50, 0.8, 12, 0.3, 3.5), portion: p(50, 200, 50), img: 'Blueberries' },
  { id: 'strawberries', name: { en: 'Strawberries', hr: 'Jagode' }, category: 'fruit', per100: n(32, 0.7, 7.7, 0.3, 2), portion: p(100, 300, 50), img: 'Strawberries' },

  /* ---------- Fats, nuts, spreads ---------- */
  { id: 'olive_oil', name: { en: 'Olive oil', hr: 'Maslinovo ulje' }, category: 'fat', per100: n(884, 0, 0, 100), portion: p(5, 20, 5), img: 'Olive Oil' },
  { id: 'avocado', name: { en: 'Avocado', hr: 'Avokado' }, category: 'fat', per100: n(160, 2, 8.5, 14.7, 6.7), portion: p(35, 105, 35), img: 'Avocado' },
  { id: 'almonds', name: { en: 'Almonds', hr: 'Bademi' }, category: 'fat', per100: n(579, 21.2, 21.6, 49.9, 12.5), portion: p(10, 40, 5), allergens: ['treeNuts'], img: 'Almonds' },
  { id: 'walnuts', name: { en: 'Walnuts', hr: 'Orasi' }, category: 'fat', per100: n(654, 15.2, 13.7, 65.2, 6.7), portion: p(10, 40, 5), allergens: ['treeNuts'], img: 'Walnuts' },
  { id: 'hazelnuts', name: { en: 'Hazelnuts', hr: 'Lješnjaci' }, category: 'fat', per100: n(628, 15, 16.7, 60.8, 9.7), portion: p(10, 40, 5), allergens: ['treeNuts'], img: 'Hazlenuts' },
  { id: 'peanut_butter', name: { en: 'Peanut butter', hr: 'Maslac od kikirikija' }, category: 'fat', per100: n(588, 25, 20, 50, 6), portion: p(10, 40, 5), allergens: ['peanuts'], img: 'Peanut Butter' },
  { id: 'hummus', name: { en: 'Hummus', hr: 'Humus' }, category: 'fat', per100: n(237, 7.8, 15, 17.8, 5.5), portion: p(30, 100, 10), allergens: ['sesame'], img: 'Hummus' },

  /* ---------- Treats (only on cheat days) ---------- */
  { id: 'pizza', name: { en: 'Pizza margherita', hr: 'Pizza margherita' }, category: 'treat', per100: n(268, 10.4, 29, 12.3, 2.2), portion: p(150, 450, 50), allergens: ['gluten', 'milk'], origin: ['dairy'], img: 'Mozzarella' },
  { id: 'burger_bun', name: { en: 'Burger bun', hr: 'Pecivo za burger' }, category: 'treat', per100: n(279, 9.8, 50.1, 3.9, 1.8), portion: p(60, 120, 60), unitG: 60, allergens: ['gluten'], img: 'Bun' },
  { id: 'beef_patty', name: { en: 'Beef burger patty', hr: 'Goveđa pljeskavica' }, category: 'treat', per100: n(254, 17.2, 0, 20, 0), portion: p(100, 200, 25), origin: ['meat'], img: 'Ground Beef' },
  { id: 'cevapi', name: { en: 'Ćevapi', hr: 'Ćevapi' }, category: 'treat', per100: n(254, 17.2, 0, 20, 0), portion: p(100, 250, 25), unitG: 25, origin: ['meat', 'pork'], img: 'Minced Pork' },
  { id: 'lepinja', name: { en: 'Lepinja flatbread', hr: 'Lepinja' }, category: 'treat', per100: n(275, 9.1, 55.7, 1.2, 2.2), portion: p(50, 100, 50), unitG: 100, allergens: ['gluten'], img: 'Pita Bread' },
  { id: 'fries', name: { en: 'Oven fries', hr: 'Pomfrit iz pećnice' }, category: 'treat', per100: n(168, 2.7, 28.7, 5.2, 2.6), portion: p(100, 250, 50), img: 'Fries' },
  { id: 'bacon', name: { en: 'Bacon / pancetta', hr: 'Slanina / panceta' }, category: 'treat', per100: n(393, 13.7, 0, 37.1, 0), portion: p(20, 80, 10), origin: ['meat', 'pork'], img: 'Bacon' },
  { id: 'parmesan', name: { en: 'Parmesan', hr: 'Parmezan' }, category: 'treat', per100: n(392, 35.8, 3.2, 25, 0), portion: p(10, 40, 5), allergens: ['milk'], origin: ['dairy'], img: 'Parmesan' },
  { id: 'milk_chocolate', name: { en: 'Milk chocolate', hr: 'Mliječna čokolada' }, category: 'treat', per100: n(535, 7.7, 59.4, 29.7, 3.4), portion: p(20, 60, 10), allergens: ['milk'], origin: ['dairy'], img: 'Milk Chocolate' },
  // Most 70% dark chocolate has no milk ingredient but may contain traces — blocked for milk allergy, OK for vegans.
  { id: 'dark_chocolate', name: { en: 'Dark chocolate 70%', hr: 'Tamna čokolada 70%' }, category: 'treat', per100: n(598, 7.8, 45.9, 42.6, 10.9), portion: p(20, 50, 10), allergens: ['milk'], img: 'Dark Chocolate' },
  { id: 'ice_cream', name: { en: 'Vanilla ice cream', hr: 'Sladoled od vanilije' }, category: 'treat', per100: n(207, 3.5, 23.6, 11, 0.7), portion: p(50, 200, 50), allergens: ['milk'], origin: ['dairy'], img: 'Ice Cream' },
  { id: 'hazelnut_spread', name: { en: 'Chocolate hazelnut spread', hr: 'Čokoladni namaz s lješnjacima' }, category: 'treat', per100: n(539, 5.4, 62.4, 29.7, 5.4), portion: p(15, 40, 5), allergens: ['treeNuts', 'milk'], origin: ['dairy'], img: 'Nutella' },
  { id: 'crepes', name: { en: 'Crêpes', hr: 'Palačinke' }, category: 'treat', per100: n(227, 6.4, 28.3, 9.7, 0.8), portion: p(60, 180, 60), unitG: 60, allergens: ['gluten', 'eggs', 'milk'], origin: ['egg', 'dairy'] },
  { id: 'jam', name: { en: 'Jam', hr: 'Džem' }, category: 'treat', per100: n(278, 0.4, 68.9, 0.1, 1.1), portion: p(10, 30, 10), img: 'Jam' },
  { id: 'croissant', name: { en: 'Butter croissant', hr: 'Kroasan s maslacem' }, category: 'treat', per100: n(406, 8.2, 45.8, 21, 2.6), portion: p(60, 120, 60), unitG: 60, allergens: ['gluten', 'milk'], origin: ['dairy'], img: 'Puff Pastry' },
  { id: 'ketchup', name: { en: 'Ketchup', hr: 'Kečap' }, category: 'treat', per100: n(101, 1, 27.4, 0.1, 0.3), portion: p(10, 40, 10), img: 'Tomato Ketchup' },

  /* ---------- Other ---------- */  { id: 'honey', name: { en: 'Honey', hr: 'Med' }, category: 'other', per100: n(304, 0.3, 82.4, 0), portion: p(5, 20, 5), origin: ['honey'], img: 'Honey' },
];

export const FOOD_BY_ID: Record<string, Food> = Object.fromEntries(FOODS.map((f) => [f.id, f]));

export function foodImageUrl(food: Food): string | null {
  return food.img
    ? `https://www.themealdb.com/images/ingredients/${encodeURIComponent(food.img)}-small.png`
    : null;
}
