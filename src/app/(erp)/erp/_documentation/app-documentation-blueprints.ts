import {
  createDocumentationBlueprint,
  REQUIRED_BUSINESS_APP_DOCUMENTATION_SECTIONS,
  type DocumentationBlock,
  type DocumentationSectionKey,
} from "@/platform/documentation/public-api";

type SectionBlocks = Partial<Record<DocumentationSectionKey, readonly DocumentationBlock[]>>;

function buildReadySections(blocks: SectionBlocks) {
  return REQUIRED_BUSINESS_APP_DOCUMENTATION_SECTIONS.map((section) => ({
    ...section,
    blocks: blocks[section.key] ?? [],
    status: "ready" as const,
  }));
}

const financeBlocks: SectionBlocks = {
  overview: [
    {
      text: "Finance keeps the company's financial structure organized. It holds the accounts, fiscal years, periods, journals, currencies, taxes, payment terms, cost centers, and dimensions used by other apps.",
      type: "paragraph",
    },
    {
      items: [
        "Use Finance before recording accounting-ready business activity.",
        "Finance solves the problem of inconsistent account setup, missing periods, and unclear reporting dimensions.",
        "Finance should be used by finance managers, accountants, controllers, and administrators who prepare company financial rules.",
        "Main concepts are accounts, journals, fiscal periods, currencies, taxes, cost centers, and dimensions.",
      ],
      type: "list",
    },
  ],
  "before-you-start": [
    {
      text: "Before using Finance, decide how your company tracks money, reporting periods, tax, and cost responsibility. A basic setup usually takes 30 to 60 minutes for a small company and longer if the chart of accounts needs review.",
      type: "paragraph",
    },
    {
      items: [
        "Account Types",
        "Chart of Accounts",
        "Fiscal Years",
        "Fiscal Periods",
        "Journals",
        "Currencies",
        "Taxes",
        "Cost Centers and Dimensions",
      ],
      title: "Create or review these first",
      type: "list",
    },
  ],
  "recommended-setup-order": [
    {
      steps: [
        { href: "/erp/finance/account-types", label: "Account Types" },
        { href: "/erp/finance/chart-of-accounts", label: "Chart of Accounts" },
        { href: "/erp/finance/fiscal-years", label: "Fiscal Years" },
        { href: "/erp/finance/fiscal-periods", label: "Periods" },
        { href: "/erp/finance/currencies", label: "Currencies" },
        { href: "/erp/finance/journals", label: "Journals" },
        { href: "/erp/finance/taxes", label: "Taxes" },
        { href: "/erp/finance/dimensions", label: "Dimensions" },
        { label: "Finance Ready" },
      ],
      title: "Recommended setup path",
      type: "flow",
    },
  ],
  "first-time-setup-guide": [
    {
      cards: [
        {
          description: "Create account types first because every account needs a type such as asset, liability, revenue, or expense.",
          href: "/erp/finance/account-types",
          status: "required",
          title: "Account Types",
        },
        {
          description: "Create the accounts your company uses for cash, sales, expenses, inventory, tax, and retained earnings.",
          href: "/erp/finance/chart-of-accounts",
          status: "required",
          title: "Chart of Accounts",
        },
        {
          description: "Create fiscal years and periods so future documents know which financial window they belong to.",
          href: "/erp/finance/fiscal-years",
          status: "required",
          title: "Fiscal Calendar",
        },
        {
          description: "Create journals for business areas such as general entries, sales, purchases, cash, bank, inventory, and adjustments.",
          href: "/erp/finance/journals",
          status: "required",
          title: "Journals",
        },
        {
          description: "Create currencies and taxes so documents can use consistent money and tax rules.",
          href: "/erp/finance/currencies",
          status: "required",
          title: "Currencies and Taxes",
        },
        {
          description: "Create cost centers and dimensions when you want reports by branch, department, product, warehouse, employee, or project.",
          href: "/erp/finance/dimensions",
          status: "optional",
          title: "Cost Centers and Dimensions",
        },
      ],
      type: "cards",
    },
  ],
  "required-master-data": [
    {
      cards: [
        { description: "Required before accounts can be grouped correctly.", href: "/erp/finance/account-types", metric: "0 created", status: "needs-attention", title: "Account Types" },
        { description: "Required for financial classification and reporting.", href: "/erp/finance/chart-of-accounts", metric: "0 created", status: "needs-attention", title: "Chart of Accounts" },
        { description: "Required before periods can be opened.", href: "/erp/finance/fiscal-years", metric: "0 created", status: "needs-attention", title: "Fiscal Years" },
        { description: "Required for date-based financial control.", href: "/erp/finance/fiscal-periods", metric: "0 created", status: "needs-attention", title: "Fiscal Periods" },
        { description: "Required when documents or reports use money values.", href: "/erp/finance/currencies", metric: "0 created", status: "needs-attention", title: "Currencies" },
        { description: "Optional until tax calculation is needed.", href: "/erp/finance/taxes", metric: "0 created", status: "optional", title: "Taxes" },
      ],
      type: "cards",
    },
  ],
  "business-workflow": [
    {
      steps: [
        { description: "Define the basic account classes.", href: "/erp/finance/account-types", label: "Account Types" },
        { description: "Build the account list used by the company.", href: "/erp/finance/chart-of-accounts", label: "Chart of Accounts" },
        { description: "Create the year and month structure.", href: "/erp/finance/fiscal-years", label: "Fiscal Years and Periods" },
        { description: "Define where entries will be grouped later.", href: "/erp/finance/journals", label: "Journals" },
        { description: "Add currencies and tax rules.", href: "/erp/finance/currencies", label: "Currencies and Taxes" },
        { description: "Add dimensions for reporting by business area.", href: "/erp/finance/dimensions", label: "Dimensions" },
        { description: "Use finance readiness reports to review missing setup.", label: "Reports" },
      ],
      title: "Finance workflow",
      type: "flow",
    },
  ],
  "sample-data": [
    {
      text: "Sample Finance data should create a small chart of accounts, one fiscal year, monthly periods, core journals, one base currency, and simple tax examples for learning.",
      type: "paragraph",
    },
    {
      actions: [
        { isEnabled: false, key: "finance-demo", label: "Generate Finance demo data", reason: "Needs a safe server action before it can write records." },
      ],
      type: "actions",
    },
  ],
  "common-mistakes": [
    {
      cards: [
        { description: "Fix by creating account types before adding accounts.", status: "needs-attention", title: "Creating accounts without account types" },
        { description: "Fix by creating periods for the dates your company will use.", status: "needs-attention", title: "Missing fiscal periods" },
        { description: "Fix by creating at least one base currency before money values are used.", status: "needs-attention", title: "No base currency" },
        { description: "Fix by assigning dimensions only when they support real reporting needs.", status: "optional", title: "Too many dimensions too early" },
      ],
      type: "cards",
    },
  ],
  faq: [
    {
      items: [
        { question: "Do I need all accounts before starting?", answer: "No. Start with the accounts required for daily operations, then add more as reports become clearer." },
        { question: "What is a journal?", answer: "A journal groups future financial entries by business area, such as bank, sales, purchase, or adjustment." },
        { question: "Can I change account categories later?", answer: "You can update setup while records are still in foundation mode. Once real postings exist later, changes should be controlled." },
      ],
      type: "qa",
    },
  ],
  "best-practices": [
    {
      items: [
        "Keep account names short and clear.",
        "Use a consistent account code pattern.",
        "Create fiscal periods before teams start entering dated documents.",
        "Only require dimensions that someone will actually use in reports.",
      ],
      type: "list",
    },
  ],
  dependencies: [
    {
      items: [
        "Platform is required for security, company context, audit, reporting, and app navigation.",
        "Inventory can use Finance readiness later for stock and cost posting checks.",
        "Manufacturing can use Finance readiness later for production cost checks.",
      ],
      type: "list",
    },
  ],
  "health-check": [
    {
      items: [
        { detail: "Create at least one account type.", href: "/erp/finance/account-types", label: "No account types", status: "needs-attention" },
        { detail: "Create accounts for cash, revenue, expense, and control accounts.", href: "/erp/finance/chart-of-accounts", label: "No chart of accounts", status: "needs-attention" },
        { detail: "Create a fiscal year and periods.", href: "/erp/finance/fiscal-years", label: "Missing fiscal calendar", status: "needs-attention" },
        { detail: "Create at least one currency.", href: "/erp/finance/currencies", label: "No currency", status: "needs-attention" },
      ],
      type: "checklist",
    },
  ],
  "quick-actions": [
    {
      actions: [
        { href: "/erp/finance/account-types", isEnabled: true, key: "create-account-type", label: "Create Account Type" },
        { href: "/erp/finance/chart-of-accounts", isEnabled: true, key: "create-account", label: "Create Account" },
        { href: "/erp/finance/fiscal-years", isEnabled: true, key: "create-fiscal-year", label: "Create Fiscal Year" },
        { href: "/erp/finance/journals", isEnabled: true, key: "create-journal", label: "Create Journal" },
      ],
      type: "actions",
    },
  ],
  "interactive-walkthrough": [
    {
      steps: [
        { label: "Open Finance Dashboard", description: "Review total definitions and setup cards." },
        { label: "Open Chart of Accounts", description: "See where accounts are created and maintained." },
        { label: "Open Fiscal Periods", description: "Learn where financial dates are organized." },
        { label: "Open Journals", description: "Learn how future entries will be grouped." },
        { label: "Open Reports", description: "Review readiness once reporting pages are available." },
      ],
      type: "flow",
    },
  ],
};

const inventoryBlocks: SectionBlocks = {
  overview: [
    {
      text: "Inventory manages products, product variants, warehouses, locations, stock quantities, transfers, adjustments, receipts, issues, reservations, and stock visibility.",
      type: "paragraph",
    },
    {
      items: [
        "Use Inventory when the business needs to know what stock exists and where it is.",
        "Inventory solves stock confusion, missing warehouse ownership, and unclear availability.",
        "Warehouse teams, operations managers, purchasing teams, sales teams, and administrators should use it.",
        "Main concepts are products, UOM, warehouses, locations, stock movements, balances, transfers, and adjustments.",
      ],
      type: "list",
    },
  ],
  "before-you-start": [
    {
      text: "Before using Inventory, prepare the basic product and warehouse structure. A simple setup usually takes 45 to 90 minutes if products are known.",
      type: "paragraph",
    },
    {
      items: ["Product Categories", "Units of Measure", "Products", "Warehouses", "Storage Locations", "Opening Balances"],
      title: "Create these before daily stock work",
      type: "list",
    },
  ],
  "recommended-setup-order": [
    {
      steps: [
        { label: "Categories" },
        { label: "UOM" },
        { href: "/erp/inventory/products", label: "Products" },
        { label: "Warehouses" },
        { label: "Locations" },
        { href: "/erp/inventory/transactions", label: "Opening Balances" },
        { href: "/erp/inventory/stock-balances", label: "Stock Ready" },
      ],
      title: "Inventory setup path",
      type: "flow",
    },
  ],
  "first-time-setup-guide": [
    {
      cards: [
        { description: "Create categories to group products in a way people understand.", status: "required", title: "Categories" },
        { description: "Create units such as piece, box, kilogram, meter, or hour so quantities are clear.", status: "required", title: "Units of Measure" },
        { description: "Create products with SKU, name, category, base UOM, and tracking method.", href: "/erp/inventory/products", status: "required", title: "Products" },
        { description: "Create warehouses to represent buildings, branches, returns areas, or virtual stock areas.", status: "required", title: "Warehouses" },
        { description: "Create locations inside warehouses such as shelves, bins, receiving, quarantine, or staging.", status: "required", title: "Locations" },
        { description: "Enter opening balances when the company already has stock before using Nexora.", href: "/erp/inventory/transactions", status: "required", title: "Opening Balances" },
      ],
      type: "cards",
    },
  ],
  "required-master-data": [
    {
      cards: [
        { description: "Needed for product grouping.", metric: "0 created", status: "needs-attention", title: "Categories" },
        { description: "Needed before quantities are meaningful.", metric: "0 created", status: "needs-attention", title: "UOM" },
        { description: "Needed before any stock movement can be useful.", href: "/erp/inventory/products", metric: "0 created", status: "needs-attention", title: "Products" },
        { description: "Needed before stock can be stored.", metric: "0 created", status: "needs-attention", title: "Warehouses" },
        { description: "Needed to know the exact place of stock.", metric: "0 created", status: "needs-attention", title: "Locations" },
        { description: "Optional unless the business tracks batches or serial numbers.", metric: "0 created", status: "optional", title: "Lots and Serial Numbers" },
      ],
      type: "cards",
    },
  ],
  "business-workflow": [
    {
      steps: [
        { href: "/erp/inventory/products", label: "Create Product", description: "Define the item the business buys, stores, sells, or consumes." },
        { href: "/erp/inventory/transactions", label: "Opening Balance", description: "Enter the starting quantity when stock already exists." },
        { href: "/erp/inventory/goods-receipt/new", label: "Receive Stock", description: "Increase stock when goods arrive." },
        { href: "/erp/inventory/warehouse-transfer/new", label: "Transfer", description: "Move stock between warehouses or locations." },
        { href: "/erp/inventory/goods-issue/new", label: "Issue", description: "Reduce stock when items are consumed, sold, or sent out." },
        { href: "/erp/inventory/stock-adjustment/new", label: "Adjustment", description: "Correct stock after count differences or damage." },
        { href: "/erp/inventory/stock-balances", label: "Stock Balance", description: "Review what is available." },
        { href: "/erp/inventory/stock-ledger", label: "Reports", description: "Review stock history and movement details." },
      ],
      type: "flow",
    },
  ],
  "sample-data": [
    {
      text: "Inventory demo data should create 10 products, 2 warehouses, 5 categories, example locations, and 20 stock movements for learning.",
      type: "paragraph",
    },
    {
      actions: [
        { isEnabled: false, key: "inventory-demo", label: "Generate Inventory demo data", reason: "Needs a safe server action before it can write records." },
      ],
      type: "actions",
    },
  ],
  "common-mistakes": [
    {
      cards: [
        { description: "Fix by entering opening balances before trusting availability.", status: "needs-attention", title: "Opening balance missing" },
        { description: "Fix by creating at least one warehouse before stock movements.", status: "needs-attention", title: "No warehouse" },
        { description: "Fix by assigning a base unit of measure to every product.", status: "needs-attention", title: "Product has no UOM" },
        { description: "Fix by reviewing transactions before allowing negative stock.", status: "needs-attention", title: "Negative stock" },
      ],
      type: "cards",
    },
  ],
  faq: [
    {
      items: [
        { question: "How do I create a product?", answer: "Open Products, add the SKU, name, base UOM, category, and tracking method." },
        { question: "How do I transfer stock?", answer: "Use Warehouse Transfer when stock moves from one warehouse or location to another." },
        { question: "How do I fix wrong stock?", answer: "Use a stock adjustment after confirming the physical count and the reason for the difference." },
      ],
      type: "qa",
    },
  ],
  "best-practices": [
    {
      items: [
        "Use clear SKU rules that warehouse users can read.",
        "Keep warehouse and location names close to the physical layout.",
        "Enter opening balances before daily receiving and issuing starts.",
        "Use adjustments only after confirming the physical reason.",
      ],
      type: "list",
    },
  ],
  dependencies: [
    {
      items: [
        "Platform is required for security, company context, audit, imports, reports, and navigation.",
        "Finance is used later for posting-readiness checks, but Inventory remains the stock quantity owner.",
        "Manufacturing uses Inventory products and movements when production consumes or creates stock.",
      ],
      type: "list",
    },
  ],
  "health-check": [
    {
      items: [
        { detail: "Create or import products.", href: "/erp/inventory/products", label: "No products", status: "needs-attention" },
        { detail: "Create at least one warehouse.", label: "No warehouses", status: "needs-attention" },
        { detail: "Create storage locations inside each warehouse.", label: "No locations", status: "needs-attention" },
        { detail: "Review products that do not have categories.", href: "/erp/inventory/products", label: "Products without category", status: "needs-attention" },
        { detail: "Review products that do not have UOM.", href: "/erp/inventory/products", label: "Products without UOM", status: "needs-attention" },
      ],
      type: "checklist",
    },
  ],
  "quick-actions": [
    {
      actions: [
        { href: "/erp/inventory/products", isEnabled: true, key: "create-product", label: "Create Product" },
        { isEnabled: false, key: "create-category", label: "Create Category", reason: "Category route is not exposed yet." },
        { isEnabled: false, key: "create-uom", label: "Create UOM", reason: "UOM route is not exposed yet." },
        { isEnabled: false, key: "create-warehouse", label: "Create Warehouse", reason: "Warehouse route is not exposed yet." },
      ],
      type: "actions",
    },
  ],
  "interactive-walkthrough": [
    {
      steps: [
        { label: "Open Inventory Dashboard", description: "Review current stock foundation metrics." },
        { label: "Open Products", description: "Learn where product records are created." },
        { label: "Open Transactions", description: "Learn where stock documents are reviewed." },
        { label: "Open Stock Balances", description: "Learn where available quantities are checked." },
        { label: "Open Stock Ledger", description: "Learn where movement history is reviewed." },
      ],
      type: "flow",
    },
  ],
};

const manufacturingBlocks: SectionBlocks = {
  overview: [
    {
      text: "Manufacturing manages the structure and daily control of production. It connects production lines, work centers, machines, operations, BOMs, routing, production plans, work orders, daily production reports, finished goods, and reports.",
      type: "paragraph",
    },
    {
      items: [
        "Use Manufacturing when the business makes products from materials or tracks factory output.",
        "Manufacturing solves unclear production structure, missing routing, incomplete daily reports, and weak production visibility.",
        "Production managers, line supervisors, planners, factory administrators, and operations leaders should use it.",
        "Main concepts are lines, work centers, machines, operations, BOM, routing, plans, orders, work orders, DPR, and finished goods.",
      ],
      type: "list",
    },
  ],
  "before-you-start": [
    {
      text: "Before using Manufacturing, prepare the factory structure and the products that can be produced. A basic setup usually takes 1 to 2 hours for one line and longer for many products or routings.",
      type: "paragraph",
    },
    {
      items: ["Inventory Products", "Production Lines", "Work Centers", "Machines", "Operations", "BOM", "Routing", "Production Targets"],
      title: "Create these before production tracking",
      type: "list",
    },
  ],
  "recommended-setup-order": [
    {
      steps: [
        { href: "/erp/manufacturing/production-lines", label: "Production Lines" },
        { href: "/erp/manufacturing/work-centers", label: "Work Centers" },
        { href: "/erp/manufacturing/machines", label: "Machines" },
        { href: "/erp/manufacturing/operations", label: "Operations" },
        { href: "/erp/manufacturing/boms", label: "BOM" },
        { href: "/erp/manufacturing/routing-plans", label: "Routing" },
        { href: "/erp/manufacturing/targets", label: "Production Plan" },
        { label: "Manufacturing Order" },
        { label: "Work Order" },
        { href: "/erp/manufacturing/daily-reports", label: "Daily Production Report" },
        { label: "Finished Goods" },
        { href: "/erp/manufacturing/reports", label: "Reports" },
      ],
      title: "Manufacturing setup path",
      type: "flow",
    },
  ],
  "first-time-setup-guide": [
    {
      cards: [
        { description: "A production line is the factory area where products are made.", href: "/erp/manufacturing/production-lines", status: "required", title: "Production Lines" },
        { description: "A work center is a capacity area that groups people, machines, or stations.", href: "/erp/manufacturing/work-centers", status: "required", title: "Work Centers" },
        { description: "Machines are equipment used by work centers or workstations.", href: "/erp/manufacturing/machines", status: "optional", title: "Machines" },
        { description: "Operations are the steps performed to make a product.", href: "/erp/manufacturing/operations", status: "required", title: "Operations" },
        { description: "A BOM lists the materials needed to make one product.", href: "/erp/manufacturing/boms", status: "required", title: "BOM" },
        { description: "Routing defines the order of operations and where work happens.", href: "/erp/manufacturing/routing-plans", status: "required", title: "Routing" },
      ],
      type: "cards",
    },
  ],
  "required-master-data": [
    {
      cards: [
        { description: "Needed before production can be organized by factory area.", href: "/erp/manufacturing/production-lines", metric: "0 created", status: "needs-attention", title: "Production Lines" },
        { description: "Needed before capacity and routing can be understood.", href: "/erp/manufacturing/work-centers", metric: "0 created", status: "needs-attention", title: "Work Centers" },
        { description: "Needed before routes can describe what work is done.", href: "/erp/manufacturing/operations", metric: "0 created", status: "needs-attention", title: "Operations" },
        { description: "Needed before material requirements are clear.", href: "/erp/manufacturing/boms", metric: "0 created", status: "needs-attention", title: "BOM" },
        { description: "Needed before planned work can follow a process.", href: "/erp/manufacturing/routing-plans", metric: "0 created", status: "needs-attention", title: "Routing" },
        { description: "Optional unless machine-level tracking is required.", href: "/erp/manufacturing/machines", metric: "0 created", status: "optional", title: "Machines" },
      ],
      type: "cards",
    },
  ],
  "business-workflow": [
    {
      steps: [
        { href: "/erp/manufacturing/production-lines", label: "Production Lines", description: "Create the factory lines where products are made." },
        { href: "/erp/manufacturing/work-centers", label: "Work Centers", description: "Create the areas that provide capacity." },
        { href: "/erp/manufacturing/machines", label: "Machines", description: "Add equipment when production depends on it." },
        { href: "/erp/manufacturing/operations", label: "Operations", description: "Define the work steps." },
        { href: "/erp/manufacturing/boms", label: "BOM", description: "Define required materials." },
        { href: "/erp/manufacturing/routing-plans", label: "Routing", description: "Define the order and location of work." },
        { href: "/erp/manufacturing/targets", label: "Production Plan", description: "Set what the factory expects to produce." },
        { label: "Manufacturing Order", description: "Plan a production run for a product." },
        { label: "Work Order", description: "Assign work to a line, center, or station." },
        { href: "/erp/manufacturing/daily-reports", label: "Daily Production Report", description: "Record what happened today." },
        { label: "Finished Goods", description: "Confirm completed output for stock." },
        { href: "/erp/manufacturing/reports", label: "Reports", description: "Review output, targets, and production health." },
      ],
      type: "flow",
    },
  ],
  "sample-data": [
    {
      text: "Manufacturing demo data should create 2 production lines, 3 work centers, 4 machines, 8 operations, sample BOMs, routing plans, targets, and daily production reports.",
      type: "paragraph",
    },
    {
      actions: [
        { isEnabled: false, key: "manufacturing-demo", label: "Generate Manufacturing demo data", reason: "Needs a safe server action before it can write records." },
      ],
      type: "actions",
    },
  ],
  "common-mistakes": [
    {
      cards: [
        { description: "Fix by creating production lines before targets or daily reports.", status: "needs-attention", title: "Missing production line" },
        { description: "Fix by assigning work centers before planning capacity.", status: "needs-attention", title: "No work center" },
        { description: "Fix by creating BOMs before planning material needs.", status: "needs-attention", title: "Plan without BOM" },
        { description: "Fix by creating routing before using operation-based work.", status: "needs-attention", title: "Product without routing" },
      ],
      type: "cards",
    },
  ],
  faq: [
    {
      items: [
        { question: "What is a production line?", answer: "A production line is the place or flow where a product is made." },
        { question: "What is a work center?", answer: "A work center is a capacity area such as a machine group, labor area, or production department." },
        { question: "What is the difference between BOM and routing?", answer: "BOM says what materials are needed. Routing says what steps are followed to make the product." },
      ],
      type: "qa",
    },
  ],
  "best-practices": [
    {
      items: [
        "Start with one line and one product before modeling the full factory.",
        "Keep operation names simple enough for supervisors to recognize.",
        "Create BOM and routing together so material and process are aligned.",
        "Use daily production reports consistently, even when output is small.",
      ],
      type: "list",
    },
  ],
  dependencies: [
    {
      items: [
        "Inventory is required because produced goods and consumed materials belong to stock.",
        "Finance is optional now and used later for production cost readiness.",
        "Quality is optional later for inspections, nonconformance, and traceability.",
        "Payroll can be connected later when labor costing is introduced.",
      ],
      type: "list",
    },
  ],
  "health-check": [
    {
      items: [
        { detail: "Create at least one production line.", href: "/erp/manufacturing/production-lines", label: "No production lines", status: "needs-attention" },
        { detail: "Create at least one work center.", href: "/erp/manufacturing/work-centers", label: "No work centers", status: "needs-attention" },
        { detail: "Create operations used in routing.", href: "/erp/manufacturing/operations", label: "No operations", status: "needs-attention" },
        { detail: "Review products without BOM.", href: "/erp/manufacturing/boms", label: "Products without BOM", status: "needs-attention" },
        { detail: "Review products without routing.", href: "/erp/manufacturing/routing-plans", label: "Products without routing", status: "needs-attention" },
      ],
      type: "checklist",
    },
  ],
  "quick-actions": [
    {
      actions: [
        { href: "/erp/manufacturing/production-lines/new", isEnabled: true, key: "create-line", label: "Create Production Line" },
        { href: "/erp/manufacturing/work-centers/new", isEnabled: true, key: "create-work-center", label: "Create Work Center" },
        { href: "/erp/manufacturing/operations/new", isEnabled: true, key: "create-operation", label: "Create Operation" },
        { href: "/erp/manufacturing/boms/new", isEnabled: true, key: "create-bom", label: "Create BOM" },
      ],
      type: "actions",
    },
  ],
  "interactive-walkthrough": [
    {
      steps: [
        { label: "Open Manufacturing Dashboard", description: "Review production foundation metrics." },
        { label: "Open Production Lines", description: "Learn where factory lines are defined." },
        { label: "Open Work Centers", description: "Learn where capacity areas are defined." },
        { label: "Open BOM and Routing", description: "Learn where material and process rules are set." },
        { label: "Open Daily Reports", description: "Learn where supervisors record daily output." },
      ],
      type: "flow",
    },
  ],
};

export const financeDocumentationBlueprint = createDocumentationBlueprint({
  appKey: "finance",
  appName: "Finance",
  dependencies: [
    { appKey: "platform", href: "/erp", label: "Platform", requirement: "required" },
    { appKey: "inventory", href: "/erp/inventory", label: "Inventory", requirement: "optional" },
    { appKey: "manufacturing", href: "/erp/manufacturing", label: "Manufacturing", requirement: "optional" },
  ],
  documentationHref: "/erp/finance/documentation",
  homeHref: "/erp/finance",
  quickActions: [
    { href: "/erp/finance/account-types", isEnabled: true, key: "account-types", label: "Create Account Type" },
    { href: "/erp/finance/chart-of-accounts", isEnabled: true, key: "accounts", label: "Create Account" },
    { href: "/erp/finance/fiscal-years", isEnabled: true, key: "fiscal-years", label: "Create Fiscal Year" },
  ],
  sections: buildReadySections(financeBlocks),
  status: "ready",
});

export const inventoryDocumentationBlueprint = createDocumentationBlueprint({
  appKey: "inventory",
  appName: "Inventory",
  dependencies: [
    { appKey: "platform", href: "/erp", label: "Platform", requirement: "required" },
    { appKey: "finance", href: "/erp/finance", label: "Finance", requirement: "optional" },
    { appKey: "manufacturing", href: "/erp/manufacturing", label: "Manufacturing", requirement: "optional" },
  ],
  documentationHref: "/erp/inventory/documentation",
  homeHref: "/erp/inventory",
  quickActions: [
    { href: "/erp/inventory/products", isEnabled: true, key: "products", label: "Create Product" },
    { href: "/erp/inventory/goods-receipt/new", isEnabled: true, key: "goods-receipt", label: "Create Goods Receipt" },
    { href: "/erp/inventory/stock-adjustment/new", isEnabled: true, key: "adjustment", label: "Create Stock Adjustment" },
  ],
  sections: buildReadySections(inventoryBlocks),
  status: "ready",
});

export const manufacturingDocumentationBlueprint = createDocumentationBlueprint({
  appKey: "manufacturing",
  appName: "Manufacturing",
  dependencies: [
    { appKey: "inventory", href: "/erp/inventory", label: "Inventory", requirement: "required" },
    { appKey: "finance", href: "/erp/finance", label: "Finance", requirement: "optional" },
    { appKey: "quality", href: "/erp", label: "Quality", requirement: "optional" },
    { appKey: "payroll", href: "/erp", label: "Payroll", requirement: "later" },
  ],
  documentationHref: "/erp/manufacturing/documentation",
  homeHref: "/erp/manufacturing",
  quickActions: [
    { href: "/erp/manufacturing/production-lines/new", isEnabled: true, key: "production-line", label: "Create Production Line" },
    { href: "/erp/manufacturing/work-centers/new", isEnabled: true, key: "work-center", label: "Create Work Center" },
    { href: "/erp/manufacturing/boms/new", isEnabled: true, key: "bom", label: "Create BOM" },
  ],
  sections: buildReadySections(manufacturingBlocks),
  status: "ready",
});
