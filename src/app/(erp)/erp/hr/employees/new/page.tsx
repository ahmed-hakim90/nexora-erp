import { redirect } from "next/navigation";

export default function HrEmployeeNewRedirectPage() {
  redirect("/erp/hr/employees?wizard=1");
}
