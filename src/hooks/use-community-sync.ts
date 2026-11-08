import { useEffect } from 'react';

import { fetchCommunityPrices, receiptsConfigured } from '@/lib/receipts';
import { useAppStore } from '@/store/app-store';

const REFRESH_MS = 12 * 60 * 60 * 1000;

/** Keeps other people's receipt prices for your city cached (refreshed at most twice a day). */
export function useCommunitySync() {
  const city = useAppStore((s) => s.city);
  const community = useAppStore((s) => s.community);
  const setCommunity = useAppStore((s) => s.setCommunity);

  useEffect(() => {
    if (!receiptsConfigured || !city) return;
    if (community && community.city === city && Date.now() - community.fetchedAt < REFRESH_MS) return;
    let cancelled = false;
    fetchCommunityPrices(city)
      .then((prices) => {
        if (!cancelled) setCommunity({ city, fetchedAt: Date.now(), prices });
      })
      .catch(() => {
        // Offline or not set up yet — the app keeps working with store price lists.
      });
    return () => {
      cancelled = true;
    };
  }, [city, community, setCommunity]);
}
