/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,jsx}",
    ],
    theme: {
        extend: {
            colors: {
                'editor-bg': '#1e1e1e',
                'editor-hover': '#2a2a2a',
                'tab-active': '#1e1e1e',
                'tab-inactive': '#2d2d2d',
            }
        },
    },
    plugins: [],
}
