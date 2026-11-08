// Meal "shapes". Each part lists foods that can fill it; the generator picks one
// allowed food per part and then sizes the portions to hit the meal's targets.

export type MealType = 'breakfast' | 'snack' | 'main';
export type PartRole = 'protein' | 'carb' | 'veg' | 'fruit' | 'fat' | 'extra';

export interface TemplatePart {
  role: PartRole;
  options: string[];
  /** Optional parts are dropped if none of their foods are allowed. */
  optional?: boolean;
  /** Caps the portion for this part, e.g. yogurt used as a sauce. */
  maxG?: number;
}

export interface MealTemplate {
  id: string;
  name: { en: string; hr: string };
  types: MealType[];
  parts: TemplatePart[];
  /** Treat meals are only used on cheat days (and never on normal days). */
  treat?: boolean;
}

const MEAT_FISH = ['chicken_breast', 'turkey_breast', 'beef_mince', 'pork_loin', 'salmon', 'hake'];
const PLATE_PROTEIN = [...MEAT_FISH, 'tofu'];
const SIDES = ['rice', 'brown_rice', 'potatoes', 'sweet_potato', 'buckwheat', 'quinoa', 'couscous', 'polenta'];
const COOKED_VEG = ['broccoli', 'green_beans', 'zucchini', 'carrot', 'spinach', 'chard', 'cabbage', 'mixed_veg', 'mushrooms'];
const FRUIT = ['banana', 'apple', 'orange', 'pear', 'mandarin', 'kiwi', 'berries', 'strawberries'];
const NUTS = ['almonds', 'walnuts', 'hazelnuts', 'peanut_butter'];
const YOGURTS = ['greek_yogurt', 'skyr', 'yogurt', 'cottage_cheese'];
const BREAD = ['bread_whole', 'bread_white'];

export const MEAL_TEMPLATES: MealTemplate[] = [
  /* ---------- Breakfast ---------- */
  {
    id: 'oat_bowl',
    name: { en: 'Oat bowl', hr: 'Zobena kaša' },
    types: ['breakfast'],
    parts: [
      { role: 'carb', options: ['oats'] },
      { role: 'protein', options: ['milk', 'greek_yogurt', 'skyr', 'soy_drink'] },
      { role: 'fruit', options: ['banana', 'berries', 'apple', 'strawberries'] },
      { role: 'fat', options: NUTS, optional: true },
    ],
  },
  {
    id: 'eggs_toast',
    name: { en: 'Eggs on toast', hr: 'Jaja s kruhom' },
    types: ['breakfast'],
    parts: [
      { role: 'protein', options: ['eggs'] },
      { role: 'carb', options: BREAD },
      { role: 'veg', options: ['tomato', 'cucumber', 'pepper'], maxG: 150 },
      { role: 'fat', options: ['avocado'], optional: true },
    ],
  },
  {
    id: 'omelette',
    name: { en: 'Veggie omelette', hr: 'Omlet s povrćem' },
    types: ['breakfast', 'main'],
    parts: [
      { role: 'protein', options: ['eggs'] },
      { role: 'veg', options: ['spinach', 'mushrooms', 'pepper', 'zucchini', 'tomato'] },
      { role: 'extra', options: ['feta', 'gouda'], optional: true, maxG: 40 },
      { role: 'carb', options: [...BREAD, 'potatoes'], maxG: 250 },
    ],
  },
  {
    id: 'yogurt_bowl',
    name: { en: 'Yogurt bowl', hr: 'Zdjelica jogurta' },
    types: ['breakfast'],
    parts: [
      { role: 'protein', options: ['greek_yogurt', 'skyr', 'cottage_cheese'] },
      { role: 'carb', options: ['oats'], optional: true },
      { role: 'fruit', options: ['berries', 'banana', 'strawberries', 'kiwi'] },
      { role: 'fat', options: ['walnuts', 'almonds', 'hazelnuts'], optional: true },
      { role: 'extra', options: ['honey'], optional: true, maxG: 10 },
    ],
  },
  {
    id: 'sandwich',
    name: { en: 'Sandwich', hr: 'Sendvič' },
    types: ['breakfast'],
    parts: [
      { role: 'carb', options: BREAD },
      { role: 'protein', options: ['turkey_ham', 'ham', 'cottage_cheese', 'tuna', 'hummus'] },
      { role: 'extra', options: ['gouda'], optional: true, maxG: 30 },
      { role: 'veg', options: ['tomato', 'cucumber', 'lettuce', 'pepper'], maxG: 150 },
    ],
  },
  {
    id: 'tofu_scramble',
    name: { en: 'Tofu scramble', hr: 'Kajgana od tofua' },
    types: ['breakfast'],
    parts: [
      { role: 'protein', options: ['tofu'] },
      { role: 'veg', options: ['spinach', 'pepper', 'mushrooms', 'tomato'] },
      { role: 'carb', options: [...BREAD, 'potatoes'], maxG: 250 },
      { role: 'fat', options: ['olive_oil'] },
    ],
  },
  {
    id: 'pb_toast',
    name: { en: 'Peanut butter toast', hr: 'Kruh s maslacem od kikirikija' },
    types: ['breakfast'],
    parts: [
      { role: 'carb', options: BREAD },
      { role: 'fat', options: ['peanut_butter'] },
      { role: 'fruit', options: ['banana', 'apple', 'strawberries'] },
      { role: 'protein', options: ['soy_drink', 'milk', 'skyr'], optional: true },
    ],
  },

  /* ---------- Snacks ---------- */
  {
    id: 'fruit_nuts',
    name: { en: 'Fruit & nuts', hr: 'Voće i orašasti plodovi' },
    types: ['snack'],
    parts: [
      { role: 'fruit', options: FRUIT },
      { role: 'fat', options: ['almonds', 'walnuts', 'hazelnuts'] },
    ],
  },
  {
    id: 'yogurt_fruit',
    name: { en: 'Creamy fruit bowl', hr: 'Kremasta zdjelica s voćem' },
    types: ['snack'],
    parts: [
      { role: 'protein', options: YOGURTS },
      { role: 'fruit', options: ['berries', 'banana', 'strawberries', 'kiwi', 'apple'] },
    ],
  },
  {
    id: 'cottage_veg',
    name: { en: 'Cottage cheese & veggies', hr: 'Svježi sir s povrćem' },
    types: ['snack'],
    parts: [
      { role: 'protein', options: ['cottage_cheese'] },
      { role: 'veg', options: ['cucumber', 'pepper', 'carrot', 'tomato'] },
      { role: 'carb', options: ['rice_cakes', 'bread_whole'], optional: true, maxG: 40 },
    ],
  },
  {
    id: 'rice_cakes',
    name: { en: 'Rice cakes with topping', hr: 'Rižini krekeri s namazom' },
    types: ['snack'],
    parts: [
      { role: 'carb', options: ['rice_cakes'] },
      { role: 'fat', options: ['peanut_butter', 'hummus', 'avocado'] },
      { role: 'fruit', options: ['banana', 'strawberries'], optional: true },
    ],
  },
  {
    id: 'hummus_veg',
    name: { en: 'Hummus & veggies', hr: 'Humus s povrćem' },
    types: ['snack'],
    parts: [
      { role: 'fat', options: ['hummus'] },
      { role: 'veg', options: ['carrot', 'cucumber', 'pepper'] },
    ],
  },
  {
    id: 'boiled_eggs',
    name: { en: 'Boiled eggs', hr: 'Kuhana jaja' },
    types: ['snack'],
    parts: [
      { role: 'protein', options: ['eggs'] },
      { role: 'veg', options: ['tomato', 'cucumber', 'pepper'], maxG: 150 },
    ],
  },
  {
    id: 'apple_pb',
    name: { en: 'Fruit with peanut butter', hr: 'Voće s maslacem od kikirikija' },
    types: ['snack'],
    parts: [
      { role: 'fruit', options: ['apple', 'pear', 'banana'] },
      { role: 'fat', options: ['peanut_butter'], maxG: 25 },
    ],
  },
  {
    id: 'milk_shake',
    name: { en: 'Smoothie', hr: 'Smoothie' },
    types: ['snack'],
    parts: [
      { role: 'protein', options: ['milk', 'soy_drink', 'skyr', 'yogurt'] },
      { role: 'fruit', options: ['banana', 'berries', 'strawberries'] },
      { role: 'carb', options: ['oats'], optional: true },
    ],
  },

  /* ---------- Lunch & dinner ---------- */
  {
    id: 'plate',
    name: { en: 'Classic plate', hr: 'Klasični tanjur' },
    types: ['main'],
    parts: [
      { role: 'protein', options: PLATE_PROTEIN },
      { role: 'carb', options: SIDES },
      { role: 'veg', options: COOKED_VEG },
      { role: 'fat', options: ['olive_oil'] },
    ],
  },
  {
    id: 'fish_plate',
    name: { en: 'Dalmatian fish plate', hr: 'Dalmatinski tanjur s ribom' },
    types: ['main'],
    parts: [
      { role: 'protein', options: ['hake', 'salmon', 'sardines'] },
      { role: 'carb', options: ['potatoes'] },
      { role: 'veg', options: ['chard', 'spinach', 'green_beans'] },
      { role: 'fat', options: ['olive_oil'] },
    ],
  },
  {
    id: 'pasta',
    name: { en: 'Pasta with sauce', hr: 'Tjestenina s umakom' },
    types: ['main'],
    parts: [
      { role: 'carb', options: ['pasta', 'pasta_whole'] },
      { role: 'protein', options: ['beef_mince', 'chicken_breast', 'tuna', 'lentils', 'tofu'] },
      { role: 'veg', options: ['passata'] },
      { role: 'veg', options: ['zucchini', 'spinach', 'mushrooms'], optional: true },
      { role: 'fat', options: ['olive_oil'] },
    ],
  },
  {
    id: 'salad_bowl',
    name: { en: 'Big salad', hr: 'Velika salata' },
    types: ['main'],
    parts: [
      { role: 'veg', options: ['lettuce'] },
      { role: 'protein', options: ['chicken_breast', 'tuna', 'eggs', 'chickpeas', 'turkey_breast', 'salmon'] },
      { role: 'veg', options: ['tomato', 'cucumber', 'pepper'] },
      { role: 'extra', options: ['feta'], optional: true, maxG: 40 },
      { role: 'carb', options: [...BREAD, 'potatoes', 'quinoa', 'couscous'] },
      { role: 'fat', options: ['olive_oil'] },
    ],
  },
  {
    id: 'stew',
    name: { en: 'Bean & lentil stew', hr: 'Varivo od mahunarki' },
    types: ['main'],
    parts: [
      { role: 'protein', options: ['lentils', 'beans', 'chickpeas'] },
      { role: 'carb', options: ['potatoes'] },
      { role: 'veg', options: ['carrot', 'passata', 'cabbage'] },
      { role: 'fat', options: ['olive_oil'] },
      { role: 'extra', options: BREAD, optional: true, maxG: 60 },
    ],
  },
  {
    id: 'wrap',
    name: { en: 'Wrap', hr: 'Wrap (tortilja)' },
    types: ['main'],
    parts: [
      { role: 'carb', options: ['tortilla'] },
      { role: 'protein', options: ['chicken_breast', 'turkey_breast', 'beans', 'tofu', 'beef_mince'] },
      { role: 'veg', options: ['lettuce', 'tomato', 'pepper', 'cucumber'], maxG: 150 },
      { role: 'extra', options: ['greek_yogurt', 'hummus', 'avocado'], optional: true, maxG: 70 },
    ],
  },
  {
    id: 'stir_fry',
    name: { en: 'Stir-fry with rice', hr: 'Wok s rižom' },
    types: ['main'],
    parts: [
      { role: 'protein', options: ['tofu', 'chicken_breast', 'turkey_breast', 'pork_loin'] },
      { role: 'carb', options: ['rice', 'brown_rice', 'buckwheat'] },
      { role: 'veg', options: ['mixed_veg', 'broccoli', 'pepper', 'mushrooms'] },
      { role: 'fat', options: ['olive_oil'] },
    ],
  },
  /* ---------- More everyday meals ---------- */
  {
    id: 'millet_porridge',
    name: { en: 'Millet porridge', hr: 'Kaša od prosa' },
    types: ['breakfast'],
    parts: [
      { role: 'carb', options: ['millet'] },
      { role: 'protein', options: ['milk', 'soy_drink', 'kefir'] },
      { role: 'fruit', options: ['plums', 'peach', 'banana', 'berries', 'apple', 'grapes'] },
      { role: 'fat', options: ['walnuts', 'almonds', 'sunflower_seeds'], optional: true },
    ],
  },
  {
    id: 'kefir_bowl',
    name: { en: 'Kefir & oats', hr: 'Kefir sa zobenim pahuljicama' },
    types: ['breakfast'],
    parts: [
      { role: 'protein', options: ['kefir'] },
      { role: 'carb', options: ['oats'] },
      { role: 'fruit', options: ['berries', 'banana', 'peach', 'plums', 'apple'] },
      { role: 'fat', options: ['chia', 'sunflower_seeds', 'walnuts'], optional: true },
    ],
  },
  {
    id: 'chia_pudding',
    name: { en: 'Chia pudding', hr: 'Chia puding' },
    types: ['breakfast'],
    parts: [
      { role: 'fat', options: ['chia'], maxG: 30 },
      { role: 'protein', options: ['greek_yogurt', 'skyr', 'soy_drink', 'milk'] },
      { role: 'fruit', options: ['berries', 'strawberries', 'banana', 'kiwi', 'peach'] },
      { role: 'carb', options: ['oats'], optional: true, maxG: 40 },
    ],
  },
  {
    id: 'caprese_toast',
    name: { en: 'Caprese toast', hr: 'Tost caprese' },
    types: ['breakfast'],
    parts: [
      { role: 'carb', options: ['bread_whole', 'bread_white'] },
      { role: 'protein', options: ['mozzarella'] },
      { role: 'veg', options: ['tomato'], maxG: 150 },
      { role: 'veg', options: ['arugula'], optional: true },
      { role: 'fat', options: ['olive_oil'], optional: true, maxG: 10 },
    ],
  },
  {
    id: 'polenta_yogurt',
    name: { en: 'Polenta with yogurt', hr: 'Palenta s jogurtom' },
    types: ['breakfast', 'main'],
    parts: [
      { role: 'carb', options: ['polenta'] },
      { role: 'protein', options: ['yogurt', 'kefir', 'greek_yogurt'] },
      { role: 'extra', options: ['cottage_cheese', 'feta'], optional: true, maxG: 60 },
    ],
  },
  {
    id: 'kefir_fruit',
    name: { en: 'Kefir & fruit', hr: 'Kefir i voće' },
    types: ['snack'],
    parts: [
      { role: 'protein', options: ['kefir'] },
      { role: 'fruit', options: ['banana', 'apple', 'plums', 'peach', 'grapes', 'berries'] },
    ],
  },
  {
    id: 'figs_nuts',
    name: { en: 'Dried figs & nuts', hr: 'Suhe smokve i orašasti plodovi' },
    types: ['snack'],
    parts: [
      { role: 'fruit', options: ['dried_figs'] },
      { role: 'fat', options: ['walnuts', 'almonds', 'peanuts', 'hazelnuts'] },
    ],
  },
  {
    id: 'peanuts_fruit',
    name: { en: 'Peanuts & fruit', hr: 'Kikiriki i voće' },
    types: ['snack'],
    parts: [
      { role: 'fat', options: ['peanuts', 'sunflower_seeds'] },
      { role: 'fruit', options: ['apple', 'banana', 'orange', 'mandarin', 'grapes', 'pear'] },
    ],
  },
  {
    id: 'watermelon_feta',
    name: { en: 'Watermelon & feta', hr: 'Lubenica i feta' },
    types: ['snack'],
    parts: [
      { role: 'fruit', options: ['watermelon'] },
      { role: 'protein', options: ['feta', 'cottage_cheese'], maxG: 60 },
    ],
  },
  {
    id: 'stuffed_peppers',
    name: { en: 'Stuffed peppers', hr: 'Punjene paprike' },
    types: ['main'],
    parts: [
      { role: 'veg', options: ['pepper'] },
      { role: 'protein', options: ['beef_mince', 'turkey_breast'] },
      { role: 'carb', options: ['rice'], maxG: 70 },
      { role: 'veg', options: ['passata'] },
      { role: 'extra', options: ['onion'], optional: true, maxG: 50 },
      { role: 'carb', options: ['potatoes', 'bread_white'], optional: true },
    ],
  },
  {
    id: 'goulash',
    name: { en: 'Beef goulash', hr: 'Goveđi gulaš' },
    types: ['main'],
    parts: [
      { role: 'protein', options: ['beef_steak'] },
      { role: 'carb', options: ['potatoes', 'polenta', 'pasta'] },
      { role: 'veg', options: ['onion'], maxG: 80 },
      { role: 'veg', options: ['pepper', 'carrot'] },
      { role: 'fat', options: ['olive_oil'] },
    ],
  },
  {
    id: 'chicken_risotto',
    name: { en: 'Chicken risotto', hr: 'Rižoto s piletinom' },
    types: ['main'],
    parts: [
      { role: 'carb', options: ['rice'] },
      { role: 'protein', options: ['chicken_breast', 'chicken_thigh'] },
      { role: 'veg', options: ['mushrooms', 'peas', 'zucchini'] },
      { role: 'extra', options: ['onion'], optional: true, maxG: 50 },
      { role: 'fat', options: ['olive_oil'] },
    ],
  },
  {
    id: 'sarma',
    name: { en: 'Sarma (cabbage rolls)', hr: 'Sarma' },
    types: ['main'],
    parts: [
      { role: 'veg', options: ['sauerkraut'] },
      { role: 'protein', options: ['beef_mince'] },
      { role: 'carb', options: ['rice'], maxG: 60 },
      { role: 'extra', options: ['onion'], optional: true, maxG: 50 },
      { role: 'carb', options: ['potatoes', 'bread_whole'], optional: true },
    ],
  },
  {
    id: 'grilled_fish',
    name: { en: 'Grilled fish', hr: 'Riba s gradela' },
    types: ['main'],
    parts: [
      { role: 'protein', options: ['mackerel', 'trout', 'hake', 'salmon'] },
      { role: 'carb', options: ['potatoes', 'bread_whole', 'polenta'] },
      { role: 'veg', options: ['chard', 'arugula', 'lettuce', 'tomato'] },
      { role: 'fat', options: ['olive_oil'] },
    ],
  },
  {
    id: 'seafood_pasta',
    name: { en: 'Seafood pasta', hr: 'Tjestenina s plodovima mora' },
    types: ['main'],
    parts: [
      { role: 'carb', options: ['pasta', 'pasta_whole'] },
      { role: 'protein', options: ['squid', 'shrimp'] },
      { role: 'veg', options: ['passata', 'zucchini'] },
      { role: 'fat', options: ['olive_oil'] },
    ],
  },
  {
    id: 'barley_stew',
    name: { en: 'Barley & bean stew', hr: 'Ričet (ječam s grahom)' },
    types: ['main'],
    parts: [
      { role: 'carb', options: ['barley'] },
      { role: 'protein', options: ['beans', 'turkey_ham', 'ham'] },
      { role: 'veg', options: ['carrot'] },
      { role: 'extra', options: ['onion'], optional: true, maxG: 50 },
      { role: 'fat', options: ['olive_oil'], optional: true, maxG: 10 },
    ],
  },
  {
    id: 'chicken_bake',
    name: { en: 'Oven chicken & vegetables', hr: 'Pečena piletina s povrćem' },
    types: ['main'],
    parts: [
      { role: 'protein', options: ['chicken_thigh', 'chicken_breast'] },
      { role: 'carb', options: ['sweet_potato', 'potatoes'] },
      { role: 'veg', options: ['cauliflower', 'broccoli', 'zucchini', 'carrot'] },
      { role: 'fat', options: ['olive_oil'] },
    ],
  },
  {
    id: 'buddha_bowl',
    name: { en: 'Buddha bowl', hr: 'Buddha zdjela' },
    types: ['main'],
    parts: [
      { role: 'carb', options: ['bulgur', 'quinoa', 'brown_rice'] },
      { role: 'protein', options: ['chickpeas', 'tofu', 'eggs'] },
      { role: 'veg', options: ['carrot', 'beetroot', 'corn'] },
      { role: 'veg', options: ['spinach', 'arugula', 'lettuce'] },
      { role: 'fat', options: ['hummus', 'avocado'], optional: true, maxG: 70 },
    ],
  },
  {
    id: 'tuna_bean_salad',
    name: { en: 'Tuna & bean salad', hr: 'Salata od tune i graha' },
    types: ['main'],
    parts: [
      { role: 'protein', options: ['tuna'] },
      { role: 'carb', options: ['beans', 'chickpeas'] },
      { role: 'veg', options: ['tomato', 'corn', 'cucumber'] },
      { role: 'extra', options: ['onion'], optional: true, maxG: 40 },
      { role: 'fat', options: ['olive_oil'] },
      { role: 'carb', options: ['bread_whole'], optional: true, maxG: 80 },
    ],
  },
  {
    id: 'steak_plate',
    name: { en: 'Beef steak with potatoes', hr: 'Junetina s krumpirom' },
    types: ['main'],
    parts: [
      { role: 'protein', options: ['beef_steak'] },
      { role: 'carb', options: ['potatoes', 'sweet_potato'] },
      { role: 'veg', options: ['arugula', 'lettuce', 'green_beans', 'broccoli'] },
      { role: 'fat', options: ['olive_oil'] },
    ],
  },
  {
    id: 'shrimp_rice',
    name: { en: 'Prawns with rice & peas', hr: 'Kozice s rižom i graškom' },
    types: ['main'],
    parts: [
      { role: 'protein', options: ['shrimp', 'squid'] },
      { role: 'carb', options: ['rice', 'brown_rice'] },
      { role: 'veg', options: ['peas'] },
      { role: 'fat', options: ['olive_oil'] },
    ],
  },
  {
    id: 'eggplant_bake',
    name: { en: 'Baked eggplant', hr: 'Zapečeni patlidžan' },
    types: ['main'],
    parts: [
      { role: 'veg', options: ['eggplant'] },
      { role: 'protein', options: ['mozzarella', 'feta', 'beef_mince'] },
      { role: 'veg', options: ['passata'] },
      { role: 'carb', options: ['bread_whole', 'potatoes', 'bulgur'] },
      { role: 'fat', options: ['olive_oil'], optional: true, maxG: 10 },
    ],
  },
  {
    id: 'bulgur_salad',
    name: { en: 'Bulgur salad', hr: 'Salata od bulgura' },
    types: ['main'],
    parts: [
      { role: 'carb', options: ['bulgur', 'couscous', 'quinoa'] },
      { role: 'protein', options: ['chickpeas', 'feta', 'tuna', 'chicken_breast'] },
      { role: 'veg', options: ['tomato', 'cucumber', 'pepper'] },
      { role: 'veg', options: ['arugula', 'onion'], optional: true, maxG: 60 },
      { role: 'fat', options: ['olive_oil'] },
    ],
  },
  /* ---------- Treats (cheat days only) ---------- */
  {
    id: 'crepes',
    name: { en: 'Crêpes with chocolate spread', hr: 'Palačinke s čokoladnim namazom' },
    types: ['breakfast'],
    treat: true,
    parts: [
      { role: 'carb', options: ['crepes'], maxG: 180 },
      { role: 'fat', options: ['hazelnut_spread', 'jam'], maxG: 40 },
      { role: 'fruit', options: ['banana', 'strawberries', 'berries'], optional: true },
      { role: 'protein', options: ['greek_yogurt', 'skyr', 'milk'], optional: true },
    ],
  },
  {
    id: 'full_breakfast',
    name: { en: 'Eggs & bacon breakfast', hr: 'Jaja sa slaninom' },
    types: ['breakfast'],
    treat: true,
    parts: [
      { role: 'protein', options: ['eggs'] },
      { role: 'extra', options: ['bacon'], maxG: 60 },
      { role: 'carb', options: ['bread_white', 'bread_whole'] },
      { role: 'veg', options: ['tomato', 'mushrooms'], optional: true, maxG: 150 },
    ],
  },
  {
    id: 'croissant_breakfast',
    name: { en: 'Croissant & coffee-shop breakfast', hr: 'Kroasan za doručak' },
    types: ['breakfast'],
    treat: true,
    parts: [
      { role: 'carb', options: ['croissant'] },
      { role: 'protein', options: ['greek_yogurt', 'skyr', 'yogurt', 'milk'] },
      { role: 'extra', options: ['jam'], optional: true, maxG: 20 },
      { role: 'fruit', options: ['strawberries', 'berries', 'orange', 'kiwi'], optional: true },
    ],
  },
  {
    id: 'pb_jam_toast',
    name: { en: 'Peanut butter & jam toast', hr: 'Tost s maslacem od kikirikija i džemom' },
    types: ['breakfast'],
    treat: true,
    parts: [
      { role: 'carb', options: ['bread_white'] },
      { role: 'fat', options: ['peanut_butter'], maxG: 30 },
      { role: 'extra', options: ['jam'], maxG: 25 },
      { role: 'fruit', options: ['banana', 'strawberries'], optional: true },
    ],
  },
  {
    id: 'burrito',
    name: { en: 'Bean burrito', hr: 'Burrito s grahom' },
    types: ['main'],
    treat: true,
    parts: [
      { role: 'carb', options: ['tortilla'] },
      { role: 'protein', options: ['beans', 'chickpeas'] },
      { role: 'carb', options: ['rice'], maxG: 70 },
      { role: 'fat', options: ['avocado'], optional: true, maxG: 70 },
      { role: 'veg', options: ['tomato', 'pepper', 'lettuce'], maxG: 120 },
    ],
  },
  {
    id: 'loaded_fries',
    name: { en: 'Loaded fries', hr: 'Pomfrit s dodacima' },
    types: ['main'],
    treat: true,
    parts: [
      { role: 'carb', options: ['fries'], maxG: 250 },
      { role: 'protein', options: ['chickpeas', 'beans', 'beef_patty', 'chicken_breast'] },
      { role: 'fat', options: ['avocado', 'hummus'], optional: true, maxG: 70 },
      { role: 'veg', options: ['tomato', 'pepper', 'lettuce'], maxG: 120 },
      { role: 'extra', options: ['ketchup'], optional: true, maxG: 30 },
    ],
  },  {
    id: 'ice_cream',
    name: { en: 'Ice cream', hr: 'Sladoled' },
    types: ['snack'],
    treat: true,
    parts: [
      { role: 'extra', options: ['ice_cream'], maxG: 150 },
      { role: 'fruit', options: ['strawberries', 'berries', 'banana'], optional: true },
    ],
  },
  {
    id: 'chocolate',
    name: { en: 'Chocolate & fruit', hr: 'Čokolada i voće' },
    types: ['snack'],
    treat: true,
    parts: [
      { role: 'extra', options: ['milk_chocolate', 'dark_chocolate'], maxG: 40 },
      { role: 'fruit', options: ['apple', 'banana', 'orange', 'mandarin', 'strawberries'] },
    ],
  },
  {
    id: 'burger',
    name: { en: 'Burger & fries', hr: 'Burger i pomfrit' },
    types: ['main'],
    treat: true,
    parts: [
      { role: 'carb', options: ['burger_bun'], maxG: 120 },
      { role: 'protein', options: ['beef_patty'], maxG: 180 },
      { role: 'extra', options: ['gouda'], optional: true, maxG: 30 },
      { role: 'veg', options: ['tomato', 'lettuce', 'cucumber'], maxG: 100 },
      { role: 'carb', options: ['fries'], maxG: 200 },
      { role: 'extra', options: ['ketchup'], optional: true, maxG: 30 },
    ],
  },
  {
    id: 'pizza',
    name: { en: 'Pizza night', hr: 'Večer pizze' },
    types: ['main'],
    treat: true,
    parts: [
      { role: 'carb', options: ['pizza'], maxG: 400 },
      { role: 'veg', options: ['lettuce', 'tomato', 'cucumber'] },
      { role: 'fat', options: ['olive_oil'], optional: true, maxG: 10 },
    ],
  },
  {
    id: 'cevapi',
    name: { en: 'Ćevapi with lepinja', hr: 'Ćevapi u lepinji' },
    types: ['main'],
    treat: true,
    parts: [
      { role: 'protein', options: ['cevapi'], maxG: 250 },
      { role: 'carb', options: ['lepinja'] },
      { role: 'veg', options: ['pepper', 'tomato', 'cucumber'], maxG: 150 },
      { role: 'extra', options: ['fries'], optional: true, maxG: 150 },
    ],
  },
  {
    id: 'carbonara',
    name: { en: 'Pasta carbonara', hr: 'Tjestenina carbonara' },
    types: ['main'],
    treat: true,
    parts: [
      { role: 'carb', options: ['pasta'] },
      { role: 'extra', options: ['bacon'], maxG: 70 },
      { role: 'protein', options: ['eggs'], maxG: 110 },
      { role: 'extra', options: ['parmesan'], maxG: 30 },
    ],
  },
];


export const TEMPLATE_BY_ID: Record<string, MealTemplate> = Object.fromEntries(
  MEAL_TEMPLATES.map((t) => [t.id, t]),
);

