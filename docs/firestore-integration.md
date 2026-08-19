# Connecting the dashboard to Firestore

The client is finished. Every page reads through `src/services/dashboardData.ts`,
every query carries the agency's counties and the selected date window, and the
demonstration path generates documents in exactly the shape Firestore will
return. Connecting is configuration and a rollup job — not further UI work.

Read `src/data/schema.ts` first. It is the contract, and it explains the one
design decision the rest of this depends on: there is a single rollup grain,
**county × day**, and Overview, Demographics, Most Requested and Pantry
Interactions all read the same documents.

---

## 1. Create the database

The dashboard uses a **named** database, `accessbelt-agency`, separate from the
consumer app's `(default)` and from the Operator Portal's `accessbelt-operator`.

```bash
gcloud firestore databases create \
  --database=accessbelt-agency \
  --location=nam5 \
  --type=firestore-native
```

## 2. Deploy rules and indexes

```bash
firebase deploy --only firestore:rules   --database accessbelt-agency
firebase deploy --only firestore:indexes --database accessbelt-agency
```

> **The `--database` flag is not optional.** Without it these rules deploy to
> `(default)` and replace the rules protecting the family-facing resource data
> the consumer app reads.

The three composite indexes in `firestore/indexes.json` back the range queries
in `dashboardData.ts`. Deploy them before the first query, or Firestore will
fail it at runtime with a console link — a poor way to find out.

## 3. Mint custom claims

Access is decided entirely by claims. Add a callable that an administrator runs
once per agency user:

```ts
// functions/src/grantAgencyAccess.ts
export const grantAgencyAccess = onCall(async (request) => {
  assertCallerIsPlatformAdmin(request.auth);

  const { uid, role, orgId, counties } = request.data;
  await getAuth().setCustomUserClaims(uid, { role, orgId, counties });
});
```

| Claim      | Type       | Notes                                                              |
| ---------- | ---------- | ------------------------------------------------------------------ |
| `role`     | string     | `agency_admin` \| `agency_analyst` \| `agency_readonly`             |
| `orgId`    | string     | Must match `orgId` on the agency's alerts and schedules             |
| `counties` | string[]   | Display spelling — `"Lowndes"`, not `"lowndes"` or `"Lowndes County"` |

Spelling matters: `counties` is compared directly against the `county` field on
rollup documents, and `slug()` in `schema.ts` is only used for document ids.

Claims are read from the token, so a user must sign out and back in (or the
client must force-refresh the ID token) before a change takes effect.

## 4. Write the rollups

A scheduled Cloud Function reduces the consumer app's raw event stream into one
`rollupsCountyDaily` document per county per day, plus one `rollupsPantryDaily`
per pantry per day. Both are written with the Admin SDK, which bypasses the
rules — no client write path exists for them, deliberately.

Two properties the client depends on:

- **Counts, never percentages.** Every map in `CountyDailyDoc` holds counts,
  because the client sums them across counties and days and derives shares at
  the end. A percentage cannot be summed.
- **`date` is `YYYY-MM-DD`.** Lexicographic order is chronological order, which
  is what makes the range queries work without a timestamp index.

Backfill at least `2 × your longest window` of history so period-over-period
comparison has something to compare against on day one. For a 90-day view that
is 180 days.

`src/data/demoRollups.ts` is a working reference implementation of the shaping —
weekday rhythm, per-item drift, county weighting — if you want the seeded data
to resemble the real thing while you build the job.

## 5. Seed the directories

| Collection       | Contents                                              |
| ---------------- | ----------------------------------------------------- |
| `pantries`       | Stable attributes only: name, address, coordinates, type, county, `isActive`, `topItems`, `updatedAt` |
| `requestedItems` | `name` and `category`. No counts — those live in the rollups |
| `countyMetrics`  | Annual ACS/USDA measures keyed by FIPS, including `vintage` |

`countyMetrics` is neither county-scoped nor date-scoped, and both are
deliberate. The choropleth draws all 67 counties for geographic context and
marks the ones outside coverage as locked, so filtering would leave holes in the
map while protecting published census data. And these are annual figures with a
citation — they must not appear to move when someone picks "last 7 days".

## 6. Flip the switch

```bash
# .env.local
VITE_USE_FIREBASE=true
VITE_FIREBASE_API_KEY=…
VITE_FIREBASE_AUTH_DOMAIN=…
VITE_FIREBASE_PROJECT_ID=…
VITE_FIREBASE_APP_ID=…
```

The API key is **not** a secret. Firebase web API keys are public identifiers
that ship in every client bundle by design; access control comes from the rules
above and from App Check.

### What changes in the UI when this flips

- The header pill reads **Firestore Live** instead of **Demo Data**.
- The preview persona switcher **disappears entirely**, so it can never unlock a
  paid module for a real agency. This is enforced in `PreviewProvider`, not in
  CSS, and there is a test for the case where a stored "unlock everything"
  preference survives into live mode.
- A listener that fails falls back to demonstration data *and* surfaces the
  error banner. An agency must never mistake fallback data for live data.

---

## Verifying before you trust it

Work through these in order. Each one has failed in a real deployment
somewhere.

1. **Sign in as a user whose claims cover two counties.** Confirm the header
   scope selector offers exactly those two and the county totals change when you
   switch between them.
2. **Scope to a county the user is *not* assigned** by editing `?scope=` in the
   URL. It must produce an empty state, never data.
3. **Change the date range** and confirm every page moves, not just Overview.
   Check the network panel: the document count should scale with
   `counties × days`.
4. **Break a rollup document on purpose** — set `familiesServed` to a string.
   The dashboard must skip it with a console warning and keep rendering.
5. **Revoke a county from the claims** and reload. The query must fail closed,
   with the error banner visible, not silently return everything.
6. **Check an export.** Open the CSV and confirm the provenance block at the top
   names the agency, the scope and the period — and that no county outside the
   agency's coverage appears in the rows.

## Read cost

```
documents per dashboard load ≈ (counties in scope × days in window) × 2
```

The `× 2` is the previous window, fetched in the same listener for
period-over-period growth. Eight counties on the default 30-day view is roughly
480 document reads. If a statewide agency on a 90-day view becomes the common
case, add a monthly pre-aggregate written by the same job — no page changes.
