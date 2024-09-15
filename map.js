// https://github.com/themanaworld/tmwa-client-data/blob/master/maps/1.world
// https://github.com/themanaworld/tmwa-client-data/blob/master/maps/001-1.tmx
// https://github.com/themanaworld/tmwa-client-data/blob/master/tilesets/desert1.tsx
// https://github.com/themanaworld/tmwa-client-data/blob/master/graphics/sprites/monsters/scorpion.xml

// Jack O
// DrunkLadySkeleton
// MegaManaBug

let scale;
let mapCount;
let isDrawCollision;
let isDrawText;
let isDrawObjects;
let isDrawBox;
let objectSize;
let isDrawMapInfo;
let isDrawMapFrames;
let isDrawObjectMarkers;

// Register the hashchange event listener
window.addEventListener('hashchange', readParameters);

const assetsBaseUrl =
  'https://raw.githubusercontent.com/themanaworld/tmwa-client-data/master/maps/';
const worldDataFile = assetsBaseUrl + '1.world';

// Function to load XML data from a file URL
async function loadXML(fileUrl) {
  const response = await fetch(fileUrl);
  const xmlText = await response.text();
  const parser = new DOMParser();
  return parser.parseFromString(xmlText, 'application/xml');
}

// Function to load a tileset from a TSX (Tile Set XML) file with image loading
async function loadTileset(tilesetSource) {
  try {
    const tilesetXml = await loadXML(assetsBaseUrl + tilesetSource);
    const tilesetElement = tilesetXml.querySelector('tileset');
    const imageElement = tilesetElement.querySelector('image');

    let tileWidth = parseInt(tilesetElement.getAttribute('tilewidth'));
    let width = parseInt(imageElement.getAttribute('width'));
    let height = parseInt(imageElement.getAttribute('height'));

    const tileset = {
      firstgid: 0,
      image: new Image(),
      tileWidth: tileWidth,
      tileHeight: parseInt(tilesetElement.getAttribute('tileheight')),
      width: width,
      height: height,
      tilesPerRow: Math.floor(width / tileWidth),
    };

    tileset.image.src = assetsBaseUrl + imageElement.getAttribute('source');

    // Wait for the image to load
    await new Promise((resolve, reject) => {
      tileset.image.onload = resolve;
      tileset.image.onerror = reject;
    });

    return tileset;
  } catch (error) {
    console.error(`Error loading tileset from TSX:`, error);
    return null;
  }
}

// Function to load a monster object from an XML file with image loading
async function loadObject(tilesetSource) {
  try {
    const tilesetXml = await loadXML(assetsBaseUrl + tilesetSource);
    const tilesetElement = tilesetXml.querySelector('imageset');
    let imageSource = tilesetElement.getAttribute('src').split('|')[0];

    const tileset = {
      tilesetImage: new Image(),
      tileWidth: parseInt(tilesetElement.getAttribute('width')),
      tileHeight: parseInt(tilesetElement.getAttribute('height')),
    };

    tileset.tilesetImage.src = assetsBaseUrl + '../' + imageSource;

    // Wait for the image to load
    await new Promise((resolve, reject) => {
      tileset.tilesetImage.onload = resolve;
      tileset.tilesetImage.onerror = reject;
    });

    return tileset;
  } catch (error) {
    console.error('Error loading object from XML for ' + tilesetSource, error);
    return null;
  }
}

// Function to load all tilesets referenced in a map's XML and cache them
async function loadAllTilesets(mapXml, tilesetCache) {
  const tileIdMap = new Map();
  const tilesetElements = mapXml.querySelectorAll('tileset');

  for (let tilesetElement of tilesetElements) {
    const tilesetSource = tilesetElement.getAttribute('source');
    let tileset;

    if (tilesetCache.has(tilesetSource)) {
      tileset = tilesetCache.get(tilesetSource);
    } else {
      tileset = await loadTileset(tilesetSource);
      if (tileset) {
        tilesetCache.set(tilesetSource, tileset);
      } else {
        continue;
      }
    }

    if (tileset) {
      tileset.firstgid = parseInt(tilesetElement.getAttribute('firstgid'));

      const tileCount =
        (tileset.width / tileset.tileWidth) *
        (tileset.height / tileset.tileHeight);

      for (let tileIndex = 0; tileIndex < tileCount; tileIndex++) {
        const tileId = tileset.firstgid + tileIndex;
        const tileInfo = {
          tilesetImage: tileset.image,
          tileWidth: tileset.tileWidth,
          tileHeight: tileset.tileHeight,
          sourceX: (tileIndex % tileset.tilesPerRow) * tileset.tileWidth,
          sourceY:
            Math.floor(tileIndex / tileset.tilesPerRow) * tileset.tileHeight,
        };
        tileIdMap.set(tileId, tileInfo);
      }
    }
  }

  return tileIdMap;
}

// Function to load all monster objects in a map's XML and cache them
async function loadAllObjects(mapXml, monsterMap, objectCache) {
  const objectIdMap = new Map();
  const objectElements = mapXml.querySelectorAll('object[type="spawn"]');

  for (let objectElement of objectElements) {
    const objectName = objectElement.getAttribute('name');
    let croppedName = monsterMap.get(objectName);

    if (!croppedName) {
      continue;
    }

    let url = '../graphics/sprites/' + croppedName;
    let tileset;

    if (objectCache.has(url)) {
      tileset = objectCache.get(url);
    } else {
      tileset = await loadObject(url);
      if (tileset) {
        objectCache.set(url, tileset);
      } else {
        continue;
      }
    }

    if (tileset) {
      objectIdMap.set(objectName, tileset);
    }
  }

  return objectIdMap;
}

// Function to draw all layers of a map
function drawMap(context, mapXml, tileIdMap, mapInfo, minX, minY) {
  const offsetX = mapInfo.x - minX;
  const offsetY = mapInfo.y - minY;

  const layers = mapXml.querySelectorAll('layer');
  const mapElement = mapXml.querySelector('map');
  const mapTileWidth = parseInt(mapElement.getAttribute('tilewidth'));
  const mapTileHeight = parseInt(mapElement.getAttribute('tileheight'));

  layers.forEach((layer) => {
    const layerName = layer.getAttribute('name');
    const layerOffsetX = parseFloat(layer.getAttribute('offsetx') || 0);
    const layerOffsetY = parseFloat(layer.getAttribute('offsety') || 0);

    if (!isDrawCollision && layerName === 'Collision') {
      return;
    }

    const width = parseInt(layer.getAttribute('width'));
    const height = parseInt(layer.getAttribute('height'));
    const data = layer
      .querySelector('data')
      .textContent.trim()
      .split(',')
      .map(Number);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tileId = data[y * width + x];
        if (tileId !== 0) {
          const tileInfo = tileIdMap.get(tileId);

          if (!tileInfo) {
            continue;
          }

          const { tilesetImage, sourceX, sourceY, tileWidth, tileHeight } =
            tileInfo;

          context.drawImage(
            tilesetImage,
            sourceX,
            sourceY,
            tileWidth,
            tileHeight,
            x * mapTileWidth + offsetX + layerOffsetX,
            y * mapTileHeight + offsetY + layerOffsetY,
            tileWidth,
            tileHeight
          );
        }
      }
    }
  });

  const mapWidthInTiles = parseInt(mapElement.getAttribute('width'));
  const mapHeightInTiles = parseInt(mapElement.getAttribute('height'));
  const mapWidthInPixels = mapWidthInTiles * mapTileWidth;
  const mapHeightInPixels = mapHeightInTiles * mapTileHeight;

  // Draw map information at the center of the map if enabled
  if (isDrawMapInfo) {
    // Calculate the center position of the map
    const centerX = offsetX + mapWidthInPixels / 2;
    const centerY = offsetY + mapHeightInPixels / 2;

    // Map information to display
    const infoLines = [
      `Filename: ${mapInfo.fileName}`,
      `Width: ${mapInfo.mapWidth} px (${mapWidthInTiles} tiles)`,
      `Height: ${mapInfo.mapHeight} px (${mapHeightInTiles} tiles)`,
      `OffsetX: ${mapInfo.x}`,
      `OffsetY: ${mapInfo.y}`,
    ];

    // Calculate total height of the text block
    const lineHeight = 45 / scale; // Line height adjusted for scaling
    const totalTextHeight = infoLines.length * lineHeight;

    // Starting Y position (centered vertically)
    let infoY = centerY - totalTextHeight / 2 + lineHeight / 2;

    // Save context state
    context.save();
    context.textAlign = 'center'; // Center text horizontally
    context.textBaseline = 'middle'; // Center text vertically

    for (const line of infoLines) {
      drawText(context, line, centerX, infoY);
      infoY += lineHeight; // Move to the next line
    }

    // Restore context state
    context.restore();
  }

  // Draw map frame if enabled
  if (isDrawMapFrames) {
    context.save();
    context.strokeStyle = 'blue'; // Or any color you prefer
    context.lineWidth = 4 / scale; // Adjust line width for scaling
    context.strokeRect(
      offsetX,
      offsetY,
      mapWidthInPixels,
      mapHeightInPixels
    );
    context.restore();
  }
}

// Function to draw all objects in a map
function drawObjects(context, mapXml, objectIdMap, mapInfo, minX, minY) {
  const offsetX = mapInfo.x - minX;
  const offsetY = mapInfo.y - minY;

  const objectGroups = mapXml.querySelectorAll('objectgroup');
  const mapElement = mapXml.querySelector('map');
  const mapTileWidth = parseInt(mapElement.getAttribute('tilewidth'));
  const mapTileHeight = parseInt(mapElement.getAttribute('tileheight'));

  objectGroups.forEach((objectGroup) => {
    // Extract group offsets
    const groupOffsetX = parseFloat(objectGroup.getAttribute('offsetx') || 0);
    const groupOffsetY = parseFloat(objectGroup.getAttribute('offsety') || 0);

    const objects = objectGroup.querySelectorAll('object');
    objects.forEach((object) => {
      const objectX = parseFloat(object.getAttribute('x'));
      const objectY = parseFloat(object.getAttribute('y'));
      const objectWidth = parseFloat(
        object.getAttribute('width') || mapTileWidth
      );
      const objectHeight = parseFloat(
        object.getAttribute('height') || mapTileHeight
      );
      const objectName = object.getAttribute('name') || '';
      const objectType = object.getAttribute('type') || '';

      // Adjust positions and sizes according to scale
      const scaledOffsetX = offsetX + groupOffsetX;
      const scaledOffsetY = offsetY + groupOffsetY;
      const scaledObjectX = objectX + scaledOffsetX;
      const scaledObjectY = objectY + scaledOffsetY;
      const scaledObjectWidth = objectWidth;
      const scaledObjectHeight = objectHeight;

      if (isDrawObjects && objectType === 'spawn') {
        const tileInfo = objectIdMap.get(objectName);
        if (tileInfo) {
          const { tilesetImage, tileWidth, tileHeight } = tileInfo;

          context.drawImage(
            tilesetImage,
            0,
            0,
            tileWidth,
            tileHeight,
            scaledObjectX,
            scaledObjectY,
            tileWidth * objectSize,
            tileHeight * objectSize
          );
        }
      } else {
        if (isDrawBox) {
          context.strokeStyle = 'red';
          context.lineWidth = 4 / scale; // Adjust line width for scaling
          context.strokeRect(
            scaledObjectX,
            scaledObjectY,
            scaledObjectWidth,
            scaledObjectHeight
          );
        }
        if (isDrawText && objectType === 'warp') {
          drawText(
            context,
            objectName,
            scaledObjectX,
            scaledObjectY - 5
          );
        }
      }

      // Draw a marker at the object's position if enabled
      if (isDrawObjectMarkers) {
        context.save();
        context.fillStyle = 'red';
        context.beginPath();
        context.arc(
          scaledObjectX,
          scaledObjectY,
          5 / scale, // Adjust marker size for scaling
          0,
          2 * Math.PI
        );
        context.fill();

        // Optionally, draw the object name next to the marker
        context.textAlign = 'left';
        context.textBaseline = 'middle';
        context.font = `${30 / scale}px Sans-serif`; // Adjust font size
        context.fillStyle = 'yellow';
        context.fillText(objectName, scaledObjectX + 10 / scale, scaledObjectY);

        context.restore();
      }
    });
  });
}

function drawText(context, text, x, y) {
  context.font = `${40 / scale}px Sans-serif`; // Adjust font size for scaling
  context.strokeStyle = 'black';
  context.lineWidth = 8 / scale; // Adjust line width for scaling
  context.strokeText(text, x, y);
  context.fillStyle = 'white';
  context.fillText(text, x, y);
}

// Function to read monster data
async function readMonsters() {
  const monsterMap = new Map();
  const monsters = await loadXML(assetsBaseUrl + '../monsters.xml');
  const monsterList = monsters.querySelectorAll('monster');

  for (let monster of monsterList) {
    const name = monster.getAttribute('name').replace(' ', '');
    const spriteName = monster
      .querySelector('sprite')
      .textContent.split('|')[0];
    monsterMap.set(name, spriteName);
  }

  return monsterMap;
}

// Main function to draw the entire world map
async function drawWorld() {
  const canvas = document.getElementById('mapCanvas');
  const context = canvas.getContext('2d');
  const monsterMap = await readMonsters();

  const tilesetCache = new Map();
  const objectCache = new Map();

  try {
    const worldData = await (await fetch(worldDataFile)).json();

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    // Load map data and calculate world bounds
    const maps = await Promise.all(
      worldData.maps.slice(0, mapCount).map(async (mapInfo) => {
        const mapXml = await loadXML(assetsBaseUrl + mapInfo.fileName);
        const mapElement = mapXml.querySelector('map');
        const mapWidthInTiles = parseInt(mapElement.getAttribute('width'));
        const mapHeightInTiles = parseInt(mapElement.getAttribute('height'));
        const tileWidth = parseInt(mapElement.getAttribute('tilewidth'));
        const tileHeight = parseInt(mapElement.getAttribute('tileheight'));
        const mapWidth = mapWidthInTiles * tileWidth;
        const mapHeight = mapHeightInTiles * tileHeight;

        minX = Math.min(minX, mapInfo.x);
        minY = Math.min(minY, mapInfo.y);
        maxX = Math.max(maxX, mapInfo.x + mapWidth);
        maxY = Math.max(maxY, mapInfo.y + mapHeight);

        // Preload tilesets and objects for each map
        const tileIdMap = await loadAllTilesets(mapXml, tilesetCache);
        const objectIdMap = await loadAllObjects(
          mapXml,
          monsterMap,
          objectCache
        );

        return {
          mapXml,
          mapInfo: {
            ...mapInfo,
            mapWidth,
            mapHeight,
            tileWidth,
            tileHeight,
          },
          tileIdMap,
          objectIdMap,
        };
      })
    );

    // Adjust canvas size based on total world bounds and apply the scale factor
    canvas.width = (maxX - minX) * scale;
    canvas.height = (maxY - minY) * scale;

    // Apply scaling transformation on the canvas context
    context.scale(scale, scale);

    // First, draw all maps (tiles)
    for (const { mapXml, mapInfo, tileIdMap } of maps) {
      drawMap(context, mapXml, tileIdMap, mapInfo, minX, minY);
    }

    // Then, draw all objects to ensure they are on top
    for (const { mapXml, mapInfo, objectIdMap } of maps) {
      drawObjects(context, mapXml, objectIdMap, mapInfo, minX, minY);
    }
  } catch (error) {
    console.error('Error loading or drawing world:', error);
  }
}

function readParameters() {
  if (!window.location.hash) {
    // Set a default hash if not present
    window.location.hash =
      '#scale=0.5&mapcount=2&coll=0&text=1&objects=1&box=1&objectSize=10&mapInfo=1&mapFrames=1&objectMarkers=1';
  }

  let params = new URLSearchParams(window.location.hash.substring(1));
  scale = parseFloat(params.get('scale'));
  mapCount = parseInt(params.get('mapcount'), 10);
  objectSize = parseInt(params.get('objectSize'), 10);
  isDrawCollision = Boolean(parseInt(params.get('coll'), 10));
  isDrawText = Boolean(parseInt(params.get('text'), 10));
  isDrawObjects = Boolean(parseInt(params.get('objects'), 10));
  isDrawBox = Boolean(parseInt(params.get('box'), 10));

  // New parameters
  isDrawMapInfo = Boolean(parseInt(params.get('mapInfo'), 10));
  isDrawMapFrames = Boolean(parseInt(params.get('mapFrames'), 10));
  isDrawObjectMarkers = Boolean(parseInt(params.get('objectMarkers'), 10));

  // Draw the world
  drawWorld();
}

readParameters();
