// script.js

// Base URLs
const apiUrl = 'https://api.github.com/repos/themanaworld/tmwa-client-data/contents/tilesets';
const rawBaseUrl = 'https://raw.githubusercontent.com/themanaworld/tmwa-client-data/master/';

// Parameters with default values
let scale = 1.0;
let maxTilesets = 10; // Limit the number of tilesets to process
let showImage = true;
let showTileInfo = true;

// Function to read parameters from the URL hash and update the content
function readParameters() {
    let params = new URLSearchParams(window.location.hash.substring(1));
    scale = parseFloat(params.get('scale')) || 1.0;
    maxTilesets = parseInt(params.get('maxTilesets'), 10) || 10;
    showImage = params.get('showImage') !== '0'; // Default to true unless '0'
    showTileInfo = params.get('showTileInfo') !== '0'; // Default to true unless '0'

    // After reading parameters, update the content
    updateContent();
}

// Function to update the content based on the current parameters
async function updateContent() {
    // Clear existing content
    document.getElementById('content').innerHTML = '';

    // Fetch and display tilesets
    await fetchTilesetFiles();
}

// Function to fetch the list of .tsx files from the tilesets directory
async function fetchTilesetFiles() {
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        // Filter out .tsx files
        const tsxFiles = data.filter(item => item.name.endsWith('.tsx'));

        // Limit the number of tilesets to process based on maxTilesets
        const tsxFilesToProcess = tsxFiles.slice(0, maxTilesets);

        // Process each .tsx file
        for (const tsxFile of tsxFilesToProcess) {
            await processTileset(tsxFile);
        }
    } catch (error) {
        console.error('Error fetching tileset files:', error);
        document.getElementById('content').innerHTML = '<p>Error loading tileset files.</p>';
    }
}

// Function to process each .tsx file and display all information
async function processTileset(tsxFile) {
    try {
        const tsxUrl = tsxFile.download_url;

        // Fetch the content of the .tsx file
        const response = await fetch(tsxUrl);
        const tsxText = await response.text();

        // Parse the XML content
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(tsxText, 'application/xml');

        // Get tileset information
        const tilesetElement = xmlDoc.querySelector('tileset');

        if (!tilesetElement) {
            console.warn(`No <tileset> element found in ${tsxFile.name}`);
            return;
        }

        const tilesetName = tilesetElement.getAttribute('name') || 'N/A';
        const tileWidth = parseInt(tilesetElement.getAttribute('tilewidth'), 10) || 0;
        const tileHeight = parseInt(tilesetElement.getAttribute('tileheight'), 10) || 0;
        let tileCount = parseInt(tilesetElement.getAttribute('tilecount'), 10);
        let columns = parseInt(tilesetElement.getAttribute('columns'), 10);

        // Find the <image> element and get the 'source' attribute
        const imageElement = tilesetElement.querySelector('image');
        let imageSource = '';
        let imageWidth = 0;
        let imageHeight = 0;

        if (imageElement) {
            imageSource = imageElement.getAttribute('source');

            // Handle relative paths
            if (!imageSource.startsWith('http')) {
                imageSource = rawBaseUrl + imageSource.replace(/^(\.\/|\.\.\/)*/, '');
            }

            // Get image width and height
            imageWidth = parseInt(imageElement.getAttribute('width'), 10) || 0;
            imageHeight = parseInt(imageElement.getAttribute('height'), 10) || 0;
        }

        // Compute tileCount and columns if they are missing
        if ((!tileCount || !columns) && tileWidth > 0 && tileHeight > 0 && imageWidth > 0 && imageHeight > 0) {
            columns = Math.floor(imageWidth / tileWidth);
            const rows = Math.floor(imageHeight / tileHeight);
            tileCount = columns * rows;
        }

        // Display the tileset information
        displayTileset({
            tsxFileName: tsxFile.name,
            tilesetName,
            tileWidth,
            tileHeight,
            tileCount,
            columns,
            imageSource,
            imageWidth,
            imageHeight
        });
    } catch (error) {
        console.error(`Error processing tileset ${tsxFile.name}:`, error);
    }
}

// Function to display the tileset information
function displayTileset(tilesetInfo) {
    const contentDiv = document.getElementById('content');

    const tilesetDiv = document.createElement('div');
    tilesetDiv.classList.add('tileset');

    const title = document.createElement('h2');
    title.textContent = tilesetInfo.tsxFileName;
    tilesetDiv.appendChild(title);

    if (showImage && tilesetInfo.imageSource) {
        const imgElement = document.createElement('img');
        imgElement.src = tilesetInfo.imageSource;
        imgElement.alt = tilesetInfo.tsxFileName;
        imgElement.loading = 'lazy';
        imgElement.style.transform = `scale(${scale})`;
        imgElement.style.transformOrigin = '0 0';
        tilesetDiv.appendChild(imgElement);
    }

    if (showTileInfo) {
        const infoList = document.createElement('ul');

        const tilesetNameItem = document.createElement('li');
        tilesetNameItem.textContent = `Tileset Name: ${tilesetInfo.tilesetName}`;
        infoList.appendChild(tilesetNameItem);

        const tileSizeItem = document.createElement('li');
        tileSizeItem.textContent = `Tile Size: ${tilesetInfo.tileWidth} x ${tilesetInfo.tileHeight}`;
        infoList.appendChild(tileSizeItem);

        const imageSizeItem = document.createElement('li');
        imageSizeItem.textContent = `Image Size: ${tilesetInfo.imageWidth} x ${tilesetInfo.imageHeight}`;
        infoList.appendChild(imageSizeItem);

        if (tilesetInfo.tileCount) {
            const tileCountItem = document.createElement('li');
            tileCountItem.textContent = `Tile Count: ${tilesetInfo.tileCount}`;
            infoList.appendChild(tileCountItem);
        }

        if (tilesetInfo.columns) {
            const columnsItem = document.createElement('li');
            columnsItem.textContent = `Columns: ${tilesetInfo.columns}`;
            infoList.appendChild(columnsItem);
        }

        tilesetDiv.appendChild(infoList);
    }

    contentDiv.appendChild(tilesetDiv);
}

// Initialize the page on load
readParameters();

// Register the hashchange event listener
window.addEventListener('hashchange', readParameters);