import "server-only";

import { getEnvironment } from "./env";

export function getServerEnvironment() {
  // Service-role secrets must only be read through server-only modules.
  return getEnvironment();
}
