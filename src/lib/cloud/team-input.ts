import { z } from "zod";
export const teamRoleSchema = z.enum(["manager", "viewer"], "Выберите менеджера или наблюдателя");
export const inviteTeamSchema = z.object({ email: z.string().trim().toLowerCase().pipe(z.email().max(254)), role: teamRoleSchema });
export const invitationIdentitySchema = z.object({ invitationId: z.uuid() });
export const memberIdentitySchema = z.object({ memberId: z.uuid(), expectedRole: teamRoleSchema });
export const memberRoleSchema = memberIdentitySchema.extend({ role: teamRoleSchema });
