import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { foodImageUrl, type Food } from '@/data/foods';
import { useColors } from '@/theme/colors';

export function FoodPhoto({ food, size = 44 }: { food: Food; size?: number }) {
  const c = useColors();
  const url = foodImageUrl(food);
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: c.woodSoft, borderColor: c.card },
      ]}>
      {url ? (
        <Image
          source={{ uri: url }}
          style={{ width: size * 0.82, height: size * 0.82 }}
          contentFit="contain"
          cachePolicy="disk"
          transition={150}
          accessibilityLabel={food.name.en}
        />
      ) : (
        <Ionicons name="restaurant-outline" size={size * 0.45} color={c.wood} />
      )}
    </View>
  );
}

/** Up to three overlapping food photos. */
export function FoodPhotoStack({ foods, size = 46 }: { foods: Food[]; size?: number }) {
  const shown = foods.slice(0, 3);
  return (
    <View style={{ width: size + (shown.length - 1) * size * 0.45, height: size, flexDirection: 'row' }}>
      {shown.map((f, i) => (
        <View key={f.id} style={{ position: 'absolute', left: i * size * 0.45, zIndex: 3 - i }}>
          <FoodPhoto food={f} size={size} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, overflow: 'hidden' },
});
