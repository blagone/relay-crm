import { describe, expect, it } from "vitest";
import { inquiryEmailSubject, inquiryMessageTemplate } from "../../src/lib/cloud/message-templates";

describe("message templates", () => {
  it("builds a client-safe follow-up message", () => {
    expect(inquiryMessageTemplate({ clientName: "Анна", inquiryTitle: "Сайт", nextContactOn: "2026-09-10" })).toContain("Анна");
    expect(inquiryMessageTemplate({ clientName: "Анна", inquiryTitle: "Сайт", nextContactOn: "2026-09-10" })).toContain("Сайт");
  });
  it("creates a concise email subject", () => expect(inquiryEmailSubject("Сайт")).toBe("По заявке «Сайт»"));
});
