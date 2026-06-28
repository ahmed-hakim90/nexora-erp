import { redirect } from "next/navigation";

export default function NewDailyReportPage() {
  redirect("/erp/manufacturing/daily-reports?create=1");
}
