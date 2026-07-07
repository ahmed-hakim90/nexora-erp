import type { NavigationGroup, NavigationItem } from "@/shared/ui";

/*
 * Canonical ERP Information Architecture.
 *
 * Single source of truth for the workspace-based sidebar navigation.
 * See docs/ERP_INFORMATION_ARCHITECTURE.md.
 *
 * Rules encoded here:
 *  - Each business app is an independent workspace (Dashboard / Master Data /
 *    Operations / Transactions / Reports / Analytics / Settings).
 *  - Every page has a single responsibility.
 *  - "planned" pages/workspaces are surfaced but never link to a placeholder
 *    page; they render disabled with a "Soon" badge.
 *  - No developer-index pages are surfaced.
 */

export type ErpNavStatus = "ready" | "planned";

export type ErpNavPage = Readonly<{
  key: string;
  label: string;
  href: string;
  status: ErpNavStatus;
  requiredPermission?: string;
  responsibility?: string;
}>;

export type ErpNavSection = Readonly<{
  key: string;
  label: string;
  pages: readonly ErpNavPage[];
}>;

export type ErpWorkspace = Readonly<{
  key: string;
  label: string;
  href: string;
  iconKey: string;
  category: "business" | "administration";
  status: ErpNavStatus;
  /** Path prefixes that mean "this workspace is active". */
  pathPrefixes: readonly string[];
  sections: readonly ErpNavSection[];
}>;

const ready = (
  key: string,
  label: string,
  href: string,
  responsibility?: string,
  requiredPermission?: string,
): ErpNavPage => ({ href, key, label, requiredPermission, responsibility, status: "ready" });

const planned = (
  key: string,
  label: string,
  href: string,
  responsibility?: string,
): ErpNavPage => ({ href, key, label, responsibility, status: "planned" });

export const ERP_INFORMATION_ARCHITECTURE: readonly ErpWorkspace[] = [
  {
    key: "finance",
    label: "Finance",
    href: "/erp/finance",
    iconKey: "finance",
    category: "business",
    status: "ready",
    pathPrefixes: ["/erp/finance"],
    sections: [
      {
        key: "overview",
        label: "Overview",
        pages: [ready("finance.dashboard", "Dashboard", "/erp/finance", "Finance workspace KPIs and readiness.")],
      },
      {
        key: "master-data",
        label: "Master Data",
        pages: [
          ready("finance.coa", "Chart of Accounts", "/erp/finance/chart-of-accounts", "Account tree, CRUD, hierarchy, status."),
          ready("finance.account-types", "Account Types", "/erp/finance/account-types", "Account type definitions."),
          ready("finance.journals", "Journals", "/erp/finance/journals", "Journal definitions only."),
          ready("finance.currencies", "Currencies", "/erp/finance/currencies", "Currency definitions."),
          ready("finance.taxes", "Taxes", "/erp/finance/taxes", "Tax definitions."),
          ready("finance.payment-terms", "Payment Terms", "/erp/finance/payment-terms", "Payment term definitions."),
          ready("finance.cost-centers", "Cost Centers", "/erp/finance/cost-centers", "Cost center master."),
          ready("finance.dimensions", "Financial Dimensions", "/erp/finance/dimensions", "Dimension management."),
        ],
      },
      {
        key: "calendar",
        label: "Calendar",
        pages: [
          ready("finance.fiscal-years", "Fiscal Years", "/erp/finance/fiscal-years", "Fiscal calendar management only."),
          ready("finance.fiscal-periods", "Fiscal Periods", "/erp/finance/fiscal-periods", "Period management only."),
        ],
      },
      {
        key: "transactions",
        label: "Transactions",
        pages: [
          planned("finance.journal-entries", "Journal Entries", "/erp/finance/journal-entries", "Journal entry documents."),
          planned("finance.opening-balances", "Opening Balances", "/erp/finance/opening-balances", "Opening balance documents."),
        ],
      },
      {
        key: "reports",
        label: "Reports",
        pages: [ready("finance.reports", "Financial Reports", "/erp/finance/reports", "Finance reporting readiness contracts.")],
      },
    ],
  },
  {
    key: "inventory",
    label: "Inventory",
    href: "/erp/inventory",
    iconKey: "inventory",
    category: "business",
    status: "ready",
    pathPrefixes: ["/erp/inventory", "/erp/master-data"],
    sections: [
      {
        key: "overview",
        label: "Overview",
        pages: [ready("inventory.dashboard", "Dashboard", "/erp/inventory", "Inventory workspace KPIs.")],
      },
      {
        key: "master-data",
        label: "Master Data",
        pages: [
          ready("inventory.products", "Products", "/erp/inventory/products", "Product master data."),
          ready("inventory.categories", "Categories", "/erp/inventory/categories", "Product categories."),
          ready("inventory.brands", "Brands", "/erp/master-data/brands", "Brand master."),
          ready("inventory.uom-categories", "UOM Categories", "/erp/inventory/uom-categories", "Unit of measure categories."),
          ready("inventory.units", "Units of Measure", "/erp/inventory/uoms", "Units of measure."),
          ready("inventory.warehouses", "Warehouses", "/erp/inventory/warehouses", "Warehouse master."),
          ready("inventory.locations", "Locations", "/erp/inventory/locations", "Location hierarchy and capacity."),
          ready("inventory.handling-unit-types", "Handling Unit Types", "/erp/inventory/handling-unit-types", "Container type definitions."),
          ready("inventory.handling-units", "Handling Units", "/erp/inventory/handling-units", "Physical container traceability."),
          ready("inventory.handling-unit-contents", "HU Contents", "/erp/inventory/handling-unit-contents", "Current and historical HU contents."),
          ready("inventory.variants", "Variants", "/erp/inventory/variants", "Product variants."),
          ready("inventory.lots", "Lots", "/erp/inventory/lots", "Lot tracking."),
          ready("inventory.serials", "Serial Numbers", "/erp/inventory/serials", "Serial number tracking."),
        ],
      },
      {
        key: "operations",
        label: "Operations",
        pages: [
          ready("inventory.stock-balances", "Stock Balances", "/erp/inventory/stock-balances", "On hand / reserved / available facts."),
          ready("inventory.stock-movements", "Stock Movements", "/erp/inventory/transactions", "Movement documents."),
        ],
      },
      {
        key: "transactions",
        label: "Transactions",
        pages: [
          planned("inventory.transfers", "Transfers", "/erp/inventory/transfers", "Transfer documents only."),
          planned("inventory.adjustments", "Adjustments", "/erp/inventory/adjustments", "Adjustment documents only."),
          planned("inventory.opening-balances", "Opening Balances", "/erp/inventory/opening-balances", "Opening documents only."),
          ready("inventory.reorder-rules", "Reorder Rules", "/erp/inventory/reorder-rules", "Reorder rule management."),
        ],
      },
      {
        key: "reports",
        label: "Reports",
        pages: [ready("inventory.reports", "Inventory Reports", "/erp/reports", "Read-only reporting.")],
      },
    ],
  },
  {
    key: "manufacturing",
    label: "Manufacturing",
    href: "/erp/manufacturing",
    iconKey: "manufacturing",
    category: "business",
    status: "ready",
    pathPrefixes: ["/erp/manufacturing"],
    sections: [
      {
        key: "overview",
        label: "Overview",
        pages: [ready("manufacturing.dashboard", "Dashboard", "/erp/manufacturing", "Production KPIs, shift, achievements, scrap, downtime.")],
      },
      {
        key: "execution",
        label: "Execution",
        pages: [
          ready("manufacturing.dpr", "Daily Production Report", "/erp/manufacturing/daily-reports", "Production execution facts only."),
          ready("manufacturing.production-plans", "Production Plans", "/erp/manufacturing/production-plans", "Planning with plan lines and DPR actuals."),
          ready("manufacturing.orders", "Manufacturing Orders", "/erp/manufacturing/manufacturing-orders", "MO facts with controlled lifecycle actions."),
          ready("manufacturing.work-orders", "Work Orders", "/erp/manufacturing/work-orders", "WO facts with controlled lifecycle actions."),
        ],
      },
      {
        key: "engineering",
        label: "Engineering",
        pages: [
          ready("manufacturing.boms", "BOM", "/erp/manufacturing/boms", "Bills of material."),
          ready("manufacturing.routing", "Routing", "/erp/manufacturing/routing-plans", "Routing definitions."),
          ready("manufacturing.lines", "Production Lines", "/erp/manufacturing/production-lines", "Production line master."),
          ready("manufacturing.work-centers", "Work Centers", "/erp/manufacturing/work-centers", "Work center master."),
          ready("manufacturing.workstations", "Workstations", "/erp/manufacturing/workstations", "Workstation master."),
        ],
      },
      {
        key: "workforce",
        label: "Workforce",
        pages: [
          ready("manufacturing.workers", "Workers", "/erp/manufacturing/manufacturing-profiles", "Manufacturing worker profiles."),
          ready("manufacturing.assignments", "Line Assignments", "/erp/manufacturing/line-assignments", "Worker-to-line assignments."),
          ready("manufacturing.standards", "Production Standards", "/erp/manufacturing/production-standards", "Product-line-shift standards."),
        ],
      },
      {
        key: "analytics",
        label: "Analytics",
        pages: [
          ready("manufacturing.targets", "Targets", "/erp/manufacturing/targets", "Tabbed target & achievement management."),
          ready("manufacturing.kpis", "KPIs", "/erp/manufacturing/reports", "Production / worker / line / product KPI facts."),
        ],
      },
      {
        key: "reports",
        label: "Reports",
        pages: [ready("manufacturing.reports", "Reports", "/erp/manufacturing/reports", "Read-only production reports and KPI facts.")],
      },
    ],
  },
  plannedWorkspace("purchasing", "Purchasing", "shopping-cart", [
    ready("purchasing.dashboard", "Dashboard", "/erp/purchasing", "Purchasing workspace overview."),
    planned("purchasing.suppliers", "Suppliers", "/erp/purchasing/suppliers"),
    planned("purchasing.rfqs", "RFQs", "/erp/purchasing/rfqs"),
    planned("purchasing.orders", "Purchase Orders", "/erp/purchasing/orders"),
    planned("purchasing.receipts", "Receipts", "/erp/purchasing/receipts"),
    planned("purchasing.vendor-bills", "Vendor Bills", "/erp/purchasing/vendor-bills"),
    planned("purchasing.reports", "Reports", "/erp/purchasing/reports"),
  ]),
  plannedWorkspace("sales", "Sales", "sales", [
    planned("sales.dashboard", "Dashboard", "/erp/sales"),
    planned("sales.customers", "Customers", "/erp/sales/customers"),
    planned("sales.quotations", "Quotations", "/erp/sales/quotations"),
    planned("sales.orders", "Orders", "/erp/sales/orders"),
    planned("sales.deliveries", "Deliveries", "/erp/sales/deliveries"),
    planned("sales.returns", "Returns", "/erp/sales/returns"),
    planned("sales.reports", "Reports", "/erp/sales/reports"),
  ]),
  {
    key: "hr",
    label: "HR",
    href: "/erp/hr",
    iconKey: "hr",
    category: "business",
    status: "ready",
    pathPrefixes: ["/erp/hr"],
    sections: [
      {
        key: "overview",
        label: "Overview",
        pages: [
          ready("hr.dashboard", "HR Dashboard", "/erp/hr", "HR workspace KPIs and quick actions.", "hr.view"),
          ready("hr.dashboard-executive", "Executive Dashboard", "/erp/hr/dashboards/executive", "Executive HR KPIs.", "hr.view"),
          ready("hr.dashboard-department", "Department Dashboard", "/erp/hr/dashboards/department", "Department workforce metrics.", "hr.view"),
        ],
      },
      {
        key: "people",
        label: "People",
        pages: [
          ready("hr.employees", "Employees", "/erp/hr/employees", "Employee directory and profiles.", "hr.employees.view"),
          ready("hr.assignments", "Assignments", "/erp/hr/assignments", "Assignment timeline and changes.", "hr.assignments.view"),
          ready("hr.contracts", "Contracts", "/erp/hr/contracts", "Legal contracts and lifecycle.", "hr.contracts.view"),
        ],
      },
      {
        key: "organization",
        label: "Organization",
        pages: [
          ready("hr.org", "Organization", "/erp/hr/organization", "Organization structure and chart.", "hr.positions.view"),
          ready("hr.positions-jobs", "Positions & Jobs", "/erp/hr/positions-jobs", "Jobs, positions, and career paths.", "hr.jobs.view"),
          ready("hr.skills", "Skills & Competencies", "/erp/hr/skills-competencies/skills", "Skills matrix and competency catalog.", "hr.skills.view"),
        ],
      },
      {
        key: "time",
        label: "Time & Attendance",
        pages: [
          ready("hr.attendance-leave", "Attendance & Leave", "/erp/hr/attendance-leave", "Leave and attendance foundation.", "hr.leave.view"),
          ready("hr.attendance-devices", "Attendance Devices", "/erp/hr/attendance-devices", "Device registry and sync.", "hr.leave.view"),
          ready("hr.attendance-processing", "Attendance Processing", "/erp/hr/attendance-processing", "Attendance processing workflows.", "hr.attendance.view"),
          ready("hr.attendance-export", "Attendance Export", "/erp/hr/attendance-export", "Payroll attendance input export and snapshots.", "hr.attendance.export"),
          ready("hr.overtime", "Overtime", "/erp/hr/overtime", "Overtime requests and approvals.", "hr.overtime.view"),
          ready("hr.overtime-reports", "Overtime Reports", "/erp/hr/overtime/reports", "Overtime register and approval history.", "hr.overtime.export"),
          ready("hr.late-early", "Late / Early", "/erp/hr/late-early", "Late arrival and early leave violations.", "hr.late.view"),
          ready("hr.late-early-reports", "Late/Early Reports", "/erp/hr/late-early/reports", "Late and early leave reports.", "hr.late.export"),
          ready("hr.time-policies", "Time Policies", "/erp/hr/time-policies", "Late, early, and time rules.", "hr.manage"),
        ],
      },
      {
        key: "compensation",
        label: "Compensation & Payroll",
        pages: [
          ready("hr.compensation", "Compensation", "/erp/hr/compensation", "Compensation setup and profiles.", "hr.compensation.view"),
          ready("hr.payroll-readiness", "Payroll Readiness", "/erp/hr/payroll-readiness", "Payroll readiness and validation.", "hr.payroll.view"),
          ready("hr.advances", "Advances", "/erp/hr/advances", "Employee salary advances.", "hr.compensation.view"),
          ready("hr.loans", "Loans", "/erp/hr/loans", "Employee loans.", "hr.compensation.view"),
          ready("hr.bonuses", "Bonuses", "/erp/hr/bonuses", "Bonus records.", "hr.compensation.view"),
          ready("hr.incentives", "Incentives", "/erp/hr/incentives", "Incentive records.", "hr.compensation.view"),
          ready("hr.penalties", "Penalties", "/erp/hr/penalties", "Penalty records.", "hr.employees.view"),
          ready("hr.bank-accounts", "Bank Accounts", "/erp/hr/bank-accounts", "Employee bank accounts.", "hr.compensation.view"),
        ],
      },
      {
        key: "talent",
        label: "Talent",
        pages: [
          ready("hr.recruitment", "Recruitment", "/erp/hr/recruitment", "Hiring pipeline.", "hr.employees.view"),
          ready("hr.onboarding", "Onboarding", "/erp/hr/onboarding", "Onboarding programs.", "hr.employees.view"),
          ready("hr.training", "Training", "/erp/hr/training", "Training programs.", "hr.employees.view"),
          ready("hr.performance", "Performance", "/erp/hr/performance", "Performance cycles.", "hr.employees.view"),
          ready("hr.succession", "Succession", "/erp/hr/succession", "Succession planning.", "hr.employees.view"),
        ],
      },
      {
        key: "operations",
        label: "Operations",
        pages: [
          ready("hr.requests", "Requests", "/erp/hr/requests", "HR requests hub.", "hr.actions.view"),
          ready("hr.documents", "Documents", "/erp/hr/documents", "Employee document center.", "hr.employees.view"),
          ready("hr.custody", "Custody / Assets", "/erp/hr/custody", "Employee custody tracking.", "hr.employees.view"),
        ],
      },
      {
        key: "supporting",
        label: "Supporting",
        pages: [
          ready("hr.reports", "Reports", "/erp/hr/reports", "HR reports.", "hr.reports.view"),
          ready("hr.settings", "Settings", "/erp/hr/settings", "HR settings.", "hr.manage"),
        ],
      },
    ],
  },
  plannedWorkspace("fleet", "Fleet", "fleet", [
    planned("fleet.dashboard", "Dashboard", "/erp/fleet"),
    planned("fleet.vehicles", "Vehicles", "/erp/fleet/vehicles"),
    planned("fleet.drivers", "Drivers", "/erp/fleet/drivers"),
    planned("fleet.trips", "Trips", "/erp/fleet/trips"),
    planned("fleet.fuel", "Fuel", "/erp/fleet/fuel"),
    planned("fleet.maintenance", "Maintenance", "/erp/fleet/maintenance"),
    planned("fleet.reports", "Reports", "/erp/fleet/reports"),
  ]),
  plannedWorkspace("service", "Service", "service", [
    planned("service.dashboard", "Dashboard", "/erp/service"),
    planned("service.centers", "Service Centers", "/erp/service/centers"),
    planned("service.tickets", "Tickets", "/erp/service/tickets"),
    planned("service.warranty", "Warranty", "/erp/service/warranty"),
    planned("service.repairs", "Repairs", "/erp/service/repairs"),
    planned("service.spare-parts", "Spare Parts", "/erp/service/spare-parts"),
    planned("service.reports", "Reports", "/erp/service/reports"),
  ]),
  {
    key: "administration",
    label: "Platform",
    href: "/erp/settings",
    iconKey: "administration",
    category: "administration",
    status: "ready",
    pathPrefixes: ["/erp/settings", "/erp/feature-flags", "/erp/notifications", "/erp/dashboard", "/erp/reports", "/erp/admin"],
    sections: [
      {
        key: "platform-control-plane",
        label: "Platform Control Plane",
        pages: [
          ready("platform.dashboard", "Dashboard", "/erp/dashboard", "Cross-app dashboard contribution catalog."),
          ready("platform.reports", "Reports", "/erp/reports", "Cross-app report and print contribution catalog."),
          ready("platform.settings", "Settings", "/erp/settings", "Tenant, company, branch, app, and user settings."),
          ready("platform.feature-flags", "Feature Flags", "/erp/feature-flags", "Staged rollout controls and capability gates."),
          ready("platform.notifications", "Notifications", "/erp/notifications", "Notification hooks, templates, preferences, and inbox readiness."),
        ],
      },
      {
        key: "administration",
        label: "Administration",
        pages: [
          ready("admin.users", "Users", "/erp/admin/users", "Operational user management.", "platform.user.read"),
          ready("admin.roles", "Roles", "/erp/admin/roles", "Role and template management.", "platform.role.manage"),
          ready("admin.permissions", "Permissions", "/erp/admin/permissions", "Permission matrix.", "platform.permission.read"),
          ready("admin.invitations", "Invitations", "/erp/admin/invitations", "User invitations.", "platform.user.manage"),
          ready("admin.access", "Access", "/erp/admin/access", "Company, branch, app, and data-scope access.", "platform.membership.manage"),
          planned("admin.companies", "Companies", "/erp/admin/companies"),
          planned("admin.branches", "Branches", "/erp/admin/branches"),
          planned("admin.audit", "Audit", "/erp/admin/audit"),
          planned("admin.localization", "Localization", "/erp/admin/localization"),
        ],
      },
    ],
  },
];

function plannedWorkspace(
  key: string,
  label: string,
  iconKey: string,
  pages: readonly ErpNavPage[],
): ErpWorkspace {
  return {
    category: "business",
    href: `/erp/${key}`,
    iconKey,
    key,
    label,
    pathPrefixes: [`/erp/${key}`],
    sections: [{ key: "pages", label, pages }],
    status: "planned",
  };
}

export type BuildErpSidebarOptions = Readonly<{
  permissions?: ReadonlySet<string> | readonly string[];
}>;

function isActiveHref(activePath: string, href: string): boolean {
  return activePath === href || activePath.startsWith(`${href}/`);
}

function pageToItem(activePath: string, page: ErpNavPage): NavigationItem {
  const isPlanned = page.status === "planned";

  return {
    badge: isPlanned ? "Soon" : undefined,
    href: isPlanned ? undefined : page.href,
    isActive: !isPlanned && isActiveHref(activePath, page.href),
    isDisabled: isPlanned,
    key: page.key,
    label: page.label,
  };
}

/**
 * Build the workspace-based accordion sidebar for the ERP experience.
 *
 * @param activePath current route path (e.g. "/erp/finance/journals")
 * @param options optional permission set for permission-aware page visibility
 */
export function buildErpSidebarGroups(
  activePath: string,
  options: BuildErpSidebarOptions = {},
): readonly NavigationGroup[] {
  const granted = options.permissions
    ? options.permissions instanceof Set
      ? options.permissions
      : new Set(options.permissions)
    : null;

  return ERP_INFORMATION_ARCHITECTURE.map((workspace) => {
    const sections = workspace.sections
      .map((section) => ({
        items: section.pages
          .filter((page) => !granted || !page.requiredPermission || granted.has(page.requiredPermission))
          .map((page) => pageToItem(activePath, page)),
        key: section.key,
        label: section.label,
      }))
      .filter((section) => section.items.length > 0);

    const items = sections.flatMap((section) => section.items);
    const isActive = workspace.pathPrefixes.some((prefix) => isActiveHref(activePath, prefix));

    return {
      category: workspace.category === "administration" ? "Administration" : "Business Applications",
      href: workspace.href,
      iconKey: workspace.iconKey,
      isActive,
      items,
      key: workspace.key,
      label: workspace.label,
      sections,
      status: workspace.status,
    } satisfies NavigationGroup;
  });
}
