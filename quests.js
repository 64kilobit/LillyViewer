// Base URLs
const baseUrl =
  'https://raw.githubusercontent.com/themanaworld/tmwa-client-data/master/';
const githubBaseUrl =
  'https://github.com/themanaworld/tmwa-client-data/blob/master/';

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

// Function to create a hyperlink to GitHub
function a(url, text) {
  return '<a href="' + url + '" target="_blank">' + text + '</a>';
}

// Function to load and display quests with links to GitHub files
async function quests() {
  const questsL1 = await loadXML(baseUrl + 'quests.xml');
  const questsL1Include = questsL1.querySelectorAll('include');

  for (let l1 of questsL1Include) {
    const urlL1 = l1.getAttribute('name');
    add('<h1>' + a(githubBaseUrl + urlL1, urlL1) + '</h1>');

    const questsL2 = await loadXML(baseUrl + urlL1);
    const questsL2Include = questsL2.querySelectorAll('include');

    for (let l2 of questsL2Include) {
      const urlL2 = l2.getAttribute('name');
      add('<h1>' + a(githubBaseUrl + urlL2, urlL2) + '</h1>');

      const questsL3 = await loadXML(baseUrl + urlL2);
      const questsL3Include = questsL3.querySelectorAll('include');

      for (let l3 of questsL3Include) {
        const urlL3 = l3.getAttribute('name');
        add('<h1>' + a(githubBaseUrl + urlL3, urlL3) + '</h1>');

        const questsL4 = await loadXML(baseUrl + urlL3);
        const questsL4Include = questsL4.querySelectorAll('quest');

        for (let l4 of questsL4Include) {
          const urlL4 = l4.getAttribute('name');
          const group = l4.getAttribute('group');
          const texts = l4.querySelectorAll('text');

          for (let text of texts) {
            add(
              '<br>' + group + ' &gt; ' + urlL4 + ' &gt; ' + text.textContent
            );
          }
        }
      }
    }
  }
}

// Call the function to load and display quests
quests();
