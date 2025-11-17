import prisma from "../lib/prisma";
import jwt from "jsonwebtoken";
import SessionMethod from "../enums/SessionMethod";
import bcrypt from "bcrypt";
import { NextRequest, NextResponse } from "next/server";
import { get } from "http";

export async function tradSignup(req: NextRequest) {
  // get inputs from request body
  const { email, password } = await req.json();

  // validate input
  if (!email) return new NextResponse("Email is required", { status: 400 });
  if (!password)
    return new NextResponse("Password is required", { status: 400 });

  // check if user already exists
  const existingUser = await checkExistUser(email);
  if (existingUser) {
    return new NextResponse("User already exists, please login instead", {
      status: 409,
    });
  }

  // hash password
  const hashedPsw = await bcrypt.hash(password, 10);

  // create new user
  try {
    const user = await prisma.user.create({
      data: {
        email: email,
        password: hashedPsw,
      },
    });

    return createUserSession(
      { id: user.id, email: user.email },
      SessionMethod.SIGN_UP
    );
  } catch (error) {
    return NextResponse.json(
      { message: `Error signing up user in file:${__filename}`, error },
      { status: 500 }
    );
  }
}

export async function googleAuthSignIn(req: NextRequest) {
  // the url from google
  const url = new URL(req.url);
  // gets the code containing the authorization data
  const code = url.searchParams.get("code");

  if (!code) return NextResponse.json({ error: "No code" }, { status: 400 });

  // Exchange code for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/google/callback`,
    }),
  });

  const tokenData = await tokenRes.json();

  // Fetch user info
  const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  const profile = await userRes.json();

  // check if user exists
  let user = await checkExistUser(profile.email);

  // if user does not exist create new user record
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: profile.email,
        googleId: profile.sub,
      },
    });
  }

  return createUserSession(
    { id: user.id, email: user.email },
    SessionMethod.SIGN_IN
  );
}

export async function tradLogin(req: NextRequest) {
    const { email, password } = await req.json();

    if (!email) return new NextResponse("Email is required", { status: 400 });
    if (!password) return new NextResponse("Password is required", { status: 400 });

    const user = await checkExistUser(email);
    if (!user) {
        return new NextResponse("You might not have an account, please sign up first", { status: 404 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password!);
    if (!passwordMatch) {
        return new NextResponse("Incorrect password", { status: 401 });
    }

    return createUserSession(
        { id: user.id, email: user.email },
        SessionMethod.LOGIN
    );
}

export async function logout(req: NextRequest) {
    req.cookies.delete("auth_token");
    return getResponse({id: "", email: ""}, SessionMethod.LOGOUT);
}

// checks email only
export async function checkExistUser(email: string) {
  return await prisma.user.findUnique({
    where: { email: email },
  });
}

export function createUserSession(
  user: { id: string; email: string },
  method: SessionMethod
  //   req?: NextRequest | null = null
) {
  // create JWT token
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );

  const response = getResponse(user, method);

  // set the JWT in the cookie
  if (response) {
    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
  }

  return response;
}

function getResponse(
  user: { id: string; email: string },
  method: SessionMethod,
) {
  switch (method) {
    case SessionMethod.LOGIN:
      return NextResponse.json(
        { message: "Logged in successfully", user },
        { status: 200 }
      );
    case SessionMethod.LOGOUT:
      return NextResponse.json(
        { message: "Logged out successfully" },
        { status: 200 }
      );
    case SessionMethod.SIGN_IN:
      // this case represents OAuth sign in with google
      // TODO: this is temporary redirect to home page, can be changed later
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/?success=true&provider=google`);
    case SessionMethod.SIGN_UP:
      return NextResponse.json(
        { message: "Signed up successfully", user },
        { status: 201 }
      );
    default:
    // TODO: add default response ?
  }
}
