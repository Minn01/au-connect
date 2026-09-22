// GOOGLE OAUTH
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

import { GOOGLE_AUTH_URL, OAUTH_STATE_RANDOM_BYTES_LENGTH } from "@/lib/constants";
import { GOOGLE_CLIENT_ID } from "@/lib/env";
import { createOauthStateCookie } from "@/lib/authFunctions";
import { getOAuthCallbackUrl } from "@/lib/server/appUrl";

// this route redirects user to google oauth consent screen

export async function GET(req: Request) {
  const state = randomBytes(OAUTH_STATE_RANDOM_BYTES_LENGTH).toString("base64url");
  const redirectUri = getOAuthCallbackUrl("google", req);

  const response = NextResponse.redirect(
    GOOGLE_AUTH_URL + "?" +
      new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        prompt: "select_account",
        // CSFR protection
        state: state,
      }).toString()
  );

  createOauthStateCookie(response, state, req);

  return response;
}
