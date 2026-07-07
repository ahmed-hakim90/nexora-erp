# Device Driver Guide

## Resolving a Driver

```typescript
import { createAttendanceDeviceDriverForDevice, resolveDriverKey } from "@/features/hr/public-api";

const driverKey = resolveDriverKey(device.device_type, device.driver_key);
const driver = createAttendanceDeviceDriverForDevice({ deviceType: device.device_type, driverKey });
await driver.connect({ deviceId, deviceType, driverKey, ipAddress, port, timezone: "UTC" });
```

## Adding a Vendor Driver

1. Create driver class extending `BaseAttendanceDeviceDriver` or `ProtocolAttendanceDeviceDriver`
2. Register descriptor in `device-drivers/registry.ts`
3. Map `device_type` → driver key in `DEVICE_TYPE_TO_DRIVER`
4. Add tests in `tests/platform/hr-workforce-enterprise-hardening.test.ts`

## UI Integration

Drivers are discoverable via `loadHrDeviceDriverRegistry()` — UI does not need modification when adding drivers.

## Production Notes

- TCP/REST drivers currently use protocol simulation for development; replace `ProtocolAttendanceDeviceDriver.onConnect` with real socket/HTTP clients per vendor SDK.
- Credentials stored in device `metadata.credentials` (never exposed to client).
- All commands flow through `HrAttendanceDeviceCommandService` for audit consistency.
