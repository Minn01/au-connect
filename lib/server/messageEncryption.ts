import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const ENVELOPE_PREFIX = "enc:v1:";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const AAD = Buffer.from("au-connect:message:v1", "utf8");

function isEncryptedMessageText(value: string): boolean {
  return value.startsWith(ENVELOPE_PREFIX);
}

function encryptionKey(): Buffer {
  const encodedKey = process.env.MESSAGE_ENCRYPTION_KEY?.trim();
  if (!encodedKey) {
    throw new Error('Environment variable "MESSAGE_ENCRYPTION_KEY" is missing');
  }

  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      'Environment variable "MESSAGE_ENCRYPTION_KEY" must be a base64-encoded 32-byte key',
    );
  }

  return key;
}

export function encryptMessageText(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  cipher.setAAD(AAD);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${ENVELOPE_PREFIX}${iv.toString("base64url")}.${authTag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptMessageText(value: string): string;
export function decryptMessageText(value: null): null;
export function decryptMessageText(value: string | null): string | null;
export function decryptMessageText(value: string | null): string | null {
  if (value === null || !isEncryptedMessageText(value)) return value;

  try {
    const parts = value.slice(ENVELOPE_PREFIX.length).split(".");
    if (parts.length !== 3) throw new Error("Invalid encrypted message envelope");

    const [encodedIv, encodedAuthTag, encodedCiphertext] = parts;
    const iv = Buffer.from(encodedIv, "base64url");
    const authTag = Buffer.from(encodedAuthTag, "base64url");
    const ciphertext = Buffer.from(encodedCiphertext, "base64url");
    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error("Invalid encrypted message envelope");
    }

    const decipher = createDecipheriv(ALGORITHM, encryptionKey(), iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAAD(AAD);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error(
      "Unable to decrypt message text. Check MESSAGE_ENCRYPTION_KEY and stored data.",
    );
  }
}
