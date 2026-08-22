'use strict';

const ORIGIN = 'https://futuremusic.online';
const ORG_ID = ORIGIN + '/#org';
const SITE_ID = ORIGIN + '/#website';
const DATE = '2026-08-22';

const org = {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'Future Music Collective',
    url: ORIGIN,
    logo: ORIGIN + '/images/logo.png',
};

const website = {
    '@type': 'WebSite',
    '@id': SITE_ID,
    url: ORIGIN,
    name: 'Future Music Collective',
    publisher: { '@id': ORG_ID },
};

function abs(path) {
    if (!path) return ORIGIN + '/images/logo.png';
    if (/^https?:\/\//i.test(path)) return path;
    return ORIGIN + path;
}

const LINKS = {
    'hero-slayer': { href: '/hero-slayer', name: 'Hero Slayer' },
    'zombie-defense': { href: '/zombie-defense', name: 'Zombie Outpost Defense' },
    paintcadia: { href: '/paintcadia', name: 'Paintcadia' },
    'addiction-slayer': { href: '/addiction-slayer', name: 'Addiction Slayer' },
    'target-catharsis': { href: '/target-catharsis', name: 'Target Catharsis' },
    'herd-orama': { href: '/herd-orama', name: 'Herd-Orama' },
    domain: { href: '/domain', name: 'Domain' },
    rampart: { href: '/rampart', name: 'Rampart Reborn' },
    neweden: { href: '/neweden', name: 'New Eden' },
    'color-contagion': { href: '/color-contagion', name: 'Color Contagion' },
    terrarium: { href: '/terrarium', name: 'Nature Terrarium' },
    numgen: { href: '/numgen', name: 'Random Number Generator' },
    projects: { href: '/projects', name: 'Projects' },
};

function rel(...slugs) {
    return slugs.map((s) => LINKS[s]).filter(Boolean);
}

const PAGES = {
    projects: {
        kind: 'hub',
        path: '/projects',
        title: 'Free Browser Games & Creative Tools | Future Music Collective',
        description:
            'Play free HTML5 browser games from Future Music Collective: zombie tower defense, arcade action, animal survival, strategy, and painting combat. Also includes Hero Slayer alpha and a free random number generator.',
        keywords:
            'free browser games, HTML5 games, play games online, zombie tower defense, arcade games, indie games, Future Music Collective',
        image: '/images/preview.jpg',
        h1: 'Project Archive — Games & Tools',
        sitemapPri: '0.9',
    },
    numgen: {
        kind: 'tool',
        path: '/numgen',
        title: 'Random Number Generator — Free 10-Digit Number Generator Online',
        description:
            'Free random number generator: create 1,000 ten-digit numbers in one click, comma-separated and ready to copy. Also generate any count, digit length, or min–max range. Runs in your browser — no signup.',
        keywords:
            'random number generator, number generator, random number generator online, 10 digit number generator, generate random numbers, random number picker, comma separated random numbers, bulk random number generator, free number generator',
        image: '/images/logo.png',
        h1: 'Random Number Generator',
        lede: 'A free online number generator that creates random numbers in your browser. One click produces 1,000 ten-digit random numbers, comma-separated and ready to copy.',
        appName: 'Random Number Generator',
        featureList: [
            'Generate 1,000 ten-digit random numbers per click',
            'Comma-separated, newline, or space-separated output',
            'Custom count, digit length, and min–max range',
            'Copy and download results',
            'Runs locally in the browser',
        ],
        howtoName: 'How to generate random numbers online',
        howto: [
            'Leave the defaults for a 10-digit random number generator batch of 1,000, or set count and digits.',
            'Optional: choose min–max range mode, unique values, or a different separator.',
            'Press Generate. The button label updates to match your count.',
            'Press Copy All or Download .txt. Press Clear to empty the box.',
        ],
        faq: [
            {
                q: 'What is a random number generator?',
                a: 'A random number generator is a program that produces numbers that are hard to predict. This page is a free number generator you can use in any modern browser without installing software.',
            },
            {
                q: 'How do I generate 10-digit random numbers?',
                a: 'Keep “Digits per number” at 10 (the default) and press Generate. Each result is a 10-digit string from 0000000000 to 9999999999. Turn off “Keep leading zeros” if you want unpadded integers instead.',
            },
            {
                q: 'Can I generate 1000 random numbers at once?',
                a: 'Yes. The default batch size is 1,000. You can request anywhere from 1 to 10,000 numbers per click, then copy the whole comma-separated list or download it as a text file.',
            },
            {
                q: 'Is this random number generator free?',
                a: 'Yes. There is no signup, no watermark, and no usage cap beyond the 10,000-per-click limit (click Generate again for another batch).',
            },
            {
                q: 'Are the numbers cryptographically secure?',
                a: 'They are drawn with the Web Cryptography API in supporting browsers, which is far stronger than a simple Math.random() toy. Still, do not use the output as production encryption keys, wallet seeds, or official lottery results.',
            },
            {
                q: 'Do you store the numbers I generate?',
                a: 'No. Generation happens on your device. Future Music Collective does not receive, log, or save the list.',
            },
            {
                q: 'What is the difference between a number generator and a random number picker?',
                a: 'People use both phrases for the same idea. “Number generator” often means bulk IDs or codes; “random number picker” often means one integer from a min–max range. This tool does both.',
            },
        ],
        related: rel('projects', 'hero-slayer', 'zombie-defense'),
        sitemapPri: '0.9',
    },
    'hero-slayer': {
        kind: 'game',
        path: '/hero-slayer',
        title: 'Hero Slayer — Mythology Army Builder & Bullet Hell (Windows Alpha)',
        description:
            'Hero Slayer is a mythology strategy game: summon portal armies, hunt world heroes, and fight in a top-down / FPS bullet-hell hybrid. Windows alpha access is $5 (75% off $20).',
        keywords:
            'Hero Slayer, army builder game, mythology strategy game, bullet hell strategy, summon army game, indie Windows game, hero hunter game',
        image: '/images/hero-slayer/demon_king.jpg',
        gameName: 'Hero Slayer',
        genre: ['Strategy', 'Action', 'Bullet hell', 'Role-playing'],
        platform: ['Windows'],
        playMode: 'SinglePlayer',
        isFree: false,
        price: '5.00',
        h1: 'Hero Slayer',
        faq: [
            {
                q: 'What is Hero Slayer?',
                a: 'Hero Slayer is a mythology strategy game where you summon and upgrade armies from a dimensional portal, capture territories, and hunt living heroes in a hybrid top-down and first-person bullet-hell battlefield.',
            },
            {
                q: 'Is Hero Slayer free to play?',
                a: 'No. Alpha access is a paid Windows download. The current alpha price is $5, marked down from a $20 retail price (75% off).',
            },
            {
                q: 'What platform does Hero Slayer run on?',
                a: 'The alpha is a Windows package. After checkout you receive an obfuscated zip download to play on PC.',
            },
            {
                q: 'How do I buy Hero Slayer alpha?',
                a: 'Open the Hero Slayer page, press Confirm & Checkout, and complete Stripe payment. Entitled accounts can then download the game zip.',
            },
            {
                q: 'What kind of units can you summon?',
                a: 'Portal armies include goblin swarms, acid slimes, vampires, shadow dragons, bone constructs, and the Demon King apex, plus banners, temples, and god powers that reshape the map.',
            },
        ],
        related: rel('zombie-defense', 'paintcadia', 'rampart', 'projects'),
        sitemapPri: '0.85',
    },
    'zombie-defense': {
        kind: 'game',
        path: '/zombie-defense',
        title: 'Zombie Outpost Defense — Free Browser Tower Defense Game',
        description:
            'Play Zombie Outpost Defense free in your browser. Draw tactical walls, hire units, upgrade your arsenal, and survive endless undead waves in this HTML5 zombie tower defense game. No download.',
        keywords:
            'zombie tower defense, zombie defense game, free zombie game, browser tower defense, HTML5 zombie game, outpost defense, play zombie game online',
        image: '/images/zombie-thumbnail.png',
        gameName: 'Zombie Outpost Defense',
        genre: ['Tower defense', 'Strategy', 'Survival', 'Action'],
        platform: ['Web Browser', 'HTML5'],
        playMode: 'SinglePlayer',
        isFree: true,
        eyebrow: 'Free HTML5 game',
        h1: 'Zombie Outpost Defense',
        lede: 'A free browser zombie tower defense game. Draw your fortifications, hire specialized defenders, and hold the camp against endless waves of the undead — no download, no account.',
        playSrc: '/zombie-defense/index.html',
        fullscreenHref: '/zombie-defense/index.html',
        playLabel: 'Play zombie defense',
        tags: ['Tower defense', 'Zombies', 'Strategy', 'Free', 'Browser'],
        about: [
            'Zombie Outpost Defense is a free online tower defense game set at a last-stand camp. You sketch walls and emplacements, spend resources on units, and upgrade weapons while the horde scales in density and speed.',
            'Unlike a static grid tower defense, the outpost loop rewards placement, timing, and loadout choices. Specialists cover lanes; splash weapons clear clumps; speed controls let you study a wave or rush the next one.',
            'Play it full screen on desktop or in the embed on this page. Progress is local to your browser session unless the game UI says otherwise.',
        ],
        howto: [
            'Press Play or use the embed below. Click through the title screens to reach the outpost.',
            'Draw or place defenses around your camp before the first wave arrives.',
            'Hire units and spend upgrades between waves. Watch weak lanes and rebuild broken walls.',
            'Survive as long as you can. Open fullscreen if you want the canvas to fill the display.',
        ],
        faq: [
            {
                q: 'Is Zombie Outpost Defense free?',
                a: 'Yes. It runs in the browser on this site with no purchase and no app store download.',
            },
            {
                q: 'Do I need to install anything?',
                a: 'No. Any modern desktop or mobile browser with HTML5 canvas can play. Fullscreen is optional.',
            },
            {
                q: 'What type of game is this?',
                a: 'It is a zombie tower defense / base-defense survival game: you fortify an outpost and hold waves rather than running a linear shooter campaign.',
            },
            {
                q: 'Does it work on phones?',
                a: 'Yes, the canvas scales to the screen. Landscape plus fullscreen is the most comfortable layout for drawing defenses.',
            },
        ],
        related: rel('paintcadia', 'addiction-slayer', 'rampart', 'hero-slayer'),
        sitemapPri: '0.85',
    },
    paintcadia: {
        kind: 'game',
        path: '/paintcadia',
        title: 'Paintcadia — Free Painting Tower Defense Browser Game',
        description:
            'Play Paintcadia free online: a colorful painting combat game where you defend painted maps with troops, bosses, and custom images. HTML5, no download — tutorial and custom games included.',
        keywords:
            'Paintcadia, painting game, color tower defense, paint defense game, free browser game, custom map game, HTML5 painting game',
        image: '/images/paintcadia-thumbnail.png',
        gameName: 'Paintcadia',
        genre: ['Tower defense', 'Art', 'Strategy', 'Action'],
        platform: ['Web Browser', 'HTML5'],
        playMode: 'SinglePlayer',
        isFree: true,
        eyebrow: 'Free HTML5 game',
        h1: 'Paintcadia',
        lede: 'A free painting tower defense game in the browser. Color the battlefield, deploy troops, and fight through painted maps — or upload your own image for a custom game.',
        playSrc: '/paintcadia/index.html',
        fullscreenHref: '/paintcadia/index.html',
        playLabel: 'Play Paintcadia',
        tags: ['Painting', 'Tower defense', 'Color', 'Free', 'Browser'],
        about: [
            'Paintcadia mixes illustration with tower defense. You fight across hand-painted stages with knights, musketeers, tanks, wildlife, and bosses while the soundtrack from Future Music Collective runs underneath.',
            'The tutorial teaches the loop. Custom Game lets you load a PNG or JPEG and turn any picture into a battlefield. Campaign levels are listed in the menu as they unlock.',
            'It is built for short browser sessions: click to start, mute or fullscreen from the corner controls, and jump back to the Projects archive when you are done.',
        ],
        howto: [
            'Click Play in the embed or open fullscreen. Dismiss the logo, then click to start.',
            'Choose Tutorial for a guided round, or Custom Game to upload an image as the map.',
            'Place and command units to defend painted ground. Use mute and fullscreen from the top-right controls.',
            'Return here or to Projects when you want another Future Music game.',
        ],
        faq: [
            {
                q: 'What is Paintcadia?',
                a: 'Paintcadia is a free browser game that combines painting and tower defense. You defend colorful maps with troops and can upload your own image for a custom match.',
            },
            {
                q: 'Is Paintcadia free to play?',
                a: 'Yes. It runs on futuremusic.online in HTML5 with no login required to start a game.',
            },
            {
                q: 'Can I use my own artwork?',
                a: 'Yes. Custom Game accepts PNG and JPEG uploads so you can turn a picture into a playable battlefield.',
            },
            {
                q: 'Does it work without downloading an app?',
                a: 'Yes. It is an in-browser HTML5 game. Fullscreen is available from the in-game control bar.',
            },
        ],
        related: rel('zombie-defense', 'target-catharsis', 'color-contagion', 'hero-slayer'),
        sitemapPri: '0.85',
    },
    'addiction-slayer': {
        kind: 'game',
        path: '/addiction-slayer',
        title: 'Addiction Slayer — Free Arcade Action Game in Your Browser',
        description:
            'Play Addiction Slayer free online: an arcade action game where you fight physical manifestations of craving with precision strikes, power-ups, and reflex combat. HTML5, no download.',
        keywords:
            'Addiction Slayer, arcade action game, free browser game, reflex game, HTML5 action game, indie arcade game',
        image: '/images/addictionSlayer.png',
        gameName: 'Addiction Slayer',
        genre: ['Action', 'Arcade', 'Shooter'],
        platform: ['Web Browser', 'HTML5'],
        playMode: 'SinglePlayer',
        isFree: true,
        eyebrow: 'Free HTML5 game',
        h1: 'Addiction Slayer',
        lede: 'A free arcade action game about breaking the cycle. Face down manifestations of craving, land precision strikes, and reclaim the screen — play instantly in the browser.',
        playSrc: '/addiction%20slayer/index.html',
        fullscreenHref: '/addiction%20slayer/index.html',
        playLabel: 'Play Addiction Slayer',
        tags: ['Arcade', 'Action', 'Free', 'Browser'],
        about: [
            'Addiction Slayer is a fast HTML5 arcade game: pickups, hazards, and bosses stand in for habits you cut down with timing and movement rather than a lecture.',
            'The loop is score-and-survive. Good items help, bad items punish, and weapons or shields change how aggressive you can be in a wave.',
            'It is designed to run full screen in a desktop or mobile browser with no account. Sound can be loud; use device volume or in-game mute if present.',
        ],
        howto: [
            'Start the embed or open fullscreen, then click the logo screen to enter the game.',
            'Move and strike as the on-screen prompts show. Prioritize threats that drain health.',
            'Grab helpful pickups and avoid junk that inflicts status or damage.',
            'Chase a longer run. Reload the page to restart a session from the title.',
        ],
        faq: [
            {
                q: 'Is Addiction Slayer a therapy app?',
                a: 'No. It is an arcade action game with an addiction metaphor. It is not medical treatment and does not replace professional care.',
            },
            {
                q: 'Is it free?',
                a: 'Yes. Play it in the browser on this page. No download and no paid gate on the web version.',
            },
            {
                q: 'What are the controls?',
                a: 'Use the on-screen instructions after the title. Desktop play typically uses keyboard or mouse; touch devices use tap and on-screen buttons.',
            },
            {
                q: 'Can I play on mobile?',
                a: 'Yes. The canvas is built for browsers on phones and desktops. Fullscreen helps on small screens.',
            },
        ],
        related: rel('zombie-defense', 'target-catharsis', 'hero-slayer', 'paintcadia'),
        sitemapPri: '0.8',
    },
    'target-catharsis': {
        kind: 'game',
        path: '/target-catharsis',
        title: 'Target Catharsis — Free Color-Matching Arcade Game',
        description:
            'Play Target Catharsis free in your browser: a precision color-matching arcade game about rhythm, reflexes, and breaking the right targets. HTML5, no download.',
        keywords:
            'Target Catharsis, color matching game, reflex arcade game, free browser arcade, HTML5 color game, rhythm action game',
        image: '/images/target.png',
        gameName: 'Target Catharsis',
        genre: ['Arcade', 'Action', 'Puzzle'],
        platform: ['Web Browser', 'HTML5'],
        playMode: 'SinglePlayer',
        isFree: true,
        eyebrow: 'Free HTML5 game',
        h1: 'Target Catharsis',
        lede: 'A free precision arcade game. Match colors, break the right targets, and stay in rhythm as the field speeds up — built for short, focused browser sessions.',
        playSrc: '/TargetGame/target.html',
        fullscreenHref: '/TargetGame/target.html',
        playLabel: 'Play Target Catharsis',
        tags: ['Arcade', 'Color', 'Reflexes', 'Free', 'Browser'],
        about: [
            'Target Catharsis is a color-driven arcade shooter/puzzle hybrid. You clear solid and fractured targets by picking the matching color under time pressure, with bombs, hourglasses, and stars mixing the cadence.',
            'The visual language is neon-on-dark with rain and pulse effects. Rounds are short; the skill ceiling is accuracy plus switching speed, not a long RPG grind.',
            'Play in the embed or fullscreen. Some builds show mid-session video ads; you can close them from the overlay when the timer allows.',
        ],
        howto: [
            'Load the embed below or open fullscreen.',
            'Select a color, then hit matching targets. Wrong colors break your flow.',
            'Use pickups (bomb, hourglass, star) when they appear to reset pressure.',
            'Chase combos. Restart anytime by refreshing the game frame.',
        ],
        faq: [
            {
                q: 'What is Target Catharsis?',
                a: 'It is a free browser arcade game about matching colors and breaking the correct targets with timing and accuracy.',
            },
            {
                q: 'Is Target Catharsis free?',
                a: 'Yes. Play it on this page with no download. An optional fullscreen view is linked above the FAQ.',
            },
            {
                q: 'Does it work on mobile?',
                a: 'Yes. Tap targets on a phone; a landscape view is easier once the field gets dense.',
            },
            {
                q: 'Is this a rhythm game?',
                a: 'It plays like a reflex/rhythm hybrid: audio and spawn timing matter, but you aim at colored targets rather than hitting notes on a highway.',
            },
        ],
        related: rel('paintcadia', 'addiction-slayer', 'color-contagion', 'zombie-defense'),
        sitemapPri: '0.8',
    },
    'herd-orama': {
        kind: 'game',
        path: '/herd-orama',
        title: 'Herd-Orama — Free Animal Survival Game in the Browser',
        description:
            'Play Herd-Orama (Herd Survival) free online. Pick an animal, grow your herd, fight rivals, and dominate a browser ecosystem. HTML5 animal survival — no download.',
        keywords:
            'Herd-Orama, herd survival game, animal survival game, grow your herd, free browser game, animal io game, HTML5 survival',
        image: '/herd.io%20distribution/menu_background.png',
        gameName: 'Herd-Orama',
        genre: ['Survival', 'Action', 'Simulation'],
        platform: ['Web Browser', 'HTML5'],
        playMode: 'SinglePlayer',
        isFree: true,
        eyebrow: 'Free HTML5 game',
        h1: 'Herd-Orama',
        lede: 'A free animal survival game in your browser. Choose a species, grow the herd, pick fights you can win, and climb the food chain in a compact ecosystem.',
        playSrc: '/herd.io%20distribution/index.html',
        fullscreenHref: '/herd.io%20distribution/index.html',
        playLabel: 'Play Herd-Orama',
        tags: ['Survival', 'Animals', 'Herd', 'Free', 'Browser'],
        about: [
            'Herd-Orama (also called Herd Survival) is an HTML5 ecosystem brawler. You pick a creature — from prey animals to apex options like lion, wolf, or T-rex — then roam, eat, populate, and fight.',
            'The fantasy is an .io-style herd: numbers and upgrades matter as much as the individual avatar. Soundtrack and species callouts are original to the Future Music Collective build.',
            'If a checkout overlay appears for extras, open fullscreen so payment can run as a top-level page. The core survival loop itself plays in the embed.',
        ],
        howto: [
            'Start in the embed or, for the most reliable input and any checkout, use Play fullscreen.',
            'Click the logo, then choose an animal on the menu.',
            'Move, graze or hunt, and grow population. Avoid fights you cannot win yet.',
            'Spend upgrades when the herd can afford them. Restart from the menu after a wipe.',
        ],
        faq: [
            {
                q: 'What is Herd-Orama?',
                a: 'Herd-Orama is a free browser animal survival game. You pick a species, grow a herd, and compete for space in a small wild map.',
            },
            {
                q: 'Is Herd-Orama the same as Herd Survival?',
                a: 'Yes. The in-game title screen says Herd Survival; this site lists it as Herd-Orama. Both names refer to the same HTML5 game.',
            },
            {
                q: 'Is it free to play?',
                a: 'Yes. The browser game is free. Fullscreen is recommended if you use any optional paid extras so checkout is not trapped in an iframe.',
            },
            {
                q: 'What animals can I play?',
                a: 'The roster includes herd and hunter species such as deer, dog, pig, snake, crocodile, lion, wolf, gorilla, elephant, and more unlockable creatures.',
            },
        ],
        related: rel('zombie-defense', 'addiction-slayer', 'terrarium', 'hero-slayer'),
        sitemapPri: '0.8',
    },
    domain: {
        kind: 'game',
        path: '/domain',
        title: 'Domain — Multiplayer Strategy Territory Game (Up to 4 Players)',
        description:
            'Domain is a retro-inspired multiplayer strategy game: chess-like maneuvering, resource pools, decks, and civ abilities for up to 4 players. Preview the interface and design on Future Music Collective.',
        keywords:
            'Domain strategy game, multiplayer territory game, chess like strategy, deck strategy game, 4 player strategy game, retro strategy',
        image: '/images/domain3.png',
        gameName: 'Domain',
        genre: ['Strategy', 'Board game', 'Multiplayer'],
        platform: ['Web'],
        playMode: 'MultiPlayer',
        isFree: true,
        h1: 'Domain',
        faq: [
            {
                q: 'What is Domain?',
                a: 'Domain is a strategy game about conquering a shared map with up to four players. It mixes chess-like positioning, resource timing, and deck abilities.',
            },
            {
                q: 'How many players does Domain support?',
                a: 'Up to four players can vie for the same board in a session.',
            },
            {
                q: 'Is Domain like chess?',
                a: 'It uses chess-like maneuvering but adds resource pools, unique abilities, and civilization-style construction rather than a pure orthodox chess ruleset.',
            },
            {
                q: 'Where can I learn more?',
                a: 'This page shows the interface and design. Related browser games from the same collective are linked below, including Rampart Reborn and Hero Slayer.',
            },
        ],
        related: rel('rampart', 'hero-slayer', 'zombie-defense', 'projects'),
        sitemapPri: '0.7',
    },
    rampart: {
        kind: 'game',
        path: '/rampart',
        title: 'Rampart Reborn — Free Castle Defense Game (Rampart-Style Browser Remake)',
        description:
            'Play Rampart Reborn free in the browser: a castle-building artillery game inspired by classic Rampart. Place walls, place cannons, and survive the siege. Includes a mod lab for community forks.',
        keywords:
            'Rampart Reborn, Rampart game, castle defense game, artillery strategy game, browser Rampart, HTML5 castle game, wall building game',
        image: '/images/rampart-thumbnail.png',
        gameName: 'Rampart Reborn',
        genre: ['Strategy', 'Artillery', 'Castle defense'],
        platform: ['Web Browser', 'HTML5'],
        playMode: 'MultiPlayer',
        isFree: true,
        h1: 'Rampart Reborn',
        faq: [
            {
                q: 'What is Rampart Reborn?',
                a: 'Rampart Reborn is a browser remake of the classic Rampart loop: build castle walls, place cannons, and bombard rival keeps between building phases.',
            },
            {
                q: 'Is Rampart Reborn free?',
                a: 'Yes. Play the official build in the browser from this page. Source download and community forks are available from the same shell.',
            },
            {
                q: 'Can I mod Rampart Reborn?',
                a: 'Yes. The page includes a mod lab for documented forks. Login is required to upload a new fork; anyone can play listed versions.',
            },
            {
                q: 'Is this the original arcade Rampart?',
                a: 'No. It is an original HTML5 reimplementation inspired by the arcade/SNES castle-defense classic, not a ROM or official port.',
            },
        ],
        related: rel('zombie-defense', 'domain', 'hero-slayer', 'projects'),
        sitemapPri: '0.8',
    },
    neweden: {
        kind: 'game',
        path: '/neweden',
        title: 'New Eden — Free 3D Browser Exploration Game (Quest 3 VR)',
        description:
            'Play New Eden free in the browser: a low-poly 3D world with portals, NPCs, trains, and co-op for up to four explorers. Works in desktop Chrome and Meta Quest Browser with Enter VR.',
        keywords:
            'New Eden game, 3D browser game, Quest 3 VR game, WebXR exploration, low poly MMO, free browser 3D game, Starleap',
        image: '/games/neweden/og.jpg',
        gameName: 'New Eden',
        genre: ['Adventure', 'Exploration', 'MMO', 'VR'],
        platform: ['Web Browser', 'WebXR', 'Meta Quest'],
        playMode: 'MultiPlayer',
        isFree: true,
        h1: 'New Eden',
        faq: [],
        related: rel('hero-slayer', 'rampart', 'herd-orama', 'projects'),
        sitemapPri: '0.75',
    },
    'color-contagion': {
        kind: 'game',
        path: '/color-contagion',
        title: 'Color Contagion — Relaxing Colorization & Brain-Upgrade Game',
        description:
            'Color Contagion (Colorization) is a relaxing browser game: upgrade regions of a character’s brain, invent, talk, and colorize a black-and-white world. Play the hosted HTML5 build free.',
        keywords:
            'Color Contagion, Colorization game, relaxing color game, brain upgrade game, idle colorization, free color game',
        image: '/images/FALLBACK_IMG.png',
        gameName: 'Color Contagion',
        genre: ['Casual', 'Simulation', 'Puzzle'],
        platform: ['Web Browser', 'HTML5'],
        playMode: 'SinglePlayer',
        isFree: true,
        eyebrow: 'Free hosted game',
        h1: 'Color Contagion',
        lede: 'A relaxing colorization game. Upgrade regions of your character’s brain, unlock inventions and dialogue, and slowly paint a black-and-white world back to life.',
        playHref: 'https://mobile-game-853337900822.us-central1.run.app/',
        playLabel: 'Play Color Contagion',
        tags: ['Casual', 'Color', 'Relaxing', 'Free'],
        about: [
            'Color Contagion — also listed as Colorization — is a low-pressure progression game. You invest in mental regions, watch the world gain color, and collect inventions instead of surviving a combat clock.',
            'The hosted build runs on a dedicated Cloud Run app. This page is the Future Music Collective landing so search engines and assistants can recommend it alongside the other browser games.',
            'Expect a contemplative pace, readable upgrades, and a tone closer to a toy than an action score-chaser.',
        ],
        howto: [
            'Press Play Color Contagion to open the hosted game in a new tab.',
            'Start upgrading a brain region from the main view.',
            'Spend progress on inventions and dialogue as they unlock.',
            'Keep coloring regions until the world map fills in.',
        ],
        faq: [
            {
                q: 'Is Color Contagion the same as Colorization?',
                a: 'Yes. Colorization is the working name of the relaxing brain-upgrade / color-the-world game. This site presents it as Color Contagion.',
            },
            {
                q: 'Is it free?',
                a: 'Yes. The hosted HTML5 build is free to open in a browser.',
            },
            {
                q: 'Why does play open another site?',
                a: 'The live game is deployed on its own Cloud Run service. This page is the canonical description and recommendation landing on futuremusic.online.',
            },
            {
                q: 'Is it an action game?',
                a: 'No. It is a relaxing progression toy about coloring a world and upgrading mental regions, not a shooter or tower defense.',
            },
        ],
        related: rel('paintcadia', 'target-catharsis', 'terrarium', 'projects'),
        sitemapPri: '0.7',
    },
    terrarium: {
        kind: 'game',
        path: '/terrarium',
        title: 'Nature Terrarium — Free Bird Sandbox & Ecosystem Toy',
        description:
            'Open Nature Terrarium in your browser: spawn robins, blue jays, and cardinals, tweak game speed, and watch a small ecosystem. A free HTML5 nature sandbox — no download.',
        keywords:
            'bird terrarium game, nature sandbox, free ecosystem toy, spawn birds game, HTML5 terrarium, virtual bird sanctuary',
        image: '/images/logo.png',
        gameName: 'Nature Terrarium',
        genre: ['Simulation', 'Sandbox', 'Casual'],
        platform: ['Web Browser', 'HTML5'],
        playMode: 'SinglePlayer',
        isFree: true,
        eyebrow: 'Free HTML5 sandbox',
        h1: 'Nature Terrarium',
        lede: 'A free browser terrarium. Spawn birds, pause time, and watch a tiny sky-and-trees ecosystem without a fail state.',
        playSrc: '/terrarium/index.html',
        fullscreenHref: '/terrarium/index.html',
        playLabel: 'Open terrarium',
        tags: ['Sandbox', 'Birds', 'Nature', 'Free'],
        about: [
            'Nature Terrarium is a quiet HTML5 sandbox: a roster of birds, speed control, pause, and an immortal toggle if you would rather watch than manage deaths.',
            'It is a toy rather than a high-score game. Sessions can persist through the site’s terrarium save API when a session token is present.',
            'Use fullscreen if you want the canvas to fill the monitor; the embed on this page is enough for a quick look.',
        ],
        howto: [
            'Load the embed or open fullscreen.',
            'Press a bird button (Robin, Blue Jay, Cardinal) to spawn.',
            'Drag game speed, pause, or enable Immortal Birds from the top-right panel.',
            'Leave it running as ambient motion, or refresh to reset the population.',
        ],
        faq: [
            {
                q: 'What is Nature Terrarium?',
                a: 'It is a free browser sandbox where you spawn birds and watch a small ecosystem. There is no campaign and no required objective.',
            },
            {
                q: 'Is it free?',
                a: 'Yes. It runs in HTML5 on this site with no purchase.',
            },
            {
                q: 'Can I save my terrarium?',
                a: 'When the page has a session, the game can save and load through the terrarium API. Otherwise the population lasts for the tab.',
            },
            {
                q: 'Is this a game with a score?',
                a: 'No. It is an ambient nature toy. If you want a scored arcade, try Target Catharsis or Zombie Outpost Defense.',
            },
        ],
        related: rel('herd-orama', 'color-contagion', 'paintcadia', 'numgen'),
        sitemapPri: '0.6',
    },
};

function breadcrumbs(def) {
    const items = [
        { '@type': 'ListItem', position: 1, name: 'Home', item: ORIGIN + '/' },
        { '@type': 'ListItem', position: 2, name: 'Projects', item: ORIGIN + '/projects' },
    ];
    if (def.path !== '/projects') {
        items.push({
            '@type': 'ListItem',
            position: 3,
            name: def.gameName || def.appName || def.h1,
            item: ORIGIN + def.path,
        });
    }
    return {
        '@type': 'BreadcrumbList',
        '@id': ORIGIN + def.path + '#crumbs',
        itemListElement: items,
    };
}

function faqNode(def) {
    if (!def.faq || !def.faq.length) return null;
    return {
        '@type': 'FAQPage',
        '@id': ORIGIN + def.path + '#faq',
        mainEntity: def.faq.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
    };
}

function howtoNode(def) {
    if (!def.howto || !def.howto.length) return null;
    return {
        '@type': 'HowTo',
        name: def.howtoName || ('How to play ' + (def.gameName || def.h1)),
        step: def.howto.map((text, i) => ({
            '@type': 'HowToStep',
            position: i + 1,
            text,
        })),
    };
}

function appNode(def) {
    const url = ORIGIN + def.path;
    if (def.kind === 'tool') {
        return {
            '@type': 'WebApplication',
            '@id': url + '#app',
            name: def.appName || def.h1,
            url,
            description: def.description,
            applicationCategory: 'UtilitiesApplication',
            operatingSystem: 'Any',
            browserRequirements: 'Requires JavaScript',
            isAccessibleForFree: true,
            inLanguage: 'en',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            featureList: def.featureList || [],
            publisher: { '@id': ORG_ID },
        };
    }
    if (def.kind === 'hub') {
        return {
            '@type': 'CollectionPage',
            '@id': url + '#collection',
            name: def.h1,
            url,
            description: def.description,
            isPartOf: { '@id': SITE_ID },
            about: { '@id': ORG_ID },
            hasPart: Object.values(LINKS)
                .filter((l) => l.href !== '/projects')
                .map((l) => ({ '@type': 'WebPage', name: l.name, url: ORIGIN + l.href })),
        };
    }
    const offers = def.isFree
        ? { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' }
        : {
              '@type': 'Offer',
              price: def.price || '0',
              priceCurrency: 'USD',
              availability: 'https://schema.org/InStock',
          };
    return {
        '@type': 'VideoGame',
        '@id': url + '#game',
        name: def.gameName || def.h1,
        url,
        image: abs(def.image),
        description: def.description,
        genre: def.genre,
        gamePlatform: def.platform,
        playMode: def.playMode ? 'https://schema.org/' + def.playMode : undefined,
        applicationCategory: 'GameApplication',
        operatingSystem: (def.platform || ['Web Browser']).join(', '),
        isAccessibleForFree: !!def.isFree,
        inLanguage: 'en',
        offers,
        publisher: { '@id': ORG_ID },
        author: { '@id': ORG_ID },
    };
}

function pageNode(def) {
    const url = ORIGIN + def.path;
    return {
        '@type': 'WebPage',
        '@id': url + '#webpage',
        url,
        name: def.title,
        description: def.description,
        isPartOf: { '@id': SITE_ID },
        about: { '@id': url + (def.kind === 'tool' ? '#app' : def.kind === 'hub' ? '#collection' : '#game') },
        inLanguage: 'en',
        dateModified: DATE,
        primaryImageOfPage: abs(def.image),
    };
}

function build(def) {
    const canonicalUrl = ORIGIN + def.path;
    const image = abs(def.image);
    const graph = [org, website, appNode(def), pageNode(def), breadcrumbs(def), faqNode(def), howtoNode(def)].filter(
        Boolean
    );
    return {
        title: def.title,
        metaDescription: def.description,
        metaKeywords: def.keywords,
        canonicalUrl,
        ogTitle: def.title,
        ogDescription: def.description,
        ogImage: image,
        ogType: def.kind === 'game' ? 'video.game' : 'website',
        jsonLd: { '@context': 'https://schema.org', '@graph': graph },
        landing: {
            h1: def.h1,
            lede: def.lede || def.description,
            eyebrow: def.eyebrow || (def.kind === 'game' ? 'Game' : 'Tool'),
            playSrc: def.playSrc || null,
            playHref: def.playHref || null,
            playLabel: def.playLabel || 'Play now',
            fullscreenHref: def.fullscreenHref || def.playSrc || def.playHref || null,
            iframeAllow: def.iframeAllow || 'autoplay; fullscreen; gamepad; xr-spatial-tracking; payment',
            about: def.about || [],
            howto: def.howto || [],
            faq: def.faq || [],
            tags: def.tags || def.genre || [],
            related: def.related || [],
            image: def.image,
            gameName: def.gameName || def.appName || def.h1,
        },
    };
}

function page(slug) {
    const def = PAGES[slug];
    if (!def) throw new Error('Unknown SEO page: ' + slug);
    return build(def);
}

function esc(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
}

function metaHtml(slug) {
    const p = page(slug);
    return [
        '<title>' + esc(p.title) + '</title>',
        '<meta name="description" content="' + esc(p.metaDescription) + '">',
        '<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">',
        '<meta name="keywords" content="' + esc(p.metaKeywords) + '">',
        '<link rel="canonical" href="' + esc(p.canonicalUrl) + '">',
        '<meta property="og:type" content="' + esc(p.ogType) + '">',
        '<meta property="og:url" content="' + esc(p.canonicalUrl) + '">',
        '<meta property="og:title" content="' + esc(p.ogTitle) + '">',
        '<meta property="og:description" content="' + esc(p.ogDescription) + '">',
        '<meta property="og:image" content="' + esc(p.ogImage) + '">',
        '<meta property="og:site_name" content="Future Music Collective">',
        '<meta name="twitter:card" content="summary_large_image">',
        '<meta name="twitter:title" content="' + esc(p.ogTitle) + '">',
        '<meta name="twitter:description" content="' + esc(p.ogDescription) + '">',
        '<meta name="twitter:image" content="' + esc(p.ogImage) + '">',
        '<script type="application/ld+json">' + JSON.stringify(p.jsonLd) + '</script>',
    ].join('');
}

function sitemapXml() {
    const urls = [
        { loc: ORIGIN + '/', pri: '1.0', freq: 'weekly' },
        { loc: ORIGIN + '/music', pri: '0.8', freq: 'weekly' },
        { loc: ORIGIN + '/about', pri: '0.5', freq: 'monthly' },
        { loc: ORIGIN + '/contact', pri: '0.4', freq: 'monthly' },
        { loc: ORIGIN + '/advocacy', pri: '0.4', freq: 'monthly' },
        { loc: ORIGIN + '/merch', pri: '0.5', freq: 'weekly' },
    ];
    for (const def of Object.values(PAGES)) {
        urls.push({ loc: ORIGIN + def.path, pri: def.sitemapPri || '0.7', freq: 'weekly', lastmod: DATE });
    }
    const body = urls
        .map((u) => {
            let n =
                '  <url>\n    <loc>' +
                u.loc +
                '</loc>\n    <changefreq>' +
                u.freq +
                '</changefreq>\n    <priority>' +
                u.pri +
                '</priority>';
            if (u.lastmod) n += '\n    <lastmod>' + u.lastmod + '</lastmod>';
            return n + '\n  </url>';
        })
        .join('\n');
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + body + '\n</urlset>\n';
}

module.exports = { ORIGIN, PAGES, LINKS, page, metaHtml, sitemapXml };
