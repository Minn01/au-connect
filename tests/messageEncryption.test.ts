import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import {
  decryptMessageText,
  encryptMessageText,
} from "../lib/server/messageEncryption";

const originalKey = process.env.MESSAGE_ENCRYPTION_KEY;
process.env.MESSAGE_ENCRYPTION_KEY = randomBytes(32).toString("base64");

test.after(() => {
  if (originalKey === undefined) delete process.env.MESSAGE_ENCRYPTION_KEY;
  else process.env.MESSAGE_ENCRYPTION_KEY = originalKey;
});

test("encrypts and decrypts message text", () => {
  const plaintext = "A private message with unicode: \u0e2a\u0e27\u0e31\u0e2a\u0e14\u0e35";
  const encrypted = encryptMessageText(plaintext);

  assert.match(encrypted, /^enc:v1:/);
  assert.notEqual(encrypted, plaintext);
  assert.equal(decryptMessageText(encrypted), plaintext);
});

test("uses a fresh IV for every encryption", () => {
  const first = encryptMessageText("same message");
  const second = encryptMessageText("same message");

  assert.notEqual(first, second);
  assert.equal(decryptMessageText(first), "same message");
  assert.equal(decryptMessageText(second), "same message");
});

test("returns legacy plaintext and null unchanged", () => {
  assert.equal(decryptMessageText("legacy plaintext"), "legacy plaintext");
  assert.equal(decryptMessageText(null), null);
});

test("rejects tampered ciphertext", () => {
  const encrypted = encryptMessageText("do not alter");
  const lastCharacter = encrypted.at(-1);
  const tampered = `${encrypted.slice(0, -1)}${lastCharacter === "A" ? "B" : "A"}`;

  assert.throws(
    () => decryptMessageText(tampered),
    /Unable to decrypt message text/,
  );
});
