/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,jsx}",
    ],
    theme: {
        extend: {
            colors: {
                'editor-bg': '#18181b',
                'editor-hover': '#2a2a2a',
                'tab-active': '#18181b',
                'tab-inactive': '#27272a',
            }
        },
    },
    plugins: [],
}
