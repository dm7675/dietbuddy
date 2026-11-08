import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

const EMOJI = ['🎉', '🍕', '🍦', '🍫', '🍔', '🥳', '✨', '🍩'];

/** A short burst of falling treats. Calls onDone when finished. */
export function Celebration({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const [progress] = useState(() => new Animated.Value(0));

  // Fixed pseudo-random layout so re-renders don't reshuffle the pieces.
  const pieces = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        emoji: EMOJI[i % EMOJI.length],
        x: ((i * 37) % 100) / 100,
        delay: ((i * 13) % 10) / 25,
        drift: (((i * 53) % 9) - 4) * 12,
        size: 24 + ((i * 7) % 3) * 8,
        spin: (i % 2 ? 1 : -1) * (180 + ((i * 29) % 180)),
      })),
    [],
  );

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 2200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => onDone());
  }, [progress, onDone]);

  return (
    <Modal transparent visible animationType="none" onRequestClose={onDone}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden>
        {pieces.map((p, i) => {
          const local = progress.interpolate({
            inputRange: [0, p.delay, Math.min(1, p.delay + 0.6), 1],
            outputRange: [0, 0, 1, 1],
          });
          return (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                left: p.x * (width - 40),
                top: -60,
                opacity: local.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] }),
                transform: [
                  { translateY: local.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.9] }) },
                  { translateX: local.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
                  {
                    rotate: local.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }),
                  },
                ],
              }}>
              <Text style={{ fontSize: p.size }}>{p.emoji}</Text>
            </Animated.View>
          );
        })}
      </View>
    </Modal>
  );
}
