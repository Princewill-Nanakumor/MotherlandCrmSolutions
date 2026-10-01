/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import {
  applySearchToLeadListParams,
  removeOpenLeadFromLiveUrl,
  shouldDismissOpenLeadForSearchChange,
} from "@/lib/leadListSearchParams";

describe("applySearchToLeadListParams", () => {
  it("drops the open lead when the search text changes", () => {
    const params = new URLSearchParams(
      "search=jill.hopkins@live.com&page=2&lead=ST123&name=Jill-Hopkins",
    );

    const next = applySearchToLeadListParams(
      params,
      "lisafarrell2021@gmail.com",
    );

    expect(next.get("search")).toBe("lisafarrell2021@gmail.com");
    expect(next.get("page")).toBe("1");
    expect(next.get("lead")).toBeNull();
    expect(next.get("name")).toBeNull();
  });

  it("keeps the open lead when the search text is already on the URL", () => {
    const params = new URLSearchParams(
      "search=jill.hopkins@live.com&page=1&lead=ST123&name=Jill-Hopkins",
    );

    const next = applySearchToLeadListParams(params, "jill.hopkins@live.com");

    expect(next.get("lead")).toBe("ST123");
    expect(next.get("name")).toBe("Jill-Hopkins");
  });

  it("drops the open lead when search is cleared", () => {
    const params = new URLSearchParams("search=jill.hopkins@live.com&lead=ST123");

    const next = applySearchToLeadListParams(params, "  ");

    expect(next.get("search")).toBeNull();
    expect(next.get("lead")).toBeNull();
  });
});

describe("shouldDismissOpenLeadForSearchChange", () => {
  it("does not dismiss while context is catching up to the URL", () => {
    expect(
      shouldDismissOpenLeadForSearchChange(
        "",
        "jill.hopkins@live.com",
        "jill.hopkins@live.com",
      ),
    ).toBe(false);
  });

  it("dismisses when the user searches for a different lead", () => {
    expect(
      shouldDismissOpenLeadForSearchChange(
        "jill.hopkins@live.com",
        "lisafarrell2021@gmail.com",
        "jill.hopkins@live.com",
      ),
    ).toBe(true);
  });
});

describe("removeOpenLeadFromLiveUrl", () => {
  it("removes only the open lead from the address bar", () => {
    const original = window.location.href;
    window.history.replaceState(
      null,
      "",
      "/dashboard/all-leads?search=jill.hopkins%40live.com&page=1&lead=ST123&name=Jill-Hopkins",
    );

    removeOpenLeadFromLiveUrl();

    const params = new URLSearchParams(window.location.search);
    expect(params.get("search")).toBe("jill.hopkins@live.com");
    expect(params.get("page")).toBe("1");
    expect(params.get("lead")).toBeNull();
    expect(params.get("name")).toBeNull();

    window.history.replaceState(null, "", original);
  });
});
