// =============================================================
// What Now? — Direction C ("Chambers")
// Tailwind config fragment. Merge `theme.extend` into the project's
// tailwind.config.{js,ts}. Names map 1:1 to design-tokens/tokens.css.
// =============================================================

/** @type {Partial<import('tailwindcss').Config>} */
module.exports = {
  theme: {
    extend: {
      colors: {
        ink:        { DEFAULT: '#14253a', soft: '#44566b', faint: '#7b8794' },
        paper:      { DEFAULT: '#ffffff', warm: '#f7f4ee', sunk: '#eef0f2' },
        navy:       { DEFAULT: '#1b3a5b', dark: '#122a44', soft: '#e7edf3', ink: '#102744' },
        brass:      { DEFAULT: '#b08d57', text: '#6f5527', q: '#9c7a3e' },
        // "clock" — deadline emphasis (amber, never red)
        gold:       { DEFAULT: '#8a5a14', strong: '#5c3a0a', text: '#7a5a2a', soft: '#f6edda', line: '#e6d5ab', line2: '#ddc794' },
        help:       { DEFAULT: '#2c5544', soft: '#e4ede7', ink: '#173e2c' },
        line:       { DEFAULT: '#dde1e6', card: '#e2e5ea' },
      },
      fontFamily: {
        serif: ['"Libre Baskerville"', 'Georgia', 'serif'], // wordmark + ALL headings
        sans:  ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      fontSize: {
        // [size, { lineHeight }]
        display: ['41px', { lineHeight: '1.16' }],
        h1:      ['34px', { lineHeight: '1.20' }],
        h2:      ['30px', { lineHeight: '1.22' }],
        h3:      ['19px', { lineHeight: '1.30' }],
        lead:    ['18px', { lineHeight: '1.55' }],
        body:    ['16px', { lineHeight: '1.55' }],
        ui:      ['15px', { lineHeight: '1.40' }],
        sm:      ['14px', { lineHeight: '1.45' }],
        meta:    ['13px', { lineHeight: '1.45' }],
        eyebrow: ['11.5px', { lineHeight: '1', letterSpacing: '0.14em' }],
      },
      borderRadius: {
        button: '8px',
        input:  '8px',
        card:   '10px',
        panel:  '12px',
        pill:   '6px',
        icon:   '9px',
      },
      boxShadow: {
        card:     '0 1px 2px rgba(20,37,58,.05)',
        raised:   '0 8px 20px -12px rgba(27,58,91,.40)',
        deadline: '0 14px 30px -18px rgba(138,90,20,.40)',
        cta:      '0 10px 22px -10px rgba(27,58,91,.60)',
      },
      minHeight: { control: '48px' },
    },
  },
};
