/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Toaster } from "@/components/ui/toaster";
import { resetToastsForTests, toast } from "@/components/ui/use-toast";

describe("user create toast", () => {
  afterEach(() => {
    resetToastsForTests();
  });

  it("renders success toast text in the toaster", async () => {
    render(<Toaster />);
    toast({
      title: "Success",
      description: "User created successfully",
      variant: "success",
    });
    expect(
      await screen.findByText("User created successfully"),
    ).toBeInTheDocument();
  });
});
