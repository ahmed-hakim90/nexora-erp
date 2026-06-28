import { redirect } from "next/navigation";

export default function NewInventoryProductPage() {
  redirect("/erp/inventory/products?create=1");
}
