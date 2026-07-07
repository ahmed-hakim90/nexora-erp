import "server-only";

export function isHrDeviceDriverSimulationEnabled(): boolean {
  return process.env.HR_DEVICE_DRIVER_SIMULATION === "true";
}
