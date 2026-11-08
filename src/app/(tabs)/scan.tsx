import Ionicons from '@expo/vector-icons/Ionicons';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { FoodPhoto } from '@/components/food-photo';
import { AppText, Button, Card, Chip, Notice, Screen } from '@/components/ui';
import { TAB_BAR_HEIGHT } from '@/components/wood-tab-bar';
import { FOODS, FOOD_BY_ID } from '@/data/foods';
import { dateKey } from '@/lib/dates';
import { formatMoney, formatNumber } from '@/lib/format';
import { CHAIN_IDS, chainName, storePrice } from '@/lib/prices';
import {
  linePricePerKg,
  lineGrams,
  readReceipt,
  receiptsConfigured,
  sharePrices,
  type ReceiptLine,
} from '@/lib/receipts';
import { useAppStore } from '@/store/app-store';
import { Radius, Space, useColors } from '@/theme/colors';

type Phase =
  | { name: 'idle' }
  | { name: 'reading' }
  | { name: 'review'; chain: string | null; date: string; lines: ReceiptLine[] }
  | { name: 'saved'; count: number; shared: 'yes' | 'no' | 'failed' }
  | { name: 'error'; message: string };

export default function ScanTab() {
  const { t } = useTranslation();
  const c = useColors();
  const { language, city, myPrices, saveMyPrices, clearMyPrices } = useAppStore();
  const [phase, setPhase] = useState<Phase>({ name: 'idle' });
  const money = (n: number) => formatMoney(n, language);

  const takePhoto = async (source: 'camera' | 'gallery') => {
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setPhase({ name: 'error', message: t('scan.permission') });
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
      const res =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];

      setPhase({ name: 'reading' });
      // Shrink to ~1600 px wide JPEG: plenty for reading text, small enough to upload quickly.
      const ctx = ImageManipulator.manipulate(asset.uri);
      if ((asset.width ?? 0) > 1600) ctx.resize({ width: 1600 });
      const image = await (await ctx.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
      if (!image.base64) throw new Error('no image data');

      const result = await readReceipt(image.base64);
      setPhase({ name: 'review', chain: result.chain, date: result.date ?? dateKey(), lines: result.lines });
    } catch (e) {
      setPhase({ name: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  const save = async (p: Extract<Phase, { name: 'review' }>) => {
    if (!p.chain) return;
    const rows = p.lines
      .filter((l) => l.include)
      .map((l) => ({ foodId: l.foodId!, chain: p.chain!, price: linePricePerKg(l)!, date: p.date }))
      .filter((r) => r.price !== null);
    saveMyPrices(rows);
    let shared: 'yes' | 'no' | 'failed' = 'no';
    if (receiptsConfigured && city) {
      try {
        await sharePrices(rows.map((r) => ({ chain: r.chain, city, foodId: r.foodId, pricePerKg: r.price, date: r.date })));
        shared = 'yes';
      } catch {
        shared = 'failed';
      }
    }
    setPhase({ name: 'saved', count: rows.length, shared });
  };

  return (
    <Screen
      bottomInset={TAB_BAR_HEIGHT}
      footer={
        phase.name === 'review' ? (
          <View>
            <Button
              title={phase.chain ? t('scan.save', { n: phase.lines.filter((l) => l.include).length }) : t('scan.pickStore')}
              onPress={() => save(phase)}
              disabled={!phase.chain || !phase.lines.some((l) => l.include)}
              icon="checkmark"
            />
          </View>
        ) : undefined
      }>
      <AppText variant="title">{t('scan.title')}</AppText>

      {!receiptsConfigured ? (
        <Card style={{ backgroundColor: c.woodSoft, borderColor: c.woodSoft }}>
          <View style={styles.row}>
            <Ionicons name="construct-outline" size={20} color={c.wood} />
            <AppText variant="heading" style={styles.flex}>
              {t('scan.notConfiguredTitle')}
            </AppText>
          </View>
          <AppText variant="caption">{t('scan.notConfiguredText')}</AppText>
        </Card>
      ) : null}

      {phase.name === 'idle' || phase.name === 'error' ? (
        <Card style={styles.gapMd}>
          <View style={[styles.hero, { backgroundColor: c.woodSoft }]}>
            <Ionicons name="receipt-outline" size={44} color={c.wood} />
          </View>
          <AppText color="textSecondary" style={styles.center}>
            {t('scan.intro')}
          </AppText>
          {phase.name === 'error' ? <Notice text={t('scan.error', { error: phase.message })} /> : null}
          <Button title={t('scan.camera')} icon="camera" onPress={() => takePhoto('camera')} disabled={!receiptsConfigured} />
          <Button
            title={t('scan.gallery')}
            icon="images-outline"
            variant="secondary"
            onPress={() => takePhoto('gallery')}
            disabled={!receiptsConfigured}
          />
          <AppText variant="caption" color="textSecondary" style={styles.center}>
            {t('scan.tips')}
          </AppText>
        </Card>
      ) : null}

      {phase.name === 'reading' ? (
        <Card style={[styles.gapMd, styles.centerItems]}>
          <ActivityIndicator size="large" color={c.primary} />
          <AppText variant="heading">{t('scan.reading')}</AppText>
          <AppText variant="caption" color="textSecondary">
            {t('scan.readingSub')}
          </AppText>
        </Card>
      ) : null}

      {phase.name === 'review' ? <Review phase={phase} onChange={setPhase} /> : null}

      {phase.name === 'saved' ? (
        <Card style={styles.gapMd}>
          <View style={styles.row}>
            <Ionicons name="checkmark-circle" size={24} color={c.statusGood} />
            <AppText variant="heading" style={styles.flex}>
              {t('scan.saved', { n: phase.count })}
            </AppText>
          </View>
          {phase.shared === 'yes' ? (
            <AppText variant="caption" color="textSecondary">
              {t('scan.shared', { city })}
            </AppText>
          ) : null}
          {phase.shared === 'failed' ? <Notice text={t('scan.shareFailed')} /> : null}
          <Button title={t('scan.scanAnother')} icon="camera" onPress={() => setPhase({ name: 'idle' })} />
        </Card>
      ) : null}

      {phase.name !== 'review' ? (
        <Card>
          <AppText variant="heading">{t('scan.myPrices')}</AppText>
          {Object.keys(myPrices).length === 0 ? (
            <AppText variant="caption" color="textSecondary">
              {t('scan.noPrices')}
            </AppText>
          ) : (
            <>
              {Object.entries(myPrices).flatMap(([foodId, byChain]) =>
                Object.entries(byChain).map(([chain, v]) => (
                  <View key={`${foodId}-${chain}`} style={styles.row}>
                    {FOOD_BY_ID[foodId] ? <FoodPhoto food={FOOD_BY_ID[foodId]} size={32} /> : null}
                    <AppText variant="caption" style={styles.flex}>
                      {FOOD_BY_ID[foodId]?.name[language] ?? foodId} · {chainName(chain)}
                    </AppText>
                    <AppText variant="label">{t('scan.perKg', { price: money(v.price) })}</AppText>
                  </View>
                )),
              )}
              <Button title={t('scan.clear')} variant="danger" icon="trash-outline" onPress={clearMyPrices} />
            </>
          )}
        </Card>
      ) : null}
    </Screen>
  );
}

/* ---------- Review & correct ---------- */

function Review({
  phase,
  onChange,
}: {
  phase: Extract<Phase, { name: 'review' }>;
  onChange: (p: Phase) => void;
}) {
  const { t } = useTranslation();
  const c = useColors();
  const language = useAppStore((s) => s.language);
  const [editing, setEditing] = useState<string | null>(null);
  const money = (n: number) => formatMoney(n, language);

  const update = (key: string, patch: Partial<ReceiptLine>) =>
    onChange({
      ...phase,
      lines: phase.lines.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, ...patch };
        if (patch.foodId !== undefined) next.include = linePricePerKg(next) !== null;
        return next;
      }),
    });

  const matched = phase.lines.filter((l) => l.foodId);
  const unmatched = phase.lines.filter((l) => !l.foodId);

  return (
    <>
      <Card>
        <AppText variant="heading">{t('scan.store')}</AppText>
        <View style={styles.chips}>
          {CHAIN_IDS.map((id) => (
            <Chip key={id} label={chainName(id)} selected={phase.chain === id} onPress={() => onChange({ ...phase, chain: id })} />
          ))}
        </View>
        <AppText variant="caption" color="textSecondary">
          {t('scan.date')}: {phase.date} · {t('scan.found', { n: matched.length })}
        </AppText>
      </Card>

      {[...matched, ...unmatched].map((l) => {
        const food = l.foodId ? FOOD_BY_ID[l.foodId] : null;
        const perKg = linePricePerKg(l);
        const list = l.foodId && phase.chain ? storePrice(l.foodId, phase.chain) : null;
        const grams = lineGrams(l);
        return (
          <Card key={l.key} style={[styles.line, !food && { opacity: 0.7 }]}>
            <View style={styles.row}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: l.include, disabled: perKg === null }}
                disabled={perKg === null}
                onPress={() => update(l.key, { include: !l.include })}
                hitSlop={8}>
                <Ionicons
                  name={l.include ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={perKg === null ? c.border : l.include ? c.primary : c.textSecondary}
                />
              </Pressable>
              {food ? <FoodPhoto food={food} size={36} /> : <Ionicons name="help-circle-outline" size={36} color={c.border} />}
              <View style={styles.flex}>
                <AppText variant="label">{food ? food.name[language] : t('scan.notUsed')}</AppText>
                <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                  {l.text}
                </AppText>
              </View>
              <Chip label={t('scan.change')} tone="wood" onPress={() => setEditing(editing === l.key ? null : l.key)} />
            </View>
            <AppText variant="caption" color="textSecondary">
              {money(l.totalPrice)}
              {grams > 0 ? ` · ${grams >= 1000 ? `${formatNumber(grams / 1000, language, 2)} kg` : `${Math.round(grams)} g`}` : ` · ${t('scan.noWeight')}`}
              {perKg !== null ? ` → ${t('scan.perKg', { price: money(perKg) })}` : ''}
              {perKg !== null && list !== null ? ` (${t('scan.listPrice', { price: money(list) })})` : ''}
            </AppText>
            {editing === l.key ? (
              <FoodPicker
                onPick={(foodId) => {
                  update(l.key, { foodId });
                  setEditing(null);
                }}
              />
            ) : null}
          </Card>
        );
      })}
    </>
  );
}

function FoodPicker({ onPick }: { onPick: (foodId: string | null) => void }) {
  const { t } = useTranslation();
  const c = useColors();
  const language = useAppStore((s) => s.language);
  const [q, setQ] = useState('');
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (s ? FOODS.filter((f) => f.name.en.toLowerCase().includes(s) || f.name.hr.toLowerCase().includes(s)) : FOODS).slice(0, 6);
  }, [q]);

  return (
    <View style={styles.picker}>
      <AppText variant="caption" color="textSecondary">
        {t('scan.pickFood')}
      </AppText>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder={t('prefs.search')}
        placeholderTextColor={c.textSecondary}
        autoFocus
        style={[styles.search, { color: c.text, borderColor: c.border }]}
      />
      {results.map((f) => (
        <Pressable key={f.id} accessibilityRole="button" onPress={() => onPick(f.id)} style={styles.row}>
          <FoodPhoto food={f} size={28} />
          <AppText variant="caption">{f.name[language]}</AppText>
        </Pressable>
      ))}
      <Chip label={t('scan.notAFood')} tone="danger" onPress={() => onPick(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  centerItems: { alignItems: 'center' },
  gapMd: { gap: Space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  hero: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  line: { gap: 6 },
  picker: { gap: 6, paddingTop: Space.sm },
  search: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: Space.md, height: 40, fontSize: 15 },
});
