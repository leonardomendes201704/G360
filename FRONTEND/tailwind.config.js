/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {},
    },
    // Disabling preflight to avoid conflict with Material UI's CssBaseline
    // We will manually add necessary resets if needed.
    corePlugins: {
        preflight: false,
    },
    plugins: [],
}
