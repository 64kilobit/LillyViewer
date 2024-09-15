// Base URLs
const baseUrl = 'https://raw.githubusercontent.com/themanaworld/tmwa-client-data/master/';
const baseUrl2 = 'https://raw.githubusercontent.com/themanaworld/tmwa-client-data/master/graphics/sprites/';
let maxMonsters = 15; // Default maxMonsters value

// Function to check and add default hash if not present
function ensureDefaultHash() {
    if (!window.location.hash) {
        // Set a default hash if not present
        window.location.hash = '#maxMonsters=15';
    }
}

// Function to read parameters from the URL hash
function readHashParameters() {
    let params = new URLSearchParams(window.location.hash.substring(1));

    // Set maxMonsters based on the hash value, or default to 15
    maxMonsters = parseInt(params.get('maxMonsters'), 10) || maxMonsters;

    // Trigger monsters function based on updated maxMonsters value
    monsters();
}

// Function to load XML data from a file URL
async function loadXML(fileUrl) {
    const response = await fetch(fileUrl);
    const xmlText = await response.text();
    const parser = new DOMParser();
    return parser.parseFromString(xmlText, 'application/xml');
}

// Function to add content to the page
function add(text) {
    document.getElementById('content').innerHTML += text;
}

// Function to create an anchor link
function a(url, text) {
    return '<a href="' + url + '">' + text + '</a>';
}

// Function to create an image element
function img(url) {
    return '<img src="' + url + '" />';
}

// Function to load and display monster data
async function monsters() {
    const monstersXml = await loadXML(baseUrl + 'monsters.xml');
    const monsterList = monstersXml.querySelectorAll('monster');
    const limitedMonsters = Array.from(monsterList).slice(0, maxMonsters);

    for (let monster of limitedMonsters) {
        const name = monster.getAttribute('name');
        add('<h1>' + name + '</h1>');

        const spriteList = monster.querySelectorAll('sprite');
        for (let sprite of spriteList) {
            const spriteName = sprite.textContent.split('|')[0];
            const spriteRest = sprite.textContent.split('|')[1];
            
            if (spriteRest) {
                const colors = spriteRest.replace('#', '').split(',');
                for (let color of colors) {
                    add('<div style="width: 20px; height: 10px; background-color: #' + color + ';"></div>');
                }
            }

            add('<div>' + a(baseUrl2 + spriteName, spriteName) + ' ' + spriteRest + '</div>');

            const specificMonster = await loadXML(baseUrl2 + spriteName);

            const image = specificMonster.querySelector('imageset');
            if (image) {
                const imageWidth = image.getAttribute('width');
                const imageHeight = image.getAttribute('height');
                const imageName = image.getAttribute('src').split('|')[0];

                add('<div>' + a(baseUrl + imageName, imageName) + ' w=' + imageWidth + ' h=' + imageHeight + '</div>');
                add(img(baseUrl + imageName));
            }
        }
    }
}

// Function to initialize the page
function initializePage() {
    ensureDefaultHash();  // Ensure hash is present
    readHashParameters();  // Read and apply hash parameters
}

// Register hashchange event listener
window.addEventListener('hashchange', readHashParameters);

// Initialize the page on load
initializePage();
