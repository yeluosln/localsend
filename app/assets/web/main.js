const BASE_URL = '/api/localsend/v2';

let i18n = {};
let sessionId = sessionStorage.getItem('sessionId');
let queryPin = new URLSearchParams(window.location.search).get('pin');

async function requestFiles() {
  document.getElementById('status-text').innerText = i18n.waiting;

  let initialUrl = new URL(`${BASE_URL}/prepare-download`, document.location);
  if (sessionId) {
    initialUrl.searchParams.append('sessionId', sessionId);
  }
  if (queryPin) {
    initialUrl.searchParams.append('pin', queryPin);
  }

  console.log(initialUrl);

  let response = await fetch(
    initialUrl,
    {
      method: 'POST',
    },
  );

  if (response.status === 429) {
    document.getElementById('status-text').innerText = i18n.tooManyAttempts;
    return;
  }

  while (response.status === 401) {
    const pin = prompt(i18n.enterPin);
    if (!pin) {
      document.getElementById('status-text').innerText = i18n.invalidPin;
      return;
    }

    response = await fetch(
      `${BASE_URL}/prepare-download?pin=${pin}`,
      {
      method: 'POST',
      },
    );

    if (response.status === 429) {
      document.getElementById('status-text').innerText = i18n.tooManyAttempts;
      return;
    }
  }

  if (response.status === 403) {
    document.getElementById('status-text').innerText = i18n.rejected;
    return;
  } else if (response.status !== 200) {
    document.getElementById('status-text').innerText = `Error: ${response.status}`;
    return;
  }

  const data = await response.json();
  const files = data.files;
  sessionId = data.sessionId;
  sessionStorage.setItem('sessionId', sessionId);

  document.getElementById('status-text').innerText = `${i18n.files} (${Object.keys(data.files).length})`;

  if (Object.keys(files).length === 1) {
    // single file
    const file = files[Object.keys(files)[0]];
    document.getElementById('single-file').innerHTML = `
    <a class="file-item" href="${BASE_URL}/download?sessionId=${sessionId}&fileId=${file.id}">
      <div class="file-name-cell">
        ${file.fileName}
      </div>
      <div class="file-size-cell">
        ${formatBytes(file.size)}
      </div>
    </a>
    `;
    return;
  }
  document.getElementById('file-list').innerHTML = `
    ${Object.keys(files).map((key, index) => `
      <a class="file-item" href="${BASE_URL}/download?sessionId=${sessionId}&fileId=${key}">
        <div class="file-index-cell">
          ${index + 1}
        </div>
        <div class="file-name-cell">
          ${files[key].fileName}
        </div>
        <div class="file-size-cell">
          ${formatBytes(files[key].size)}
        </div>
      </a>
  `).join('')}
  `;
}

async function fetchI18n() {
  const response = await fetch('/i18n.json');
  i18n = await response.json();
}

async function init() {
  await fetchI18n();
  await requestFiles();
}

function formatBytes(bytes) {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
}

init();
