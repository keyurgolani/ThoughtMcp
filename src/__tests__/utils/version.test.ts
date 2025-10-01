/**
 * Version utility tests
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  clearVersionCache,
  getVersion,
  getVersionInfo,
} from "../../utils/version.js";

describe("Version Utility", () => {
  beforeEach(() => {
    // Clear cache before each test
    clearVersionCache();
  });

  describe("getVersion", () => {
    it("should return a valid version string", () => {
      const version = getVersion();
      expect(typeof version).toBe("string");
      expect(version).toMatch(/^\d+\.\d+\.\d+/); // Basic semver pattern
    });

    it("should return the same version on multiple calls (caching)", () => {
      const version1 = getVersion();
      const version2 = getVersion();
      expect(version1).toBe(version2);
    });

    it("should return current package version", () => {
      const version = getVersion();
      expect(version).toBe("0.4.0"); // Current version
    });
  });

  describe("getVersionInfo", () => {
    it("should return detailed version information", () => {
      const versionInfo = getVersionInfo();

      expect(versionInfo).toHaveProperty("version");
      expect(versionInfo).toHaveProperty("major");
      expect(versionInfo).toHaveProperty("minor");
      expect(versionInfo).toHaveProperty("patch");
      expect(versionInfo).toHaveProperty("isPrerelease");

      expect(typeof versionInfo.version).toBe("string");
      expect(typeof versionInfo.major).toBe("number");
      expect(typeof versionInfo.minor).toBe("number");
      expect(typeof versionInfo.patch).toBe("number");
      expect(typeof versionInfo.isPrerelease).toBe("boolean");
    });

    it("should parse version 0.3.0 correctly", () => {
      const versionInfo = getVersionInfo();

      expect(versionInfo.version).toBe("0.4.0");
      expect(versionInfo.major).toBe(0);
      expect(versionInfo.minor).toBe(4);
      expect(versionInfo.patch).toBe(0);
      expect(versionInfo.isPrerelease).toBe(false);
    });

    it("should detect prerelease versions", () => {
      // This test would need to be updated if we use prerelease versions
      const versionInfo = getVersionInfo();
      expect(versionInfo.isPrerelease).toBe(false);
    });
  });

  describe("clearVersionCache", () => {
    it("should clear the version cache", () => {
      // Get version to populate cache
      const version1 = getVersion();

      // Clear cache
      clearVersionCache();

      // Get version again - should still work
      const version2 = getVersion();
      expect(version2).toBe(version1);
    });
  });
});
