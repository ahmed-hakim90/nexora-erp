# Easy Operator Forms Standard

> **Status:** Constitutional — mandatory for every Nexora screen with data entry.  
> **Authority:** Child of [Nexora Platform UX Constitution](NEXORA_PLATFORM_UX_CONSTITUTION.md).  
> **Enforcement:** [Platform UX Review Gate](PLATFORM_UX_REVIEW_GATE.md) · `.cursor/rules/easy-operator-forms.mdc`

Ahmed's recurring UX bar is simple: **operators must understand every field without guessing, in Arabic or English, on desktop and mobile — without being told again per screen.**

This standard turns that bar into platform law.

---

## 1. Core Rule

**Easy beats dense.**

If an operator must ask "what is this field?" or squint at a single crowded row, the screen fails — even when the backend is correct.

---

## 2. Mandatory Platform Primitives

Do **not** invent module-local `AdvanceFormField`, `LabeledInput`, or one-off label wrappers.

| Need | Use from `@/shared/ui` |
| --- | --- |
| Field with visible label + optional hint | `FieldGroup` |
| Grouped form block with title | `FormSection` or `EditableSectionCard` |
| Modal create/edit | `RecordFormDialog` + `RecordFormSection` |
| Grid layout | `FormGrid` or `grid gap-4 md:grid-cols-2 xl:grid-cols-3` |
| Relation | `EntityLookup` (always with `label`) |
| Date | `DatePicker` / `DatePickerField` |
| Feedback | `platform.feedback` |

Canonical implementation: `src/shared/ui/form/enterprise-form.tsx`.

---

## 3. Labels — Never Placeholder-Only

### 3.1 Required

- Every input, select, and lookup has a **persistent visible label**.
- Placeholder is **supplemental** (example value or format), never the only label.
- Labels use i18n keys (`t("…")`), never hardcoded English in Arabic UI.

### 3.2 Prohibited

```tsx
// ❌ Placeholder is the only label — context disappears after typing
<Input placeholder="Amount (SAR)" name="amount" />

// ❌ Raw value with no label — user sees "1" with no meaning
<Input defaultValue="1" name="deductionMonths" />
```

### 3.3 Required pattern

```tsx
<FieldGroup description={t("hr.advances.deductionMonthsHint")} label={t("hr.advances.deductionMonths")}>
  <Input defaultValue="1" id="deductionMonths" min={1} name="deductionMonths" type="number" />
</FieldGroup>
```

Or `EntityLookup` with explicit `label` prop.

---

## 4. Layout Density

### 4.1 Column limits

| Breakpoint | Max columns for operator forms |
| --- | --- |
| Mobile (`< md`) | **1** — stack all fields |
| Tablet (`md`) | **2** |
| Desktop (`xl+`) | **3** — never 4+ for mixed field types |

### 4.2 Prohibited

- Six mixed fields (lookup + select + number + text + button) in one row.
- Primary submit button squeezed inside the same grid cell as inputs without full-width mobile fallback.

### 4.3 Required

- Primary CTA row: `flex justify-end` with `w-full sm:w-auto` on the button, inside a `border-t` footer — not a sparse extra grid row.
- Long text fields (reason, notes, description): full width **below** the main `FormGrid`, not awkward `col-span-2` beside a single field.
- Use `gap-4` minimum between fields — not `gap-2` or `gap-3` for create forms.

### 4.4 Canonical create form structure

```tsx
<FormSection title={...} description={...}>
  <form className="space-y-5">
    <FormGrid>
      {/* pairs: employee + type, amount + deduction months */}
      <FieldGroup label={...} isRequired>
        <EntityLookup label={t("hr.common.searchEmployee")} ... />
      </FieldGroup>
      ...
    </FormGrid>
    <FieldGroup label={...}>{/* optional full-width field */}</FieldGroup>
    <div className="flex justify-end border-t border-[hsl(var(--border))] pt-4">
      <Button className="min-w-[9rem] w-full sm:w-auto" type="submit" />
    </div>
  </form>
</FormSection>
```

- `EntityLookup` always sits inside `FieldGroup`; lookup `label` is the **placeholder** inside the control, `FieldGroup label` is the visible field name.
- Long field hints use `FieldGroup help={resolveHrFieldHelp(...)}` (tooltip), not `description` that breaks row height alignment.
- Prefer `FormSection` for create blocks; reserve `EditableSectionCard` for profile sections with collapse/history.

---

## 5. Section Structure (List Workspaces)

### 5.0 Default layout: list-primary + create sidebar

List-first pages keep the **table as the wide main area** and the **create form in a narrow sidebar (~20–24rem)** beside it.

```text
PageHeader → KPIs → [ Table + filter (wide) | Create form (narrow sidebar) ]
```

- LTR: table left (wide), create panel right (narrow).
- RTL: table left/wide, create panel right/narrow — **swap column widths for RTL**, not only `col-start`.

```tsx
<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] rtl:lg:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)]">
  <section className="min-w-0 lg:col-start-1 lg:row-start-1 rtl:lg:col-start-2">{/* filter + table */}</section>
  <aside className="lg:sticky lg:top-4 lg:col-start-2 lg:self-start lg:row-start-1 rtl:lg:col-start-1">{/* stacked create form */}</aside>
</div>
```

Never give the create form the `1fr` wide column in RTL — that inverts list-first hierarchy.

### 5.1 Stacked fallback (mobile)

On small screens, stack with create panel first (`order-1`), then filter + table (`order-2`).

### 5.2 Create section

- Wrapped in `FormSection` (preferred) or `EditableSectionCard` for profile-style collapse.
- Has **title** + one-line **description** explaining the task.
- Example keys: `hr.<module>.createTitle`, `hr.<module>.createDescription`.

### 5.3 Filter section

- Separate from create — never merged into the same form.
- Lighter visual weight (simple bordered section or `PageFilters`).
- Title optional but recommended: `hr.<module>.filterTitle`.

---

## 6. Localization (Non-Negotiable)

### 6.1 UI copy

- All labels, buttons, placeholders, hints, statuses, and enum options go through `useTranslations()`.
- Arabic locale must not show raw English catalog labels from foundation constants.

### 6.2 Enum / status display

Use `translateCatalogKey` helpers in `src/features/<app>/application/utils/*-i18n-display.ts`:

- `translateHrStatus(t, status)` — workflow statuses
- `translateHrAdvanceType(t, type)` — domain enums (add sibling helpers per catalog)

Pattern for new catalogs:

```ts
export function translateHrFooType(t: TranslateFn, value: string): string {
  return translateCatalogKey(t, "hr.fooType", value, formatHrStatusLabel(value));
}
```

Add keys under `hr.<catalog>.<normalized_value>` in `hr-en.ts` and `hr-ar.ts`.

### 6.3 Prohibited

- `{ label: "Salary Advance", value: "salary" }` rendered directly in Arabic UI.
- Status column showing `submitted`, `partially_settled`, etc. without translation.

---

## 7. Field Hints & Defaults

| Situation | Required UX |
| --- | --- |
| Numeric default (e.g. `1` month) | Visible label + `FieldGroup` `description` explaining what the number means |
| Optional field | Label says optional; placeholder may repeat |
| Money | Label includes currency; placeholder shows example amount (`e.g. 1500`) |
| Business rule the operator must know | Hint text under field — not tooltip-only |

Tooltips (`HelpHint`) are **additive**, never the primary explanation.

---

## 8. Buttons & Actions

- Primary action label = **verb + object** in active locale (`تقديم الطلب`, not generic cramped text).
- Section title already names the task → button can be shorter (`Submit request`).
- Destructive actions: explicit label + confirmation dialog.
- Row actions in tables: translated labels; status badges use `translateHrStatus`.

---

## 9. Accessibility

- Every labeled field: `htmlFor` on label + matching `id` on control (or `FieldGroup` wrapping).
- Icon-only buttons: `aria-label`.
- Errors: `FieldErrorText` + `aria-describedby` via `fieldA11yProps`.

---

## 10. Review Gate Checklist (Summary)

Before merge, confirm:

- [ ] No placeholder-only fields
- [ ] `FieldGroup` / `EntityLookup label` on every control
- [ ] Max 3 columns on desktop create forms
- [ ] Create section has title + description
- [ ] Create before filter on list workspaces
- [ ] All enums/statuses translated in forms and tables
- [ ] Primary button full-width on mobile
- [ ] Hints on ambiguous numeric defaults
- [ ] No module-local form field wrappers

Fail any item → screen is not merge-ready.

---

## Related Documents

- [Form Guidelines](FORM_GUIDELINES.md)
- [ERP Page Modal Pattern](../../.cursor/rules/erp-page-modal-patterns.mdc)
- [Platform UX Review Gate](PLATFORM_UX_REVIEW_GATE.md)
- [Operator Experience](../01-platform/OPERATOR_EXPERIENCE.md)
