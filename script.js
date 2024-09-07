// https://github.com/themanaworld/tmwa-client-data/blob/master/maps/1.world
// https://github.com/themanaworld/tmwa-client-data/blob/master/maps/001-1.tmx
// https://github.com/themanaworld/tmwa-client-data/blob/master/tilesets/desert1.tsx
// https://github.com/themanaworld/tmwa-client-data/blob/master/graphics/sprites/monsters/scorpion.xml


let scale;
let mapCount;
let isDrawCollision;
let isDrawText;
let isDrawObjects;
let isDrawBox;

// Register the hashchange event listener
window.addEventListener('hashchange', readParameters);

function readParameters(){
    if (!window.location.hash) {
      // Set a default hash if not present
      window.location.hash = "#scale=0.5&mapcount=2&coll=0&text=0&objects=0&box=0";
    }

  let params = new URLSearchParams(window.location.hash.substring(1));
  scale = parseFloat(params.get('scale'));
  mapCount = parseInt(params.get('mapcount'), 10);
  isDrawCollision = Boolean(parseInt(params.get('coll'), 10));
  isDrawText = Boolean(parseInt(params.get('text'), 10));
  console.log(isDrawText);
  isDrawObjects = Boolean(parseInt(params.get('objects'), 10));
  isDrawBox = Boolean(parseInt(params.get('box'), 10));
  // draw world
  drawWorld();
}




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
async function loadTileset(tilesetSource) {
  try {
    const tilesetXml = await loadXML(assetsBaseUrl + tilesetSource);
    const tilesetElement = tilesetXml.querySelector('tileset');
    const imageElement = tilesetElement.querySelector('image');

    let tileWidth = parseInt(tilesetElement.getAttribute('tilewidth'));
    let width = parseInt(imageElement.getAttribute('width')); // Ensure this is parsed as an integer
    let height = parseInt(imageElement.getAttribute('height')); // Parse the height attribute

    const tileset = {
      firstgid: 0, // ID of the first tile in this tileset
      image: new Image(), // Image element to hold the tileset image
      tileWidth: tileWidth,
      tileHeight: parseInt(tilesetElement.getAttribute('tileheight')),
      width: width,
      height: height,
      tilesPerRow: Math.floor(width / tileWidth), // Correct calculation of tiles per row
    };

    tileset.image.src = assetsBaseUrl + imageElement.getAttribute('source');
    return tileset;
  } catch (error) {
    console.error(`Error loading tileset from TSX:`, error);
    return null;
  }
}

// Function to load all tilesets referenced in a map's XML and store tile ID mappings
async function loadAllTilesets(mapXml) {
  const tileIdMap = new Map(); // Map to store tileId to tile image and position mapping
  const tilesetElements = mapXml.querySelectorAll('tileset');

  for (let tilesetElement of tilesetElements) {
    const tilesetSource = tilesetElement.getAttribute('source');
    let tileset = await loadTileset(tilesetSource);

    if (tileset) {
      tileset.firstgid = parseInt(tilesetElement.getAttribute('firstgid'));

      // Calculate the total number of tiles in the tileset
      const tileCount = (tileset.width / tileset.tileWidth) * (tileset.height / tileset.tileHeight);

      for (let tileIndex = 0; tileIndex < tileCount; tileIndex++) {
        const tileId = tileset.firstgid + tileIndex;
        const tileInfo = {
          tilesetImage: tileset.image,
          tileIndex: tileIndex,
          tileWidth: tileset.tileWidth,
          tileHeight: tileset.tileHeight,
          tilesPerRow: tileset.tilesPerRow,
          sourceX : (tileIndex % tileset.tilesPerRow) * tileset.tileWidth,
          sourceY : Math.floor(tileIndex / tileset.tilesPerRow) * tileset.tileHeight,
        };
        tileIdMap.set(tileId, tileInfo); // Store tile-specific data
      }
    }
  }

  return tileIdMap; // Only return the tileIdMap
}



// Function to load a tileset from a TSX (Tile Set XML) file
async function loadObject(tilesetSource) {
  try {
    // console.log(assetsBaseUrl + tilesetSource)
    const tilesetXml = await loadXML(assetsBaseUrl + tilesetSource);
    const tilesetElement = tilesetXml.querySelector('imageset');
    
    let imageSource=tilesetElement.getAttribute('src').split("|")[0]

    const tileset = {
      tilesetImage: new Image(), // Image element to hold the tileset image
      tileWidth: parseInt(tilesetElement.getAttribute('width')),
      tileHeight: parseInt(tilesetElement.getAttribute('height')),
    };
    
    tileset.tilesetImage.src = assetsBaseUrl + "../"+imageSource;
    // console.log(tileset.tilesetImage.src)
    return tileset;
  } catch (error) {
    // console.error(`Error loading object from XML:`, error);
    return null;
  }
}

// Function to load all tilesets referenced in a map's XML
async function loadAllObjects(mapXml) {
  const tileIdMap = new Map(); 

  const tilesetElements = mapXml.querySelectorAll('object[type="spawn"]');
  
  for (let tilesetElement of tilesetElements) {
    const tilesetSource = tilesetElement.getAttribute('name');
    // console.log(tilesetSource)
    let croppedname=nameToObject(tilesetSource);

    let url = "../graphics/sprites/monsters/"+croppedname+".xml";
    let tileset = await loadObject(url);
    if (tileset) {
      tileIdMap.set(croppedname, tileset);
    }
  }

  return tileIdMap;
}

function nameToObject(name){
  return name.toLowerCase().replace("red","").replace("green","").replace("yellow", "").replace("sea", "").replace("mountain","").replace("fire","");
}


// Function to draw all layers of a map (tiles and objects)
function drawMap(context, mapXml, tileIdMap, objectIdMap, offsetX = 0, offsetY = 0) {
  const layers = mapXml.querySelectorAll('layer');
  const objectGroups = mapXml.querySelectorAll('objectgroup');
  const mapElement = mapXml.querySelector('map');
  const mapTileWidth = parseInt(mapElement.getAttribute('tilewidth'));
  const mapTileHeight = parseInt(mapElement.getAttribute('tileheight'));

  // console.log(`Drawing map at offset: X=${offsetX}, Y=${offsetY}`);
  
  layers.forEach((layer) => {
    const layerName = layer.getAttribute('name');
    const layerOffsetX = parseFloat(layer.getAttribute('offsetx') || 0);
    const layerOffsetY = parseFloat(layer.getAttribute('offsety') || 0);

    // Skip Collision and Fringe layers for now
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
            // console.error(`Tile ID ${tileId} not found in tileIdMap`);
            continue;
          }

          const { tilesetImage, sourceX, sourceY, tileWidth, tileHeight } = tileInfo;

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

  // Draw objects (like trees, buildings) from object layers
  objectGroups.forEach((objectGroup) => {
    const objects = objectGroup.querySelectorAll('object');
    objects.forEach((object) => {
      const objectX = parseFloat(object.getAttribute('x'));
      const objectY = parseFloat(object.getAttribute('y'));
      const objectWidth = parseFloat(object.getAttribute('width') || mapTileWidth);
      const objectHeight = parseFloat(object.getAttribute('height') || mapTileHeight);
      const objectName = object.getAttribute('name') || '';
      const objectType = object.getAttribute('type') || '';
      
      let croppedName=nameToObject(objectName);

      if (isDrawObjects &&objectType==="spawn"){

        const tileInfo = objectIdMap.get(croppedName);

        if (tileInfo){
          // console.log("drawing "+objectName)
          const { tilesetImage, tileWidth, tileHeight } = tileInfo;
          // console.log(tileInfo)
          
          context.drawImage(
            tilesetImage,
            0,
            0,
            tileWidth,
            tileHeight,
            objectX +offsetX ,
            objectY +offsetY,
            5*tileWidth,
            5*tileHeight
          
          );


        } else{
          // console.error(`Object ID ${objectName} not found in objectIdMap`);
    
        }
      }else{
      // Draw a red rectangle around the object (for debugging)
      if (isDrawBox){
      context.strokeStyle = 'red';
      context.lineWidth = 4;
      context.strokeRect(objectX + offsetX, objectY + offsetY, objectWidth, objectHeight);
      }
      // Draw the object's name
      if (isDrawText&&objectType==="warp"){
      drwText(context, objectName, objectX + offsetX, objectY + offsetY - 5);
      }
    }


    });
  });
}

function drwText(context, text, x, y) {
  context.font = '40px Sans-serif';
  context.strokeStyle = 'black';
  context.lineWidth = 8;
  context.strokeText(text, x, y);
  context.fillStyle = 'white';
  context.fillText(text, x, y);
}


// Main function to draw the entire world map with optimized tile lookup and objects
async function drawWorld() {
  const canvas = document.getElementById('mapCanvas');
  const context = canvas.getContext('2d');

  try {
    const worldData = await (await fetch(worldDataFile)).json();

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // Load map data and calculate world bounds
    const maps = await Promise.all(
      worldData.maps.slice(0, mapCount).map(async (mapInfo) => {
        const mapXml = await loadXML(assetsBaseUrl + mapInfo.fileName);
        const mapElement = mapXml.querySelector('map');
        const mapWidth = parseInt(mapElement.getAttribute('width')) * parseInt(mapElement.getAttribute('tilewidth'));
        const mapHeight = parseInt(mapElement.getAttribute('height')) * parseInt(mapElement.getAttribute('tileheight'));

        minX = Math.min(minX, mapInfo.x);
        minY = Math.min(minY, mapInfo.y);
        maxX = Math.max(maxX, mapInfo.x + mapWidth);
        maxY = Math.max(maxY, mapInfo.y + mapHeight);

        return { mapXml, mapInfo, mapWidth, mapHeight };
      })
    );

    // Adjust canvas size based on total world bounds and apply the scale factor
    canvas.width = (maxX - minX) * scale;
    canvas.height = (maxY - minY) * scale;
    console.log(`Canvas size: ${canvas.width}x${canvas.height}`);

    // Apply scaling transformation on the canvas context
    context.scale(scale, scale); // This scales down everything drawn on the canvas

    // Draw each map onto the canvas
    for (const { mapXml, mapInfo } of maps) {
      const tileIdMap = await loadAllTilesets(mapXml);
      const objectIdMap = await loadAllObjects(mapXml); // Load objects (e.g., spawns)

      console.log(`Drawing map: ${mapInfo.fileName} at X=${mapInfo.x - minX}, Y=${mapInfo.y - minY}`);

      drawMap(context, mapXml, tileIdMap, objectIdMap, mapInfo.x - minX, mapInfo.y - minY);
    }

    console.log('World map rendering completed.');
  } catch (error) {
    console.error('Error loading or drawing world:', error);
  }
}

readParameters()
