import { describe, expect, it } from "vitest";
import {
  DATABASE_UNREACHABLE_USER_MESSAGE,
  friendlyDatabaseConnectMessage,
  humanizeDashboardFetchError,
  humanizeSignInError,
  isRetryableFilterFetch,
  isTlsOrNetworkFailure,
} from "@/lib/mongoConnectionError";

const OPENSSL_ALERT_80 =
  "40D95647E87F0000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error:ssl/record/rec_layer_s3.c:918:SSL alert number 80";

describe("mongoConnectionError", () => {
  it("detects OpenSSL TLS alert 80", () => {
    expect(isTlsOrNetworkFailure(new Error(OPENSSL_ALERT_80))).toBe(true);
  });

  it("maps TLS handshake drops to a short retry message", () => {
    expect(friendlyDatabaseConnectMessage(new Error(OPENSSL_ALERT_80))).toBe(
      DATABASE_UNREACHABLE_USER_MESSAGE,
    );
  });

  it("does not rewrite invalid credentials", () => {
    expect(humanizeSignInError("Invalid email or password")).toBe(
      "Invalid email or password",
    );
  });

  it("hides raw OpenSSL text on the sign-in form", () => {
    expect(humanizeSignInError(OPENSSL_ALERT_80)).toBe(
      DATABASE_UNREACHABLE_USER_MESSAGE,
    );
  });

  it("maps Mongo secureConnect timeouts to the same retry message", () => {
    const secureConnect =
      "Socket 'secureConnect' timed out after 30002ms (connectTimeoutMS: 30000)";
    expect(isTlsOrNetworkFailure(new Error(secureConnect))).toBe(true);
    expect(humanizeSignInError(secureConnect)).toBe(
      DATABASE_UNREACHABLE_USER_MESSAGE,
    );
  });

  it("does not treat a blank sign-in error as a database outage", () => {
    expect(humanizeSignInError("")).toBe("Sign in failed. Please try again.");
  });

  it("hides browser Failed to fetch on dashboard loads", () => {
    expect(humanizeDashboardFetchError(new Error("Failed to fetch"))).toBe(
      "We couldn't reach the server. Check your connection and try again.",
    );
    expect(
      humanizeDashboardFetchError(new Error("Request timed out. Please try again.")),
    ).toBe("This is taking longer than expected. Please try again.");
  });

  it("retries filter fetches on abort and 5xx", () => {
    expect(isRetryableFilterFetch(new Error("Failed to fetch"))).toBe(true);
    expect(isRetryableFilterFetch(new Error("Failed to fetch statuses (HTTP 503)"))).toBe(
      true,
    );
    expect(isRetryableFilterFetch(new Error("Invalid email or password"))).toBe(
      false,
    );
  });
});
