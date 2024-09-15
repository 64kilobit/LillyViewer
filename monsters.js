// https://github.com/themanaworld/tmwa-client-data/blob/master/maps/1.world
// https://github.com/themanaworld/tmwa-client-data/blob/master/maps/001-1.tmx
// https://github.com/themanaworld/tmwa-client-data/blob/master/tilesets/desert1.tsx
// https://github.com/themanaworld/tmwa-client-data/blob/master/graphics/sprites/monsters/scorpion.xml
// https://api.github.com/repos/themanaworld/tmwa-client-data/git/trees/master?recursive=1

// quests.xml;
// monsters.xml;
// items.xml;
// skills.xml;
// stats.xml;
// weapons.xml;
// emotes.xml;
// deasmessages.xml;
// status - effects.xml;
// itemcolors.xml;
// groups.xml;
// equipmentwindow.xml;
// effects.xml;
// deadmessages.xml;
// Function to load XML data from a file URL

let maxMonsters = 15;

function l(text) {
  console.log(text);
}
function add(text) {
  document.getElementById('content').innerHTML += text;
}
function a(url, text) {
  return '<a href="' + url + '">' + text + '</a>';
}
function img(url) {
  return '<img src="' + url + '" />';
}

const baseUrl =
  'https://raw.githubusercontent.com/themanaworld/tmwa-client-data/master/';
const baseUrl2 =
  'https://raw.githubusercontent.com/themanaworld/tmwa-client-data/master/graphics/sprites/';

async function loadXML(fileUrl) {
  const response = await fetch(fileUrl);
  const xmlText = await response.text();
  const parser = new DOMParser();
  return parser.parseFromString(xmlText, 'application/xml');
}

async function quests() {
  const questsL1 = await loadXML(baseUrl + 'quests.xml');
  const questsL1Include = questsL1.querySelectorAll('include');

  for (let l1 of questsL1Include) {
    const urlL1 = l1.getAttribute('name');
    document.getElementById('content2').innerHTML += '<h1>' + urlL1 + '</h1>';
    const questsL2 = await loadXML(baseUrl + urlL1);
    const questsL2Include = questsL2.querySelectorAll('include');

    for (let l2 of questsL2Include) {
      const urlL2 = l2.getAttribute('name');
      document.getElementById('content2').innerHTML += '<h1>' + urlL2 + '</h1>';
      const questsL3 = await loadXML(baseUrl + urlL2);
      const questsL3Include = questsL3.querySelectorAll('include');

      for (let l3 of questsL3Include) {
        const urlL3 = l3.getAttribute('name');
        document.getElementById('content2').innerHTML +=
          '<h1>' + urlL3 + '</h1>';

        const questsL4 = await loadXML(baseUrl + urlL3);
        const questsL4Include = questsL4.querySelectorAll('quest');

        for (let l4 of questsL4Include) {
          const urlL4 = l4.getAttribute('name');
          const group = l4.getAttribute('group');
          const texts = l4.querySelectorAll('text');
          for (let text of texts) {
            document.getElementById('content2').innerHTML +=
              '<br>' + group + ' &gt; ' + urlL4 + ' &gt; ' + text.textContent;
          }
        }
      }
    }
  }
}

async function monsters() {
  const monsters = await loadXML(baseUrl + 'monsters.xml');
  const monsterList = monsters.querySelectorAll('monster');
  const monsterList2 = Array.from(monsterList).slice(0, maxMonsters);

  for (let monster of monsterList2) {
    const name = monster.getAttribute('name');

    add('<h1>' + name + '</h1>');

    const spriteList = monster.querySelectorAll('sprite');
    for (let sprite of spriteList) {
      const spriteName = sprite.textContent.split('|')[0];
      const spriteRest = sprite.textContent.split('|')[1];
      if (spriteRest) {
        let colors = spriteRest.replace('#', '').split(',');
        for (let color of colors) {
          add(
            '<div style="width: 20px; height: 10px; background-color: #' +
              color +
              ';"></div>'
          );
        }
      }
      add(
        '<div>' +
          a(baseUrl2 + spriteName, spriteName) +
          ' ' +
          spriteRest +
          '</div>'
      );

      const specificMonster = await loadXML(baseUrl2 + spriteName);

      const image = specificMonster.querySelector('imageset');
      const imageWidth = image.getAttribute('width');
      const imageHeight = image.getAttribute('height');
      const imageName = image.getAttribute('src').split('|')[0];
      const imageRest = image.getAttribute('src').split('|')[1];
      add(
        '<div>' +
          a(baseUrl + imageName, imageName) +
          +imageRest +
          ' w=' +
          imageWidth +
          ' h=' +
          imageHeight +
          '</div>'
      );
      add(img(baseUrl + imageName));
    }
  }
}

monsters();
