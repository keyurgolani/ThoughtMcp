import { z } from "zod";

export enum SkepticismLevel {
  LOW = "low", // Trust AI (0.2 confidence threshold)
  MEDIUM = "medium", // Balanced (0.5 confidence threshold)
  HIGH = "high", // Trust Nothing (0.8 confidence threshold)
}

export const UserProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  preferences: z.object({
    defaultFramework: z
      .enum(["scientific", "creative", "systems", "analytical"])
      .default("scientific"),
    skepticismLevel: z.nativeEnum(SkepticismLevel).default(SkepticismLevel.MEDIUM),
    verboseMode: z.boolean().default(false),
    autoDecompose: z.boolean().default(true),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export interface UpdateProfileRequest {
  preferences?: Partial<UserProfile["preferences"]>;
  name?: string;
}
