import { NextResponse } from "next/server";

type ErrorBody = {
  error: string;
  code?: string;
  forceLogout?: boolean;
};

export function unauthorizedResponse(
  message = "Unauthorized",
): NextResponse<ErrorBody> {
  return NextResponse.json(
    {
      error: message,
      code: "UNAUTHORIZED",
      forceLogout: true,
    },
    { status: 401 },
  );
}

export function forbiddenResponse(
  message = "Forbidden",
  code = "FORBIDDEN",
): NextResponse<ErrorBody> {
  return NextResponse.json(
    {
      error: message,
      code,
    },
    { status: 403 },
  );
}
