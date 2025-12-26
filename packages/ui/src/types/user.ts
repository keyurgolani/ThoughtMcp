export enum SkepticismLevel {
  LOW = "low", // Trust AI (0.2 confidence threshold)
  MEDIUM = "medium", // Balanced (0.5 confidence threshold)
  HIGH = "high", // Trust Nothing (0.8 confidence threshold)
}

export interface UserPreferences {
  defaultFramework: "scientific" | "creative" | "systems" | "analytical";
  skepticismLevel: SkepticismLevel;
  verboseMode: boolean;
  autoDecompose: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}
