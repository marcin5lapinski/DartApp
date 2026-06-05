// Player profiles — persistent profiles stored in localStorage

const PLAYERS_KEY = 'dart_players';

function loadPlayers() {
  try { return JSON.parse(localStorage.getItem(PLAYERS_KEY) || '[]'); }
  catch { return []; }
}

function savePlayers(list) {
  try { localStorage.setItem(PLAYERS_KEY, JSON.stringify(list)); } catch {}
}

function createPlayer(name, primaryDouble, secondaryDouble) {
  const trimmed = name.trim().slice(0, 20);
  if (!trimmed) return null;
  const list = loadPlayers();
  if (list.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) return null;
  const player = {
    id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    name: trimmed,
    primaryDouble: primaryDouble || null,
    secondaryDouble: secondaryDouble || null,
  };
  list.push(player);
  savePlayers(list);
  return player;
}

function deletePlayer(id) {
  savePlayers(loadPlayers().filter(p => p.id !== id));
}

function renamePlayer(id, newName) {
  const trimmed = newName.trim().slice(0, 20);
  if (!trimmed) return false;
  const list = loadPlayers();
  if (list.some(p => p.id !== id && p.name.toLowerCase() === trimmed.toLowerCase())) return false;
  savePlayers(list.map(p => p.id === id ? { ...p, name: trimmed } : p));
  return true;
}

function updatePlayer(id, name, primaryDouble, secondaryDouble) {
  const trimmed = name.trim().slice(0, 20);
  if (!trimmed) return false;
  const list = loadPlayers();
  if (list.some(p => p.id !== id && p.name.toLowerCase() === trimmed.toLowerCase())) return false;
  savePlayers(list.map(p => p.id === id
    ? { ...p, name: trimmed, primaryDouble: primaryDouble || null, secondaryDouble: secondaryDouble || null }
    : p));
  return true;
}

function renderPlayersScreen() {
  const list = loadPlayers();
  const container = document.getElementById('players-list');
  container.innerHTML = '';

  if (list.length === 0) {
    container.innerHTML = '<p class="empty-msg">Brak zapisanych graczy.</p>';
    return;
  }

  list.forEach(player => {
    const row = document.createElement('div');
    row.className = 'player-row';
    row.dataset.id = player.id;
    const pLabel = player.primaryDouble ? closeDoubleLabel(player.primaryDouble) : '—';
    const sLabel = player.secondaryDouble ? closeDoubleLabel(player.secondaryDouble) : '—';
    row.innerHTML = `
      <span class="player-row-name">${escapeHtml(player.name)}</span>
      <span class="player-row-doubles">${pLabel} / ${sLabel}</span>
      <div class="player-row-actions">
        <button class="btn-icon btn-rename-player" title="Zmień nazwę">✏️</button>
        <button class="btn-icon btn-delete-player" title="Usuń">🗑️</button>
      </div>
    `;
    container.appendChild(row);
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function populatePlayerSuggestions() {
  const list = loadPlayers();
  const datalist = document.getElementById('players-datalist');
  if (!datalist) return;
  datalist.innerHTML = '';
  list.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.name;
    datalist.appendChild(opt);
  });
}
