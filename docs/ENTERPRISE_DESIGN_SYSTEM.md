# Nexora ERP Enterprise Design System

## 1. Vision

Nexora is not an admin panel.

Nexora is not a CRUD dashboard.

Nexora is a premium enterprise ERP platform.

The UI should feel close to:

* Microsoft Dynamics 365
* SAP Fiori
* Linear
* Stripe Dashboard
* Notion
* Vercel Dashboard

The product must feel clean, fast, premium, and enterprise-ready.

---

## 2. Design Principles

### Premium, not crowded

Use space generously.

Avoid dense pages unless the user is inside a data-heavy table.

### Lookup-first

Never expose raw UUID fields.

Every reference must use:

* EntityLookup
* Combobox
* SearchPicker
* Recent/Favorite entities

### Consistent page patterns

Every page must follow shared patterns.

No module should invent a different UI style.

### Action clarity

Every page must clearly show:

* Primary action
* Secondary actions
* Bulk actions
* Record status
* Permissions

### Enterprise-friendly

Support:

* RTL/LTR
* Dark mode
* High contrast
* Keyboard navigation
* Responsive layouts

---

## 3. Color System

### Neutral Palette

```css
--color-background: #F8FAFC;
--color-surface: #FFFFFF;
--color-surface-muted: #F1F5F9;
--color-border: #E5E7EB;
--color-divider: #F1F5F9;

--color-text-primary: #0F172A;
--color-text-secondary: #475569;
--color-text-muted: #94A3B8;
```

### Brand Palette

```css
--color-primary-500: #2563EB;
--color-primary-600: #1D4ED8;
--color-primary-700: #1E40AF;

--color-secondary-500: #7C3AED;
--color-secondary-600: #6D28D9;
```

### Semantic Colors

```css
--color-success: #16A34A;
--color-warning: #F59E0B;
--color-danger: #DC2626;
--color-info: #0EA5E9;
```

### Sidebar

```css
--sidebar-background: #0F172A;
--sidebar-hover: #1E293B;
--sidebar-active: #2563EB;
--sidebar-text: #CBD5E1;
--sidebar-text-active: #FFFFFF;
```

### Dark Mode

```css
--dark-background: #020617;
--dark-surface: #0F172A;
--dark-card: #111827;
--dark-border: #1E293B;
--dark-text-primary: #F8FAFC;
--dark-text-secondary: #CBD5E1;
--dark-primary: #3B82F6;
```

---

## 4. Module Accent Colors

Finance:

```css
--module-finance: #2563EB;
```

Inventory:

```css
--module-inventory: #10B981;
```

Manufacturing:

```css
--module-manufacturing: #F97316;
```

Purchasing:

```css
--module-purchasing: #06B6D4;
```

Sales:

```css
--module-sales: #8B5CF6;
```

CRM:

```css
--module-crm: #EC4899;
```

HR:

```css
--module-hr: #14B8A6;
```

Payroll:

```css
--module-payroll: #0EA5E9;
```

Fleet:

```css
--module-fleet: #F59E0B;
```

Service:

```css
--module-service: #EF4444;
```

Projects:

```css
--module-projects: #6366F1;
```

Quality:

```css
--module-quality: #84CC16;
```

Rule:

90% of the interface should remain neutral.

Module colors are accents only.

Never turn every page into a different theme.

---

## 5. Gradients

Finance:

```css
linear-gradient(135deg, #2563EB, #3B82F6)
```

Inventory:

```css
linear-gradient(135deg, #059669, #10B981)
```

Manufacturing:

```css
linear-gradient(135deg, #EA580C, #F97316)
```

Automation / AI:

```css
linear-gradient(135deg, #7C3AED, #A855F7)
```

System:

```css
linear-gradient(135deg, #0F172A, #334155)
```

---

## 6. Typography

Use a modern sans font.

Preferred:

* Inter
* Geist
* system-ui fallback

Scale:

```css
--font-xs: 12px;
--font-sm: 14px;
--font-md: 16px;
--font-lg: 18px;
--font-xl: 20px;
--font-2xl: 24px;
--font-3xl: 30px;
--font-4xl: 36px;
```

Line height:

```css
--leading-tight: 1.2;
--leading-normal: 1.5;
--leading-relaxed: 1.7;
```

Usage:

* Page title: 30–36px
* Section title: 20–24px
* Card title: 16–18px
* Body: 14–16px
* Caption: 12px

---

## 7. Spacing

Use an 8px spacing system.

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

Never build cramped pages.

Enterprise UI needs breathing space.

---

## 8. Radius

```css
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 20px;
--radius-2xl: 24px;
```

Usage:

* Buttons: 10–12px
* Inputs: 10–12px
* Cards: 16px
* Dialogs: 20px
* Main containers: 24px

---

## 9. Shadows

Subtle only.

```css
--shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.05);
--shadow-md: 0 8px 24px rgba(15, 23, 42, 0.08);
--shadow-lg: 0 20px 40px rgba(15, 23, 42, 0.12);
```

No heavy black shadows.

---

## 10. Application Shell

The shell has:

* Topbar
* Sidebar
* App Launcher
* Global Search
* Command Palette
* Notifications
* Company Switcher
* Branch Switcher
* Theme Toggle
* Language Toggle
* User Menu

Topbar height:

```css
64px
```

Sidebar width:

```css
280px expanded
72px collapsed
```

Main workspace:

```css
background: #F8FAFC;
padding: 24px;
```

---

## 11. Enterprise Home Workspace

The home page must include:

* Welcome hero
* Current user
* Current company
* Current branch
* ERP progress cards
* Ready apps
* Planned apps
* Platform apps
* Recent apps
* Favorites
* Pinned apps
* Recent documents
* Recent activity
* Quick actions

No plain lists.

Everything should be card-based and visually rich.

---

## 12. App Cards

Each app card includes:

* Icon
* Gradient header
* App name
* Description
* Status badge
* Open action
* Docs action
* Favorite action
* Pin action
* Permission indicator
* Recent activity count

Status styles:

```text
Ready: green
In Development: blue
Beta: amber
Planned: gray
Disabled: slate
Not Licensed: red
```

---

## 13. KPI Cards

KPI card structure:

* Icon
* Label
* Value
* Change indicator
* Short helper text
* Optional sparkline

Example:

```text
Apps Ready
3
Finance, Inventory, Manufacturing
```

KPI cards must not look like plain boxes.

---

## 14. Page Pattern

Every list page must include:

* Page header
* Breadcrumbs
* Primary action
* Search
* Filters
* View controls
* Table
* Bulk actions
* Pagination
* Empty state
* Loading state
* Error state

No exceptions.

---

## 15. Detail Page Pattern

Every detail page must include:

* Header
* Status badge
* Primary actions
* Summary cards
* Tabs

Tabs:

* Overview
* Timeline
* Comments
* Attachments
* Relations
* Audit

No entity detail should be a plain form only.

---

## 16. Document Workspace Pattern

Every document follows the same layout:

* Document header
* Lifecycle bar
* Document metadata
* Lines table
* Totals or summary
* Timeline
* Attachments
* Comments
* Related documents
* Audit

Examples:

* Inventory Transfer
* Stock Adjustment
* Manufacturing Order
* Work Order
* Journal
* Invoice later
* Purchase Order later
* Sales Order later

---

## 17. Tables

Tables must support:

* Search
* Filters
* Sorting
* Grouping
* Column visibility
* Density switch
* Row actions
* Bulk actions
* Sticky header
* Pagination
* Empty state
* Loading skeleton
* Responsive card fallback

Never expose raw IDs.

Use human-readable labels.

---

## 18. Forms

Forms must use:

* React Hook Form
* Zod validation
* Section cards
* Inline validation
* Helpful descriptions
* Drawers for create/edit
* Full-page wizard only for complex documents

Reference fields must use EntityLookup.

Never use raw text inputs for foreign keys.

---

## 19. Drawers & Modals

Use Drawer for:

* Create/edit entity
* Side details
* Quick review
* Contextual actions

Use Dialog for:

* Confirm delete/archive
* Small focused tasks
* Warnings
* Approval confirmation

Use Sheet for:

* Mobile navigation
* Mobile filters

---

## 20. Search

Global search must cover:

* Apps
* Commands
* Products
* Reports
* Finance definitions
* Inventory records
* Manufacturing records
* Settings
* Users

Search UI should feel like Raycast / Linear.

---

## 21. Command Palette

Shortcut:

```text
Ctrl + K
```

Supports:

* Open app
* Open page
* Create record
* Search record
* Run report
* Import
* Export
* Switch company
* Switch branch

---

## 22. Empty States

No blank pages.

Every empty state includes:

* Icon
* Title
* Description
* Primary action
* Secondary action if useful

Example:

```text
No products yet

Create your first product or import from Excel.
[New Product] [Import]
```

---

## 23. Loading States

Use skeleton loading.

Avoid spinner-only pages.

Skeletons should match the final layout.

---

## 24. Error States

Error states must be clear.

Show:

* What happened
* What user can do
* Retry action
* Support/debug reference if needed

---

## 25. Accessibility

Required:

* Keyboard navigation
* Focus rings
* ARIA labels
* Screen-reader friendly buttons
* Dialog focus trap
* Escape to close overlays
* RTL support
* High contrast support

---

## 26. Responsive Design

Desktop first, but fully responsive.

Breakpoints:

```css
sm: 640px;
md: 768px;
lg: 1024px;
xl: 1280px;
2xl: 1536px;
```

Mobile behavior:

* Sidebar becomes Sheet
* Tables become cards
* Filters collapse
* Actions move to overflow menu

---

## 27. Icons

Use Lucide only.

Rules:

* App icon per app
* Action icon per action
* Status icon when useful
* No random icon packs

---

## 28. Animation

Use subtle motion only.

Duration:

```css
150ms to 250ms
```

Use for:

* Drawer open
* Dropdown open
* Card hover
* Tab switch
* Command palette

Avoid excessive animation.

---

## 29. Module UI Rules

### Finance

Accent:

```css
#2563EB
```

Feel:

Trustworthy, structured, precise.

Use:

* Tree tables
* Status badges
* Fiscal period timelines
* Account hierarchy

### Inventory

Accent:

```css
#10B981
```

Feel:

Operational, clear, fast.

Use:

* Product cards
* Stock grids
* Location hierarchy
* Movement timelines

### Manufacturing

Accent:

```css
#F97316
```

Feel:

Live operations, production floor, performance.

Use:

* DPR fast entry
* Achievement gauges
* Worker tables
* Line dashboards
* Scrap/downtime indicators

---

## 30. Visual Acceptance Gate

A page is not accepted unless:

* It looks premium
* It uses shared UI components
* It has spacing
* It has visual hierarchy
* It has empty/loading/error states
* It works in dark mode
* It supports RTL
* It is keyboard accessible
* It does not expose raw IDs
* It is permission-aware

Ask before accepting:

Would this look acceptable in a demo to an enterprise customer?

If no, redesign.

---

## 31. Implementation Rule

Before implementing any page:

1. Use shared UI components.
2. Follow the page pattern.
3. Use module accent color only as accent.
4. Use EntityLookup for references.
5. Add empty/loading/error states.
6. Add responsive behavior.
7. Add permission gates.
8. Add tests for pure logic where possible.

Do not build developer-index pages.

Do not build unstyled lists.

Do not build placeholder pages.

---

## 32. Final Rule

Nexora's architecture is already strong.

From now on, UI quality must match architecture quality.

Every screen must feel like a product, not a technical prototype.
