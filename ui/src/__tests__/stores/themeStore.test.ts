/**
 * ThemeStore Tests
 *
 * Tests for the theme management store.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { themes, useThemeStore, type ThemeId } from '../../stores/themeStore';

describe('ThemeStore', () => {
  // Store original documentElement
  let originalDocumentElement: HTMLElement;

  beforeEach(() => {
    // Create a mock document element for DOM manipulation tests
    originalDocumentElement = document.documentElement;

    // Create a mock element with all required methods
    const mockElement = document.createElement('html');
    Object.defineProperty(document, 'documentElement', {
      value: mockElement,
      writable: true,
      configurable: true,
    });

    // Reset store state before each test
    useThemeStore.setState({
      currentTheme: 'cosmic-cyan',
      respectReducedMotion: true,
      highContrast: false,
    });
  });

  afterEach(() => {
    // Restore original documentElement
    Object.defineProperty(document, 'documentElement', {
      value: originalDocumentElement,
      writable: true,
      configurable: true,
    });
  });

  describe('themes', () => {
    it('should have all expected themes defined', () => {
      const expectedThemes: ThemeId[] = [
        'cosmic-cyan',
        'midnight-ocean',
        'sunset-ember',
        'forest-glow',
        'aurora-violet',
        'monochrome',
      ];

      for (const themeId of expectedThemes) {
        expect(themes[themeId]).toBeDefined();
        expect(themes[themeId].id).toBe(themeId);
        expect(themes[themeId].name).toBeTruthy();
        expect(themes[themeId].description).toBeTruthy();
        expect(themes[themeId].colors).toBeDefined();
      }
    });

    it('should have all required color properties for each theme', () => {
      const requiredColorKeys = [
        'primary',
        'primaryMuted',
        'primaryGlow',
        'primarySubtle',
        'primaryBg',
        'secondary',
        'secondaryMuted',
        'secondaryGlow',
        'secondarySubtle',
        'secondaryBg',
        'highlight',
        'highlightMuted',
        'highlightGlow',
        'highlightSubtle',
        'highlightBg',
        'background',
        'backgroundSecondary',
        'backgroundTertiary',
        'surface',
        'surfaceElevated',
        'surfaceOverlay',
        'surfaceSunken',
        'border',
        'borderHover',
        'borderActive',
      ];

      for (const themeId of Object.keys(themes) as ThemeId[]) {
        const theme = themes[themeId];
        for (const key of requiredColorKeys) {
          expect(theme.colors[key as keyof typeof theme.colors]).toBeDefined();
        }
      }
    });
  });

  describe('setTheme', () => {
    it('should update the current theme', () => {
      const { setTheme } = useThemeStore.getState();

      setTheme('midnight-ocean');

      expect(useThemeStore.getState().currentTheme).toBe('midnight-ocean');
    });

    it('should apply theme CSS variables to document', () => {
      // Mock document.documentElement
      const mockSetProperty = vi.fn();
      const mockSetAttribute = vi.fn();
      vi.spyOn(document, 'documentElement', 'get').mockReturnValue({
        style: { setProperty: mockSetProperty },
        setAttribute: mockSetAttribute,
      } as unknown as HTMLElement);

      const { setTheme } = useThemeStore.getState();
      setTheme('sunset-ember');

      // Verify CSS variables were set
      expect(mockSetProperty).toHaveBeenCalled();
      expect(mockSetAttribute).toHaveBeenCalledWith('data-theme', 'sunset-ember');
    });
  });

  describe('getTheme', () => {
    it('should return the current theme object', () => {
      const { getTheme } = useThemeStore.getState();

      const theme = getTheme();

      expect(theme.id).toBe('cosmic-cyan');
      expect(theme.name).toBe('Cosmic Cyan');
    });

    it('should return updated theme after setTheme', () => {
      const { setTheme, getTheme } = useThemeStore.getState();

      setTheme('forest-glow');
      const theme = getTheme();

      expect(theme.id).toBe('forest-glow');
      expect(theme.name).toBe('Forest Glow');
    });
  });

  describe('getCSSVariables', () => {
    it('should return CSS variables for current theme', () => {
      const { getCSSVariables } = useThemeStore.getState();

      const variables = getCSSVariables();

      expect(variables['--theme-primary']).toBe('#00FFFF');
      expect(variables['--theme-secondary']).toBe('#9B59B6');
      expect(variables['--theme-highlight']).toBe('#FFD700');
    });
  });

  describe('toggleReducedMotion', () => {
    it('should toggle reduced motion preference', () => {
      const { toggleReducedMotion } = useThemeStore.getState();

      expect(useThemeStore.getState().respectReducedMotion).toBe(true);

      toggleReducedMotion();
      expect(useThemeStore.getState().respectReducedMotion).toBe(false);

      toggleReducedMotion();
      expect(useThemeStore.getState().respectReducedMotion).toBe(true);
    });
  });

  describe('toggleHighContrast', () => {
    it('should toggle high contrast mode', () => {
      const { toggleHighContrast } = useThemeStore.getState();

      expect(useThemeStore.getState().highContrast).toBe(false);

      toggleHighContrast();
      expect(useThemeStore.getState().highContrast).toBe(true);

      toggleHighContrast();
      expect(useThemeStore.getState().highContrast).toBe(false);
    });
  });

  describe('theme color values', () => {
    it('cosmic-cyan should have cyan primary color', () => {
      expect(themes['cosmic-cyan'].colors.primary).toBe('#00FFFF');
    });

    it('midnight-ocean should have blue-tinted colors', () => {
      expect(themes['midnight-ocean'].colors.primary).toBe('#00D4FF');
    });

    it('sunset-ember should have warm orange colors', () => {
      expect(themes['sunset-ember'].colors.primary).toBe('#FF6B35');
    });

    it('forest-glow should have green colors', () => {
      expect(themes['forest-glow'].colors.primary).toBe('#00FF88');
    });

    it('aurora-violet should have purple colors', () => {
      expect(themes['aurora-violet'].colors.primary).toBe('#BF40BF');
    });

    it('monochrome should have white/gray colors', () => {
      expect(themes['monochrome'].colors.primary).toBe('#FFFFFF');
    });
  });
});
