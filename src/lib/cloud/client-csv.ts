import { createClientSchema, type CreateClientInput } from "@/lib/cloud/client-input";

export const CLIENT_CSV_HEADERS = ["name", "company", "email", "phone"] as const;
export const MAX_CLIENT_CSV_BYTES = 256 * 1024;
export const MAX_CLIENT_CSV_ROWS = 500;
export const MAX_CLIENT_EXPORT_ROWS = 5_000;

export class ClientCsvError extends Error {}

function parseRows(text: string, delimiter: "," | ";") {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else cell += character;
      continue;
    }
    if (character === '"' && cell.length === 0) quoted = true;
    else if (character === delimiter) {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.endsWith("\r") ? cell.slice(0, -1) : cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  if (quoted) throw new ClientCsvError("В CSV есть незакрытая кавычка.");
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.endsWith("\r") ? cell.slice(0, -1) : cell);
    rows.push(row);
  }
  return rows;
}

function detectDelimiter(text: string): "," | ";" {
  let comma = 0;
  let semicolon = 0;
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (!quoted && (character === "\n" || character === "\r")) break;
    else if (!quoted && character === ",") comma += 1;
    else if (!quoted && character === ";") semicolon += 1;
  }
  return semicolon > comma ? ";" : ",";
}

export function parseClientCsv(raw: string): CreateClientInput[] {
  if (raw.includes("\0")) throw new ClientCsvError("CSV содержит недопустимый нулевой байт.");
  const text = raw.replace(/^\uFEFF/, "");
  const rows = parseRows(text, detectDelimiter(text));
  const header = rows.shift()?.map(value => value.trim().toLowerCase());
  if (!header || header.length !== CLIENT_CSV_HEADERS.length || CLIENT_CSV_HEADERS.some((name, index) => header[index] !== name)) {
    throw new ClientCsvError(`Первая строка должна быть: ${CLIENT_CSV_HEADERS.join(",")}.`);
  }
  const populated = rows.filter(row => row.some(value => value.trim() !== ""));
  if (populated.length === 0) throw new ClientCsvError("В CSV нет клиентов.");
  if (populated.length > MAX_CLIENT_CSV_ROWS) throw new ClientCsvError(`За один раз можно импортировать не более ${MAX_CLIENT_CSV_ROWS} клиентов.`);

  return populated.map((row, index) => {
    if (row.length !== CLIENT_CSV_HEADERS.length) throw new ClientCsvError(`Строка ${index + 2}: ожидается 4 столбца.`);
    const parsed = createClientSchema.safeParse({ name: row[0], company: row[1], email: row[2], phone: row[3] });
    if (!parsed.success) throw new ClientCsvError(`Строка ${index + 2}: ${parsed.error.issues[0]?.message ?? "проверьте данные"}.`);
    return parsed.data;
  });
}

function neutralizeSpreadsheetFormula(value: string) {
  return /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string | null) {
  const safe = neutralizeSpreadsheetFormula(value ?? "");
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function serializeClientCsv(clients: Array<{ name: string; company: string; email: string | null; phone: string | null }>) {
  const lines = [CLIENT_CSV_HEADERS.join(","), ...clients.map(client => [client.name, client.company, client.email, client.phone].map(csvCell).join(","))];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
