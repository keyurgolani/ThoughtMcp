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
      currentTheme: 'cosmic',
      respectReducedMotion: true,
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
      const expectedThemes: ThemeId[] = ['cosmic', 'ember', 'monochrome', 'light', 'high-contrast'];

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

    it('should have isLight property for each theme', () => {
      for (const themeId of Object.keys(themes) as ThemeId[]) {
        expect(typeof themes[themeId].isLight).toBe('boolean');
      }
    });

    it('should correctly identify light vs dark themes', () => {
      expect(themes['cosmic'].isLight).toBe(false);
      expect(themes['ember'].isLight).toBe(false);
      expect(themes['monochrome'].isLight).toBe(false);
      expect(themes['light'].isLight).toBe(true);
      expect(themes['high-contrast'].isLight).toBe(false);
    });
  });

  describe('setTheme', () => {
    it('should update the current theme', () => {
      const { setTheme } = useThemeStore.getState();

      setTheme('ember');

      expect(useThemeStore.getState().currentTheme).toBe('ember');
    });

    it('should apply theme CSS variables to document', () => {
      // Mock document.documentElement
      const mockSetProperty = vi.fn();
      const mockSetAttribute = vi.fn();
      const mockClassList = { add: vi.fn(), remove: vi.fn() };
      vi.spyOn(document, 'documentElement', 'get').mockReturnValue({
        style: { setProperty: mockSetProperty },
        setAttribute: mockSetAttribute,
        removeAttribute: vi.fn(),
        classList: mockClassList,
      } as unknown as HTMLElement);

      const { setTheme } = useThemeStore.getState();
      setTheme('ember');

      // Verify CSS variables were set
      expect(mockSetProperty).toHaveBeenCalled();
      expect(mockSetAttribute).toHaveBeenCalledWith('data-theme', 'ember');
    });
  });

  describe('getTheme', () => {
    it('should return the current theme object', () => {
      const { getTheme } = useThemeStore.getState();

      const theme = getTheme();

      expect(theme.id).toBe('cosmic');
      expect(theme.name).toBe('Cosmic');
    });

    it('should return updated theme after setTheme', () => {
      const { setTheme, getTheme } = useThemeStore.getState();

      setTheme('light');
      const theme = getTheme();

      expect(theme.id).toBe('light');
      expect(theme.name).toBe('Light');
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

  describe('theme color values', () => {
    it('cosmic should have cyan primary color', () => {
      expect(themes['cosmic'].colors.primary).toBe('#00FFFF');
    });

    it('ember should have warm orange colors', () => {
      expect(themes['ember'].colors.primary).toBe('#FF6B35');
    });

    it('monochrome should have white/gray colors', () => {
      expect(themes['monochrome'].colors.primary).toBe('#FFFFFF');
    });

    it('light should have blue primary color', () => {
      expect(themes['light'].colors.primary).toBe('#0066CC');
    });

    it('high-contrast should have green primary color', () => {
      expect(themes['high-contrast'].colors.primary).toBe('#00FF00');
    });
  });

  describe('high-contrast theme', () => {
    it('should have maximum contrast text colors', () => {
      const hc = themes['high-contrast'].colors;
      expect(hc.textPrimary).toBe('#FFFFFF');
      expect(hc.textSecondary).toBe('#FFFFFF');
    });

    it('should have strong border colors', () => {
      const hc = themes['high-contrast'].colors;
      expect(hc.border).toBe('rgba(255, 255, 255, 0.6)');
    });

    it('should have pure black background', () => {
      const hc = themes['high-contrast'].colors;
      expect(hc.background).toBe('#000000');
    });
  });
});
