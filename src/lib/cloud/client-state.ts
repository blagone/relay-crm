export type CreateClientState = { status: "idle" | "success" | "error"; message?: string };

export const initialCreateClientState: CreateClientState = { status: "idle" };