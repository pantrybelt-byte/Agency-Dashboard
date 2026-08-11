# Phase 1: Foundation, State & Correctness — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every control in the dashboard do what it appears to do, move filter and auth state into two providers with the URL as the source of truth, and stand up a test harness so later phases cannot silently regress it.

**Architecture:** Replace the broken `React.cloneElement` prop-injection in `DashboardLayout` with nested React Router routes and an `<Outlet />`. Filter state (date range, compare mode, selected county) lives in `DashboardFilterProvider`, which reads and writes `URLSearchParams` — this fixes the Share button for free and makes deep links work. Auth moves to `AuthProvider` with a `status: 'loading' | 'authenticated' | 'unauthenticated'` field, shaped so Phase 3 can swap the body for Firebase `onAuthStateChanged` without touching any consumer.

**Tech Stack:** React 19, React Router 7, TypeScript 6, Vite 8, Vitest, @testing-library/react, Tailwind CSS 4.

---

## Important context for whoever executes this

- **This directory is not a git repository yet.** Task 1 initializes it. Do not skip it; every later task ends in a commit.
- **There is no test runner installed.** Task 2 adds Vitest.
- Pages use **named exports** (`export const OverviewPage`), not default exports. This matters for the `React.lazy` calls in Task 12.
- `tsconfig.app.json` sets `noUnusedLocals` and `noUnusedParameters`. An unused import fails `npm run build`. Remove imports as you remove their usages.
- `tsconfig.app.json` sets `verbatimModuleSyntax`. Type-only imports **must** use `import type { … }`.
- The em-dash-looking characters in the demographics data are **en-dashes** (`U+2013`), e.g. `'Children (0–17)'`. Task 10 uses explicit `–` escapes so the code is copy-paste-safe.

---

## File structure

**Created:**

| File | Responsibility |
|---|---|
| `src/test/setup.ts` | Vitest global setup — jest-dom matchers, DOM cleanup |
| `src/utils/dateRange.ts` | Pure date-window resolution: preset → concrete start/end + previous period |
| `src/utils/dateRange.test.ts` | Tests for the above |
| `src/context/DashboardFilterContext.ts` | Context object + value type. No JSX, so no `react-refresh` lint warning |
| `src/context/DashboardFilterProvider.tsx` | Provider that syncs filter state to `URLSearchParams` |
| `src/context/AuthContext.ts` | Auth context object + value type |
| `src/context/AuthProvider.tsx` | Provider with persisted demo session, Firebase-shaped API |
| `src/hooks/useDashboardFilters.ts` | Consumer hook, throws outside provider |
| `src/hooks/useDashboardFilters.test.tsx` | Tests for provider + hook together |
| `src/hooks/useAuth.ts` | Consumer hook, throws outside provider |
| `src/hooks/useAuth.test.tsx` | Tests for auth provider + persistence |
| `src/components/routing/RequireAuth.tsx` | Route guard, redirects to `/login` preserving intended destination |
| `src/components/routing/RequireAuth.test.tsx` | Tests for the guard |
| `src/components/ui/RouteFallback.tsx` | Suspense fallback for lazily loaded routes |
| `src/utils/demographics.ts` | Derives demographic KPIs from `DemographicsData` |
| `src/utils/demographics.test.ts` | Tests for the above |
| `src/utils/seededRandom.ts` | Deterministic PRNG so mock data stops changing every refresh |

**Modified:** `package.json`, `vite.config.ts`, `src/App.tsx`, `src/components/layout/DashboardLayout.tsx`, `src/components/layout/Header.tsx`, `src/components/ui/DateRangePicker.tsx`, `src/pages/OverviewPage.tsx`, `src/pages/DemographicsPage.tsx`, `src/data/mockData.ts`.

**Deliberately untouched:** `src/components/ui/DataTable.tsx` is dead code (imported nowhere) while four pages hand-roll their own tables. Do **not** delete it here — Phase 2 rebuilds it as the single accessible table component and migrates all four call sites. Deleting now just creates churn.

---

## Task 1: Initialize the repository

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Confirm this is not already a repository**

Run: `git rev-parse --is-inside-work-tree`
Expected: `fatal: not a git repository (or any of the parent directories): .git`

If it instead prints `true`, skip to Step 4.

- [ ] **Step 2: Initialize**

```bash
git init -b main
```

- [ ] **Step 3: Add the docs and coverage directories to `.gitignore`**

Append these lines to `.gitignore`:

```gitignore

# Test output
coverage
```

- [ ] **Step 4: Verify the working tree is what you expect**

Run: `git status --short | head -30`
Expected: a list of untracked source files. `node_modules` and `dist` must **not** appear — if they do, `.gitignore` is not being read and you should stop and investigate.

- [ ] **Step 5: Commit the baseline**

```bash
git add -A
git commit -m "chore: initial commit of AccessBelt dashboard baseline"
```

---

## Task 2: Install and configure the test harness

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Install the test dependencies**

```bash
npm install -D vitest jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event
```

Expected: installs without peer-dependency errors. React 19 requires `@testing-library/react` v16 or newer; if npm resolves something older, install `@testing-library/react@^16` explicitly.

- [ ] **Step 2: Create the setup file**

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
```

- [ ] **Step 3: Configure Vitest**

Replace the entire contents of `vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
```

Note the import moved from `vite` to `vitest/config`. That re-export is what makes the `test` key type-check.

- [ ] **Step 4: Add the test scripts**

In `package.json`, replace the `"scripts"` block with:

```json
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "oxlint",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
```

- [ ] **Step 5: Prove the harness runs**

Run: `npm test`
Expected: Vitest starts and reports `No test files found` (exit code 1 is acceptable here — there are genuinely no tests yet). The point of this step is confirming Vitest boots and finds the setup file without erroring.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/test/setup.ts
git commit -m "chore: add vitest and testing-library harness"
```

---

## Task 3: Date range resolution utility

The date range picker currently changes nothing. Before it can, something has to turn `'30d'` into concrete dates — including the *previous* window, which compare mode needs. This is pure logic, so it is tested first and in isolation.

**Files:**
- Create: `src/utils/dateRange.test.ts`
- Create: `src/utils/dateRange.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/dateRange.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveDateRange } from './dateRange';

// A fixed "today" so these tests never depend on the wall clock.
const NOW = new Date('2026-08-11T18:30:00.000Z');

describe('resolveDateRange', () => {
  it('resolves 7d to a seven-day inclusive window ending today', () => {
    const result = resolveDateRange('7d', null, NOW);
    expect(result.startDate).toBe('2026-08-05');
    expect(result.endDate).toBe('2026-08-11');
    expect(result.dayCount).toBe(7);
  });

  it('resolves the previous period as the window immediately before', () => {
    const result = resolveDateRange('7d', null, NOW);
    expect(result.previousStartDate).toBe('2026-07-29');
    expect(result.previousEndDate).toBe('2026-08-04');
  });

  it('resolves 30d to a thirty-day inclusive window', () => {
    const result = resolveDateRange('30d', null, NOW);
    expect(result.startDate).toBe('2026-07-13');
    expect(result.endDate).toBe('2026-08-11');
    expect(result.dayCount).toBe(30);
    expect(result.previousEndDate).toBe('2026-07-12');
    expect(result.previousStartDate).toBe('2026-06-13');
  });

  it('resolves ytd from January 1 of the current year', () => {
    const result = resolveDateRange('ytd', null, NOW);
    expect(result.startDate).toBe('2026-01-01');
    expect(result.endDate).toBe('2026-08-11');
    expect(result.dayCount).toBe(223);
    expect(result.previousEndDate).toBe('2025-12-31');
  });

  it('uses the supplied custom range', () => {
    const result = resolveDateRange('custom', { startDate: '2026-07-01', endDate: '2026-07-31' }, NOW);
    expect(result.startDate).toBe('2026-07-01');
    expect(result.endDate).toBe('2026-07-31');
    expect(result.dayCount).toBe(31);
  });

  it('normalises a custom range supplied backwards', () => {
    const result = resolveDateRange('custom', { startDate: '2026-08-01', endDate: '2026-07-01' }, NOW);
    expect(result.startDate).toBe('2026-07-01');
    expect(result.endDate).toBe('2026-08-01');
    expect(result.dayCount).toBe(32);
  });

  it('falls back to 30d when custom is selected without a range', () => {
    const result = resolveDateRange('custom', null, NOW);
    expect(result.startDate).toBe('2026-07-13');
    expect(result.dayCount).toBe(30);
  });

  it('produces a human label for each preset', () => {
    expect(resolveDateRange('7d', null, NOW).label).toBe('Last 7 days');
    expect(resolveDateRange('ytd', null, NOW).label).toBe('Year to date');
    expect(
      resolveDateRange('custom', { startDate: '2026-07-01', endDate: '2026-07-31' }, NOW).label,
    ).toBe('2026-07-01 – 2026-07-31');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/utils/dateRange.test.ts`
Expected: FAIL — `Failed to resolve import "./dateRange"`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/dateRange.ts`:

```ts
import type { CustomDateRange, DateRangePreset } from '../types';

const MS_PER_DAY = 86_400_000;

const PRESET_DAYS: Record<'7d' | '30d' | '90d', number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export interface ResolvedDateRange {
  /** Inclusive start, YYYY-MM-DD. */
  startDate: string;
  /** Inclusive end, YYYY-MM-DD. */
  endDate: string;
  /** Inclusive start of the equally sized window immediately before. */
  previousStartDate: string;
  /** Inclusive end of the equally sized window immediately before. */
  previousEndDate: string;
  dayCount: number;
  label: string;
}

/** Format a Date as YYYY-MM-DD in UTC. */
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Parse YYYY-MM-DD as UTC midnight, avoiding local-timezone drift. */
function fromISODate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/**
 * Turn a UI preset into the concrete date window the data layer will query,
 * plus the equally sized preceding window that compare mode charts against.
 *
 * All arithmetic is in UTC so the result does not shift with the viewer's
 * timezone — an agency in Central Time and a reviewer in Eastern Time must see
 * the same numbers for "last 30 days".
 */
export function resolveDateRange(
  preset: DateRangePreset,
  custom: CustomDateRange | null,
  now: Date,
): ResolvedDateRange {
  const today = fromISODate(toISODate(now));

  let start: Date;
  let end: Date;
  let label: string;

  if (preset === 'custom' && custom) {
    start = fromISODate(custom.startDate);
    end = fromISODate(custom.endDate);
    if (start.getTime() > end.getTime()) {
      [start, end] = [end, start];
    }
    label = `${toISODate(start)} – ${toISODate(end)}`;
  } else if (preset === 'ytd') {
    start = fromISODate(`${today.getUTCFullYear()}-01-01`);
    end = today;
    label = 'Year to date';
  } else {
    // 'custom' without a range falls back to the 30d default.
    const days = PRESET_DAYS[preset === 'custom' ? '30d' : preset];
    end = today;
    start = addDays(today, -(days - 1));
    label = `Last ${days} days`;
  }

  const dayCount = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
  const previousEnd = addDays(start, -1);
  const previousStart = addDays(previousEnd, -(dayCount - 1));

  return {
    startDate: toISODate(start),
    endDate: toISODate(end),
    previousStartDate: toISODate(previousStart),
    previousEndDate: toISODate(previousEnd),
    dayCount,
    label,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/utils/dateRange.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/dateRange.ts src/utils/dateRange.test.ts
git commit -m "feat: add date range resolution with previous-period support"
```

---

## Task 4: URL-synced dashboard filter provider

This is the task that fixes three defects at once: compare mode reaching pages, the date range meaning something, and the Share button copying a URL that actually reproduces the view.

**Files:**
- Create: `src/context/DashboardFilterContext.ts`
- Create: `src/context/DashboardFilterProvider.tsx`
- Create: `src/hooks/useDashboardFilters.ts`
- Create: `src/hooks/useDashboardFilters.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useDashboardFilters.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DashboardFilterProvider } from '../context/DashboardFilterProvider';
import { useDashboardFilters } from './useDashboardFilters';

const FIXED_NOW = new Date('2026-08-11T00:00:00.000Z');

function Probe() {
  const {
    dateRange,
    customRange,
    compareMode,
    selectedCountyId,
    resolved,
    setDateRange,
    setCompareMode,
    setSelectedCountyId,
  } = useDashboardFilters();

  return (
    <div>
      <span data-testid="range">{dateRange}</span>
      <span data-testid="custom">{customRange ? `${customRange.startDate}/${customRange.endDate}` : 'none'}</span>
      <span data-testid="compare">{String(compareMode)}</span>
      <span data-testid="county">{selectedCountyId ?? 'none'}</span>
      <span data-testid="start">{resolved.startDate}</span>
      <button onClick={() => setDateRange('7d')}>seven days</button>
      <button onClick={() => setDateRange('custom', { startDate: '2026-01-05', endDate: '2026-01-09' })}>
        custom range
      </button>
      <button onClick={() => setCompareMode(true)}>enable compare</button>
      <button onClick={() => setSelectedCountyId('al-lowndes')}>select lowndes</button>
    </div>
  );
}

function renderProbe(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <DashboardFilterProvider now={FIXED_NOW}>
        <Probe />
      </DashboardFilterProvider>
    </MemoryRouter>,
  );
}

describe('DashboardFilterProvider', () => {
  it('defaults to a 30 day range with compare off and no county', () => {
    renderProbe('/');
    expect(screen.getByTestId('range')).toHaveTextContent('30d');
    expect(screen.getByTestId('compare')).toHaveTextContent('false');
    expect(screen.getByTestId('county')).toHaveTextContent('none');
    expect(screen.getByTestId('start')).toHaveTextContent('2026-07-13');
  });

  it('hydrates every filter from the URL', () => {
    renderProbe('/?range=7d&compare=1&county=al-macon');
    expect(screen.getByTestId('range')).toHaveTextContent('7d');
    expect(screen.getByTestId('compare')).toHaveTextContent('true');
    expect(screen.getByTestId('county')).toHaveTextContent('al-macon');
    expect(screen.getByTestId('start')).toHaveTextContent('2026-08-05');
  });

  it('hydrates a custom range from the URL', () => {
    renderProbe('/?range=custom&from=2026-03-01&to=2026-03-31');
    expect(screen.getByTestId('custom')).toHaveTextContent('2026-03-01/2026-03-31');
    expect(screen.getByTestId('start')).toHaveTextContent('2026-03-01');
  });

  it('ignores an unrecognised range and falls back to 30d', () => {
    renderProbe('/?range=banana');
    expect(screen.getByTestId('range')).toHaveTextContent('30d');
  });

  it('ignores a malformed custom range', () => {
    renderProbe('/?range=custom&from=not-a-date&to=2026-03-31');
    expect(screen.getByTestId('custom')).toHaveTextContent('none');
  });

  it('updates the resolved window when the preset changes', async () => {
    const user = userEvent.setup();
    renderProbe('/');
    await user.click(screen.getByRole('button', { name: 'seven days' }));
    expect(screen.getByTestId('range')).toHaveTextContent('7d');
    expect(screen.getByTestId('start')).toHaveTextContent('2026-08-05');
  });

  it('stores a custom range and clears it when another preset is chosen', async () => {
    const user = userEvent.setup();
    renderProbe('/');
    await user.click(screen.getByRole('button', { name: 'custom range' }));
    expect(screen.getByTestId('custom')).toHaveTextContent('2026-01-05/2026-01-09');

    await user.click(screen.getByRole('button', { name: 'seven days' }));
    expect(screen.getByTestId('custom')).toHaveTextContent('none');
  });

  it('toggles compare mode', async () => {
    const user = userEvent.setup();
    renderProbe('/');
    await user.click(screen.getByRole('button', { name: 'enable compare' }));
    expect(screen.getByTestId('compare')).toHaveTextContent('true');
  });

  it('records the selected county', async () => {
    const user = userEvent.setup();
    renderProbe('/');
    await user.click(screen.getByRole('button', { name: 'select lowndes' }));
    expect(screen.getByTestId('county')).toHaveTextContent('al-lowndes');
  });
});

describe('useDashboardFilters', () => {
  it('throws when used outside the provider', () => {
    expect(() =>
      render(
        <MemoryRouter>
          <Probe />
        </MemoryRouter>,
      ),
    ).toThrow(/DashboardFilterProvider/);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/hooks/useDashboardFilters.test.tsx`
Expected: FAIL — `Failed to resolve import "../context/DashboardFilterProvider"`.

- [ ] **Step 3: Create the context object**

The context lives in its own non-JSX file so that the provider module exports only a component. That keeps the `react/only-export-components` lint rule quiet without a suppression comment.

Create `src/context/DashboardFilterContext.ts`:

```ts
import { createContext } from 'react';
import type { CustomDateRange, DateRangePreset } from '../types';
import type { ResolvedDateRange } from '../utils/dateRange';

export interface DashboardFilterValue {
  dateRange: DateRangePreset;
  customRange: CustomDateRange | null;
  compareMode: boolean;
  selectedCountyId: string | null;
  /** Concrete dates for the current selection, plus the preceding window. */
  resolved: ResolvedDateRange;
  setDateRange: (preset: DateRangePreset, custom?: CustomDateRange) => void;
  setCompareMode: (enabled: boolean) => void;
  setSelectedCountyId: (countyId: string | null) => void;
}

export const DashboardFilterContext = createContext<DashboardFilterValue | null>(null);
```

- [ ] **Step 4: Create the provider**

Create `src/context/DashboardFilterProvider.tsx`:

```tsx
import React, { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { CustomDateRange, DateRangePreset } from '../types';
import { resolveDateRange, toISODate } from '../utils/dateRange';
import { DashboardFilterContext, type DashboardFilterValue } from './DashboardFilterContext';

const PRESETS: DateRangePreset[] = ['7d', '30d', '90d', 'ytd', 'custom'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parsePreset(raw: string | null): DateRangePreset {
  return PRESETS.includes(raw as DateRangePreset) ? (raw as DateRangePreset) : '30d';
}

function parseCustomRange(from: string | null, to: string | null): CustomDateRange | null {
  if (!from || !to) return null;
  if (!ISO_DATE.test(from) || !ISO_DATE.test(to)) return null;
  return { startDate: from, endDate: to };
}

interface DashboardFilterProviderProps {
  children: React.ReactNode;
  /** Injectable clock. Tests pass a fixed date; production leaves it undefined. */
  now?: Date;
}

/**
 * Holds every cross-page filter in the URL query string.
 *
 * The URL is the single source of truth on purpose: it makes the Share button
 * actually share the current view, makes filtered views bookmarkable, and gives
 * Phase 3 a natural place to read query parameters from.
 */
export const DashboardFilterProvider: React.FC<DashboardFilterProviderProps> = ({ children, now }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const rangeParam = searchParams.get('range');
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const compareParam = searchParams.get('compare');
  const countyParam = searchParams.get('county');

  // Reduce the clock to a date string so the memo below does not invalidate on
  // every render just because `new Date()` produced a new object.
  const todayISO = toISODate(now ?? new Date());

  const update = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          mutate(next);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setDateRange = useCallback(
    (preset: DateRangePreset, custom?: CustomDateRange) => {
      update((params) => {
        params.set('range', preset);
        if (preset === 'custom' && custom) {
          params.set('from', custom.startDate);
          params.set('to', custom.endDate);
        } else {
          params.delete('from');
          params.delete('to');
        }
      });
    },
    [update],
  );

  const setCompareMode = useCallback(
    (enabled: boolean) => {
      update((params) => {
        if (enabled) {
          params.set('compare', '1');
        } else {
          params.delete('compare');
        }
      });
    },
    [update],
  );

  const setSelectedCountyId = useCallback(
    (countyId: string | null) => {
      update((params) => {
        if (countyId) {
          params.set('county', countyId);
        } else {
          params.delete('county');
        }
      });
    },
    [update],
  );

  const value = useMemo<DashboardFilterValue>(() => {
    const dateRange = parsePreset(rangeParam);
    const customRange = parseCustomRange(fromParam, toParam);
    return {
      dateRange,
      customRange,
      compareMode: compareParam === '1',
      selectedCountyId: countyParam,
      resolved: resolveDateRange(dateRange, customRange, new Date(`${todayISO}T00:00:00.000Z`)),
      setDateRange,
      setCompareMode,
      setSelectedCountyId,
    };
  }, [
    rangeParam,
    fromParam,
    toParam,
    compareParam,
    countyParam,
    todayISO,
    setDateRange,
    setCompareMode,
    setSelectedCountyId,
  ]);

  return <DashboardFilterContext.Provider value={value}>{children}</DashboardFilterContext.Provider>;
};
```

- [ ] **Step 5: Create the consumer hook**

Create `src/hooks/useDashboardFilters.ts`:

```ts
import { useContext } from 'react';
import { DashboardFilterContext, type DashboardFilterValue } from '../context/DashboardFilterContext';

export function useDashboardFilters(): DashboardFilterValue {
  const value = useContext(DashboardFilterContext);
  if (!value) {
    throw new Error('useDashboardFilters must be used inside a DashboardFilterProvider');
  }
  return value;
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/hooks/useDashboardFilters.test.tsx`
Expected: PASS, 10 tests. The "throws outside the provider" test will print a React error boundary warning to the console — that is expected noise, not a failure.

- [ ] **Step 7: Commit**

```bash
git add src/context/DashboardFilterContext.ts src/context/DashboardFilterProvider.tsx src/hooks/useDashboardFilters.ts src/hooks/useDashboardFilters.test.tsx
git commit -m "feat: add URL-synced dashboard filter context"
```

---

## Task 5: Auth provider with persisted session

Today `App.tsx` holds `useState(false)`, so a page refresh signs the user out and deep links are impossible.

**This is not authentication and must not be described as such.** It restores a demo session so the prototype behaves like a real app. Phase 3 replaces the body of this provider with Firebase `onAuthStateChanged`. The `status` field exists now specifically so that swap requires no changes in any consumer.

**Files:**
- Create: `src/context/AuthContext.ts`
- Create: `src/context/AuthProvider.tsx`
- Create: `src/hooks/useAuth.ts`
- Create: `src/hooks/useAuth.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useAuth.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../context/AuthProvider';
import { useAuth } from './useAuth';

function Probe() {
  const { status, user, signIn, signOut } = useAuth();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="email">{user?.email ?? 'none'}</span>
      <span data-testid="org">{user?.organization ?? 'none'}</span>
      <button onClick={() => signIn('director@unitedwayriverregion.org')}>sign in</button>
      <button onClick={signOut}>sign out</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

describe('AuthProvider', () => {
  it('starts unauthenticated with no stored session', () => {
    renderProbe();
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    expect(screen.getByTestId('email')).toHaveTextContent('none');
  });

  it('authenticates and applies the supplied email to the profile', async () => {
    const user = userEvent.setup();
    renderProbe();
    await user.click(screen.getByRole('button', { name: 'sign in' }));
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('email')).toHaveTextContent('director@unitedwayriverregion.org');
    expect(screen.getByTestId('org')).not.toHaveTextContent('none');
  });

  it('restores the session on remount', async () => {
    const user = userEvent.setup();
    const { unmount } = renderProbe();
    await user.click(screen.getByRole('button', { name: 'sign in' }));
    unmount();

    renderProbe();
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('email')).toHaveTextContent('director@unitedwayriverregion.org');
  });

  it('clears the stored session on sign out', async () => {
    const user = userEvent.setup();
    const { unmount } = renderProbe();
    await user.click(screen.getByRole('button', { name: 'sign in' }));
    await user.click(screen.getByRole('button', { name: 'sign out' }));
    unmount();

    renderProbe();
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });

  it('ignores a corrupt stored session instead of crashing', () => {
    window.localStorage.setItem('accessbelt.session.v1', '{not json');
    renderProbe();
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });

  it('ignores a stored session with no email', () => {
    window.localStorage.setItem('accessbelt.session.v1', '{"email":42}');
    renderProbe();
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });
});

describe('useAuth', () => {
  it('throws when used outside the provider', () => {
    expect(() => render(<Probe />)).toThrow(/AuthProvider/);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/hooks/useAuth.test.tsx`
Expected: FAIL — `Failed to resolve import "../context/AuthProvider"`.

- [ ] **Step 3: Create the context object**

Create `src/context/AuthContext.ts`:

```ts
import { createContext } from 'react';
import type { AgencyUser } from '../types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthValue {
  /**
   * 'loading' is never emitted by the demo provider, which reads
   * localStorage synchronously. It exists so that Phase 3 can swap in Firebase
   * `onAuthStateChanged` — which resolves asynchronously — without any consumer
   * changing, and without the login page flashing during session restore.
   */
  status: AuthStatus;
  user: AgencyUser | null;
  signIn: (email: string) => void;
  signOut: () => void;
}

export const AuthContext = createContext<AuthValue | null>(null);
```

- [ ] **Step 4: Create the provider**

Create `src/context/AuthProvider.tsx`:

```tsx
import React, { useCallback, useMemo, useState } from 'react';
import type { AgencyUser } from '../types';
import { mockCurrentUser } from '../data/mockData';
import { AuthContext, type AuthValue } from './AuthContext';

const STORAGE_KEY = 'accessbelt.session.v1';

/**
 * Read a previously stored demo session.
 *
 * This is session *restoration*, not authentication — nothing here verifies a
 * credential. Phase 3 replaces it with Firebase Auth.
 */
function readStoredSession(): AgencyUser | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const email = (parsed as { email?: unknown }).email;
    if (typeof email !== 'string' || email.length === 0) return null;

    return { ...mockCurrentUser, email };
  } catch {
    // Corrupt or unreadable storage must never take the dashboard down.
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AgencyUser | null>(readStoredSession);

  const signIn = useCallback((email: string) => {
    setUser({ ...mockCurrentUser, email });
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ email }));
    } catch {
      // Private browsing can reject writes; staying signed in for this tab is fine.
    }
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing useful to do if storage is unavailable.
    }
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      status: user ? 'authenticated' : 'unauthenticated',
      user,
      signIn,
      signOut,
    }),
    [user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

- [ ] **Step 5: Create the consumer hook**

Create `src/hooks/useAuth.ts`:

```ts
import { useContext } from 'react';
import { AuthContext, type AuthValue } from '../context/AuthContext';

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return value;
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/hooks/useAuth.test.tsx`
Expected: PASS, 7 tests.

- [ ] **Step 7: Commit**

```bash
git add src/context/AuthContext.ts src/context/AuthProvider.tsx src/hooks/useAuth.ts src/hooks/useAuth.test.tsx
git commit -m "feat: add auth provider with persisted demo session"
```

---

## Task 6: Route guard

**Files:**
- Create: `src/components/routing/RequireAuth.tsx`
- Create: `src/components/routing/RequireAuth.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/routing/RequireAuth.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../../context/AuthProvider';
import { RequireAuth } from './RequireAuth';

function LoginStub() {
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? 'none';
  return (
    <div>
      <span data-testid="screen">login</span>
      <span data-testid="from">{from}</span>
    </div>
  );
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginStub />} />
          <Route
            path="/food-deserts"
            element={
              <RequireAuth>
                <span data-testid="screen">food deserts</span>
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  it('redirects an unauthenticated visitor to the login route', () => {
    renderAt('/food-deserts');
    expect(screen.getByTestId('screen')).toHaveTextContent('login');
  });

  it('remembers the route the visitor was trying to reach', () => {
    renderAt('/food-deserts');
    expect(screen.getByTestId('from')).toHaveTextContent('/food-deserts');
  });

  it('renders the protected content for a restored session', () => {
    window.localStorage.setItem(
      'accessbelt.session.v1',
      JSON.stringify({ email: 'director@unitedwayriverregion.org' }),
    );
    renderAt('/food-deserts');
    expect(screen.getByTestId('screen')).toHaveTextContent('food deserts');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/routing/RequireAuth.test.tsx`
Expected: FAIL — `Failed to resolve import "./RequireAuth"`.

- [ ] **Step 3: Write the implementation**

Create `src/components/routing/RequireAuth.tsx`:

```tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { RouteFallback } from '../ui/RouteFallback';

/**
 * Gate for every dashboard route. Preserves the attempted destination in
 * location state so the login screen can return the visitor to it.
 */
export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <RouteFallback />;
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};
```

- [ ] **Step 4: Create the fallback component it depends on**

Create `src/components/ui/RouteFallback.tsx`:

```tsx
export const RouteFallback = () => (
  <div className="flex items-center justify-center py-24" role="status" aria-live="polite">
    <span className="w-6 h-6 border-2 border-white/20 border-t-emerald-400 rounded-full animate-spin" />
    <span className="sr-only">Loading</span>
  </div>
);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/components/routing/RequireAuth.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/routing/RequireAuth.tsx src/components/routing/RequireAuth.test.tsx src/components/ui/RouteFallback.tsx
git commit -m "feat: add route guard preserving intended destination"
```

---

## Task 7: Restructure routing — remove the cloneElement bug

This is the root-cause fix. `DashboardLayout` currently does:

```tsx
React.cloneElement(children as React.ReactElement<{ compareMode?: boolean }>, { compareMode, dateRange })
```

`children` is the `<Routes>` element, not the page. The props land on React Router's `Routes` component, which ignores unknown props. `OverviewPage` therefore always receives its default `compareMode = false`, which is why the Compare toggle, the dashed indigo "Previous Period" area, and the "Comparison Active" pill are all unreachable.

Nested routes plus `<Outlet />` remove the need to pass anything down at all.

**Files:**
- Modify: `src/App.tsx` (full rewrite)
- Modify: `src/components/layout/DashboardLayout.tsx` (full rewrite)

- [ ] **Step 1: Rewrite `App.tsx`**

Replace the entire contents of `src/App.tsx`:

```tsx
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { DashboardFilterProvider } from './context/DashboardFilterProvider';
import { RequireAuth } from './components/routing/RequireAuth';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { DemographicsPage } from './pages/DemographicsPage';
import { FoodDesertsPage } from './pages/FoodDesertsPage';
import { PantryInteractionsPage } from './pages/PantryInteractionsPage';
import { MostRequestedPage } from './pages/MostRequestedPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { useAuth } from './hooks/useAuth';

function LoginRoute() {
  const { status, signIn } = useAuth();
  const location = useLocation();

  if (status === 'authenticated') {
    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';
    return <Navigate to={from} replace />;
  }

  return <LoginPage onLogin={signIn} />;
}

function ProtectedShell() {
  return (
    <RequireAuth>
      <DashboardFilterProvider>
        <DashboardLayout />
      </DashboardFilterProvider>
    </RequireAuth>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route element={<ProtectedShell />}>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/demographics" element={<DemographicsPage />} />
            <Route path="/food-deserts" element={<FoodDesertsPage />} />
            <Route path="/interactions" element={<PantryInteractionsPage />} />
            <Route path="/most-requested" element={<MostRequestedPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

Note `SettingsPage` no longer takes a `user` prop — Step 3 updates it.

- [ ] **Step 2: Rewrite `DashboardLayout.tsx`**

Replace the entire contents of `src/components/layout/DashboardLayout.tsx`:

```tsx
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../hooks/useAuth';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Overview', subtitle: 'Region-wide analytics & period comparison' },
  '/demographics': { title: 'Demographics & Community', subtitle: 'Age, household, and community ZIP breakdown' },
  '/food-deserts': { title: 'Food Deserts', subtitle: 'Food access analysis by county & census tract' },
  '/interactions': { title: 'Pantry Interactions', subtitle: 'App engagement and pantry activity' },
  '/most-requested': { title: 'Most Requested Items', subtitle: 'Item demand intelligence' },
  '/reports': { title: 'Reports & Export', subtitle: 'Generate and download reports' },
  '/settings': { title: 'Settings', subtitle: 'Agency account & threshold alert configuration' },
};

export const DashboardLayout = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const pageInfo = pageTitles[location.pathname] ?? { title: 'Dashboard', subtitle: '' };

  return (
    <div className="min-h-screen flex bg-[#0f1117] text-slate-100 relative">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onSignOut={signOut}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header
          pageTitle={pageInfo.title}
          pageSubtitle={pageInfo.subtitle}
          onToggleSidebar={() => setMobileSidebarOpen(true)}
        />

        <main className="flex-1 p-5 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        <footer className="border-t border-white/[0.04] py-4 px-8 no-print">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[11px] text-slate-600">
              © 2026 AccessBelt Analytics · Demonstration data — live Firebase integration pending
            </p>
            <p className="text-[11px] text-slate-600">
              Partnered with United Way River Region & USDA
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};
```

The footer text changed deliberately. It previously read "Data refreshed real-time (Firebase Ready)", which is false — nothing is connected. Phase 3 replaces this with a real `lastRollupAt` timestamp.

- [ ] **Step 3: Drop the `user` prop from `SettingsPage`**

In `src/pages/SettingsPage.tsx`, delete the props interface and read from the hook instead.

Remove these lines:

```tsx
interface SettingsPageProps {
  user: AgencyUser;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ user }) => {
```

Replace with:

```tsx
export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
```

Then update the imports at the top of the file — replace:

```tsx
import type { AgencyUser } from '../types';
```

with:

```tsx
import { useAuth } from '../hooks/useAuth';
```

Because `user` is now `AgencyUser | null`, add an early return immediately after the `useState` declarations and before `handleAddAlert`:

```tsx
  if (!user) return null;
```

This is unreachable in practice — `RequireAuth` guarantees a user before this renders — but it satisfies the type checker without a non-null assertion.

- [ ] **Step 4: Verify the type checker is clean**

Run: `npx tsc -b`
Expected: no output. If it reports that `Header` does not accept the props being passed, that is expected — Task 8 rewrites `Header`. Complete Task 8 before re-running.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/layout/DashboardLayout.tsx src/pages/SettingsPage.tsx
git commit -m "fix: replace cloneElement prop injection with nested routes"
```

---

## Task 8: Wire the header and date picker to the filter context

**Files:**
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/components/ui/DateRangePicker.tsx`

- [ ] **Step 1: Rewrite the `DateRangePicker` props and custom-range handling**

In `src/components/ui/DateRangePicker.tsx`, replace the import block and props interface:

```tsx
import React, { useState } from 'react';
import { Calendar, GitCompare, X, Check } from 'lucide-react';
import type { CustomDateRange, DateRangePreset } from '../../types';

interface DateRangePickerProps {
  selected: DateRangePreset;
  customRange: CustomDateRange | null;
  onChange: (preset: DateRangePreset, custom?: CustomDateRange) => void;
  compareMode: boolean;
  onToggleCompare: (enabled: boolean) => void;
}
```

Replace the component signature and its state initialisers:

```tsx
export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  selected,
  customRange,
  onChange,
  compareMode,
  onToggleCompare,
}) => {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [startDate, setStartDate] = useState(customRange?.startDate ?? '2026-07-01');
  const [endDate, setEndDate] = useState(customRange?.endDate ?? '2026-08-11');

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    onChange('custom', { startDate, endDate });
    setShowCustomModal(false);
  };
```

Replace the custom-range button label so it reflects the range actually in effect rather than the modal's local draft state:

```tsx
          {selected === 'custom' && customRange
            ? `${customRange.startDate} – ${customRange.endDate}`
            : 'Custom'}
```

Finally, the compare toggle is currently wrapped in `{onToggleCompare && ( … )}`. Since the prop is now required, delete that conditional wrapper and render the button unconditionally.

- [ ] **Step 2: Rewrite the `Header` props and data sources**

In `src/components/layout/Header.tsx`, replace the import block and props interface:

```tsx
import React, { useState } from 'react';
import { Bell, Menu, ChevronDown, User, Settings, LogOut, RefreshCw, Share2, Check } from 'lucide-react';
import { DateRangePicker } from '../ui/DateRangePicker';
import { useAuth } from '../../hooks/useAuth';
import { useDashboardFilters } from '../../hooks/useDashboardFilters';

interface HeaderProps {
  pageTitle: string;
  pageSubtitle?: string;
  onToggleSidebar: () => void;
}
```

Replace the component signature and add the hook reads:

```tsx
export const Header: React.FC<HeaderProps> = ({ pageTitle, pageSubtitle, onToggleSidebar }) => {
  const { user, signOut } = useAuth();
  const { dateRange, customRange, compareMode, setDateRange, setCompareMode } = useDashboardFilters();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleManualSync = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1200);
  };

  const handleShareView = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Clipboard access is denied outside secure contexts; fail quietly
      // rather than showing a false "Copied!" confirmation.
    }
  };

  if (!user) return null;
```

The `try`/`catch` matters: `navigator.clipboard.writeText` rejects on non-secure origins, and the current code shows "Copied!" regardless of whether anything was copied.

- [ ] **Step 3: Update the `DateRangePicker` call site inside `Header`**

Replace the existing `<DateRangePicker … />` block with:

```tsx
            <DateRangePicker
              selected={dateRange}
              customRange={customRange}
              onChange={setDateRange}
              compareMode={compareMode}
              onToggleCompare={setCompareMode}
            />
```

- [ ] **Step 4: Update the sign-out button inside the user menu**

The menu's sign-out button currently reads `onClick={onSignOut}`. Change it to:

```tsx
                      onClick={signOut}
```

- [ ] **Step 5: Verify the type checker is clean**

Run: `npx tsc -b`
Expected: no output.

- [ ] **Step 6: Verify the existing tests still pass**

Run: `npm test`
Expected: PASS, 28 tests across 4 files.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/Header.tsx src/components/ui/DateRangePicker.tsx
git commit -m "feat: drive header controls from the filter context"
```

**Known gap, deliberately deferred:** the date picker is still wrapped in `hidden sm:block` inside `Header`, so mobile users cannot change the date range at all. Fixing it needs a responsive rework of the header bar, which belongs with Phase 2's responsive and accessibility pass rather than here.

---

## Task 9: Make compare mode actually render

**Files:**
- Modify: `src/pages/OverviewPage.tsx`
- Create: `src/pages/OverviewPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/OverviewPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DashboardFilterProvider } from '../context/DashboardFilterProvider';
import { OverviewPage } from './OverviewPage';

function renderAt(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/${search}`]}>
      <DashboardFilterProvider now={new Date('2026-08-11T00:00:00.000Z')}>
        <OverviewPage />
      </DashboardFilterProvider>
    </MemoryRouter>,
  );
}

describe('OverviewPage', () => {
  it('shows the plain trend subtitle when compare is off', () => {
    renderAt('');
    expect(screen.getByText('30-day trend across all pantries')).toBeInTheDocument();
    expect(screen.queryByText('Comparison Active')).not.toBeInTheDocument();
  });

  it('shows the comparison affordances when compare is on', () => {
    renderAt('?compare=1');
    expect(screen.getByText('Comparison Active')).toBeInTheDocument();
    expect(
      screen.getByText('Comparing Current Period (Green) vs Previous Period (Indigo)'),
    ).toBeInTheDocument();
  });

  it('labels KPI trends against the resolved window length', () => {
    renderAt('?compare=1&range=7d');
    expect(screen.getAllByText('vs previous 7 days').length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pages/OverviewPage.test.tsx`
Expected: FAIL — `useDashboardFilters` is not yet called by the page, so `Comparison Active` never renders and the third test finds no matching text.

- [ ] **Step 3: Update the page to read from context**

In `src/pages/OverviewPage.tsx`, delete the props interface entirely:

```tsx
interface OverviewPageProps {
  compareMode?: boolean;
  dateRange?: string;
}
```

Add the hook import beneath the existing `exportToCSV` import:

```tsx
import { useDashboardFilters } from '../hooks/useDashboardFilters';
```

Replace the component signature and its first line:

```tsx
export const OverviewPage: React.FC = () => {
  const { compareMode, resolved } = useDashboardFilters();
  const [showBanner, setShowBanner] = useState(true);
```

- [ ] **Step 4: Make the KPI trend labels reflect the real window**

Both `MetricCard` elements that take a `trendLabel` currently hardcode `'vs previous 30 days'`. Replace each of the two occurrences of:

```tsx
          trendLabel={compareMode ? 'vs previous 30 days' : 'vs last period'}
```

with:

```tsx
          trendLabel={compareMode ? `vs previous ${resolved.dayCount} days` : 'vs last period'}
```

- [ ] **Step 5: Make the chart subtitle reflect the real window**

Replace:

```tsx
          subtitle={compareMode ? 'Comparing Current Period (Green) vs Previous Period (Indigo)' : '30-day trend across all pantries'}
```

with:

```tsx
          subtitle={
            compareMode
              ? 'Comparing Current Period (Green) vs Previous Period (Indigo)'
              : `${resolved.dayCount}-day trend across all pantries`
          }
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/pages/OverviewPage.test.tsx`
Expected: PASS, 3 tests.

Recharts' `ResponsiveContainer` measures to zero width under jsdom and will log width/height warnings to the console. That is expected — these assertions target the `ChartCard` subtitle and pill, which render outside the chart container. Do not add a resize-observer shim to silence it.

- [ ] **Step 7: Confirm the fix by hand**

Run: `npm run dev`

Sign in with any email, then click **Compare** in the header. Confirm all four of these:
1. The URL gains `?compare=1`.
2. A dashed indigo "Previous Period" series appears on the Families Served chart.
3. The "Comparison Active" pill appears in the chart card header.
4. Copying the URL into a new tab reproduces the comparison view.

Before this task, none of those happened.

- [ ] **Step 8: Commit**

```bash
git add src/pages/OverviewPage.tsx src/pages/OverviewPage.test.tsx
git commit -m "fix: make compare mode and date range reach the overview page"
```

---

## Task 10: Derive the demographics KPIs from the data

`DemographicsPage.tsx` renders `"5,486"`, `"3,114"`, `"2,817"` and `"3.8 Persons"` as string literals sitting beside charts that read the real object. Three of those happen to match today. The fourth does not: the weighted average of the household-size bands is **3.7**, not 3.8. When Firebase supplies real numbers, all four would keep displaying 2026 fiction.

**Files:**
- Create: `src/utils/demographics.test.ts`
- Create: `src/utils/demographics.ts`
- Modify: `src/pages/DemographicsPage.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/demographics.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { DemographicsData } from '../types';
import { mockDemographics } from '../data/mockData';
import {
  AGE_GROUP_CHILDREN,
  AGE_GROUP_SENIORS,
  VISITOR_TYPE_FIRST_TIME,
  averageHouseholdSize,
  countByAgeGroup,
  countByVisitorType,
  parseHouseholdBandMidpoint,
  totalIndividualsServed,
} from './demographics';

describe('parseHouseholdBandMidpoint', () => {
  it('averages a hyphenated range', () => {
    expect(parseHouseholdBandMidpoint('1-2 Persons')).toBe(1.5);
    expect(parseHouseholdBandMidpoint('3-4 Persons')).toBe(3.5);
  });

  it('averages an en-dashed range', () => {
    expect(parseHouseholdBandMidpoint('5–6 Persons')).toBe(5.5);
  });

  it('treats an open-ended band as half a person above its floor', () => {
    expect(parseHouseholdBandMidpoint('7+ Persons')).toBe(7.5);
  });

  it('returns null for an unparseable label', () => {
    expect(parseHouseholdBandMidpoint('Unknown')).toBeNull();
  });
});

describe('countByAgeGroup', () => {
  it('returns the count for a known group', () => {
    expect(countByAgeGroup(mockDemographics, AGE_GROUP_CHILDREN)).toBe(5486);
    expect(countByAgeGroup(mockDemographics, AGE_GROUP_SENIORS)).toBe(3114);
  });

  it('returns zero for a group that is absent', () => {
    expect(countByAgeGroup(mockDemographics, 'Martians')).toBe(0);
  });
});

describe('countByVisitorType', () => {
  it('returns the count for a known visitor type', () => {
    expect(countByVisitorType(mockDemographics, VISITOR_TYPE_FIRST_TIME)).toBe(2817);
  });
});

describe('totalIndividualsServed', () => {
  it('sums every age group', () => {
    expect(totalIndividualsServed(mockDemographics)).toBe(14827);
  });
});

describe('averageHouseholdSize', () => {
  it('weights band midpoints by household count', () => {
    // (3855*1.5 + 6672*3.5 + 3262*5.5 + 1038*7.5) / 14827 = 3.6999...
    expect(averageHouseholdSize(mockDemographics)).toBe(3.7);
  });

  it('ignores bands whose label cannot be parsed', () => {
    const data: DemographicsData = {
      ...mockDemographics,
      householdSizes: [
        { size: '1-2 Persons', count: 100, percentage: 50 },
        { size: 'Unknown', count: 100, percentage: 50 },
      ],
    };
    expect(averageHouseholdSize(data)).toBe(1.5);
  });

  it('returns zero rather than NaN when there are no households', () => {
    const data: DemographicsData = { ...mockDemographics, householdSizes: [] };
    expect(averageHouseholdSize(data)).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/utils/demographics.test.ts`
Expected: FAIL — `Failed to resolve import "./demographics"`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/demographics.ts`:

```ts
import type { DemographicsData } from '../types';

// The data uses en-dashes (U+2013) inside these labels, not hyphens.
// Escaped explicitly so the constants survive copy-paste and diff tooling.
export const AGE_GROUP_CHILDREN = 'Children (0–17)';
export const AGE_GROUP_ADULTS = 'Adults (18–59)';
export const AGE_GROUP_SENIORS = 'Seniors (60+)';

export const VISITOR_TYPE_FIRST_TIME = 'First-Time';

/**
 * Turn a household-size band label into the representative size used for
 * weighted averaging. Handles '1-2 Persons', '5–6 Persons' and '7+ Persons'.
 * Returns null when the label cannot be interpreted, so callers can skip it
 * rather than poisoning the average with NaN.
 */
export function parseHouseholdBandMidpoint(label: string): number | null {
  const openEnded = /^(\d+)\+/.exec(label);
  if (openEnded) return Number(openEnded[1]) + 0.5;

  const range = /^(\d+)\s*[-–]\s*(\d+)/.exec(label);
  if (range) return (Number(range[1]) + Number(range[2])) / 2;

  const single = /^(\d+)/.exec(label);
  if (single) return Number(single[1]);

  return null;
}

export function countByAgeGroup(data: DemographicsData, group: string): number {
  return data.ageGroups.find((entry) => entry.group === group)?.count ?? 0;
}

export function countByVisitorType(data: DemographicsData, type: string): number {
  return data.visitorTypes.find((entry) => entry.type === type)?.count ?? 0;
}

export function totalIndividualsServed(data: DemographicsData): number {
  return data.ageGroups.reduce((sum, entry) => sum + entry.count, 0);
}

/** Weighted mean household size, rounded to one decimal place. */
export function averageHouseholdSize(data: DemographicsData): number {
  let weighted = 0;
  let households = 0;

  for (const band of data.householdSizes) {
    const midpoint = parseHouseholdBandMidpoint(band.size);
    if (midpoint === null) continue;
    weighted += midpoint * band.count;
    households += band.count;
  }

  if (households === 0) return 0;
  return Math.round((weighted / households) * 10) / 10;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/utils/demographics.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Use the derived values on the page**

In `src/pages/DemographicsPage.tsx`, add the import beneath the existing `exportToCSV` import:

```tsx
import {
  AGE_GROUP_CHILDREN,
  AGE_GROUP_SENIORS,
  VISITOR_TYPE_FIRST_TIME,
  averageHouseholdSize,
  countByAgeGroup,
  countByVisitorType,
} from '../utils/demographics';
```

Immediately after the `const [searchTerm, setSearchTerm] = useState('');` line, add:

```tsx
  const childrenServed = countByAgeGroup(demographics, AGE_GROUP_CHILDREN);
  const seniorsServed = countByAgeGroup(demographics, AGE_GROUP_SENIORS);
  const firstTimeRecipients = countByVisitorType(demographics, VISITOR_TYPE_FIRST_TIME);
  const avgHouseholdSize = averageHouseholdSize(demographics);
```

Then replace each of the four hardcoded `value` props:

```tsx
          value="5,486"      →  value={childrenServed}
          value="3,114"      →  value={seniorsServed}
          value="2,817"      →  value={firstTimeRecipients}
          value="3.8 Persons" →  value={`${avgHouseholdSize} Persons`}
```

`MetricCard` already applies `toLocaleString()` to numeric values, so the first three keep their thousands separators.

- [ ] **Step 6: Verify by hand**

Run: `npm run dev` and open `/demographics`.
Expected: the first three KPIs read 5,486 / 3,114 / 2,817 exactly as before; **Avg Household Size now reads `3.7 Persons`, not `3.8`.** That change is correct — 3.8 never matched the data underneath it.

- [ ] **Step 7: Commit**

```bash
git add src/utils/demographics.ts src/utils/demographics.test.ts src/pages/DemographicsPage.tsx
git commit -m "fix: derive demographics KPIs from data instead of hardcoding"
```

---

## Task 11: Make the mock data deterministic

`src/data/mockData.ts` calls `Math.random()` at module scope on lines 500, 504 and 539. Every page load produces a different chart. That breaks screenshot-stable demos, makes any future snapshot test flaky, and means two people looking at "the same" dashboard see different numbers.

**Files:**
- Create: `src/utils/seededRandom.ts`
- Modify: `src/data/mockData.ts`

- [ ] **Step 1: Create the PRNG**

Create `src/utils/seededRandom.ts`:

```ts
/**
 * mulberry32 — a small, fast, seedable PRNG.
 *
 * Used so demonstration data is identical on every load: stable for
 * screenshots in the grant deck, and stable for tests. Not for anything
 * security-related.
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

- [ ] **Step 2: Import it in the mock data module**

Add to the imports at the top of `src/data/mockData.ts`:

```ts
import { createSeededRandom } from '../utils/seededRandom';
```

- [ ] **Step 3: Seed `generateDailyInteractions`**

Inside `function generateDailyInteractions()`, add this as the first line of the function body:

```ts
  const random = createSeededRandom(20260811);
```

Then replace both `Math.random()` calls in that function with `random()`:

```ts
    const noise = 0.85 + random() * 0.3;
```

```ts
    const notificationViews = Math.round(450 * baseFactor * trendFactor * (0.8 + random() * 0.4));
```

- [ ] **Step 4: Seed `generateFamiliesServedTimeSeries`**

Inside `function generateFamiliesServedTimeSeries()`, add this as the first line of the function body:

```ts
  const random = createSeededRandom(48271);
```

Then replace the `Math.random()` call:

```ts
    const noise = 0.88 + random() * 0.24;
```

- [ ] **Step 5: Confirm no `Math.random` remains**

Run: `grep -n "Math.random" src/data/mockData.ts`
Expected: no output, exit code 1.

- [ ] **Step 6: Confirm the output is stable across loads**

Run: `npx vitest run` then run it a second time.
Expected: both runs PASS with identical results. Then run `npm run dev`, note the first value on the Families Served chart, hard-refresh, and confirm it is unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/utils/seededRandom.ts src/data/mockData.ts
git commit -m "fix: make generated mock series deterministic"
```

---

## Task 12: Split routes into separate chunks

The production bundle is currently a single 786 KB JavaScript file (222 KB gzipped). Recharts and all seven pages download before the login screen paints.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/DashboardLayout.tsx`

- [ ] **Step 1: Record the current bundle size**

Run: `npm run build`
Expected: a chunk of roughly 786 KB and a warning that chunks exceed 500 KB. Note the exact number so you can compare in Step 5.

- [ ] **Step 2: Convert the page imports to lazy imports**

In `src/App.tsx`, replace the seven page imports:

```tsx
import { OverviewPage } from './pages/OverviewPage';
import { DemographicsPage } from './pages/DemographicsPage';
import { FoodDesertsPage } from './pages/FoodDesertsPage';
import { PantryInteractionsPage } from './pages/PantryInteractionsPage';
import { MostRequestedPage } from './pages/MostRequestedPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
```

with lazy equivalents. The pages use **named** exports, so each needs the `.then()` shim:

```tsx
import { lazy } from 'react';

const OverviewPage = lazy(() => import('./pages/OverviewPage').then((m) => ({ default: m.OverviewPage })));
const DemographicsPage = lazy(() => import('./pages/DemographicsPage').then((m) => ({ default: m.DemographicsPage })));
const FoodDesertsPage = lazy(() => import('./pages/FoodDesertsPage').then((m) => ({ default: m.FoodDesertsPage })));
const PantryInteractionsPage = lazy(() => import('./pages/PantryInteractionsPage').then((m) => ({ default: m.PantryInteractionsPage })));
const MostRequestedPage = lazy(() => import('./pages/MostRequestedPage').then((m) => ({ default: m.MostRequestedPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
```

Leave `LoginPage` imported eagerly — it is the first thing an unauthenticated visitor paints, so deferring it would add a round trip rather than remove one.

- [ ] **Step 3: Wrap the outlet in Suspense**

In `src/components/layout/DashboardLayout.tsx`, change the React import:

```tsx
import { Suspense, useState } from 'react';
```

Add the fallback import beneath the `useAuth` import:

```tsx
import { RouteFallback } from '../ui/RouteFallback';
```

Then wrap the outlet:

```tsx
        <main className="flex-1 p-5 sm:p-8 max-w-7xl w-full mx-auto">
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
```

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: PASS, 42 tests across 6 files.

- [ ] **Step 5: Rebuild and compare**

Run: `npm run build`
Expected: multiple chunks instead of one. The entry chunk should be well under 300 KB, with Recharts pulled into a chunk shared by the pages that use it. If the 500 KB warning persists on a single chunk, Recharts is still being pulled into the entry — check that no eagerly imported module re-exports a page.

- [ ] **Step 6: Verify navigation still works in a real browser**

Run: `npm run preview`

Sign in, then visit all seven routes. Confirm each renders, and that a brief spinner (not a blank page) appears on first navigation to each.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/components/layout/DashboardLayout.tsx
git commit -m "perf: split dashboard routes into lazy chunks"
```

---

## Phase 1 acceptance checklist

Run through this before declaring the phase done. Every item must be verified, not assumed.

- [ ] `npm test` passes — 42 tests, 6 files.
- [ ] `npm run build` passes with no TypeScript errors.
- [ ] `npm run lint` reports no errors.
- [ ] Entry JS chunk is under 300 KB.
- [ ] Clicking **Compare** adds a visible second series to the Overview chart *and* puts `compare=1` in the URL.
- [ ] Changing the date preset updates the chart subtitle and the KPI trend labels to match the new window length.
- [ ] Applying a custom range shows the chosen dates on the Custom pill and puts `from`/`to` in the URL.
- [ ] Copying the URL with filters applied and opening it in a new tab reproduces the identical view.
- [ ] Refreshing any page keeps you signed in.
- [ ] Navigating directly to `/food-deserts` while signed out lands on the login screen, and signing in returns you to `/food-deserts` — not to `/`.
- [ ] Signing out returns you to the login screen and a refresh does not restore the session.
- [ ] Avg Household Size reads `3.7 Persons`.
- [ ] Hard-refreshing the Overview page twice produces identical chart values.

## What Phase 1 deliberately does not fix

Called out so nobody assumes these were missed:

- **Accessibility** — all of it. Phase 2.
- **The mobile date picker** — still hidden below the `sm` breakpoint. Phase 2's responsive pass.
- **`DataTable.tsx`** — still dead code, still four hand-rolled tables. Phase 2 rebuilds and migrates.
- **The "Live Sync" pill** — still a 1200 ms fake spinner. It becomes real in Phase 3 when there is a `lastRollupAt` to show.
- **RBAC** — `permissions` and `assignedCounties` are still displayed but never enforced. Enforcement has to be server-side, so it lands with Phase 3's security rules.
- **The map** — still a tile grid described as a vector map. Phase 4.
- **CSV and PDF output** — still unhardened. Phase 5.
