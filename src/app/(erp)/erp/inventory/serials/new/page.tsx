import { redirect } from "next/navigation";

export default function NewInventorySerialPage() {
  redirect("/erp/inventory/serials?create=1");
}
