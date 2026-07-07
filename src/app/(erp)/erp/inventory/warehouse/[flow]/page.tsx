import { notFound } from "next/navigation";

import { WarehouseFlowExecutionPage, isWarehouseFlowKey } from "../../_components/warehouse-execution-pages";

export default async function WarehouseFlowRoute({
  params,
}: Readonly<{
  params: Promise<{ flow: string }>;
}>) {
  const { flow } = await params;
  if (!isWarehouseFlowKey(flow)) notFound();
  return WarehouseFlowExecutionPage({ flowKey: flow });
}
