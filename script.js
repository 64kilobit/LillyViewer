// https://github.com/themanaworld/tmwa-client-data/blob/master/maps/1.world
// https://github.com/themanaworld/tmwa-client-data/blob/master/maps/001-1.tmx
// https://github.com/themanaworld/tmwa-client-data/blob/master/tilesets/desert1.tsx
// https://github.com/themanaworld/tmwa-client-data/blob/master/graphics/sprites/monsters/scorpion.xml

const scaleFactor = 0.25;
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

// Function to load a tileset from a TSX (Tile Set XML) file
async function loadTilesetFromTSX(tilesetSource) {
  try {
    const tilesetXml = await loadXML(assetsBaseUrl + tilesetSource);
    const tilesetElement = tilesetXml.querySelector('tileset');
    const imageElement = tilesetElement.querySelector('image');

    const tileset = {
      firstgid: 0, // ID of the first tile in this tileset
      image: new Image(), // Image element to hold the tileset image
      isLoaded: false,
      tileWidth: parseInt(tilesetElement.getAttribute('tilewidth')),
      tileHeight: parseInt(tilesetElement.getAttribute('tileheight')),
    };

    tileset.image.src = assetsBaseUrl + imageElement.getAttribute('source');

    tileset.image.onload = () => {
      tileset.isLoaded = true;
      tileset.width = tileset.image.width;
    };

    tileset.image.onerror = () => {
      tileset.isLoaded = true;
      console.error(`Error loading tileset image: ${tileset.image.src}`);
    };

    return tileset;
  } catch (error) {
    console.error(`Error loading tileset from TSX:`, error);
    return null;
  }
}

// Function to load all tilesets referenced in a map's XML
async function loadTilesets(mapXml) {
  const tilesets = [];
  const tilesetElements = mapXml.querySelectorAll('tileset');

  for (let tilesetElement of tilesetElements) {
    const tilesetSource = tilesetElement.getAttribute('source');
    let tileset;

    if (tilesetSource) {
      // Load tileset from external TSX file
      tileset = await loadTilesetFromTSX(tilesetSource);
    } else {
      // Load tileset embedded within the map XML
      try {
        const firstgid = parseInt(tilesetElement.getAttribute('firstgid'));
        const imageElement = tilesetElement.querySelector('image');
        tileset = {
          firstgid,
          image: new Image(),
          isLoaded: false,
          tileWidth: parseInt(tilesetElement.getAttribute('tilewidth')),
          tileHeight: parseInt(tilesetElement.getAttribute('tileheight')),
        };

        tileset.image.src = assetsBaseUrl + imageElement.getAttribute('source');

        tileset.image.onload = () => {
          tileset.isLoaded = true;
          tileset.width = tileset.image.width;
        };

        tileset.image.onerror = () => {
          tileset.isLoaded = true;
          console.error(
            `Error loading embedded tileset image: ${tileset.image.src}`
          );
        };
      } catch (error) {
        console.error(`Error loading embedded tileset:`, error);
        tileset = null;
      }
    }

    if (tileset) {
      tileset.firstgid = parseInt(tilesetElement.getAttribute('firstgid'));
      tilesets.push(tileset);
    }
  }

  return tilesets;
}

// Function to find the image and position of a tile within a tileset
function getTileImage(tilesets, tileId) {
  for (let i = tilesets.length - 1; i >= 0; i--) {
    const tileset = tilesets[i];
    if (tileId >= tileset.firstgid) {
      const tileIndex = tileId - tileset.firstgid;
      return {
        tilesetImage: tileset.image,
        tileIndex: tileIndex,
        tileWidth: tileset.tileWidth,
        tileHeight: tileset.tileHeight,
        tilesPerRow: tileset.width / tileset.tileWidth,
      };
    }
  }
  return null;
}

// Function to draw all layers of a map (tiles and objects)
function drawMap(context, mapXml, tilesets, offsetX = 0, offsetY = 0) {
  const layers = mapXml.querySelectorAll('layer');
  const objectGroups = mapXml.querySelectorAll('objectgroup');
  const mapElement = mapXml.querySelector('map');
  const mapTileWidth = parseInt(mapElement.getAttribute('tilewidth'));
  const mapTileHeight = parseInt(mapElement.getAttribute('tileheight'));

  layers.forEach((layer) => {
    const layerName = layer.getAttribute('name');

    const layerOffsetX = parseFloat(layer.getAttribute('offsetx') || 0);
    const layerOffsetY = parseFloat(layer.getAttribute('offsety') || 0);

    // Skip Collision and Fringe layers for now
    if (layerName === 'Collision') {
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
          const tileInfo = getTileImage(tilesets, tileId);
          if (tileInfo) {
            const {
              tilesetImage,
              tileIndex,
              tileWidth,
              tileHeight,
              tilesPerRow,
            } = tileInfo;
            const sourceX = (tileIndex % tilesPerRow) * tileWidth;
            const sourceY = Math.floor(tileIndex / tilesPerRow) * tileHeight;

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
    }
  });

  // Draw objects (like trees, buildings) from object layers
  objectGroups.forEach((objectGroup) => {
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

      // Draw a red rectangle around the object (for debugging)
      context.strokeStyle = 'red';
      context.lineWidth = 4;
      context.strokeRect(
        objectX + offsetX,
        objectY + offsetY,
        objectWidth,
        objectHeight
      );

      // Draw the object's name
      context.fillStyle = 'black';
      context.font = '24px Arial';
      context.fillText(objectName, objectX + offsetX, objectY + offsetY - 5);
    });
  });
}

// Main function to draw the entire world map
async function drawWorld() {
  const canvas = document.getElementById('mapCanvas');
  const context = canvas.getContext('2d');

  try {
    const worldData = await (await fetch(worldDataFile)).json();

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    // Load map data and calculate world bounds
    const maps = await Promise.all(
      worldData.maps.slice(0, 20).map(async (mapInfo) => {
        const mapXml = await loadXML(assetsBaseUrl + mapInfo.fileName);
        const mapElement = mapXml.querySelector('map');
        const mapWidth =
          parseInt(mapElement.getAttribute('width')) *
          parseInt(mapElement.getAttribute('tilewidth'));
        const mapHeight =
          parseInt(mapElement.getAttribute('height')) *
          parseInt(mapElement.getAttribute('tileheight'));

        minX = Math.min(minX, mapInfo.x);
        minY = Math.min(minY, mapInfo.y);
        maxX = Math.max(maxX, mapInfo.x + mapWidth);
        maxY = Math.max(maxY, mapInfo.y + mapHeight);

        return { mapXml, mapInfo };
      })
    );

    canvas.width = maxX - minX;
    canvas.height = maxY - minY;
    console.log(`Canvas size: ${canvas.width}x${canvas.height}`);

    // Draw each map onto the canvas
    for (const { mapXml, mapInfo } of maps) {
      const tilesets = await loadTilesets(mapXml);
      drawMap(context, mapXml, tilesets, mapInfo.x - minX, mapInfo.y - minY);
    }

    console.log('World map rendering completed.');
  } catch (error) {
    console.error('Error loading or drawing world:', error);
  }
}

drawWorld();
