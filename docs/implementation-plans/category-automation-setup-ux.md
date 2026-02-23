# Category Automation Setup – Implementation Plan

**Date**: February 19, 2026
**Status**: Planning
**Source**: Category Automation Setup UX Flow Document (Feb 2026)
**Related files**:
- `components/dashboard/setting-up-flow/` — current setup flow
- `components/dashboard/setting-up-flow/steps/batch-tracking/` — sub-step components
- `lib/queries/batch-tracking-onboarding.ts` — data layer
- `lib/stores/setup-flow-store.ts` — step navigation state

---

## Context

The current SettingUpFlow has 2 top-level steps (Add Store → Batch Tracking Setup). The Batch Tracking step already implements the core `auto_create_batches` concept — auto/manual mode per category, shelf life days, and a combined category configuration interface. However, it's missing several UX improvements identified in the UX document.

**Decisions incorporated from UX doc review:**
- ✅ Store-type-based smart defaults — **skipped** (using `typical_shelf_life_days` from DB is sufficient for now)
- ✅ Smart prompts (Flow C) — **deferred** to a later phase
- ✅ Welcome + Square Connection + Import Catalog — **already combined** in current Add Store step, no change needed

**Revised top-level step structure (no change to sidebar):**
```
Step 1: Add Store          (existing — Square OAuth + store review + import summary)
Step 2: Batch Tracking     (existing — enhanced with items below)
  └── [NEW] Intro screen
  └── Combined tracking config  (existing)
  └── [NEW] Review & Summary screen
  └── Activating animation (existing)
  └── Success screen       (existing)
```

Steps 3–5 from the UX doc are NOT being promoted to top-level sidebar steps — the sub-step wizard approach is retained. Step 4 "Configure Automation Rules" maps to the existing combined tracking screen, enhanced.

---

## Phase 1 — Onboarding Enhancements

**Goal**: Close the gaps in the current onboarding wizard without restructuring it.

### 1.1 — Intro Screen (New sub-step before category table)

**What**: Add a framing screen at the start of BatchTrackingStep (before the combined tracking config). Its job is to explain the value prop before showing the table.

**Why**: Users currently land on a category table with no context. The intro anchors the mental model: "scan it → we calculate expiry" vs "scan it → you type the date."

**File**: Create `components/dashboard/setting-up-flow/steps/batch-tracking/step-intro.tsx`

**Content**:
- Headline: "Save Time on Deliveries"
- 2-line explanation of auto-track vs manual entry — use their actual category names where possible (e.g. "Fresh Bakery → 3 days from delivery ✓")
- Primary CTA: "Set Up Automation" (advances to category table)
- Secondary CTA: "Skip — I'll configure this later" (see 1.2)

**WizardSubStep type change**:
```ts
// current
type WizardSubStep = 0 | 1 | 'activating'

// new
type WizardSubStep = 'intro' | 'configure' | 'review' | 'activating'
```

---

### 1.2 — Skip Option

**What**: "Skip — I'll configure this later" on the intro screen. Saves all categories as `auto_create_batches: false` (manual), `is_tracked: true`, with their default shelf life days. Marks setup complete and navigates to dashboard.

**Why**: Blocking users in setup until they configure automation creates friction. A manual default is a safe fallback — they can always update in settings.

**Behaviour**:
1. User clicks skip on the intro screen
2. All imported categories are saved with `auto_create_batches: false`, shelf life from `typical_shelf_life_days`
3. `hasBatchTrackingSetup` is marked true in the DB (same as completing normally)
4. User lands on dashboard

**File changes**:
- `steps/batch-tracking/step-intro.tsx` — skip button calls skip handler
- `steps/batch-tracking-step.tsx` — `handleSkip()` function that calls `saveMutation` with all-manual defaults

---

### 1.3 — Review & Summary Screen (New sub-step before activating)

**What**: After the user clicks "Activate" on the category config screen, show a confirmation screen before firing the save mutation. Let them see what they configured and go back if needed.

**Why**: Currently clicking "Activate" immediately triggers the save + activating animation. Users have no chance to review. The UX doc's Screen 4 ("Review & Complete") builds confidence before committing.

**File**: Create `components/dashboard/setting-up-flow/steps/batch-tracking/step-review.tsx`

**Content**:
- "Automation Summary" card listing:
  - ⚡ Auto-tracking categories with shelf life days
  - ✋ Manual entry categories
- "[Change]" link → goes back to configure step
- "Complete Setup 🎉" CTA → triggers activating animation (the actual save fires here, not on the config step)

**Key change in `batch-tracking-step.tsx`**:
- `onActivate` in `StepCombinedTracking` → advances to `'review'` sub-step (no save yet)
- `onConfirm` in `StepReview` → fires `saveMutation` and advances to `'activating'`

---

### 1.4 — "What's this?" Tooltip on Category Table

**What**: An info icon (Lucide `Info`) next to the "Automation Rules" heading in the combined tracking step. On click/hover, shows a tooltip explaining auto-track vs manual.

**Tooltip copy**:
> **⚡ Auto-track**: We calculate expiry dates based on delivery date + shelf life. Nothing to enter on delivery.
> **✋ Manual entry**: You'll scan or enter the expiry date when the delivery arrives.

**File**: `components/dashboard/setting-up-flow/steps/batch-tracking/step-combined-tracking.tsx`
**Component**: Use existing `Tooltip` from `@/components/ui/tooltip` (Radix-based)

---

### 1.5 — Sort: Auto Categories First, Manual Below

**What**: In the category list, render enabled/auto categories at the top, then manual, then disabled (unchecked). Re-sort reactively as user toggles modes.

**Why**: The UX doc calls this out as a visual cue — "auto at top, manual at bottom." With many categories it helps users see the split at a glance.

**File**: `components/dashboard/setting-up-flow/steps/batch-tracking/step-combined-tracking.tsx`

**Implementation**: Add a `useMemo` sort before rendering:
```ts
const sortedCategories = useMemo(() => [...categories].sort((a, b) => {
  const scoreA = enabledIds.has(a.id) ? (categoryModes[a.id] === 'auto' ? 0 : 1) : 2
  const scoreB = enabledIds.has(b.id) ? (categoryModes[b.id] === 'auto' ? 0 : 1) : 2
  return scoreA - scoreB
}), [categories, enabledIds, categoryModes])
```

---

## Phase 2 — Settings Page (Post-Onboarding)

**Goal**: Allow users to change automation rules after setup is complete, from within the app settings.

### 2.1 — Automation Rules Settings Page

**Route**: `app/(dashboard)/settings/automation/page.tsx` (new route)

**What**:
- Heading: "Batch Tracking & Expiry Automation"
- Sub-heading: "Control how expiry dates are handled when deliveries arrive."
- Quick Actions bar: [Set all to auto-track] [Set all to manual] [Reset to defaults]
- Same category table as onboarding (reuse `CategoryRowWithConfig` from `step-combined-tracking.tsx`)
- Save Changes button
- "Advanced Options" section (collapsed by default) exposing product-level overrides (the `CategoryProductExpand` component is already built — just commented out)

**Files to create**:
- `app/(dashboard)/settings/automation/page.tsx`
- `components/settings/automation-rules-settings.tsx` — client component wrapping the reused category table

**Files to update**:
- Add "Automation" link to the settings navigation (wherever settings nav is defined)
- Consider a `[Change]` deep-link from the Review screen (1.3) that goes here post-setup

**Data layer**: Reuse `useCategoriesWithTrackingSettings` and `useSaveBatchTrackingSetup` from `lib/queries/batch-tracking-onboarding.ts`. May need a separate mutation for post-onboarding partial updates (not a full setup save).

---

### 2.2 — "Change" Link from Dashboard

**What**: A subtle "Change automation settings" link somewhere accessible from the main dashboard (e.g. in a future settings dropdown or store info panel) so users don't have to hunt for the settings page.

**Defer**: Until the settings page (2.1) is shipped.

---

## Phase 3 — Smart Prompts (Deferred)

**Goal**: Context-aware nudges after users experience the pain of manual entry.

**Trigger**: User manually enters expiry dates for 5+ items in the same category within a single delivery.

**Prompt copy**:
> 💡 Save Time on Future Deliveries
> We noticed you just entered expiry dates for 5 Dairy & Eggs products manually.
> Want us to auto-calculate a default of 7 days for all Dairy & Eggs products?
> [No thanks] [Yes, auto-track Dairy & Eggs]

**Notes**:
- Requires delivery scanning workflow instrumentation to count manual entries per category per session
- Must not re-trigger for the same category after dismiss
- Preference stored in `store_category_settings` or a separate dismissed-prompts table
- This is purely additive — no current code needs to change until delivery scanning is fully built

---

## Phase Summary

| Phase | Items | Touches |
|---|---|---|
| **Phase 1** | Intro screen, Skip option, Review screen, Tooltip, Sort order | `batch-tracking-step.tsx`, new sub-step components, `step-combined-tracking.tsx` |
| **Phase 2** | Automation settings page, product override UI exposed | New route + settings component, settings nav |
| **Phase 3** | Smart prompts post-delivery | Delivery scanning workflow, new prompt component |

---

## Implementation Order Within Phase 1

Suggested sequence (each is independently shippable):

1. **1.5 Sort** — lowest risk, pure UI, no new components
2. **1.4 Tooltip** — low risk, one component change
3. **1.1 + 1.2 Intro + Skip** — create `step-intro.tsx`, update `WizardSubStep` type, add skip handler
4. **1.3 Review screen** — create `step-review.tsx`, move save trigger from config → review

> Items 3 and 4 both touch `WizardSubStep` — do them together in one PR.

---

## Open Questions

1. **Empty state on skip**: If a user skips and all categories default to manual — should the dashboard prompt them to configure automation? Or is silent manual-default fine? For now, lets just do a silent manual-default! Later on we can think about this.
2. **Settings page auth**: Should employees (non-owner/manager roles) be able to view (but not edit) the automation settings page, or is it owner/manager only? This doesn't matter for now! Lets expect anyone who uses our app to have permissions on Square! 
3. **"Change" link placement**: Where in the post-setup dashboard should users be able to get back to automation settings? Settings menu, store card, or somewhere else? We will eventually add a link in the app sidebar for automation
