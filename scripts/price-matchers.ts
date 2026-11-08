// How each app food is found in Croatian supermarket price lists.
// Product names are normalized first: lowercase, no diacritics (č→c, š→s…), punctuation → spaces.
//
// include: product name must match
// exclude: product name must NOT match (flavoured, processed, unrelated products)
// yield:   fraction of the bought weight that the app counts (banana peel, can liquid…)
// unit:    'kg' (price per kg or litre) or 'piece' (eggs, priced per egg)

export interface Matcher {
  include: RegExp;
  exclude?: RegExp;
  yield?: number;
  unit?: 'kg' | 'piece';
  /** Grams per piece when unit is 'piece'. */
  pieceG?: number;
  /** Plausible € per kg after yield — anything outside is treated as a matching mistake. */
  range: [number, number];
  /** How many words may come before the food word (default 3). Fresh produce: 1. */
  maxWordIndex?: number;
  /** For beans/chickpeas: yield when the product is dried (1 kg dry → ~2.4 kg cooked). */
  dryYield?: number;
  /** Treats are sweets/snacks themselves, so the global sweets filter must not apply. */
  skipGlobal?: boolean;
}

/** Canned/jarred product names (net/drained weights, "u slanoj vodi", "konzerva"…). */
export const CANNED = /\d+ ?g ?\/ ?\d+ ?g|konzerv\w*|steriliz\w*|slanoj vodi|salamur\w*|limenk\w*|staklenk\w*|\bom \d|kuhan\w*/;

/** Never food we want: sweets, drinks, pet food, cosmetics, baby food… */
export const GLOBAL_EXCLUDE =
  /\b(sok|nektar|cokolad\w*|bombon\w*|keks\w*|cips|sirup|sampon|gel za|pseci|za pse|za mace|macji|igrack\w*|torta|kolac\w*|sladoled|smoothie|musli|kasic\w*|bebi|baby|djecj\w*|aroma|okusom|okus|puding|lizalic\w*|kozmet\w*|losion|sapun|liker|rakij\w*|caj|biljk\w*|sjeme|presadnic\w*|dekor\w*|svijec\w*|pice|gazirano|voda|slad|cedevita|whiskas|friskies|felix|purina|pedigree|sheba|kitekat|gourmet|buddy|syoss|nivea|pesto|ocat|ocet|dvopek|zacin\w*|umak\w*|fix|juh\w*|hipp|kotanyi|sendvic\w*|send|cappellet\w*|tortelin\w*|raviol\w*)\b/;

/** Store categories that are never food. */
export const NON_FOOD_CATEGORY = /kozmet|pic|ciscen|kucanst|toalet|potrepst/;

const MEAT_PROCESSED =
  /narez\w*|dimlj\w*|pohan\w*|nugget\w*|salam\w*|pastet\w*|kobas\w*|hrenovk\w*|sendvic\w*|marinir\w*|gril\w*|pecen\w*|kuhan\w*|kebab|burger\w*|cevap\w*|panir\w*|rolad\w*|ovitk\w*|pljeskav\w*|raznjic\w*|gotov\w*/;

const FLAVOURS =
  /vocn\w*|jagod\w*|vanil\w*|kokos\w*|breskv\w*|visnj\w*|borovnic\w*|banan\w*|ananas|marelic\w*|lesnjak|lijesnjak\w*|kava|karamel\w*|stracciatella|limun\w*|mango|malin\w*|sumsk\w*|med\b|zitaric\w*|cerealij\w*/;

export const MATCHERS: Record<string, Matcher> = {
  /* ---------- Protein ---------- */
  chicken_breast: { include: /\bpilec\w* (file\w*|prsa)\b|\bpileca prsa\b/, exclude: MEAT_PROCESSED, range: [4, 25] },
  turkey_breast: { include: /\bpurec\w* (file\w*|prsa)\b/, exclude: MEAT_PROCESSED, range: [5, 30] },
  beef_mince: {
    include: /mljeven\w* (junet\w*|junec\w*|goved\w*)|(junet\w*|junec\w*|goved\w*) (meso )?mljeven\w*/,
    exclude: /mijesan\w*|mjesan\w*|svinj\w*|cevap\w*|pljeskav\w*|burger\w*|cufte|gotov\w*/,
    range: [5, 25],
  },
  pork_loin: {
    include: /svinjsk\w* (lungic|file\w*|kare|karre|slabin\w*|kotlet\w*)|\blungic\b/,
    exclude: MEAT_PROCESSED,
    range: [4, 16],
  },
  salmon: {
    include: /\blosos\w*\b/,
    exclude: /dimlj\w*|namaz|pastet\w*|konzerv\w*|ulju|tartar|sushi|burger\w*|salat\w*|kroket\w*|pohan\w*|stapic\w*|lisnat\w*|tijest\w*|focacc\w*|spinat\w*/,
    range: [8, 35],
  },
  hake: { include: /\boslic\w*\b/, exclude: /pohan\w*|panir\w*|stapic\w*|burger\w*|gotov\w*/, range: [3, 25] },
  tuna: {
    include: /\btun(a|e|u)?\b/,
    exclude: /file\w*|domac\w*|ulj\w*|glav\w*|cijel\w*|dugoperajn\w*|\bi\b|\bnam\b|sir\b|salat\w*|namaz|pastet\w*|odrezak|steak|svjez\w*|smrz\w*|mace|pas\b|sendvic\w*|sa povrc\w*|meksik\w*|umak\w*|tjestenin\w*/,
    yield: 0.7,
    range: [5, 40],
  },
  sardines: {
    include: /\bsardin\w*\b/,
    exclude: /pastet\w*|namaz|svjez\w*|smrz\w*|umak\w*|rajcic\w*|salat\w*|povrc\w*/,
    yield: 0.8,
    range: [3, 30],
  },
  eggs: {
    include: /\bjaja\b/,
    exclude: /uskrs\w*|bojan\w*|tjestenin\w*|majonez\w*|vafel|spatzle|jajima|od jaja|prepelic\w*|tekuc\w*|bjelanj\w*|kuhan\w*|pecen\w*|tjest\w*|rezanc\w*|\d jaja\b|svjez\w* jaja\b.*tjest/,
    unit: 'piece',
    pieceG: 55,
    range: [2, 15],
  },
  tofu: { include: /\btofu\b/, exclude: /dimlj\w*|marinir\w*|kobas\w*|burger\w*|namaz/, range: [4, 25] },
  chickpeas: {
    include: /\bslanut\w*|leblebij\w*/,
    exclude: /humus|hummus|brasn\w*|grick\w*|pecen\w*|namaz|suh\w*|falafel/,
    yield: 0.6,
    dryYield: 2.2,
    range: [1, 15],
  },
  lentils: {
    include: /\blec(a|e)\b/,
    exclude: /konzerv\w*|kuhan\w*|juh\w*|namaz|grick\w*|brasn\w*|tjestenin\w*|pasta|salat\w*|varivo/,
    range: [1.5, 12],
  },
  beans: {
    include: /\bgrah\w*\b/,
    exclude: /mahun\w*|suh\w*|varivo|juh\w*|grick\w*|kobas\w*|gotov\w*|zrno|tetovac|brasn\w*|zeleni|salat\w*/,
    yield: 0.6,
    dryYield: 2.4,
    range: [1, 12],
  },
  ham: {
    include: /\bsunk\w*\b/,
    exclude: /pure\w*|pile\w*|prsut\w*|pizz\w*|salat\w*|sendvic\w*|namaz|tjestenin\w*|kroket\w*|burek|lisnat\w*|panin\w*|tortilj\w*|kroasan\w*|pecivo|tost/,
    range: [5, 30],
  },
  turkey_ham: { include: /purec\w* sunk\w*|sunk\w* od puret\w*/, exclude: /pizz\w*|sendvic\w*|tost/, range: [5, 30] },

  /* ---------- Dairy ---------- */
  cottage_cheese: {
    include: /\bsvjezi sir\b|\bkravlji sir\b|\bzrnati sir\b|cottage/,
    exclude: new RegExp(
      `\\bs\\b|\\bsa\\b|voc\\w*|jogurt\\w*|namaz|krem\\w*|vrhnj\\w*|burek|pita|strudl\\w*|lisnat\\w*|desert\\w*|vlasc\\w*|zacin\\w*|kolac\\w*|tijest\\w*|stapic\\w*|pecivo|${FLAVOURS.source}`,
    ),
    range: [2, 10],
  },
  greek_yogurt: { include: /\bgrck\w* jogurt\w*|jogurt\w* grck\w*/, exclude: FLAVOURS, range: [2, 12] },
  skyr: { include: /\bskyr\b/, exclude: FLAVOURS, range: [2, 12] },
  yogurt: {
    include: /\bjogurt\b/,
    exclude: new RegExp(`grck\\w*|skyr|kefir|lassi|proteinsk\\w*|tekuc\\w*.*${FLAVOURS.source}|${FLAVOURS.source}|bez laktoze|napitak|pice|kozm\\w*|maska`),
    range: [0.8, 8],
  },
  milk: {
    include: /\bmlijeko\b/,
    exclude:
      /kakao|kokos\w*|badem\w*|zob\w*|soj\w*|riz\w*|kondenz\w*|prah\w*|vanil\w*|jagod\w*|kava|kozj\w*|bez laktoze|tijelo|cistac\w*|napitak|desert\w*|vrhnj\w*|cokol\w*|mlijecn\w*|lice|sredstv\w*|ocisc\w*|kozmet\w*|uklanj\w*|0 ?1 ?%|0 ?5 ?%/,
    range: [0.6, 3],
  },
  gouda: { include: /\bgaud\w*|\bgouda\b/, exclude: /grick\w*|kreker\w*|namaz|sendvic\w*/, range: [5, 30] },
  feta: { include: /\bfeta\b|bijeli sir u salamuri/, exclude: /namaz|salat\w*|pita|burek|tjestenin\w*|grick\w*|kocka\w* u ulju|kruh|krumpir\w*|kobas\w*|punjen\w*|pecivo|tijest\w*|strudl\w*/, range: [4, 25] },
  soy_drink: {
    include: /soj\w* (napitak|pice|mlijek\w*)|napitak od soj\w*|soy drink|soja drink/,
    exclude: /kakao|vanil\w*|kava|desert\w*|jogurt\w*|puding\w*|cokol\w*/,
    range: [1, 6],
  },

  /* ---------- Grains & starches ---------- */
  oats: {
    include: /zoben\w* pahulj\w*|pahulj\w* zob\w*/,
    exclude: /instant|kasic\w*|grick\w*|krem\w*|napitak|bar|plocic\w*|mekinj\w*|keks\w*|cokol\w*/,
    range: [1, 8],
  },
  bread_whole: {
    include: /\bkruh\b.*(integral\w*|cjelovit\w*|razen\w*|crni|tamni|graham|sjemen\w*|zrno\w*)|(integral\w*|cjelovit\w*|razen\w*|crni|tamni|graham) kruh/,
    exclude: /mrvic\w*|tost|dvopek|krutoni|mix za|smjes\w*|brasn\w*|prepecen\w*|hrskav\w*|bez glutena|smrz\w*/,
    range: [1.5, 12],
  },
  bread_white: {
    include: /\bkruh\b|\bbaget\w*|\bstruc\w*\b|polubijel\w*/,
    exclude:
      /integral\w*|cjelovit\w*|razen\w*|crni|tamni|graham|sjemen\w*|zrno\w*|mrvic\w*|tost|dvopek|krutoni|mix|smjes\w*|brasn\w*|prepecen\w*|hrskav\w*|sendvic\w*|hamburger|hot ?dog|bez glutena|kukuruz\w*|slatk\w*|pizz\w*|lisnat\w*|smrz\w*|cesnjak\w*|maslac|sir\b|kroasan\w*|pecivo|kifl\w*/,
    range: [1, 10],
  },
  rice: {
    include: /\briz(a|e|u)\b/,
    exclude:
      /smed\w*|integral\w*|basmati|janjet\w*|govedin\w*|piletin\w*|jasmin\w*|arborio|rizot\w*|divlj\w*|crn\w*|kuhan\w*|vrecic\w*|pahulj\w*|kreker\w*|ekspand\w*|napitak|mlijek\w*|brasn\w*|puding\w*|tjestenin\w*|rezanc\w*|grick\w*|ocat|ocet|papir\w*|gotov\w*|mikrovalnu|pecen\w*|salat\w*|sushi|parboil\w*|crven\w*/,
    range: [1, 8],
  },
  brown_rice: {
    include: /(smed\w*|integral\w*) riz\w*|riz\w* (smed\w*|integral\w*)/,
    exclude: /kreker\w*|napitak|pahulj\w*|brasn\w*|tjestenin\w*|kuhan\w*|gotov\w*|vrecic\w*|mikrovalnu|vafl\w*|galet\w*/,
    range: [1.5, 10],
  },
  pasta: {
    include:
      /\b(spaghett\w*|spaget\w*|penne|pene|fusill\w*|fusil\w*|makaron\w*|tjestenin\w*|tagliatel\w*|farfall\w*|rigaton\w*|tortiglion\w*|puzic\w*|svrdl\w*|perc\w*|linguin\w*|kriteraj\w*|kokice tjest\w*)\b/,
    exclude:
      /integral\w*|cjelovit\w*|pirov\w*|bez glutena|svjez\w*|punjen\w*|tortelin\w*|raviol\w*|njok\w*|gotov\w*|umak\w*|lazanj\w*|juh\w*|instant|jaj\w*|riz\w*|heljd\w*|kukuruz\w*|lec\w*|slanut\w*|salat\w*|smrz\w*|sir\b|carbonar\w*|bolonj\w*|cup|zdjel\w*|mikrovalnu/,
    range: [0.8, 8],
  },
  pasta_whole: {
    include: /(integral\w*|cjelovit\w*|pirov\w*).*(spaghett\w*|spaget\w*|penne|pene|fusill\w*|tjestenin\w*|makaron\w*|puzic\w*|svrdl\w*)|(spaghett\w*|spaget\w*|penne|pene|fusill\w*|tjestenin\w*|makaron\w*).*(integral\w*|cjelovit\w*|pirov\w*)/,
    exclude: /bez glutena|punjen\w*|svjez\w*|gotov\w*|umak\w*/,
    range: [1.5, 12],
  },
  potatoes: { maxWordIndex: 1,
    include: /\bkrumpir\w*\b/,
    exclude:
      /pomfrit\w*|smrz\w*|pire|cips|kroket\w*|pecen\w*|njok\w*|slatk\w*|batat|konzerv\w*|salat\w*|juh\w*|prah\w*|pahulj\w*|rosti|kuhan\w*|ljust\w*|kolut\w*|kriske|stapic\w*|gotov\w*|wedges|brasn\w*|tijest\w*|burek|pita|grick\w*/,
    range: [0.4, 4],
  },
  sweet_potato: { maxWordIndex: 1, include: /\bbatat\w*|slatk\w* krumpir\w*/, exclude: /cips|pomfrit\w*|smrz\w*|pire|kolut\w*|pecen\w*/, range: [1, 8] },
  buckwheat: { maxWordIndex: 1,
    include: /\bheljd\w*/,
    exclude: /brasn\w*|tjestenin\w*|pahulj\w*|kreker\w*|kruh\w*|vafl\w*|galet\w*|kasa s|napitak|rezanc\w*|soba|mjesav\w*|pecivo|medaljon\w*/,
    range: [1.5, 12],
  },
  polenta: { include: /\bpalent\w*|kukuruzn\w* krupic\w*|kukuruzn\w* griz\w*/, exclude: /grick\w*|cips/, range: [0.8, 8] },
  quinoa: { include: /\bkvinoj\w*|quinoa/, exclude: /pahulj\w*|kreker\w*|tjestenin\w*|salat\w*|grick\w*|napitak|bar|vafl\w*|galet\w*|mix|mjesav\w*|mjes|rice up|crisp\w*|chips/, range: [3, 20] },
  couscous: { include: /\bkus ?kus\b|couscous|cuscus/, exclude: /gotov\w*|salat\w*|zacin\w*/, range: [1, 10] },
  tortilla: {
    include: /\btortilj\w*|tortilla|\bwrap\w*/,
    exclude: /cips|nachos|grick\w*|kukuruz\w*|gotov\w*|sendvic\w*|punjen\w*|piletin\w*|sir\b|mini|integral\w*/,
    range: [2, 12],
  },
  rice_cakes: {
    include: /\brizin\w* (kreker\w*|vafl\w*|galet\w*|plocic\w*|kruscic\w*|kolac\w*)|(kreker\w*|vafl\w*|galet\w*) od riz\w*|\briz\w* vafl\w*/,
    exclude: /mlijecn\w*|jogurt\w*|preljev\w*|preliv\w*|paprik\w*|sir\b|pizza|chili|jabuk\w*|cimet\w*|tamn\w*|bijel\w*|kukuruz\w*|mini|mjesavin\w*|japansk\w*/,
    range: [3, 25],
  },

  /* ---------- Vegetables ---------- */
  lettuce: {
    include: /\bsalat\w* (zelen\w*|ledenk\w*|puter\w*|kristal\w*|lollo|endivij\w*|radic\w*|krstac\w*|romaine|rimsk\w*)|\b(puterica|ledenka|matovilac|rikola|radic|endivija)\b/,
    exclude: /krumpir\w*|tun\w*|pilec\w*|grah\w*|majonez\w*|rusk\w*|francusk\w*|kupus\w*|ciklu|krastav\w*|paprik\w*|umak\w*|preljev\w*|gotov\w*|obrok\w*|tjestenin\w*|sir\b|mahun\w*|hobotnic\w*|plodov\w*|sjem\w*|kisel\w*|tikvic\w*|smrz\w*|maslin\w*/,
    range: [1, 15],
  },
  tomato: { maxWordIndex: 1,
    include: /\brajcic\w*/,
    exclude:
      /pasir\w*|koncentr\w*|umak\w*|sus\w*|kecap|pelat\w*|konzerv\w*|sjeckan\w*|passata|cherry|ketchup|pire|salsa|juh\w*|pasta|ulju|pesto|bruschett\w*|grick\w*|cips|mini|datterini|koktel\w*|grozd\w*|kroket\w*|pizz\w*|tjestenin\w*|riz\w*|mozzarell\w*/,
    range: [0.8, 8],
  },
  cucumber: { maxWordIndex: 1, include: /\bkrastav\w*/, exclude: /kisel\w*|salat\w*|octu|staklenk\w*|mini|korniso\w*|umak\w*|tzatziki|dzadziki/, range: [0.6, 8] },
  pepper: { maxWordIndex: 1,
    include: /\bpaprik\w*\b.*(crven\w*|babur\w*|zut\w*|mix|tricolor|rog\w*|slatk\w*|zelen\w*)|\bbabur\w*\b/,
    exclude: /mljeven\w*|zacin\w*|ajvar|pecen\w*|punjen\w*|kisel\w*|ostr\w*|ljut\w*|chili|namaz|pasta|krem\w*|ulju|salat\w*|feferon\w*|prah\w*|dimljen\w*|sus\w*|konzerv\w*|umak\w*|grick\w*|cips|kobas\w*|salam\w*|pljeskav\w*|smrz\w*|mini/,
    range: [1, 12],
  },
  broccoli: { maxWordIndex: 1, include: /\bbrokul\w*/, exclude: /smrz\w*|juh\w*|krem\w*|pire|mix|mjesav\w*|sjem\w*|salat\w*/, range: [1, 10] },
  zucchini: { maxWordIndex: 1, include: /\btikvic\w*/, exclude: /pohan\w*|smrz\w*|krem\w*|juh\w*|sjem\w*|ulj\w*|grill\w*|gril\w*|pecen\w*|kisel\w*|mix/, range: [0.8, 8] },
  carrot: { maxWordIndex: 1,
    include: /\bmrkv\w*/,
    exclude: /smrz\w*|mix|mjesav\w*|juh\w*|pire|cips|salat\w*|krem\w*|grashk\w*|grasak|grasak|sjem\w*|kisel\w*|ribanc\w*|naribani|mini|baby|konzerv\w*/,
    range: [0.4, 5],
  },
  spinach: { maxWordIndex: 1,
    include: /\bspinat\w*/,
    exclude: /savijac\w*|tjestenin\w*|pita|burek|pohan\w*|krem\w*|juh\w*|lisnat\w*|njok\w*|tortelin\w*|raviol\w*|svjez\w* sir|sir\b|strudl\w*|kroket\w*|pizz\w*|tijest\w*|rolad\w*|jaj\w*/,
    range: [1, 15],
  },
  chard: { maxWordIndex: 1, include: /\bblitv\w*/, exclude: /krumpir\w*|pita|burek|kroket\w*|strudl\w*/, range: [1, 10] },
  green_beans: { maxWordIndex: 1,
    include: /\bmahun\w*/,
    exclude: /salat\w*|kisel\w*|sjem\w*|konzerv\w*|staklenk\w*|varivo|zut\w*|juh\w*|gotov\w*/,
    range: [1, 10],
  },
  cabbage: { maxWordIndex: 1,
    include: /\bkupus\w*\b/,
    exclude: /kisel\w*|salat\w*|crven\w*|kelj\w*|cvjet\w*|prokulic\w*|sarm\w*|list\w*|sjem\w*|kineski|konzerv\w*|varivo|pecen\w*/,
    range: [0.3, 4],
  },
  mushrooms: { maxWordIndex: 1,
    include: /\bsampinjon\w*/,
    exclude: /konzerv\w*|staklenk\w*|kisel\w*|ulju|marinir\w*|sus\w*|juh\w*|krem\w*|umak\w*|pastet\w*|rizot\w*|pizz\w*|pecen\w*|pohan\w*|smrz\w*|rezan\w*|narezan\w*|smed\w*|mix|lim\w*/,
    range: [2, 12],
  },
  mixed_veg: {
    include: /(mjesavin\w*|mijesan\w*|mjesan\w*|mix) (povrc\w*|za wok|wok)|povrc\w* (mjesav\w*|mijesan\w*|mix|za wok|wok)|(juzno|kinesk\w*|mexick\w*|meksick\w*|wok) povrc\w*/,
    exclude: /juh\w*|krem\w*|pire|cips|grick\w*|pecen\w*|riz\w*|tjestenin\w*|piletin\w*|gotov\w*|umak\w*|salat\w*|kisel\w*|staklenk\w*|konzerv\w*/,
    range: [1, 8],
  },
  passata: {
    include: /pasiran\w* rajcic\w*|passata|pasata|rajcic\w* pasir\w*|sjeckan\w* rajcic\w*|rajcic\w* sjeckan\w*|pelat\w*/,
    exclude: /ljut\w*|chili|bosiljk\w*.*umak|maslin\w*|gljiv\w*|cesnjak\w*|luk\w*|zacinjen\w*/,
    range: [0.6, 6],
  },

  /* ---------- Fruit ---------- */
  banana: { maxWordIndex: 1,
    include: /\bbanan(a|e)\b/,
    exclude: /cips|jogurt\w*|sus\w*|desert\w*|mini|bananic\w*|napitak|kruh|baby|pire|ochi|smrz\w*/,
    yield: 0.65,
    range: [1, 5],
  },
  apple: { maxWordIndex: 1,
    include: /\bjabuk\w*\b/,
    exclude:
      /cips|sus\w*|ocat|ocet|pita|strudl\w*|jogurt\w*|pire|kompot\w*|desert\w*|cider|krem\w*|pjenu\w*|pekmez|dzem|marmelad\w*|mini|smrz\w*|pecen\w*|kriske|grick\w*|kolut\w*|ulj\w*/,
    yield: 0.9,
    range: [0.8, 6],
  },
  orange: { maxWordIndex: 1,
    include: /\bnaranc\w*\b/,
    exclude: /dzem|marmelad\w*|kor\w*|jogurt\w*|ulj\w*|krvav\w*|crven\w*|cijed\w*|desert\w*|sus\w*|kandir\w*/,
    yield: 0.73,
    range: [1, 7],
  },
  pear: { maxWordIndex: 1, include: /\bkrusk\w*\b/, exclude: /kompot\w*|konzerv\w*|sus\w*|jogurt\w*|desert\w*|dzem|pire|williams|viljamovk\w*/, yield: 0.9, range: [1, 8] },
  mandarin: { maxWordIndex: 1,
    include: /\bmandarin\w*\b|\bklementin\w*\b/,
    exclude: /konzerv\w*|kompot\w*|jogurt\w*|desert\w*|dzem|limenk\w*|staklenk\w*/,
    yield: 0.75,
    range: [0.8, 7],
  },
  kiwi: { maxWordIndex: 1, include: /\bkivi\b|\bkiwi\b/, exclude: /sus\w*|jogurt\w*|desert\w*|gold\w*|zlatn\w*/, yield: 0.85, range: [1.5, 10] },
  berries: { maxWordIndex: 1,
    include: /smrz\w*.*(bobic\w*|sumsk\w*|borovnic\w*|malin\w*|kupin\w*)|(bobic\w*|sumsk\w*|borovnic\w*|malin\w*|kupin\w*).*smrz\w*|sumsko voce|bobicasto voce/,
    exclude: /jogurt\w*|desert\w*|dzem|marmelad\w*|tijest\w*|sus\w*|muesli|obrok\w*|lisnat\w*/,
    range: [3, 25],
  },
  strawberries: { maxWordIndex: 1,
    include: /\bjagod\w*\b/,
    exclude:
      /jogurt\w*|dzem|marmelad\w*|desert\w*|krem\w*|napitak|kornet\w*|saldoled|kandit\w*|drink|milka|kiki|kompot\w*|preljev\w*|sus\w*|smrz\w*|mlijek\w*|kefir|sir\b|tijest\w*|vafl\w*|pjenu\w*|kreker\w*|sladol\w*|puding\w*|liofil\w*/,
    range: [2, 15],
  },

  /* ---------- Fats, nuts, spreads ---------- */
  olive_oil: {
    include: /maslinov\w* ulj\w*|ulj\w* maslin\w*|olive oil/,
    exclude: /komin\w*|pomace|sprej|ciabatt\w*|\bs maslin\w*|tijel\w*|kos\w*\b|krem\w*|u maslinovom|sardin\w*|tun\w*|rib\w*|masline\b|mix|mjesavin\w*|suncokret\w*|tartuf\w*|cesnjak\w*|ljut\w*|chili|bosiljk\w*|ruzmarin\w*|limun\w*/,
    yield: 0.91,
    range: [5, 35],
  },
  avocado: { maxWordIndex: 1, include: /\bavokad\w*/, exclude: /namaz|guacamole|ulj\w*|krem\w*|sushi|salat\w*|smrz\w*|pire/, yield: 0.74, range: [3, 20] },
  almonds: { maxWordIndex: 1,
    include: /\bbadem\w*\b/,
    exclude: /mlijek\w*|napitak|brasn\w*|ulj\w*|krem\w*|marcip\w*|slatk\w*|med\b|soljen\w*|zacin\w*|pecen\w*|dimljen\w*|caramel|karamel\w*|cimet\w*|mix|mjesavin\w*|pasta|maslac/,
    range: [6, 40],
  },
  walnuts: { maxWordIndex: 1,
    include: /\boras\w*\b|\borah\w*\b/,
    exclude: /orahovac|orahovic\w*|orahnjac\w*|orasast\w*|baklav\w*|pita|lokum|kiflic\w*|salam\w*|komadic\w*|ulj\w*|krem\w*|kokos\w*|lijesnjak\w*|indijsk\w*|brazil\w*|kikiriki|pistac\w*|makadam\w*|pecan|mix|mjesavin\w*|nadjev\w*|med u|kroasan\w*|kruh|pecivo|strudl\w*|potic\w*|zrno.*mljeven/,
    range: [6, 40],
  },
  hazelnuts: { maxWordIndex: 1,
    include: /\bl(j|ij)?esnjak\w*/,
    exclude: /lino|cokolino|krem\w*|namaz|mix|mjesavin\w*|nadjev\w*|jogurt\w*|kava|napitak|mlijek\w*|vafl\w*|kroasan\w*|ulj\w*|pecivo|tijest\w*|karamel\w*|maslac/,
    range: [6, 40],
  },
  peanut_butter: {
    include: /maslac od kikiriki\w*|kikiriki maslac|peanut butter|krem\w* od kikiriki\w*|kikiriki krem\w*|kikiriki namaz\w*|namaz od kikiriki\w*/,
    exclude: /bar|plocic\w*|vafl\w*/,
    range: [4, 25],
  },
  hummus: { include: /\bhumus\b|\bhummus\b/, exclude: /zemlj\w*|supstrat\w*|cvijec\w*|vrt\w*|lonc\w*|grick\w*|cips/, range: [4, 25] },

  /* ---------- Other ---------- */
  honey: {
    include: /\bmed\b.*(cvjetn\w*|livadn\w*|bagrem\w*|kadulj\w*|lip\w*|kesten\w*|vrijes\w*|sumsk\w*|domac\w*|planinsk\w*|amorf\w*|ruzmarin\w*|lavand\w*|mjesovit\w*|prirodn\w*|pcel\w*)|(cvjetn\w*|livadn\w*|bagremov\w*|kaduljin\w*|lipov\w*|kestenov\w*|vrijesov\w*|sumsk\w*|domac\w*|planinsk\w*|pcelinji|mjesoviti) med\b/,
    exclude: /meden\w*|medenjac\w*|zitar\w*|pahulj\w*|s medom|sa medom|medvjed\w*|medic\w*|senf|krem\w*|bombon\w*|lizal\w*|orasi u medu|u medu/,
    range: [5, 40],
  },
  /* ---------- Treats (cheat days) ---------- */
  pizza: {
    include: /\bpizz\w*/,
    exclude: /tijesto|mix|brasn\w*|umak\w*|zacin\w*|grick\w*|cips|kreker\w*|pecivo|snack|mini|rolic\w*|stapic\w*|ketchup|kecap|sunk\w*|za pizz\w*|sir za/,
    skipGlobal: true,
    range: [2, 20],
  },
  burger_bun: { include: /pecivo (za )?(hamburger|burger)\w*|(hamburger|burger)\w* pecivo|\bbrioche burger\w*/, exclude: /gotov\w*|smrz\w*/, range: [2, 15] },
  beef_patty: {
    include: /\bpljeskavic\w*|\bburger\w*\b.*(junec\w*|goved\w*|beef)|(junec\w*|goved\w*) burger\w*/,
    exclude: /pilec\w*|pure\w*|veg\w*|biljn\w*|soj\w*|pecivo|umak\w*|sir\b|gotov\w*|pecen\w*/,
    skipGlobal: true,
    range: [5, 25],
  },
  cevapi: { include: /\bcevap\w*/, exclude: /zacin\w*|pilec\w*|pure\w*|veg\w*|gotov\w*|pecen\w*|lepinj\w*/, skipGlobal: true, range: [5, 25] },
  lepinja: { include: /\blepinj\w*|\bsomun\w*/, exclude: /cevap\w*|punjen\w*/, range: [1.5, 12] },
  fries: { include: /\bpomfrit\w*|pommes frites|\bfrites\b/, exclude: /zacin\w*|batat|slatk\w*|cips|grick\w*/, skipGlobal: true, range: [1, 10] },
  bacon: { include: /\bslanin\w*|\bpancet\w*|\bbacon\b/, exclude: /kreker\w*|stangic\w*|sa slanin\w*|s slanin\w*|cips|grick\w*|okus|pecen\w*|kockic\w* za juh\w*/, range: [5, 30] },
  parmesan: { include: /\bparmez\w*|\bparmigian\w*|grana padano/, exclude: /salam\w*|grick\w*|kreker\w*|cips|umak\w*|pesto/, range: [8, 45] },
  milk_chocolate: {
    include: /\bmlijecn\w* cokolad\w*|\bcokolad\w* mlijecn\w*|\bmilka\b.*(alpine|mlijecn\w*|alpsk\w*)/,
    exclude: /nadjev\w*|kikiriki\w*|namaz|krem\w*|napitak|pice|kakao|keks\w*|vafl\w*|bombon\w*|praline|jaj\w*|figur\w*|lizal\w*|lesnjak\w*|lijesnjak\w*|ljesnjak\w*|orah\w*|badem\w*|riz\w*|grozd\w*|kekse/,
    skipGlobal: true,
    range: [6, 30],
  },
  dark_chocolate: {
    maxWordIndex: 1,
    include: /\b(tamn\w*|crn\w*|gork\w*) cokolad\w*|cokolad\w* (tamn\w*|crn\w*|gork\w*)|\b(70|72|74|75|85) ?% ?(kakao|cacao)/,
    exclude: /muesli|kugl\w*|komadic\w*|namaz|krem\w*|napitak|pice|keks\w*|vafl\w*|bombon\w*|praline|preljev\w*|za kuhanje|za kolac\w*|kapi\w*|mrvic\w*|lesnjak\w*|ljesnjak\w*|orah\w*|badem\w*|naranc\w*|menta|metvic\w*|cili|chili/,
    skipGlobal: true,
    range: [8, 40],
  },
  ice_cream: {
    include: /\bsladoled\w*.*vanil\w*|vanil\w*.*sladoled\w*|\bslad\b.*vanil\w*/,
    exclude: /stapic\w*|kornet\w*|sendvic\w*|kolac\w*|torta|desert\w*|cokolad\w* preljev|keks\w*/,
    skipGlobal: true,
    range: [2, 20],
  },
  hazelnut_spread: {
    include: /\bnutella\b|\blinolada\b|\bcokoladn\w* namaz\w*|\bnamaz\w* (od )?(lijesnjak\w*|lesnjak\w*|ljesnjak\w*|cokolad\w*)|\bkrem\w* (od )?(lijesnjak\w*|lesnjak\w*|ljesnjak\w*)/,
    exclude: /vafl\w*|keks\w*|kroasan\w*|pecivo|biskvit\w*|bombon\w*|go\b|b ready/,
    skipGlobal: true,
    range: [4, 25],
  },
  crepes: { include: /\bpalacink\w*/, exclude: /mjes\w*|cokolad\w*|smjes\w*|mix|brasn\w*|punjen\w*|nadjev\w*|preljev\w*|kolac\w*/, skipGlobal: true, range: [3, 20] },
  jam: { include: /\bdzem\w*|\bpekmez\w*|\bmarmelad\w*/, exclude: /kroasan\w*|keks\w*|vafl\w*|kolac\w*|pecivo|jogurt\w*|bez secera|light/, skipGlobal: true, range: [2, 15] },
  croissant: { include: /\bkroasan\w*|\bcroissant\w*/, exclude: /kakao|cok\b|cookies|visnj\w*|midi|smrz\w*|mini|punjen\w*|nadjev\w*|cokolad\w*|lesnjak\w*|ljesnjak\w*|dzem\w*|marelic\w*|vanil\w*|krem\w*|sunk\w*|sir\b/, range: [4, 25] },
  ketchup: { include: /\bkecap\w*|\bketchup\b/, exclude: /cips|grick\w*|ljut\w*|chili|curry|kari/, skipGlobal: true, range: [1, 10] },
  /* ---------- More foods ---------- */
  mackerel: { include: /\bskus\w*/, exclude: /konzerv\w*|ulj\w*|pastet\w*|umak\w*|dimlj\w*|salat\w*|rajcic\w*/, range: [3, 25] },
  trout: { include: /\bpastrv\w*/, exclude: /dimlj\w*|pastet\w*|namaz/, range: [5, 30] },
  squid: { include: /\blign\w*/, exclude: /pohan\w*|panir\w*|salat\w*|konzerv\w*|ulj\w*|grick\w*/, range: [5, 35] },
  shrimp: { include: /\bkozic\w*|\bskamp\w*|\bgamb\w*/, exclude: /panzerott\w*|rak\b|pohan\w*|panir\w*|salat\w*|umak\w*|cips|ulj\w*|okus/, range: [8, 45] },
  chicken_thigh: {
    include: /\bpilec\w* zabat\w*|\bzabatak\w*|\bzabatc\w*/,
    exclude: new RegExp(`pure\\w*|${MEAT_PROCESSED.source}`),
    range: [3, 15],
  },
  beef_steak: {
    include: /\b(junec\w*|junetin\w*|goved\w*) (but\w*|odrez\w*|steak|biftek|ramstek|vrat\w*|plec\w*|gulas\w*|ruza)/,
    exclude: new RegExp(`mljev\\w*|pikant\\w*|zacin\\w*|${MEAT_PROCESSED.source}`),
    range: [8, 40],
  },
  mozzarella: { include: /\bmozzarell\w*|\bmocarel\w*/, exclude: /salat\w*|pizz\w*|stapic\w*|pohan\w*|grick\w*|naribani|ribani/, range: [4, 25] },
  kefir: { include: /\bkefir\w*/, exclude: /vocn\w*|jagod\w*|okus|vanil\w*|borovnic\w*|banan\w*/, range: [0.8, 6] },
  barley: { include: /\bjecam\w*|\bjecmen\w* (kasa|griz|krupa)/, exclude: /kava|pahulj\w*|slad\w*|brasn\w*|napitak/, range: [1, 8] },
  bulgur: { include: /\bbulgur\w*/, exclude: /salat\w*|gotov\w*/, range: [1.5, 10] },
  millet: { include: /\bproso\b|\bprosen\w* kas\w*|\bkasa prosen\w*/, exclude: /pahulj\w*|brasn\w*|ptic\w*|za ptice/, range: [1.5, 10] },
  cauliflower: { maxWordIndex: 1, include: /\bcvjetac\w*/, exclude: /krem\w*|juh\w*|pohan\w*|mix|mjesav\w*/, range: [1, 8] },
  eggplant: { maxWordIndex: 1, include: /\bpatlidzan\w*/, exclude: /ajvar|pecen\w*|namaz|gril\w*|kisel\w*|pasteta/, range: [1, 8] },
  onion: {
    maxWordIndex: 1,
    include: /\bluk\b|\bcrven\w* luk\b|\bmlad\w* luk\b/,
    exclude: /cesnjak\w*|przen\w*|pohan\w*|kolut\w*|kisel\w*|sjem\w*|zacin\w*|prah\w*|cips|vlasac/,
    yield: 0.9,
    range: [0.4, 6],
  },
  peas: { include: /\bgrasak\b|\bgraska\b/, exclude: /mrkv\w*|mix|mjesav\w*|juh\w*|krem\w*|sjem\w*|pire|cips|wasabi/, range: [1, 8] },
  corn: {
    include: /\bkukuruz\w* (secerac|zrn\w*|u zrnu|konzerv\w*)|\bsecerac\b/,
    exclude: /palent\w*|krupic\w*|brasn\w*|pahulj\w*|cips|kokic\w*|ulj\w*|klip\w*|griz/,
    yield: 0.65,
    range: [1.5, 12],
  },
  beetroot: { maxWordIndex: 1, include: /\bcikl\w*/, exclude: /salat\w*|kisel\w*|cips|konzerv\w*|staklenk\w*|ocat/, range: [0.6, 6] },
  arugula: { include: /\brikol\w*|\brucola\b|\brukol\w*/, exclude: /pesto|mix|mjesav\w*/, range: [5, 40] },
  plums: { maxWordIndex: 1, include: /\bsljiv\w*/, exclude: /suh\w*|dzem|pekmez|rakij\w*|kompot\w*|knedl\w*|jogurt\w*/, yield: 0.94, range: [1, 8] },
  peach: { maxWordIndex: 1, include: /\bbreskv\w*/, exclude: /kompot\w*|konzerv\w*|jogurt\w*|dzem|suh\w*|polovic\w*/, yield: 0.9, range: [1, 8] },
  grapes: { maxWordIndex: 1, include: /\bgrozd\w*/, exclude: /suh\w*|ulj\w*|sjem\w*|grozdic\w*|ocat/, range: [1.5, 10] },
  watermelon: { maxWordIndex: 1, include: /\blubenic\w*/, exclude: /sjem\w*/, yield: 0.55, range: [0.3, 5] },
  dried_figs: { include: /suh\w* smokv\w*|smokv\w* suh\w*/, exclude: /namaz\w*|dzem|cokol\w*|pekmez/, range: [6, 30] },
  peanuts: {
    include: /\bkikiriki\b/,
    exclude: /maslac|krem\w*|namaz\w*|flips|smoki|ulj\w*|cips|choco|preljev\w*|bar\b|plocic\w*|mix|mjesav\w*|med\b|wasabi|chili/,
    range: [3, 20],
  },
  sunflower_seeds: { include: /\bsuncokret\w* (sjemenk\w*|jezgr\w*)|\bsjemenk\w* suncokret\w*/, exclude: /ulj\w*|mix|mjesav\w*|kruh/, range: [3, 15] },
  chia: { include: /\bchia\b/, exclude: /puding\w*|napitak|jogurt\w*|bar\b|kreker\w*|kruh/, range: [6, 30] },
  sauerkraut: { include: /\bkisel\w* kupus\w*|\bkupus\w* kisel\w*/, exclude: /salat\w*|sarm\w*/, range: [0.8, 6] },
};
