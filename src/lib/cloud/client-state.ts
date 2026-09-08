export type CreateClientState = { status: "idle" | "success" | "error"; message?: string };

export type ClientMutationState = CreateClientState;

export const initialCreateClientState: CreateClientState = { status: "idle" };
export const initialClientMutationState: ClientMutationState = { status: "idle" };
