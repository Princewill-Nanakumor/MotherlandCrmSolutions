import { describe, expect, it } from "vitest";
import { LoginSchema, SignUpSchema } from "./index";

const validSignup = {
  firstName: "Jane",
  lastName: "Doe",
  country: "United States",
  phoneNumber: "+15551234567",
  email: "jane@example.com",
  password: "Secret1!",
  confirmPassword: "Secret1!",
};

describe("SignUpSchema", () => {
  it("accepts a valid signup payload", () => {
    expect(SignUpSchema.safeParse(validSignup).success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = SignUpSchema.safeParse({
      ...validSignup,
      confirmPassword: "Other1!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects weak passwords without uppercase/number/special", () => {
    const result = SignUpSchema.safeParse({
      ...validSignup,
      password: "secret",
      confirmPassword: "secret",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = SignUpSchema.safeParse({
      ...validSignup,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("LoginSchema", () => {
  it("accepts valid credentials", () => {
    expect(
      LoginSchema.safeParse({
        email: "jane@example.com",
        password: "secret1",
      }).success,
    ).toBe(true);
  });

  it("rejects short passwords", () => {
    expect(
      LoginSchema.safeParse({
        email: "jane@example.com",
        password: "123",
      }).success,
    ).toBe(false);
  });
});
