import { registerBackgroundJobHandler } from "@/platform/background-jobs/worker-runtime";

import {
  ATTENDANCE_CLOSING_JOB,
  ATTENDANCE_EXPORT_CLEANUP_JOB,
  ATTENDANCE_EXPORT_JOB,
  ATTENDANCE_SNAPSHOT_JOB,
} from "../constants/hr-attendance-payroll.constants";
import { HR_COMPENSATION_ISSUANCE_MATERIALIZE_JOB } from "../constants/hr-compensation-issuance.constants";
import {
  runCompensationIssuanceMaterializeJob,
} from "../jobs/hr-compensation-issuance-materialize.job";

let registered = false;

export function registerHrBackgroundJobHandlers(): void {
  if (registered) return;
  registered = true;

  const noop = async () => {
    // Runtime handlers are wired at the service layer; queue processor marks jobs complete.
  };

  registerBackgroundJobHandler(ATTENDANCE_EXPORT_JOB.key, noop);
  registerBackgroundJobHandler(ATTENDANCE_SNAPSHOT_JOB.key, noop);
  registerBackgroundJobHandler(ATTENDANCE_CLOSING_JOB.key, noop);
  registerBackgroundJobHandler(ATTENDANCE_EXPORT_CLEANUP_JOB.key, noop);
  registerBackgroundJobHandler(HR_COMPENSATION_ISSUANCE_MATERIALIZE_JOB.key, async (job, supabase) => {
    await runCompensationIssuanceMaterializeJob(supabase, job.payload);
  });
  registerBackgroundJobHandler("hr.attendance.device.sync", noop);
  registerBackgroundJobHandler("hr.workforce.queue-processor", noop);
}
