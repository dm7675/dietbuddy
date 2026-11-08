// Builds src/data/prices.json from the free daily Croatian price archive at cijene.dev
// (chains publish these lists by law: Odluka NN 75/2025).
//
//   npm run update:prices                 # download the newest archive (~140 MB) and rebuild
//   npm run update:prices -- --dir <path> --date YYYY-MM-DD  # use an already unzipped archive
//   npm run update:prices -- --report     # also print which products matched each food
//
// For each food and chain the script takes the per-kg price of every matching product
// (median across that chain's stores), then keeps the 25th percentile across products:
// a typical lower-priced choice, not the single cheapest oddity or a premium brand.

import { execFileSync } from 'node:child_process';
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { CANNED, GLOBAL_EXCLUDE, MATCHERS, NON_FOOD_CATEGORY } from './price-matchers';

const CHAINS: Record<string, string> = {
  konzum: 'Konzum',
  lidl: 'Lidl',
  kaufland: 'Kaufland',
  spar: 'Spar',
  plodine: 'Plodine',
  tommy: 'Tommy',
  studenac: 'Studenac',
  eurospin: 'Eurospin',
  ribola: 'Ribola',
  ntl: 'NTL',
};

const args = process.argv.slice(2);
const report = args.includes('--report');
const dirArg = args.includes('--dir') ? args[args.indexOf('--dir') + 1] : null;
const dateArg = args.includes('--date') ? args[args.indexOf('--date') + 1] : null;

/* ---------- Helpers ---------- */

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9%]+/g, ' ')
    .trim();

function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

async function* csvRows(file: string) {
  const rl = readline.createInterface({ input: createReadStream(file, 'utf8'), crlfDelay: Infinity });
  let header: string[] | null = null;
  for await (const line of rl) {
    if (!line) continue;
    const cells = splitCsv(line);
    if (!header) {
      header = cells;
      continue;
    }
    yield Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ''])) as Record<string, string>;
  }
}

/** How many words come before a character position. */
const wordIndex = (s: string, at: number) => (s.slice(0, at).match(/ /g) ?? []).length;

/** Foods you can really buy by weight (meat/fish/deli counter, fruit & veg). Everything else comes in packs. */
const CAN_BE_LOOSE = new Set([
  'chicken_breast', 'turkey_breast', 'beef_mince', 'pork_loin', 'salmon', 'hake', 'ham', 'turkey_ham', 'gouda', 'feta',
  'cevapi', 'bacon', 'lettuce', 'tomato', 'cucumber', 'pepper', 'broccoli', 'zucchini', 'carrot', 'spinach', 'chard',
  'green_beans', 'cabbage', 'mushrooms', 'potatoes', 'sweet_potato', 'banana', 'apple', 'orange', 'pear', 'mandarin',
  'kiwi', 'strawberries', 'avocado',
]);

/** One way to buy a food in a store: g = edible grams in the pack (0 = loose, sold by weight). */
interface Pack {
  g: number;
  /** Shelf price of the pack, or € per edible kg when loose. */
  price: number;
  loose: boolean;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const percentile = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))];
};
const titleCase = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/(^|[\s-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());

/* ---------- Archive ---------- */

async function getArchiveDir(): Promise<{ dir: string; date: string; cleanup?: () => void }> {
  if (dirArg) return { dir: dirArg, date: dateArg ?? path.basename(path.resolve(dirArg)) };
  const list = (await (await fetch('https://api.cijene.dev/v0/list')).json()) as {
    archives: { date: string; url: string; size: number }[];
  };
  // Today's archive fills up during the day (chains upload at different times), so use the
  // newest *finished* day.
  const today = new Date().toISOString().slice(0, 10);
  const newest = list.archives.find((a) => a.date < today) ?? list.archives[0];
  const work = mkdtempSync(path.join(tmpdir(), 'dietbuddy-prices-'));
  const zip = path.join(work, `${newest.date}.zip`);
  console.log(`Downloading ${newest.url} (${Math.round(newest.size / 1e6)} MB)…`);
  const res = await fetch(newest.url);
  if (!res.ok || !res.body) throw new Error(`Download failed: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(zip));
  const out = path.join(work, 'archive');
  mkdirSync(out);
  // bsdtar (Windows 10+, macOS) reads zip files; GNU tar (Linux, Git Bash) can't, so fall back to unzip.
  // Relative paths avoid GNU tar reading "C:" as a remote host.
  const name = path.basename(zip);
  try {
    execFileSync('tar', ['-xf', name, '-C', 'archive'], { cwd: work, stdio: 'ignore' });
  } catch {
    execFileSync('unzip', ['-q', '-o', name, '-d', 'archive'], { cwd: work, stdio: 'ignore' });
  }
  // The download + unpacked CSVs are ~850 MB; remove them when done.
  return { dir: out, date: newest.date, cleanup: () => rmSync(work, { recursive: true, force: true }) };
}

/* ---------- Main ---------- */

async function main() {
  const file = path.join(import.meta.dirname, '..', 'src', 'data', 'prices.json');
  // Previous prices: used for any chain missing from this archive, so no store disappears.
  const previous = existsSync(file)
    ? (JSON.parse(readFileSync(file, 'utf8')) as {
        chains: Record<string, { name: string; cities: string[] }>;
        prices: Record<string, Record<string, number>>;
      })
    : null;
  const { dir, date, cleanup } = await getArchiveDir();
  const prices: Record<string, Record<string, number>> = {};
  // food → chain → [[edible grams per pack (0 = loose), price], …]
  const packs: Record<string, Record<string, [number, number][]>> = {};
  const chains: Record<string, { name: string; cities: string[] }> = {};
  try {
  const samples: Record<string, Record<string, string[]>> = {};

  for (const [code, name] of Object.entries(CHAINS)) {
    const chainDir = path.join(dir, code);
    if (!existsSync(chainDir)) {
      if (previous?.chains[code]) {
        chains[code] = previous.chains[code];
        for (const [foodId, byChain] of Object.entries(previous.prices)) {
          if (byChain[code] !== undefined) (prices[foodId] ??= {})[code] = byChain[code];
        }
        console.warn(`! ${name}: not in this archive — kept previous prices`);
      } else console.warn(`! ${name}: not in this archive`);
      continue;
    }

    const cities = new Set<string>();
    for await (const s of csvRows(path.join(chainDir, 'stores.csv'))) if (s.city) cities.add(titleCase(s.city));
    chains[code] = { name, cities: [...cities].sort((a, b) => a.localeCompare(b, 'hr')) };

    // product id → food ids it matches
    const productFood = new Map<string, string>();
    const productName = new Map<string, string>();
    for await (const p of csvRows(path.join(chainDir, 'products.csv'))) {
      const n = normalize(p.name);
      if (NON_FOOD_CATEGORY.test(normalize(p.category ?? ''))) continue;
      const globallyExcluded = GLOBAL_EXCLUDE.test(n);
      for (const [foodId, m] of Object.entries(MATCHERS)) {
        if (globallyExcluded && !m.skipGlobal) continue;
        const hit = m.include.exec(n);
        // The food word must be near the start (names read "NOUN details brand"), so
        // "walnut cake" or "ice cream with walnut" don't count as walnuts.
        if (hit && wordIndex(n, hit.index) <= (m.maxWordIndex ?? 3) && !(m.exclude && m.exclude.test(n))) {
          productFood.set(p.product_id, foodId);
          productName.set(p.product_id, p.name);
          break;
        }
      }
    }

    // product id → shelf prices and unit (per kg / per piece) prices across stores
    const unitPrices = new Map<string, number[]>();
    const shelfPrices = new Map<string, number[]>();
    for await (const r of csvRows(path.join(chainDir, 'prices.csv'))) {
      if (!productFood.has(r.product_id)) continue;
      const v = Number.parseFloat(r.unit_price.replace(',', '.'));
      const shelf = Number.parseFloat(r.price.replace(',', '.'));
      if (!Number.isFinite(v) || v <= 0) continue;
      (unitPrices.get(r.product_id) ?? unitPrices.set(r.product_id, []).get(r.product_id)!).push(v);
      if (Number.isFinite(shelf) && shelf > 0) {
        (shelfPrices.get(r.product_id) ?? shelfPrices.set(r.product_id, []).get(r.product_id)!).push(shelf);
      }
    }

    // food → per-kg prices and pack details of each matching product
    const perFood = new Map<string, { price: number; name: string; pack: Pack | null }[]>();
    for (const [pid, list] of unitPrices) {
      const foodId = productFood.get(pid)!;
      const m = MATCHERS[foodId];
      const unit = median(list);
      const name = productName.get(pid)!;
      const dried = m.dryYield !== undefined && !CANNED.test(normalize(name));
      const factor = dried ? m.dryYield! : (m.yield ?? 1);
      const pieceKg = (m.pieceG ?? 55) / 1000;
      const perKg = (m.unit === 'piece' ? unit / pieceKg : unit) / factor;
      if (perKg < m.range[0] || perKg > m.range[1]) continue;

      // Pack size = shelf price ÷ unit price (kg, or pieces for eggs).
      const shelf = shelfPrices.has(pid) ? median(shelfPrices.get(pid)!) : null;
      let pack: Pack | null = null;
      if (shelf) {
        const amount = shelf / unit; // kg (or pieces)
        const boughtG = m.unit === 'piece' ? amount * pieceKg * 1000 : amount * 1000;
        const looksLoose =
          CAN_BE_LOOSE.has(foodId) &&
          Math.abs(amount - 1) < 0.02 &&
          (!/\d+([.,]\d+)?\s?(kg|g|l|ml)\b/i.test(name) || /\bc?ca\b/i.test(name));
        if (looksLoose) pack = { g: 0, price: perKg, loose: true };
        else if (boughtG >= 20 && boughtG <= 6000) pack = { g: Math.round(boughtG * factor), price: shelf, loose: false };
      }
      const arr = perFood.get(foodId) ?? [];
      arr.push({ price: perKg, name, pack });
      perFood.set(foodId, arr);
    }

    for (const [foodId, items] of perFood) {
      const value = percentile(
        items.map((i) => i.price),
        0.25,
      );
      (prices[foodId] ??= {})[code] = Math.round(value * 100) / 100;

      // Up to 4 ways to buy it: the cheapest per kg, the smallest pack, and loose if sold by weight.
      const options = items.filter((i) => i.pack).sort((a, b) => a.price - b.price);
      const chosen: Pack[] = [];
      const add = (p: Pack) => {
        if (!chosen.some((c) => c.loose === p.loose && c.g === p.g)) chosen.push(p);
      };
      const loose = options.find((o) => o.pack!.loose);
      if (loose) add(loose.pack!);
      options.filter((o) => !o.pack!.loose).slice(0, 3).forEach((o) => add(o.pack!));
      const smallest = options.filter((o) => !o.pack!.loose).sort((a, b) => a.pack!.g - b.pack!.g)[0];
      if (smallest) add(smallest.pack!);
      if (chosen.length) {
        (packs[foodId] ??= {})[code] = chosen.slice(0, 4).map((p) => [p.g, Math.round(p.price * 100) / 100]);
      }
      if (report) {
        (samples[foodId] ??= {})[code] = items
          .sort((a, b) => a.price - b.price)
          .slice(0, 4)
          .map((i) => `${i.name} (${i.price.toFixed(2)})`);
      }
    }
    console.log(`✓ ${name}: ${perFood.size} foods priced, ${cities.size} cities`);
  }

  const missing = Object.keys(MATCHERS).filter((id) => !prices[id]);
  if (report) {
    for (const [foodId, byChain] of Object.entries(samples)) {
      console.log(`\n## ${foodId}`);
      for (const [chain, list] of Object.entries(byChain)) console.log(`  ${chain.padEnd(9)} ${prices[foodId][chain].toFixed(2)} €/kg  ← ${list.join(' | ')}`);
    }
  }
  if (missing.length) console.warn(`\n! No prices found for: ${missing.join(', ')}`);

  const out = {
    source: 'cijene.dev daily archive of Croatian retail price lists (Odluka NN 75/2025)',
    date,
    note: '€ per kg of the food as the app counts it (edible / drained weight).',
    chains,
    prices,
    // Real ways to buy each food: [edible grams in the pack, shelf price]; grams 0 = loose (price is €/kg).
    packs,
    // Edible share of the bought weight — receipts list bought weight, so the app divides by this.
    yields: Object.fromEntries(
      Object.entries(MATCHERS)
        .filter(([, m]) => m.yield !== undefined && m.yield !== 1)
        .map(([id, m]) => [id, m.yield]),
    ),
  };
  writeFileSync(file, JSON.stringify(out));
  console.log(`\nWrote ${file}`);
  } finally {
    cleanup?.();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
