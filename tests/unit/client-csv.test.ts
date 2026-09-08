import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ClientCsvError, MAX_CLIENT_CSV_ROWS, parseClientCsv, serializeClientCsv } from "../../src/lib/cloud/client-csv";

describe("client CSV portability", () => {
  it("parses BOM, quoted fields, CRLF and semicolon exports", () => {
    expect(parseClientCsv('\uFEFFname,company,email,phone\r\n"Иван, И.","ООО ""Мир""",ivan@example.com,+7999\r\n')).toEqual([
      { name: "Иван, И.", company: 'ООО "Мир"', email: "ivan@example.com", phone: "+7999" },
    ]);
    expect(parseClientCsv("name;company;email;phone\nАнна;Студия;;\n")[0]).toEqual({ name: "Анна", company: "Студия", email: "", phone: "" });
  });

  it("rejects malformed headers, invalid rows and over-limit imports", () => {
    expect(() => parseClientCsv("email,name,company,phone\nx@y.ru,X,Y,1")).toThrow(ClientCsvError);
    expect(() => parseClientCsv("name,company,email,phone\nX,Y,not-email,1")).toThrow("Строка 2");
    const rows = Array.from({ length: MAX_CLIENT_CSV_ROWS + 1 }, (_, index) => `Клиент ${index},Компания,,`).join("\n");
    expect(() => parseClientCsv(`name,company,email,phone\n${rows}`)).toThrow("не более 500");
  });

  it("exports a UTF-8 BOM, escapes CSV and neutralizes spreadsheet formulas", () => {
    const csv = serializeClientCsv([{ name: "=1+1", company: 'A,"B"', email: null, phone: " -2" }]);
    expect(csv.startsWith("\uFEFFname,company,email,phone\r\n")).toBe(true);
    expect(csv).toContain("'=1+1");
    expect(csv).toContain('"A,""B"""');
    expect(csv).toContain("' -2");
  });

  it("keeps tenant identity server-derived and documents atomic import behavior", () => {
    const action = readFileSync("src/app/actions/client-csv.ts", "utf8");
    const route = readFileSync("src/app/app/data/clients.csv/route.ts", "utf8");
    const page = readFileSync("src/app/app/data/page.tsx", "utf8");
    expect(action).toContain("authenticatedClientWorkspace(true)");
    expect(action).toContain("workspace_id: context.membership.workspace_id");
    expect(action).toContain('.from("clients").insert(clients.map');
    expect(route).toContain("authenticatedClientWorkspace(false)");
    expect(route).toContain('.eq("workspace_id", context.membership.workspace_id)');
    expect(route).toContain('.is("archived_at", null)');
    expect(route).toContain('"Cache-Control": "private, no-store"');
    expect(page).toContain("При любой ошибке импорт отменяется целиком");
  });
});
