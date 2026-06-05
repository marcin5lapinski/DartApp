// League tournament — data, schedule, standings

const TOURNAMENTS_KEY = 'dart_tournaments';
const CHECKOUT_LABELS = { double: 'Double-out', master: 'Master-out', straight: 'Straight-out' };

let _activeTournament = null;

function loadTournaments() {
  try { return JSON.parse(localStorage.getItem(TOURNAMENTS_KEY) || '[]'); }
  catch { return []; }
}

function saveTournaments(list) {
  let active   = list.filter(t => t.status === 'active');
  let finished = list.filter(t => t.status === 'finished');
  if (finished.length > 40) {
    finished.sort((a, b) => a.createdAt - b.createdAt);
    finished = finished.slice(finished.length - 40);
  }
  try { localStorage.setItem(TOURNAMENTS_KEY, JSON.stringify([...active, ...finished])); } catch {}
}

function generateSchedule(numPlayers, leagueRounds) {
  const matches = [];
  for (let i = 0; i < numPlayers; i++) {
    for (let j = i + 1; j < numPlayers; j++) {
      matches.push({ p1: i, p2: j, winner: null, legs: [null, null], avgs: [null, null] });
      if (leagueRounds === 'double') {
        matches.push({ p1: j, p2: i, winner: null, legs: [null, null], avgs: [null, null] });
      }
    }
  }
  return matches;
}

function createTournament(config, players) {
  const tournament = {
    id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
    name: config.name,
    status: 'active',
    createdAt: Math.floor(Date.now() / 1000),
    config: {
      numPlayers: config.numPlayers,
      format: config.format,
      leagueRounds: config.leagueRounds,
      winPoints: config.winPoints,
      lossPoints: config.lossPoints,
      matchConfig: { ...config.matchConfig },
    },
    players,
    matches: generateSchedule(players.length, config.leagueRounds),
  };
  const list = loadTournaments();
  list.push(tournament);
  saveTournaments(list);
  return tournament;
}

function deleteTournament(id) {
  saveTournaments(loadTournaments().filter(t => t.id !== id));
}

function computeStandings(tournament) {
  const { players, matches, config } = tournament;
  const rows = players.map((p, i) => ({
    index: i, name: p.name,
    M: 0, W: 0, L: 0,
    legsWon: 0, legsLost: 0,
    avgSum: 0, avgCount: 0,
    pts: 0,
  }));

  for (const m of matches) {
    if (m.winner === null) continue;
    const [w, l] = m.winner === 0 ? [m.p1, m.p2] : [m.p2, m.p1];
    rows[w].M++; rows[w].W++; rows[w].pts += config.winPoints;
    rows[l].M++; rows[l].L++; rows[l].pts += config.lossPoints;
    rows[m.p1].legsWon  += m.legs[0]; rows[m.p1].legsLost += m.legs[1];
    rows[m.p2].legsWon  += m.legs[1]; rows[m.p2].legsLost += m.legs[0];
    if (m.avgs[0] !== null) { rows[m.p1].avgSum += m.avgs[0]; rows[m.p1].avgCount++; }
    if (m.avgs[1] !== null) { rows[m.p2].avgSum += m.avgs[1]; rows[m.p2].avgCount++; }
  }

  rows.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const aDiff = a.legsWon - a.legsLost;
    const bDiff = b.legsWon - b.legsLost;
    if (bDiff !== aDiff) return bDiff - aDiff;
    const aAvg = a.avgCount ? a.avgSum / a.avgCount : 0;
    const bAvg = b.avgCount ? b.avgSum / b.avgCount : 0;
    if (bAvg !== aAvg) return bAvg - aAvg;
    return a.index - b.index;
  });

  rows.forEach((row, i) => {
    const diff = row.legsWon - row.legsLost;
    const prev = rows[i - 1];
    const next = rows[i + 1];
    const tiedWithPrev = prev && prev.pts === row.pts && (prev.legsWon - prev.legsLost) === diff;
    const tiedWithNext = next && next.pts === row.pts && (next.legsWon - next.legsLost) === diff;
    row._tied = tiedWithPrev || tiedWithNext;
  });

  return rows;
}

function renderTournamentListScreen() {
  const all      = loadTournaments();
  const active   = all.filter(t => t.status === 'active').sort((a, b) => b.createdAt - a.createdAt);
  const finished = all.filter(t => t.status === 'finished').sort((a, b) => b.createdAt - a.createdAt);

  const body = document.getElementById('tournament-list-body');
  body.innerHTML = '';

  if (all.length === 0) {
    body.innerHTML = '<p class="t-list-empty">Brak turniejów</p>';
  } else {
    if (active.length > 0) {
      body.insertAdjacentHTML('beforeend', '<div class="t-list-section-label">W toku</div>');
      active.forEach(t => body.appendChild(buildTournamentCard(t)));
    }
    if (finished.length > 0) {
      body.insertAdjacentHTML('beforeend', '<div class="t-list-section-label">Zakończone</div>');
      finished.forEach(t => body.appendChild(buildTournamentCard(t)));
    }
  }

  const btn = document.getElementById('btn-new-tournament');
  const atLimit = active.length >= 5;
  btn.disabled = atLimit;
  btn.title = atLimit ? 'Maksymalna liczba aktywnych turniejów: 5' : '';
}

function buildTournamentCard(t) {
  const div = document.createElement('div');
  div.className = 'tournament-card-item';
  div.dataset.id = t.id;

  const mc    = t.config.matchConfig;
  const meta  = `Liga · ${t.players.length} graczy · ${mc.variant} · First to ${mc.totalLegs}`;
  const played = t.matches.filter(m => m.winner !== null).length;
  const total  = t.matches.length;

  let statusHtml;
  if (t.status === 'active') {
    statusHtml = `<span class="tc-status tc-active">&#9654; W toku &mdash; ${played}/${total} meczów</span>`;
  } else {
    const standings = computeStandings(t);
    const winner    = standings[0] ? escapeHtml(standings[0].name) : '&mdash;';
    statusHtml = `<span class="tc-status tc-done">&#10003; Zakończony &middot; Wygrał: ${winner}</span>`;
  }

  div.innerHTML = `
    <div class="tc-main">
      <div class="tc-name">${escapeHtml(t.name)}</div>
      <div class="tc-meta">${meta}</div>
      ${statusHtml}
    </div>
    <button class="btn-delete-record tc-delete" data-id="${t.id}" title="Usuń">&#x2715;</button>
  `;
  return div;
}

function renderTournamentViewScreen(tournament) {
  _activeTournament = tournament;
  document.getElementById('tv-title').textContent = tournament.name;

  const mc = tournament.config.matchConfig;
  const roundsLabel = tournament.config.leagueRounds === 'double' ? 'Dwie rundy' : 'Jedna runda';
  const played = tournament.matches.filter(m => m.winner !== null).length;
  const total  = tournament.matches.length;
  document.getElementById('tv-info-bar').innerHTML =
    `<span>${mc.variant} &middot; First to ${mc.totalLegs} &middot; ${CHECKOUT_LABELS[mc.checkoutMode] || mc.checkoutMode}</span>` +
    `<span>${tournament.players.length} graczy &middot; ${roundsLabel} &middot; ${played}/${total} meczów rozegranych</span>`;

  const rows      = computeStandings(tournament);
  const container = document.getElementById('tv-standings');
  container.innerHTML = '';

  const table = document.createElement('table');
  table.className = 'standings-table';

  const thead = document.createElement('thead');
  thead.innerHTML = `<tr>
    <th>#</th><th class="left">Gracz</th>
    <th>M</th><th>W</th><th>L</th>
    <th>Legi</th><th>Avg</th><th>Pkt</th>
  </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  rows.forEach((row, i) => {
    const rank     = i + 1;
    const isLeader = rank === 1 && row.M > 0;
    const legDiff  = row.legsWon - row.legsLost;
    const avg      = row.avgCount ? (row.avgSum / row.avgCount).toFixed(1) : '&mdash;';
    const legsStr  = row.M === 0 ? '&mdash;' : `${row.legsWon}-${row.legsLost}`;
    const legsClass = row.M === 0 ? '' : legDiff > 0 ? 'legs-pos' : legDiff < 0 ? 'legs-neg' : 'legs-even';

    const tr = document.createElement('tr');
    if (row._tied) tr.classList.add('standings-tied');
    tr.innerHTML = `
      <td class="${isLeader ? 'pos-gold' : 'pos-num'}">${rank}</td>
      <td class="left player-name-cell ${isLeader ? 'name-gold' : ''}">${escapeHtml(row.name)}</td>
      <td>${row.M}</td>
      <td>${row.W}</td>
      <td>${row.L}</td>
      <td class="${legsClass}">${legsStr}</td>
      <td class="avg-cell">${avg}</td>
      <td class="pts-cell">${row.pts}</td>
    `;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}
