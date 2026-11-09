import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
  type RefObject,
} from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * In-app tour (owner, 2026-11-08: "um tour interativo mostrando tudo para o novo user, com opção de pular,
 * bem simples"). Screens wrap what the tour points at in `TourTarget`; the overlay (components/tour-overlay)
 * measures the target of each step on screen and dims everything else. Steps whose target isn't on screen
 * (e.g. the address card during the arrival checklist) are skipped.
 */
export type TourTargetId = 'address' | 'quick' | 'bell' | 'tab-explorer' | 'charlotte' | 'tab-maison' | 'tab-sejour';

export type TourStep = { id: keyof TourSteps; target: TourTargetId | null };
type TourSteps = {
  welcome: string;
  address: string;
  quick: string;
  bell: string;
  explorer: string;
  charlotte: string;
  maison: string;
  sejour: string;
  end: string;
};

export const TOUR_STEPS: TourStep[] = [
  { id: 'welcome', target: null },
  { id: 'address', target: 'address' },
  { id: 'quick', target: 'quick' },
  { id: 'bell', target: 'bell' },
  { id: 'explorer', target: 'tab-explorer' },
  { id: 'charlotte', target: 'charlotte' },
  { id: 'maison', target: 'tab-maison' },
  { id: 'sejour', target: 'tab-sejour' },
  { id: 'end', target: null },
];

const key = (email: string) => `ctbh.tour.v1.${email.toLowerCase()}`;

type ViewRef = ComponentRef<typeof View>;

type TourContextValue = {
  register: (id: TourTargetId, ref: RefObject<ViewRef | null>) => () => void;
  target: (id: TourTargetId) => RefObject<ViewRef | null> | undefined;
  /** The steps that have a target on screen right now (and the two without one). */
  steps: TourStep[];
  index: number | null;
  start: () => void;
  next: () => void;
  stop: () => void;
};

const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({ email, children }: { email: string; children: ReactNode }) {
  const targets = useRef(new Map<TourTargetId, RefObject<ViewRef | null>>());
  const [steps, setSteps] = useState<TourStep[]>(TOUR_STEPS);
  const [index, setIndex] = useState<number | null>(null);

  const register = useCallback((id: TourTargetId, ref: RefObject<ViewRef | null>) => {
    targets.current.set(id, ref);
    return () => {
      if (targets.current.get(id) === ref) targets.current.delete(id);
    };
  }, []);

  const start = useCallback(() => {
    setSteps(TOUR_STEPS.filter((s) => !s.target || targets.current.has(s.target)));
    setIndex(0);
  }, []);

  const stop = useCallback(() => {
    setIndex(null);
    AsyncStorage.setItem(key(email), 'done').catch(() => {});
  }, [email]);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i == null) return null;
      if (i + 1 >= steps.length) {
        AsyncStorage.setItem(key(email), 'done').catch(() => {});
        return null;
      }
      return i + 1;
    });
  }, [steps.length, email]);

  const value = useMemo(
    () => ({ register, target: (id: TourTargetId) => targets.current.get(id), steps, index, start, next, stop }),
    [register, steps, index, start, next, stop],
  );
  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  return useContext(TourContext);
}

/** Wraps what a tour step points at. Outside a TourProvider it is a plain View. */
export function TourTarget({ id, children, style }: { id: TourTargetId; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const ref = useRef<ViewRef>(null);
  const tour = useContext(TourContext);
  useEffect(() => tour?.register(id, ref), [tour, id]);
  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}

/** Starts the tour once per student, as soon as `ready` (after the house rules are signed). */
export function useTourAutoStart(email: string, ready: boolean) {
  const tour = useContext(TourContext);
  const start = tour?.start;
  useEffect(() => {
    if (!ready || !start) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    AsyncStorage.getItem(key(email))
      .then((done) => {
        // Let the Home screen lay out first, so every target can be measured.
        if (alive && !done) timer = setTimeout(start, 700);
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [email, ready, start]);
}
