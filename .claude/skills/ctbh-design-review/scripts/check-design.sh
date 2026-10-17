#!/usr/bin/env bash
# Static check of the CTBH design rules. Run from the app folder:
#   bash .claude/skills/ctbh-design-review/scripts/check-design.sh
# Prints every violation with file:line. Exit code 1 if any were found.

cd "$(dirname "$0")/../../../.." || exit 2
SRC=src
found=0

check() {
  local label="$1" pattern="$2" exclude="${3:-^$}"
  local hits
  hits=$(grep -rnE "$pattern" "$SRC" --include='*.tsx' --include='*.ts' | grep -vE "$exclude")
  if [ -n "$hits" ]; then
    echo "✗ $label"
    echo "$hits" | sed 's/^/    /'
    found=1
  fi
}

# Icons go through src/components/icon.tsx only.
check "Icon library imported outside icon.tsx" "from 'lucide-react-native'|from 'expo-symbols'" "src/components/icon.tsx"

# Red only in its fixed places: brand bar, login band, list icons, primary button, chips, active tab.
check "brand color outside its fixed places" "theme\.brand\b|Brand\.red" "src/components/(ui|list|brand-bar|floating-tab-bar).tsx|src/app/login.tsx|src/constants/theme.ts"
check "brandSoft is retired" "brandSoft"

# Screens appear whole: no staggered entrances.
check "Staggered entrance animation" "entering=\{[A-Za-z]+\.delay\("

# No uppercase overlines, no shadows, no gradients.
check "Uppercase label" "textTransform: *'uppercase'"
check "Retired BackHeader (use Screen back)" "back-header"
check "Inline shadow (use Shadow tokens)" "shadow(Color|Opacity|Radius|Offset)|elevation: *[1-9]|boxShadow:" "src/constants/theme.ts"
check "Gradient" "LinearGradient|linear-gradient"

# Typography stays light: no semibold/bold fonts.
check "Heavy font weight (max 500)" "SemiBold|_700Bold|fontWeight: *'(6|7|8|9)00'|fontWeight: *'bold'"

# Never truncate information (tab bar labels are the only exception).
check "Truncated text (numberOfLines)" "numberOfLines" "src/components/floating-tab-bar.tsx"
check "String ending with an ellipsis" "…',?$"

# Light mode only.
check "Color scheme branching (light mode only)" "useColorScheme|prefers-color-scheme" "src/hooks/use-color-scheme.ts"

# Raw colors belong in theme.ts.
check "Raw hex color outside theme.ts" "'#[0-9A-Fa-f]{3,8}'" "src/constants/theme.ts"

if [ "$found" = 0 ]; then
  echo "✓ No design rule violations found."
fi
exit "$found"
