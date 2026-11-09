import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from 'expo-router';
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
import { Dimensions, View, type ScrollView, type StyleProp, type ViewStyle } from 'react-native';

/**
 * In-app tour (owner, 2026-11-08: "um tour interativo mostrando tudo para o novo user, com opção de pular,
 * bem simples"). Screens wrap what the tour points at in `TourTarget`; when the tour starts, Accueil scrolls
 * to the top, every target is measured once, and only the steps whose target is really on screen are kept
 * (the address card is not there in arrival mode, the shortcuts may be under the fold, a hidden tab's bell
 * never counts). The overlay (components/tour-overlay) dims everything but the measured target.
 *
 * 2026-11-09 (UX review): the tour froze the app when a target was off screen or belonged to a hidden tab.
 * Targets now register only while their screen is focused, steps without a visible target are dropped, and
 * the tour is marked as seen as soon as it starts, so a crash can never make it reopen on every launch.
 */
export type TourTargetId =
  | 'address'
  | 'checklist'
  | 'quick'
  | 'top'
  | 'charlotte'
  | 'tab-explorer'
  | 'tab-maison'
  | 'tab-sejour';

export type TourStepId =
  | 'welcome'
  | 'address'
  | 'arrival'
  | 'quick'
  | 'top'
  | 'charlotte'
  | 'explorer'
  | 'maison'
  | 'sejour';

export type TourStep = { id: TourStepId; target: TourTargetId | null };
export type TourRect = { x: number; y: number; w: number; h: number };
/** A step as the overlay shows it: its target measured when the tour started (null = no target). */
export type ShownStep = TourStep & { rect: TourRect | null };

/** 8 steps at most: "address" (every day) and "arrival" (the checklist around the arrival) never show together. */
export const TOUR_STEPS: TourStep[] = [
  { id: 'welcome', target: null },
  { id: 'address', target: 'address' },
  { id: 'arrival', target: 'checklist' },
  { id: 'quick', target: 'quick' },
  { id: 'top', target: 'top' },
  { id: 'charlotte', target: 'charlotte' },
  { id: 'explorer', target: 'tab-explorer' },
  { id: 'maison', target: 'tab-maison' },
  { id: 'sejour', target: 'tab-sejour' },
];

/** Targets in the tab bar: everything else must sit above the bar to count as visible. */
const BAR_TARGETS: TourTargetId[] = ['charlotte', 'tab-explorer', 'tab-maison', 'tab-sejour'];

const key = (email: string) => `ctbh.tour.v1.${email.toLowerCase()}`;

type ViewRef = ComponentRef<typeof View>;

/** measureInWindow, or null when the view is gone, empty or never answers. */
function measure(ref: RefObject<ViewRef | null> | undefined): Promise<TourRect | null> {
  return new Promise((resolve) => {
    const view = ref?.current;
    if (!view) return resolve(null);
    const timer = setTimeout(() => resolve(null), 400);
    view.measureInWindow((x, y, w, h) => {
      clearTimeout(timer);
      resolve(w > 0 && h > 0 ? { x, y, w, h } : null);
    });
  });
}

/** Inside the screen horizontally, and at least 70 % of it between the top and `bottom`. */
function visible(r: TourRect, W: number, bottom: number) {
  if (r.x < -2 || r.x + r.w > W + 2) return false;
  const shown = Math.min(r.y + r.h, bottom) - Math.max(r.y, 0);
  return shown >= r.h * 0.7;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type TourContextValue = {
  register: (id: TourTargetId, ref: RefObject<ViewRef | null>) => () => void;
  registerScroll: (scrollTop: () => void) => () => void;
  /** The steps kept when the tour started, with their measured targets. */
  steps: ShownStep[];
  index: number | null;
  start: () => void;
  next: () => void;
  stop: () => void;
};

const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({ email, children }: { email: string; children: ReactNode }) {
  const targets = useRef(new Map<TourTargetId, RefObject<ViewRef | null>>());
  const scrollers = useRef(new Set<() => void>());
  const starting = useRef(false);
  const [steps, setSteps] = useState<ShownStep[]>([]);
  const [index, setIndex] = useState<number | null>(null);

  const register = useCallback((id: TourTargetId, ref: RefObject<ViewRef | null>) => {
    targets.current.set(id, ref);
    return () => {
      if (targets.current.get(id) === ref) targets.current.delete(id);
    };
  }, []);

  const registerScroll = useCallback((scrollTop: () => void) => {
    scrollers.current.add(scrollTop);
    return () => {
      scrollers.current.delete(scrollTop);
    };
  }, []);

  const markSeen = useCallback(() => {
    AsyncStorage.setItem(key(email), 'done').catch(() => {});
  }, [email]);

  const start = useCallback(async () => {
    if (starting.current) return;
    starting.current = true;
    // Seen from the first step: if anything goes wrong, the tour never comes back on every launch.
    markSeen();
    try {
      scrollers.current.forEach((scrollTop) => scrollTop());
      await wait(350);
      const { width: W, height: H } = Dimensions.get('window');
      const rects = new Map<TourTargetId, TourRect | null>();
      for (const step of TOUR_STEPS) {
        if (step.target) rects.set(step.target, await measure(targets.current.get(step.target)));
      }
      // The top of the tab bar: what sits behind it is not visible.
      const barTops = BAR_TARGETS.map((id) => rects.get(id)?.y).filter((y): y is number => y != null);
      const barTop = barTops.length ? Math.min(...barTops) : H;
      const shown: ShownStep[] = [];
      for (const step of TOUR_STEPS) {
        if (!step.target) {
          shown.push({ ...step, rect: null });
          continue;
        }
        const rect = rects.get(step.target);
        const bottom = BAR_TARGETS.includes(step.target) ? H : barTop;
        if (rect && visible(rect, W, bottom)) {
          // Clip what hides behind the bar, so the hole stays on what the student sees.
          const h = Math.min(rect.h, bottom - rect.y);
          shown.push({ ...step, rect: { ...rect, h } });
        }
      }
      setSteps(shown);
      setIndex(0);
    } finally {
      starting.current = false;
    }
  }, [markSeen]);

  const stop = useCallback(() => {
    setIndex(null);
    markSeen();
  }, [markSeen]);

  const next = useCallback(() => {
    setIndex((i) => (i == null || i + 1 >= steps.length ? null : i + 1));
  }, [steps.length]);

  const value = useMemo(
    () => ({ register, registerScroll, steps, index, start, next, stop }),
    [register, registerScroll, steps, index, start, next, stop],
  );
  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  return useContext(TourContext);
}

/**
 * Wraps what a tour step points at. It only counts while its screen is focused (each tab has its own bell
 * and top row; the hidden ones must never be measured). Outside a TourProvider it is a plain View.
 */
export function TourTarget({ id, children, style }: { id: TourTargetId; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const ref = useRef<ViewRef>(null);
  const register = useContext(TourContext)?.register;
  const focused = useIsFocused();
  useEffect(() => (focused && register ? register(id, ref) : undefined), [register, id, focused]);
  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}

export type ScrollRef = RefObject<ComponentRef<typeof ScrollView> | null>;

/** Accueil: lets the tour scroll the screen back to the top before measuring the targets. */
export function useTourScrollTop(scrollRef: ScrollRef) {
  const registerScroll = useContext(TourContext)?.registerScroll;
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused || !registerScroll) return;
    return registerScroll(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
  }, [registerScroll, focused, scrollRef]);
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
