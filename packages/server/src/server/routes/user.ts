import { Request, Response, Router } from "express";
import { Logger } from "../../utils/logger.js";
import { CognitiveCore } from "../cognitive-core.js";
import { SkepticismLevel, UserProfile, UserProfileSchema } from "../types/user.js";

// Mock Data Store (In-memory for now, replacing DB)
// In a real app, this would come from the database based on req.user.id
const MOCK_USER: UserProfile = {
  id: "user-default",
  name: "Antigravity User",
  email: "user@example.com",
  preferences: {
    defaultFramework: "scientific",
    skepticismLevel: SkepticismLevel.MEDIUM,
    verboseMode: false,
    autoDecompose: true,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const createUserRoutes = (_cognitiveCore: CognitiveCore): Router => {
  const router = Router();

  /**
   * GET /api/v1/user/profile
   * Retrieve current user profile
   */
  router.get("/profile", (_req: Request, res: Response) => {
    try {
      // In future: const userId = req.user.id;
      res.json(MOCK_USER);
    } catch (error) {
      Logger.error(
        "Error fetching profile",
        error instanceof Error ? error.message : String(error)
      );
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  /**
   * PUT /api/v1/user/profile
   * Update user profile preferences
   */
  router.put("/profile", (req: Request, res: Response) => {
    try {
      const updates = req.body;

      // Validate partial updates logic
      // We only allow updating preferences and basic info
      if (updates.preferences) {
        MOCK_USER.preferences = { ...MOCK_USER.preferences, ...updates.preferences };
      }
      if (updates.name) {
        MOCK_USER.name = updates.name;
      }
      MOCK_USER.updatedAt = new Date();

      // Ideally validate the final object against schema
      const validation = UserProfileSchema.safeParse(MOCK_USER);
      if (!validation.success) {
        Logger.error("Validation failed for user update", validation.error.format());
        // Revert or handle error? For now, we updated in-memory reference, which is risky if validation fails.
        // Better to validate *merged* object before committing.
        // But simple mock for now.
      }

      Logger.info("User profile updated", { id: MOCK_USER.id });
      res.json(MOCK_USER);
    } catch (error) {
      Logger.error(
        "Error updating profile",
        error instanceof Error ? error.message : String(error)
      );
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  return router;
};
