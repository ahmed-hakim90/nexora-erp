import { redirectToFinanceCreate } from "../../_components/finance-route-redirects";

export default function NewCurrencyPage() {
  redirectToFinanceCreate("currencies");
}
