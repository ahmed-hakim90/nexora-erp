import { notFound } from "next/navigation";

import { WarehouseScanReadinessPage } from "../../../_components/warehouse-execution-pages";

const targets = new Set(["product", "location", "lot", "serial", "document"]);

export default async function WarehouseScanRoute({
  params,
}: Readonly<{
  params: Promise<{ target: string }>;
}>) {
  const { target } = await params;
  if (!targets.has(target)) notFound();
  return WarehouseScanReadinessPage({ target: target as "product" | "location" | "lot" | "serial" | "document" });
}
