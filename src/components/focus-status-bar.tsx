import { useFocusEffect } from 'expo-router';
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';
import { useCallback, useState } from 'react';

/**
 * Status bar style for the screen that is on top. Tab screens keep a light canvas (dark text) while
 * pushed screens keep the red brand bar (white text), and the tabs stay mounted in the background:
 * only the focused screen renders its StatusBar, so the last one mounted is always the visible one.
 */
export function FocusStatusBar({ style }: { style: StatusBarStyle }) {
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  return focused ? <StatusBar style={style} /> : null;
}
