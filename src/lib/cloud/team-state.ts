export type TeamState = { status: "idle" | "success" | "error"; message?: string };
export const initialTeamState: TeamState = { status: "idle" };
