import assert from "node:assert/strict";
import test from "node:test";

import { getAppUrl, getOAuthCallbackUrl } from "../lib/server/appUrl";

const mutableEnv = process.env as Record<string, string | undefined>;
const originalAppPublicUrl = process.env.APP_PUBLIC_URL;
const originalNodeEnv = process.env.NODE_ENV;

test.afterEach(() => {
  if (originalAppPublicUrl === undefined) delete mutableEnv.APP_PUBLIC_URL;
  else mutableEnv.APP_PUBLIC_URL = originalAppPublicUrl;

  if (originalNodeEnv === undefined) delete mutableEnv.NODE_ENV;
  else mutableEnv.NODE_ENV = originalNodeEnv;
});

test("normalizes configured deployment URLs and OAuth callbacks", () => {
  const deployments = [
    "http://localhost:3000/connect",
    "https://minthant-bad2026.eastasia.cloudapp.azure.com/connect/",
    "https://life.au.edu/connect",
  ];

  for (const configured of deployments) {
    mutableEnv.APP_PUBLIC_URL = configured;
    const expected = configured.replace(/\/$/, "");

    assert.equal(getAppUrl(), expected);
    assert.equal(
      getOAuthCallbackUrl("google"),
      `${expected}/api/connect/v1/auth/google/callback`,
    );
    assert.doesNotMatch(getOAuthCallbackUrl("linkedin"), /connect\/connect/);
  }
});

test("derives the public URL from forwarded request headers", () => {
  delete mutableEnv.APP_PUBLIC_URL;
  mutableEnv.NODE_ENV = "production";

  const request = {
    url: "http://127.0.0.1:3000/connect/api/connect/v1/auth/google",
    headers: new Headers({
      host: "127.0.0.1:3000",
      "x-forwarded-host": "preview.example.com",
      "x-forwarded-proto": "https",
    }),
  };

  assert.equal(getAppUrl(request), "https://preview.example.com/connect");
});

test("rejects invalid configuration and missing production background URL", () => {
  mutableEnv.NODE_ENV = "production";
  mutableEnv.APP_PUBLIC_URL = "https://life.au.edu/connect/connect";
  assert.throws(() => getAppUrl(), /ending in \/connect/);

  mutableEnv.APP_PUBLIC_URL = "http://example.com/connect";
  assert.throws(() => getAppUrl(), /HTTPS URL/);

  delete mutableEnv.APP_PUBLIC_URL;
  assert.throws(() => getAppUrl(), /APP_PUBLIC_URL must be configured/);
});
