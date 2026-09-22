// AZURE OAUTH
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

import { MICROSOFT_CLIENT_ID } from "@/lib/env";
import { MICROSOFT_AUTH_URL, OAUTH_STATE_RANDOM_BYTES_LENGTH } from "@/lib/constants";
import { createOauthStateCookie } from "@/lib/authFunctions";
import { getOAuthCallbackUrl } from "@/lib/server/appUrl";

export async function GET(req: Request) {
  const state = randomBytes(OAUTH_STATE_RANDOM_BYTES_LENGTH).toString("base64url");
  const redirectUri = getOAuthCallbackUrl("azure-ad", req);

  const response = NextResponse.redirect(
    MICROSOFT_AUTH_URL + "?" +
      new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        response_type: "code",
        redirect_uri: redirectUri,
        response_mode: "query",
        scope: "openid profile email User.Read",
        state: state,
      })
  );
  // store state in cookie for validation in callback
  createOauthStateCookie(response, state, req);

  return response;
}
