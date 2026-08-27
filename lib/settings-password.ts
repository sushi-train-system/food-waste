import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const HASH_PREFIX = "scrypt:v1";
const KEY_LENGTH = 32;

export const SETTINGS_UNLOCK_COOKIE = "swt-settings-unlock";
export const DEFAULT_SETTINGS_PASSWORD =
  process.env.SETTINGS_DEFAULT_PASSWORD ?? "0000";

function unlockSecret() {
  return (
    process.env.SETTINGS_UNLOCK_SECRET ??
    process.env.DIRECT_URL ??
    process.env.DATABASE_URL ??
    "dev-settings-unlock-secret"
  );
}

function signUnlockPayload(storeId: string, userId: string) {
  return createHmac("sha256", unlockSecret())
    .update(`${storeId}:${userId}`)
    .digest("hex");
}

export function createSettingsUnlockCookieValue(storeId: string, userId: string) {
  return `${storeId}.${userId}.${signUnlockPayload(storeId, userId)}`;
}

export function isValidSettingsUnlockCookie(
  value: string | undefined,
  storeId: string,
  userId: string,
) {
  if (!value) return false;
  const [cookieStoreId, cookieUserId, signature] = value.split(".");
  if (cookieStoreId !== storeId || cookieUserId !== userId || !signature) {
    return false;
  }
  const expected = signUnlockPayload(storeId, userId);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function hashSettingsPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${HASH_PREFIX}:${salt}:${hash}`;
}

export function verifySettingsPassword(
  password: string,
  storedHash: string | null | undefined,
) {
  if (!storedHash) {
    return password === DEFAULT_SETTINGS_PASSWORD;
  }

  const [algorithm, version, salt, hash] = storedHash.split(":");
  if (`${algorithm}:${version}` !== HASH_PREFIX || !salt || !hash) {
    return false;
  }

  const actual = scryptSync(password, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
