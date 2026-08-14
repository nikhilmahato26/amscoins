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
        ink: {
          DEFAULT: "#0B1120",
          2: "#131B31",
          3: "#1E2843",
        },
        brass: {
          DEFAULT: "#C8A24A",
          hover: "#d9b661"
        },
        patina: {
          DEFAULT: "#4E9C86",
        },
        rust: {
          DEFAULT: "#C4553A",
        },
        paper: {
          DEFAULT: "#EDF0F5",
        },
        mist: {
          DEFAULT: "#8E99B4",
        },
        // App shell palette (Figma "Ready for dev" mobile screens).
        // Kept separate from the ink/brass landing palette so the two don't collide.
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
        },
        plate: "#B1B5BB",
        frost: "#F0F4FF",
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
        scroll: {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-50%)" },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "scroll": "scroll 30s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
