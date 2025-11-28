// GOOGLE OAUTH
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

import { GOOGLE_AUTH_URL, OAUTH_STATE_RANDOM_BYTES_LENGTH } from "@/lib/constants";
import { GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI } from "@/lib/env";
import { createOauthStateCookie } from "@/lib/authFunctions";

// this route redirects user to google oauth consent screen

export async function GET() {
  const state = randomBytes(OAUTH_STATE_RANDOM_BYTES_LENGTH).toString("base64url");

  const response = NextResponse.redirect(
    GOOGLE_AUTH_URL + "?" +
      new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_REDIRECT_URI,
        response_type: "code",
        scope: "openid email profile",
        prompt: "select_account",
        // CSFR protection
        state: state,
      }).toString()
  );

  createOauthStateCookie(response, state);

  return response;
}
