import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { Brand } from '@/constants/theme';

const INK = '#16161A';
const CHEEK = '#FF8A94';
const STAR = '#FFD34E';

/**
 * Charlotte, the app's assistant (owner, 2026-11-08: name "Charlotte", face = the mascot, option B on the
 * design canvas): a red brand character with a black beret. Below 40 pt the drawing switches to bigger eyes
 * and a thicker smile so it stays readable in chat bubbles and pills.
 */
export function CharlotteFace({ size = 32, sparkle = false }: { size?: number; sparkle?: boolean }) {
  const small = size < 40;
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" accessibilityElementsHidden importantForAccessibility="no">
      {small ? (
        <>
          <Rect x={16} y={28} width={168} height={160} rx={66} fill={Brand.red} />
          <Path d="M52 48c12-24 82-28 98-4 4 7-1 12-10 12H60c-8 0-12-3-8-8z" fill={INK} />
          <Ellipse cx={76} cy={108} rx={16} ry={19} fill="#FFFFFF" />
          <Ellipse cx={124} cy={108} rx={16} ry={19} fill="#FFFFFF" />
          <Circle cx={79} cy={112} r={8} fill={INK} />
          <Circle cx={127} cy={112} r={8} fill={INK} />
          <Path d="M82 142c10 11 26 11 36 0" stroke="#FFFFFF" strokeWidth={11} strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <Rect x={22} y={34} width={156} height={146} rx={62} fill={Brand.red} />
          <Path d="M56 52c12-24 78-28 94-4 4 7-1 12-10 12H64c-8 0-12-3-8-8z" fill={INK} />
          <Rect x={100} y={24} width={7} height={13} rx={3.5} fill={INK} />
          <Ellipse cx={78} cy={106} rx={13} ry={16} fill="#FFFFFF" />
          <Ellipse cx={122} cy={106} rx={13} ry={16} fill="#FFFFFF" />
          <Circle cx={81} cy={110} r={6.5} fill={INK} />
          <Circle cx={125} cy={110} r={6.5} fill={INK} />
          <Circle cx={58} cy={134} r={8} fill={CHEEK} />
          <Circle cx={142} cy={134} r={8} fill={CHEEK} />
          <Path d="M84 138c9 10 23 10 32 0" stroke="#FFFFFF" strokeWidth={7} strokeLinecap="round" fill="none" />
          {sparkle && <Path d="M168 64l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill={STAR} />}
        </>
      )}
    </Svg>
  );
}
