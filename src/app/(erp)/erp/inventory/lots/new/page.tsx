import { redirect } from "next/navigation";

export default function NewInventoryLotPage() {
  redirect("/erp/inventory/lots?create=1");
}
