// AZURE OAUTH
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

import { MICROSOFT_CLIENT_ID, MICROSOFT_REDIRECT_URI } from "@/lib/env";
import { MICROSOFT_AUTH_URL, OAUTH_STATE_RANDOM_BYTES_LENGTH } from "@/lib/constants";
import { createOauthStateCookie } from "@/lib/authFunctions";

export async function GET() {
  const state = randomBytes(OAUTH_STATE_RANDOM_BYTES_LENGTH).toString("base64url");

  const response = NextResponse.redirect(
    MICROSOFT_AUTH_URL + "?" +
      new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        response_type: "code",
        redirect_uri: MICROSOFT_REDIRECT_URI,
        response_mode: "query",
        scope: "openid profile email User.Read",
        state: state,
      })
  );
  // store state in cookie for validation in callback
  createOauthStateCookie(response, state);

  return response;
}
