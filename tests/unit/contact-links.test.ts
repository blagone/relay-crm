import { describe, expect, it } from "vitest";
import { safeEmailHref, safePhoneHref } from "../../src/lib/cloud/contact-links";

describe("client contact links", () => {
  it("normalizes telephone links without carrying formatting or schemes", () => {
    expect(safePhoneHref("+7 (999) 123-45-67")).toBe("tel:+79991234567");
    expect(safePhoneHref("8 800 555 35 35")).toBe("tel:88005553535");
    expect(safePhoneHref("tel:javascript:12")).toBeNull();
    expect(safePhoneHref(null)).toBeNull();
  });

  it("creates encoded mail links only for email-shaped values", () => {
    expect(safeEmailHref(" user+crm@example.com ")).toBe("mailto:user%2Bcrm%40example.com");
    expect(safeEmailHref("javascript:alert(1)")).toBeNull();
    expect(safeEmailHref(null)).toBeNull();
  });
});
