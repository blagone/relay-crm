export type InquiryMutationState = { status: "idle" | "success" | "error"; message?: string };

export const initialInquiryMutationState: InquiryMutationState = { status: "idle" };
