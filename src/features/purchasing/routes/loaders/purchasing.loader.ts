import "server-only";

import { purchaseDocumentKindSchema, purchasingListQuerySchema } from "../../application/schemas/purchasing.schema";
import { createPurchasingService } from "../service-factory";

export async function listPurchaseDocuments(kind: unknown, query: unknown = {}) {
  const service = await createPurchasingService();
  return service.list(purchaseDocumentKindSchema.parse(kind), purchasingListQuerySchema.parse(query));
}

export async function getPurchaseDocument(kind: unknown, id: string) {
  const service = await createPurchasingService();
  return service.read(purchaseDocumentKindSchema.parse(kind), id);
}
