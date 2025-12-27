/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      // ============================================================================
      // DESIGN TOKENS - Spacing Scale (4px base)
      // Requirements: 31.1, 31.3
      // ============================================================================
      spacing: {
        0.5: "2px",
        1: "4px",
        1.5: "6px",
        2: "8px",
        2.5: "10px",
        3: "12px",
        4: "16px",
        5: "20px",
        6: "24px",
        8: "32px",
        10: "40px",
        12: "48px",
        16: "64px",
        20: "80px",
        24: "96px",
      },

      // ============================================================================
      // DESIGN TOKENS - Typography Scale
      // Requirements: 35.1, 35.2, 35.3
      // ============================================================================
      fontSize: {
        xs: ["12px", { lineHeight: "16px", letterSpacing: "0.01em" }],
        sm: ["14px", { lineHeight: "20px", letterSpacing: "0" }],
        base: ["16px", { lineHeight: "24px", letterSpacing: "0" }],
        lg: ["18px", { lineHeight: "28px", letterSpacing: "-0.01em" }],
        xl: ["20px", { lineHeight: "28px", letterSpacing: "-0.01em" }],
        "2xl": ["24px", { lineHeight: "32px", letterSpacing: "-0.02em" }],
        "3xl": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em" }],
        "4xl": ["40px", { lineHeight: "48px", letterSpacing: "-0.02em" }],
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "Monaco", "monospace"],
      },
      fontWeight: {
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
      },
      lineHeight: {
        tight: "1.2",
        normal: "1.5",
        relaxed: "1.75",
      },

      // ============================================================================
      // DESIGN TOKENS - Border Radius Scale
      // Requirements: 31.1
      // ============================================================================
      borderRadius: {
        none: "0",
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
        full: "9999px",
      },

      // ============================================================================
      // DESIGN TOKENS - Transition Durations
      // Requirements: 31.2, 33.1, 33.2, 33.3
      // ============================================================================
      transitionDuration: {
        fast: "100ms",
        normal: "200ms",
        slow: "300ms",
        slower: "500ms",
      },
      transitionTimingFunction: {
        "ease-out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "ease-in-expo": "cubic-bezier(0.7, 0, 0.84, 0)",
        "ease-in-out-expo": "cubic-bezier(0.87, 0, 0.13, 1)",
        bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },

      // ============================================================================
      // COLOR PALETTE - Using CSS Variables for Theme Support
      // Requirements: 38.1, 38.2, 38.3
      // ============================================================================
      colors: {
        // Memory sector colors - FIXED business logic colors (theme-agnostic)
        sector: {
          episodic: "var(--sector-episodic, #d97706)", // Amber
          semantic: "var(--sector-semantic, #0891b2)", // Cyan
          procedural: "var(--sector-procedural, #9B59B6)", // Purple
          emotional: "var(--sector-emotional, #FFA500)", // Amber
          reflective: "var(--sector-reflective, #C0C0C0)", // Silver
        },
        // Link type colors (static - not themed)
        link: {
          semantic: "#3498DB", // Blue
          causal: "#E67E22", // Orange
          temporal: "#27AE60", // Green
          analogical: "#9B59B6", // Purple
        },
        // UI colors - Using CSS variables for dynamic theming
        ui: {
          background: "var(--theme-background)",
          "background-secondary": "var(--theme-background-secondary)",
          "background-tertiary": "var(--theme-background-tertiary)",
          surface: "var(--theme-surface)",
          "surface-elevated": "var(--theme-surface-elevated)",
          "surface-overlay": "var(--theme-surface-overlay)",
          "surface-sunken": "var(--theme-surface-sunken)",
          border: "var(--theme-border)",
          "border-hover": "var(--theme-border-hover)",
          "border-active": "var(--theme-border-active)",
          text: {
            primary: "var(--theme-text-primary, #ffffff)",
            secondary: "var(--theme-text-secondary, rgba(255, 255, 255, 0.7))",
            tertiary: "var(--theme-text-muted, rgba(255, 255, 255, 0.5))",
            muted: "var(--theme-text-muted, rgba(255, 255, 255, 0.4))",
            disabled: "rgba(128, 128, 128, 0.5)",
          },
          accent: {
            primary: "var(--theme-primary)",
            "primary-muted": "var(--theme-primary-muted)",
            "primary-glow": "var(--theme-primary-glow)",
            "primary-subtle": "var(--theme-primary-subtle)",
            "primary-bg": "var(--theme-primary-bg)",
            secondary: "var(--theme-secondary)",
            "secondary-muted": "var(--theme-secondary-muted)",
            "secondary-glow": "var(--theme-secondary-glow)",
            "secondary-subtle": "var(--theme-secondary-subtle)",
            "secondary-bg": "var(--theme-secondary-bg)",
            highlight: "var(--theme-highlight)",
            "highlight-muted": "var(--theme-highlight-muted)",
            "highlight-glow": "var(--theme-highlight-glow)",
            "highlight-subtle": "var(--theme-highlight-subtle)",
            "highlight-bg": "var(--theme-highlight-bg)",
          },
        },
        // Status colors (static - not themed)
        status: {
          success: "#27AE60",
          "success-glow": "rgba(39, 174, 96, 0.3)",
          "success-bg": "rgba(39, 174, 96, 0.15)",
          warning: "#F39C12",
          "warning-glow": "rgba(243, 156, 18, 0.3)",
          "warning-bg": "rgba(243, 156, 18, 0.15)",
          error: "#E74C3C",
          "error-glow": "rgba(231, 76, 60, 0.3)",
          "error-bg": "rgba(231, 76, 60, 0.15)",
          info: "#3498DB",
          "info-glow": "rgba(52, 152, 219, 0.3)",
          "info-bg": "rgba(52, 152, 219, 0.15)",
        },
      },

      // ============================================================================
      // BACKDROP BLUR
      // Requirements: 38.4
      // ============================================================================
      backdropBlur: {
        "glass-light": "8px",
        glass: "12px",
        "glass-medium": "16px",
        "glass-heavy": "20px",
      },

      // ============================================================================
      // BOX SHADOWS - Using CSS Variables for Theme Support
      // Requirements: 38.6
      // ============================================================================
      boxShadow: {
        // Subtle shadows
        subtle: "0 2px 8px rgba(0, 0, 0, 0.3)",
        medium: "0 4px 16px rgba(0, 0, 0, 0.4)",
        prominent: "0 8px 32px rgba(0, 0, 0, 0.5)",

        // ============================================================================
        // UNIFIED GLOW SYSTEM - Use CSS variables for theme consistency
        // These shadows automatically adapt to light/dark themes via CSS variables
        // ============================================================================

        // Primary glow variants (themed via CSS variables)
        glow: "var(--unified-glow-primary)",
        "glow-sm": "var(--unified-glow-primary-sm)",
        "glow-lg": "var(--unified-glow-primary-lg)",
        "glow-intense": "var(--unified-glow-primary-intense)",

        // Secondary glow variants (themed via CSS variables)
        "glow-secondary": "var(--unified-glow-secondary)",
        "glow-secondary-sm": "var(--unified-glow-secondary-sm)",
        "glow-secondary-lg": "var(--unified-glow-secondary-lg)",

        // Highlight glow variants (themed via CSS variables)
        "glow-highlight": "var(--unified-glow-highlight)",
        "glow-highlight-sm": "var(--unified-glow-highlight-sm)",
        "glow-highlight-lg": "var(--unified-glow-highlight-lg)",

        // Legacy glow variants (mapped to unified system for backward compatibility)
        "glow-gold": "var(--unified-glow-highlight)",
        "glow-gold-sm": "var(--unified-glow-highlight-sm)",
        "glow-gold-lg": "var(--unified-glow-highlight-lg)",
        "glow-purple": "var(--unified-glow-secondary)",
        "glow-purple-sm": "var(--unified-glow-secondary-sm)",
        "glow-purple-lg": "var(--unified-glow-secondary-lg)",

        // Status glow variants (use status color variables)
        "glow-success": "0 0 15px var(--status-success-border, rgba(39, 174, 96, 0.3))",
        "glow-error": "0 0 15px var(--status-error-border, rgba(231, 76, 60, 0.3))",
        "glow-warning": "0 0 15px var(--status-warning-border, rgba(243, 156, 18, 0.3))",

        // Inner glow for glassmorphism (themed)
        "inner-glow": "var(--unified-inner-glow)",
        "inner-glow-gold": "var(--unified-inner-glow-highlight)",
        "inner-glow-purple": "var(--unified-inner-glow-secondary)",

        // Combined panel shadows (themed via CSS variables)
        panel: "var(--unified-panel-glow)",
        "panel-elevated": "0 8px 32px rgba(0, 0, 0, 0.5), var(--unified-glow-primary-sm)",
        "panel-floating": "0 12px 48px rgba(0, 0, 0, 0.6), var(--unified-glow-primary)",
      },

      // ============================================================================
      // ANIMATIONS
      // Requirements: 33.1, 33.2, 33.3, 33.4, 33.5
      // ============================================================================
      animation: {
        // Pulse animations
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        // Glow animations
        glow: "glow 2s ease-in-out infinite alternate",
        "glow-slow": "glow-slow 4s ease-in-out infinite alternate",
        "glow-gold": "glow-gold 2s ease-in-out infinite alternate",
        "glow-purple": "glow-purple 2s ease-in-out infinite alternate",
        "glow-success": "glow-success 0.5s ease-out",
        // Float animations
        float: "float 6s ease-in-out infinite",
        "float-slow": "float-slow 10s ease-in-out infinite",
        // UI animations
        shimmer: "shimmer 2s linear infinite",
        "fade-in": "fadeIn 0.2s ease-out",
        "fade-out": "fadeOut 0.15s ease-in",
        "slide-up": "slideUp 0.2s ease-out",
        "slide-down": "slideDown 0.2s ease-out",
        "slide-in-right": "slideInRight 0.2s ease-out",
        "slide-in-left": "slideInLeft 0.2s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "scale-out": "scaleOut 0.15s ease-in",
        "bounce-in": "bounceIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        shake: "shake 0.4s ease-in-out",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        // Glow keyframes
        glow: {
          "0%": { boxShadow: "0 0 10px rgba(0, 255, 255, 0.2), 0 0 20px rgba(0, 255, 255, 0.1)" },
          "100%": { boxShadow: "0 0 20px rgba(0, 255, 255, 0.4), 0 0 40px rgba(0, 255, 255, 0.2)" },
        },
        "glow-slow": {
          "0%": { boxShadow: "0 0 15px rgba(0, 255, 255, 0.15)" },
          "100%": { boxShadow: "0 0 25px rgba(0, 255, 255, 0.3)" },
        },
        "glow-gold": {
          "0%": { boxShadow: "0 0 10px rgba(255, 215, 0, 0.2), 0 0 20px rgba(255, 215, 0, 0.1)" },
          "100%": { boxShadow: "0 0 20px rgba(255, 215, 0, 0.4), 0 0 40px rgba(255, 215, 0, 0.2)" },
        },
        "glow-purple": {
          "0%": { boxShadow: "0 0 10px rgba(155, 89, 182, 0.2), 0 0 20px rgba(155, 89, 182, 0.1)" },
          "100%": {
            boxShadow: "0 0 20px rgba(155, 89, 182, 0.4), 0 0 40px rgba(155, 89, 182, 0.2)",
          },
        },
        "glow-success": {
          "0%": { boxShadow: "0 0 0 rgba(39, 174, 96, 0)" },
          "50%": { boxShadow: "0 0 20px rgba(39, 174, 96, 0.5)" },
          "100%": { boxShadow: "0 0 0 rgba(39, 174, 96, 0)" },
        },
        // Float keyframes
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "25%": { transform: "translateY(-5px) rotate(1deg)" },
          "50%": { transform: "translateY(-10px) rotate(0deg)" },
          "75%": { transform: "translateY(-5px) rotate(-1deg)" },
        },
        // UI keyframes
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeOut: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        scaleOut: {
          "0%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(0.95)" },
        },
        bounceIn: {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "50%": { transform: "scale(1.02)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-4px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(4px)" },
        },
      },

      // ============================================================================
      // Z-INDEX SCALE
      // Requirements: 36.3
      // ============================================================================
      zIndex: {
        base: "0",
        dropdown: "10",
        sticky: "20",
        fixed: "30",
        "modal-backdrop": "40",
        modal: "50",
        popover: "60",
        tooltip: "70",
        toast: "80",
      },

      // ============================================================================
      // OPACITY SCALE
      // Requirements: 32.6
      // ============================================================================
      opacity: {
        primary: "1",
        secondary: "0.7",
        tertiary: "0.5",
        muted: "0.4",
        disabled: "0.3",
        subtle: "0.15",
        faint: "0.1",
      },
    },
  },
  plugins: [],
};
