module.exports = {
  prefix: "",
  important: true,
  separator: ":",
  variants: {
    inset: ['responsive', 'hover', 'focus'],
    transform: ['responsive'],
    transformOrigin: ['responsive'],
    translate: ['responsive'],
    scale: ['responsive'],
    rotate: ['responsive'],
    skew: ['responsive'],
    perspective: ['responsive'],
    perspectiveOrigin: ['responsive'],
    transformStyle: ['responsive'],
    backfaceVisibility: ['responsive'],
    // opacity: ['responsive', 'hover', 'focus', 'active', 'group-hover'],
    // borderColor: ['responsive', 'hover', 'focus', 'group-hover'],
    // textColor: ['responsive', 'hover', 'focus', 'group-hover'],
    // display: ['responsive', 'hover', 'focus', 'group-hover'],
    visibility: ['responsive', 'hover', 'focus', 'group-hover'],
  },
  theme: {
    fontFamily: {
      sans: ["-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Roboto", '"Helvetica Neue"', "Arial", '"Noto Sans"', "sans-serif", '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"'],
      serif: ["Georgia", "Cambria", '"Times New Roman"', "Times", "serif"],
      mono: ["Menlo", "Monaco", "Consolas", '"Liberation Mono"', '"Courier New"', "monospace"],
      libre: ["Libre-Baskerville-Reg"]
    },
    inset: {
      '0': 0,
      '1/2': '50%',
      '1/4': '25%',
      'auto': 'auto'
    },
    top: {
      '0': 0,
      '1/2': '50%',
      '1/4': '25%',
      'auto': 'auto'
    },
    right: {
      '0': 0,
      '1/2': '50%',
      '1/4': '25%',
      'auto': 'auto'
    },
    left: {
      '0': 0,
      '1/2': '50%',
      '1/4': '25%',
      'auto': 'auto'
    },
    transform: { // defaults to this value
      'none': 'none',
    },
    transformOrigin: { // defaults to these values
      't': 'top',
      'tr': 'top right',
      'r': 'right',
      'br': 'bottom right',
      'b': 'bottom',
      'bl': 'bottom left',
      'l': 'left',
      'tl': 'top left',
    },
    translate: { // defaults to {}
      '1/2': '50%',
      'full': '100%',
      'right-up': ['100%', '-100%'],
      '3d': ['40px', '-60px', '-130px'],
    },
    scale: { // defaults to {}
      '90': '0.9',
      '100': '1',
      '110': '1.1',
      '-100': '-1',
      'stretched-x': ['2', '0.5'],
      'stretched-y': ['0.5', '2'],
      '3d': ['0.5', '1', '2'],
    },
    rotate: { // defaults to {}
      '90': '90deg',
      '180': '180deg',
      '270': '270deg',
      '3d': ['0', '1', '0.5', '45deg'],
    },
    skew: { // defaults to {}
      '-5': '-5deg',
      '5': '5deg',
    },
    perspective: { // defaults to {}
      'none': 'none',
      '250': '250px',
      '500': '500px',
      '750': '750px',
      '1000': '1000px',
    },
    perspectiveOrigin: { // defaults to these values
      't': 'top',
      'tr': 'top right',
      'r': 'right',
      'br': 'bottom right',
      'b': 'bottom',
      'bl': 'bottom left',
      'l': 'left',
      'tl': 'top left',
    },
  },

  // extend: {
  //   variants: { // all the following default to ['responsive']
  //     inset: ['responsive', 'hover', 'focus'],
  //     transform: ['responsive'],
  //     transformOrigin: ['responsive'],
  //     translate: ['responsive'],
  //     scale: ['responsive'],
  //     rotate: ['responsive'],
  //     skew: ['responsive'],
  //     perspective: ['responsive'],
  //     perspectiveOrigin: ['responsive'],
  //     transformStyle: ['responsive'],
  //     backfaceVisibility: ['responsive'],
  //     opacity: ['responsive', 'hover', 'focus', 'active', 'group-hover'],
  //     borderColor: ['responsive', 'hover', 'focus', 'group-hover'],
  //   },
  // },
  plugins: [
    require('tailwindcss-transforms')({
      '3d': false, // defaults to false
    }),
  ],
};
