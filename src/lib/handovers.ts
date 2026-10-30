import { useEffect, useState } from 'react';

import { appApi } from '@/lib/app-api';
import { useAuth } from '@/lib/auth';

/**
 * Check-in (keys handed to the students) and check-out (keys returned), entered on the website's
 * panel. Only what the student needs: the date, which roommate received / returned the apartment,
 * and whether the signed inspection report (photos, signed by the student and the owner) is there.
 */
export type HandoverKind = 'checkin' | 'checkout';
export type Handover = { date: string | null; by: string | null; byMe: boolean; hasDocument: boolean };
export type Handovers = Record<HandoverKind, Handover>;

/** Loaded on demand (not part of "home"): null while loading or if the request fails. */
export function useHandovers() {
  const { token } = useAuth();
  const [data, setData] = useState<Handovers | null>(null);

  useEffect(() => {
    if (!token) return;
    appApi<Handovers>('handovers', { token })
      .then(setData)
      .catch(() => setData(null));
  }, [token]);

  return data;
}
