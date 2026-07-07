export function buildHrEmployeesHref(
  params: Record<string, string | undefined>,
  overrides: Record<string, string | null | undefined>,
) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) next.set(key, value);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined || value === "") next.delete(key);
    else next.set(key, value);
  }
  const query = next.toString();
  return query ? `/erp/hr/employees?${query}` : "/erp/hr/employees";
}

export function buildHrEmployeesExportHref(params: Record<string, string | undefined>) {
  const next = new URLSearchParams();
  if (params.search) next.set("search", params.search);
  if (params.status) next.set("status", params.status);
  const query = next.toString();
  return query ? `/api/hr/employees/export?${query}` : "/api/hr/employees/export";
}
