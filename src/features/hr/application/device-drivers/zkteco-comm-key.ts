import "server-only";

/**
 * Scrambles a ZKTeco comm key with the device session id (pyzk make_commkey / commpro.c MakeKey).
 */
export function makeZkCommKey(key: number, sessionId: number, ticks = 50): Buffer {
  let scrambled = 0;
  const normalizedKey = Math.trunc(key);
  const normalizedSessionId = Math.trunc(sessionId);

  for (let index = 0; index < 32; index += 1) {
    if (normalizedKey & (1 << index)) {
      scrambled = (scrambled << 1) | 1;
    } else {
      scrambled <<= 1;
    }
  }
  scrambled += normalizedSessionId;

  const firstPass = Buffer.alloc(4);
  firstPass.writeUInt32LE(scrambled >>> 0, 0);

  const xorPass = Buffer.from([
    firstPass[0]! ^ "Z".charCodeAt(0),
    firstPass[1]! ^ "K".charCodeAt(0),
    firstPass[2]! ^ "S".charCodeAt(0),
    firstPass[3]! ^ "O".charCodeAt(0),
  ]);

  const swapped = Buffer.alloc(4);
  swapped.writeUInt16LE(xorPass.readUInt16LE(2), 0);
  swapped.writeUInt16LE(xorPass.readUInt16LE(0), 2);

  const tickByte = ticks & 0xff;
  return Buffer.from([
    swapped[0]! ^ tickByte,
    swapped[1]! ^ tickByte,
    tickByte,
    swapped[3]! ^ tickByte,
  ]);
}
