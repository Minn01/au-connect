// LINKEDIN OAUTH 
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

import { LINKEDIN_AUTH_URL, OAUTH_STATE_RANDOM_BYTES_LENGTH } from "@/lib/constants";
import { LINKEDIN_CLIENT_ID } from "@/lib/env";
import { createOauthStateCookie } from "@/lib/authFunctions";
import { getOAuthCallbackUrl } from "@/lib/server/appUrl";

export async function GET(req: Request) {
  const state = randomBytes(OAUTH_STATE_RANDOM_BYTES_LENGTH).toString("base64url");
  const redirectUri = getOAuthCallbackUrl("linkedin", req);

  const response = NextResponse.redirect(
    LINKEDIN_AUTH_URL + "?" +
      new URLSearchParams({
        response_type: "code",
        client_id: LINKEDIN_CLIENT_ID,
        redirect_uri: redirectUri,
        scope: "openid profile email",
        // CSFR protection
        state: state,
      }).toString()
  );

  // store state in cookie for validation in callback
  createOauthStateCookie(response, state, req);
  return response;
}
