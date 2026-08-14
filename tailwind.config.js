/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // Marketing/auth palette. Repointed from the original navy + brass to
        // match the Figma app screens, so the landing page and the logged-in
        // app no longer read as two different products. Names kept so existing
        // markup keeps working.
        ink: {
          DEFAULT: "#000000",
          2: "#1A1A1A",
          3: "#2A2A2A",
        },
        brass: {
          DEFAULT: "#F59E0B",
          hover: "#FBBF24",
        },
        patina: {
          DEFAULT: "#10B981",
        },
        rust: {
          DEFAULT: "#8A33D7",
        },
        paper: {
          DEFAULT: "#FCFCFC",
        },
        mist: {
          DEFAULT: "#9CA3AF",
        },
        // App shell palette (Figma "Ready for dev" mobile screens).
        brand: {
          DEFAULT: "#8A33D7",
          deep: "#782DBA",
        },
        surface: {
          DEFAULT: "#1A1A1A",
          2: "#1C1C1E",
          nav: "#0A0A0A",
        },
        gold: {
          light: "#FFF5C2",
          DEFAULT: "#FFD700",
          dark: "#B8860B",
          bright: "#F4C506",
          antique: "#D4AF37",
          warm: "#E8B84B",
          pale: "#F3E2B3",
          solid: "#FFC30F",
        },
        plate: "#B1B5BB",
        frost: "#F0F4FF",
        haze: "#B4C4E0",
        sheen: "#C8D8EC",
        abyss: "#080C14",
        steel: "#B8C8E0",
        deep: "#0E1520",
        ruby: {
          DEFAULT: "#E0115F",
          deep: "#800020",
        },
        night: "#050505",
        // Light home palette. Sampled by eye from the supplied PNG mockup, so
        // these are approximations — replace with the real brand values.
        asm: {
          blue: "#0B4FD8",
          "blue-dark": "#0740B8",
          "blue-tint": "#EDF3FF",
          // Decorative only — 3.29:1 on white, so never use it for text or for
          // a fill that carries white text. Pulse dots, swatches, chart strokes.
          green: "#17A34A",
          // Text-safe green: 5.02:1 on white, 4.68:1 on tint, and white on it
          // is 5.02:1, so it works as a label colour and as a button fill.
          greenInk: "#15803D",
          "green-tint": "#EAF7EF",
          // Downward movement. 5.74:1 on white, 5.35:1 on tint.
          red: "#C81E1E",
          navy: "#102A5C",
          // Secondary text tinted from the navy hue rather than neutral gray.
          // Measured against every light surface in this palette: body clears
          // 5.5:1 and muted 5.16:1 on the worst case (asm-tint).
          body: "#546582",
          muted: "#55698E",
          line: "#E5EAF3",
          tint: "#F4F7FE",
        },
        bluesteel: {
          from: "#8FA8C0",
          to: "#6A8AA8",
        },
        tier: {
          "silver-from": "#CED5E1",
          "silver-to": "#868B95",
          "gold-from": "#FF9E45",
          "gold-to": "#F37400",
          diamond: "#1E93FE",
          ribbon: "#BC24A3",
          "ribbon-alt": "#FFA00F",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        sans: ['Instrument Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
        // Type system used by the Figma app screens.
        jakarta: ['Plus Jakarta Sans', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
        dmserif: ['DM Serif Display', 'serif'],
        playfair: ['Playfair Display', 'serif'],
        script: ['Lobster', 'cursive'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        scroll: {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-50%)" },
        },
        rise: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "live-pulse": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.45", transform: "scale(0.82)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "scroll": "scroll 30s linear infinite",
        // Exponential ease-out, from a default that is already visible if
        // animations never run.
        rise: "rise 0.62s cubic-bezier(0.16, 1, 0.3, 1) both",
        "live-pulse": "live-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        marquee: "marquee 28s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
