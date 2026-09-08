export type ClientCsvImportState = { status: "idle" | "success" | "error"; message?: string };
export const initialClientCsvImportState: ClientCsvImportState = { status: "idle" };
