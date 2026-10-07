const plugin = require("tailwindcss/plugin");

module.exports = {
    darkMode: "class",
    content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
    theme: {
        extend: {
            backgroundImage: {
                'spring-background': 'url(\'/images/backgrounds/spring_bg.jpg\')',
                'shop-background': 'url(\'/images/backgrounds/shop_bg.jpg\')',
                'map-background': 'url(\'/images/backgrounds/map_full.png\')',
                'wooden-background': 'url(\'/images/backgrounds/wooden_background.jpg\')',
                'cardboard-background': 'url(\'/images/backgrounds/cardboard_background.jpg\')',
            },
            fontFamily: {
                luckiest: ['LuckiestGuy', 'sans-serif'],
            },
        },
    },
};
