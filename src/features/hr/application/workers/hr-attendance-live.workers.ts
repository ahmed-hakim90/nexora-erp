import { defineJob } from "@/platform/background-jobs/public-api";

import { HR_ATTENDANCE_LIVE_JOB_KEYS } from "../constants/hr-attendance-live.constants";

export const HR_ATTENDANCE_LIVE_WORKERS = [
  defineJob({
    description: "Scan attendance live monitor state and KPI deltas",
    key: HR_ATTENDANCE_LIVE_JOB_KEYS.monitoring,
    maxRetries: 1,
    priority: "normal",
    queueKey: "hr-workforce-monitoring",
    retryPolicy: { cancellable: true, delaySeconds: 30, maxAttempts: 2, strategy: "fixed", timeoutSeconds: 300 },
    timeoutSeconds: 300,
  }),
  defineJob({
    description: "Scan attendance exceptions for live monitor alerts",
    key: HR_ATTENDANCE_LIVE_JOB_KEYS.exceptionScan,
    maxRetries: 1,
    priority: "normal",
    queueKey: "hr-workforce-monitoring",
    retryPolicy: { cancellable: true, delaySeconds: 60, maxAttempts: 2, strategy: "fixed", timeoutSeconds: 600 },
    timeoutSeconds: 600,
  }),
  defineJob({
    description: "Poll attendance device heartbeat for live monitor",
    key: HR_ATTENDANCE_LIVE_JOB_KEYS.heartbeat,
    maxRetries: 2,
    priority: "normal",
    queueKey: "hr-workforce-monitoring",
    retryPolicy: { cancellable: true, delaySeconds: 15, maxAttempts: 4, strategy: "fixed", timeoutSeconds: 120 },
    timeoutSeconds: 120,
  }),
  defineJob({
    description: "Monitor attendance device health for live dashboard",
    key: HR_ATTENDANCE_LIVE_JOB_KEYS.deviceHealth,
    maxRetries: 1,
    priority: "normal",
    queueKey: "hr-workforce-monitoring",
    retryPolicy: { cancellable: true, delaySeconds: 60, maxAttempts: 2, strategy: "fixed", timeoutSeconds: 300 },
    timeoutSeconds: 300,
  }),
] as const;
