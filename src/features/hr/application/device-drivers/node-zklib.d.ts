declare module "node-zklib" {
  type ZkUserRecord = Readonly<{
    cardno?: number;
    name: string;
    role: number;
    uid: number;
    userId: string;
  }>;

  type ZkAttendanceRecord = Readonly<{
    deviceUserId: string;
    recordTime: Date;
    userSn?: number;
  }>;

  export default class ZKLib {
    constructor(ip: string, port: number, timeout: number, inport: number);
    createSocket(cbErr?: (err: Error) => void, cbClose?: (type: string) => void): Promise<void>;
    disconnect(): Promise<void>;
    executeCmd(command: number, data?: string | Buffer): Promise<Buffer>;
    getAttendances(
      callbackInProcess?: (received: number, total: number) => void,
    ): Promise<{ data: ZkAttendanceRecord[]; err: Error | null }>;
    getInfo(): Promise<{ logCapacity: number; logCounts: number; userCounts: number }>;
    getUsers(): Promise<{ data: ZkUserRecord[]; err: Error | null }>;
  }
}
