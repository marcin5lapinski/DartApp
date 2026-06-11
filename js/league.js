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
      matches.push({ p1: i, p2: j, winner: null, legs: [null, null], sets: [null, null], avgs: [null, null], stats: [null, null] });
      if (leagueRounds === 'double') {
        matches.push({ p1: j, p2: i, winner: null, legs: [null, null], sets: [null, null], avgs: [null, null], stats: [null, null] });
      }
    }
  }
  return matches;
}

function nextPowerOf2(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function computeRoundName(roundIdx, numRounds) {
  const tables = {
    2: ['Półfinał', 'Finał'],
    3: ['Ćwierćfinał', 'Półfinał', 'Finał'],
    4: ['1/8 Finału', 'Ćwierćfinał', 'Półfinał', 'Finał'],
  };
  return (tables[numRounds] || [])[roundIdx] || ('Runda ' + (roundIdx + 1));
}

function _bracketCenterY(round, slot, cardH, gap) {
  if (round === 0) return slot * (cardH + gap) + cardH / 2;
  return (_bracketCenterY(round - 1, slot * 2,     cardH, gap) +
          _bracketCenterY(round - 1, slot * 2 + 1, cardH, gap)) / 2;
}

function advanceBracketWinner(matches, finishedMatch) {
  const winnerPlayerIdx = finishedMatch.winner === 0 ? finishedMatch.p1 : finishedMatch.p2;
  const nextRound = finishedMatch.round + 1;
  const nextSlot  = Math.floor(finishedMatch.slot / 2);
  const target    = matches.find(m => m.round === nextRound && m.slot === nextSlot);
  if (!target) return; // Final has no next round
  if (finishedMatch.slot % 2 === 0) target.p1 = winnerPlayerIdx;
  else                               target.p2 = winnerPlayerIdx;
}

function generateBracket(players) {
  const numPlayers = players.length;
  const B          = nextPowerOf2(numPlayers);
  const numRounds  = Math.log2(B);
  const r1Slots    = B / 2;
  const matches    = [];

  // Build realSlotSet: slots that get real matches (same formula as _computeByeSuggestion)
  const numReal = numPlayers - r1Slots;
  const realSlotSet = new Set();
  for (let i = 0; i < numReal; i++) {
    realSlotSet.add(Math.floor(i * r1Slots / numReal));
  }

  // Separate players into bye and real groups (preserve order)
  const byePlayers  = players.map((p, i) => ({ ...p, _oi: i })).filter(p => p.bye);
  const realPlayers = players.map((p, i) => ({ ...p, _oi: i })).filter(p => !p.bye);
  let byePtr = 0, realPtr = 0;

  // Round 0: interleave real matches and bye slots
  for (let slot = 0; slot < r1Slots; slot++) {
    if (realSlotSet.has(slot)) {
      const p1i = realPlayers[realPtr]._oi;
      const p2i = realPlayers[realPtr + 1]._oi;
      realPtr += 2;
      matches.push({
        round: 0, slot, isBye: false,
        p1: p1i, p2: p2i, winner: null,
        legs: [null, null], sets: [null, null],
        avgs: [null, null], stats: [null, null], starter: null,
      });
    } else {
      const p1i = byePlayers[byePtr]._oi;
      byePtr++;
      matches.push({
        round: 0, slot, isBye: true,
        p1: p1i, p2: null, winner: 0,
        legs: [null, null], sets: [null, null],
        avgs: [null, null], stats: [null, null], starter: null,
      });
    }
  }

  // Rounds 1..numRounds-1: all TBD (unchanged)
  for (let r = 1; r < numRounds; r++) {
    const slotsInRound = B / Math.pow(2, r + 1);
    for (let slot = 0; slot < slotsInRound; slot++) {
      matches.push({
        round: r, slot, isBye: false,
        p1: null, p2: null, winner: null,
        legs: [null, null], sets: [null, null],
        avgs: [null, null], stats: [null, null], starter: null,
      });
    }
  }

  // Pre-fill bye winners into subsequent rounds (unchanged)
  matches.filter(m => m.isBye).forEach(m => advanceBracketWinner(matches, m));

  return matches;
}

function _buildGroups(players, numGroups, advanceCount) {
  const groups = Array.from({ length: numGroups }, (_, gi) => ({
    name: String.fromCharCode(65 + gi),
    playerIndices: [],
    advanceCount,
  }));
  players.forEach((p, i) => {
    groups[i % numGroups].playerIndices.push(i);
  });
  return groups;
}

function _generateGroupMatches(groups) {
  const buckets = groups.map(() => []);
  groups.forEach((g, gi) => {
    const idxs = g.playerIndices;
    for (let a = 0; a < idxs.length; a++) {
      for (let b = a + 1; b < idxs.length; b++) {
        buckets[gi].push({
          p1: idxs[a], p2: idxs[b],
          winner: null,
          legs: [null, null], sets: [null, null],
          avgs: [null, null], stats: [null, null],
          starter: null,
          phase: 'group',
          groupIndex: gi,
          isBye: false,
        });
      }
    }
  });
  // Interleave: A#1, B#1, C#1, A#2, B#2, ...
  const result = [];
  const ptrs   = new Array(groups.length).fill(0);
  let remaining = buckets.reduce((s, b) => s + b.length, 0);
  while (remaining > 0) {
    for (let gi = 0; gi < groups.length; gi++) {
      if (ptrs[gi] < buckets[gi].length) {
        result.push(buckets[gi][ptrs[gi]++]);
        remaining--;
      }
    }
  }
  return result;
}

function _computeSnakePairs(n) {
  if (n <= 1) return [];
  if (n === 2) return [[0, 1]];
  const half   = n / 2;
  const result = [];
  for (let i = 0; i < half / 2; i++) {
    result.push([i, n - 1 - i]);
    result.push([half - 1 - i, half + i]);
  }
  return result;
}

function _generateBracketTBD(numGroups, advanceCount, thirdPlaceMatch) {
  const totalSeeds = numGroups * advanceCount;
  const B          = nextPowerOf2(totalSeeds);
  const numByes    = B - totalSeeds;
  const numRounds  = Math.log2(B);
  const r1Slots    = B / 2;

  const seedLabels = [];
  for (let rank = 1; rank <= advanceCount; rank++) {
    for (let gi = 0; gi < numGroups; gi++) {
      seedLabels.push(String.fromCharCode(65 + gi) + rank);
    }
  }

  const byeSeeds  = seedLabels.slice(0, numByes);
  const realSeeds = seedLabels.slice(numByes);

  const matches = [];

  if (numByes === 0) {
    const snakePairs = _computeSnakePairs(totalSeeds);
    for (let slot = 0; slot < r1Slots; slot++) {
      const pair = snakePairs[slot] || [0, 1];
      matches.push({
        round: 0, slot, phase: 'bracket', isBye: false, isThirdPlace: false,
        p1: null, p2: null, winner: null,
        legs: [null,null], sets: [null,null], avgs: [null,null], stats: [null,null], starter: null,
        p1Label: seedLabels[pair[0]], p2Label: seedLabels[pair[1]],
      });
    }
  } else {
    const numReal    = totalSeeds - r1Slots;
    const realSlotSet = new Set();
    for (let i = 0; i < numReal; i++) {
      realSlotSet.add(Math.floor(i * r1Slots / numReal));
    }
    let byePtr = 0, realPtr = 0;
    for (let slot = 0; slot < r1Slots; slot++) {
      if (realSlotSet.has(slot)) {
        matches.push({
          round: 0, slot, phase: 'bracket', isBye: false, isThirdPlace: false,
          p1: null, p2: null, winner: null,
          legs: [null,null], sets: [null,null], avgs: [null,null], stats: [null,null], starter: null,
          p1Label: realSeeds[realPtr]     || null,
          p2Label: realSeeds[realPtr + 1] || null,
        });
        realPtr += 2;
      } else {
        matches.push({
          round: 0, slot, phase: 'bracket', isBye: true, isThirdPlace: false,
          p1: null, p2: null, winner: null,
          legs: [null,null], sets: [null,null], avgs: [null,null], stats: [null,null], starter: null,
          p1Label: byeSeeds[byePtr] || null, p2Label: null,
        });
        byePtr++;
      }
    }
  }

  for (let r = 1; r < numRounds; r++) {
    const slotsInRound = B / Math.pow(2, r + 1);
    for (let slot = 0; slot < slotsInRound; slot++) {
      matches.push({
        round: r, slot, phase: 'bracket', isBye: false, isThirdPlace: false,
        p1: null, p2: null, winner: null,
        legs: [null,null], sets: [null,null], avgs: [null,null], stats: [null,null], starter: null,
        p1Label: null, p2Label: null,
      });
    }
  }

  if (thirdPlaceMatch) {
    matches.push({
      round: numRounds - 1, slot: -1, phase: 'bracket', isBye: false, isThirdPlace: true,
      p1: null, p2: null, winner: null,
      legs: [null,null], sets: [null,null], avgs: [null,null], stats: [null,null], starter: null,
      p1Label: null, p2Label: null,
    });
  }

  return { bracketSize: B, matches };
}

function createTournament(config, players) {
  if (config.format === 'groups') {
    const groups = _buildGroups(players, config.numGroups, config.advanceCount);
    const { bracketSize, matches: bracketMatches } = _generateBracketTBD(
      groups.length, config.advanceCount, config.thirdPlaceMatch || false
    );
    const tournament = {
      id:        't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
      name:      config.name,
      status:    'active',
      createdAt: Math.floor(Date.now() / 1000),
      config: {
        numPlayers:      config.numPlayers,
        format:          'groups',
        groups,
        winPoints:       config.winPoints  !== undefined ? config.winPoints  : 3,
        lossPoints:      config.lossPoints !== undefined ? config.lossPoints : 0,
        thirdPlaceMatch: config.thirdPlaceMatch || false,
        bracketSize,
        matchConfig:     { ...config.matchConfig },
      },
      players: players.map(({ bye, ...rest }) => rest),
      matches: [..._generateGroupMatches(groups), ...bracketMatches],
    };
    const list = loadTournaments();
    list.push(tournament);
    saveTournaments(list);
    return tournament;
  }

  const isBracket = config.format === 'bracket';
  const tournament = {
    id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
    name: config.name,
    status: 'active',
    createdAt: Math.floor(Date.now() / 1000),
    config: {
      numPlayers: config.numPlayers,
      format: config.format,
      ...(isBracket
        ? { bracketSize: nextPowerOf2(players.length) }
        : { leagueRounds: config.leagueRounds, winPoints: config.winPoints, lossPoints: config.lossPoints }),
      matchConfig: { ...config.matchConfig },
    },
    players: isBracket ? players.map(({ bye, ...rest }) => rest) : players,
    matches: isBracket
      ? generateBracket(players)
      : generateSchedule(players.length, config.leagueRounds),
  };
  const list = loadTournaments();
  list.push(tournament);
  saveTournaments(list);
  return tournament;
}

function deleteTournament(id) {
  saveTournaments(loadTournaments().filter(t => t.id !== id));
}

function deleteAllTournamentsByStatus(status) {
  saveTournaments(loadTournaments().filter(t => t.status !== status));
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

function computeLiveStandings(tournament, liveData) {
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
    rows[m.p1].legsWon  += (m.legs[0] || 0);
    rows[m.p1].legsLost += (m.legs[1] || 0);
    rows[m.p2].legsWon  += (m.legs[1] || 0);
    rows[m.p2].legsLost += (m.legs[0] || 0);
    if (m.avgs[0] !== null) { rows[m.p1].avgSum += m.avgs[0]; rows[m.p1].avgCount++; }
    if (m.avgs[1] !== null) { rows[m.p2].avgSum += m.avgs[1]; rows[m.p2].avgCount++; }
  }

  const { p1Idx, p2Idx, legsWon, setsWon, avgs } = liveData;
  const useSets = config.matchConfig.totalSets > 1;
  const score0  = useSets ? setsWon[0] : legsWon[0];
  const score1  = useSets ? setsWon[1] : legsWon[1];

  rows[p1Idx].legsWon  += legsWon[0];
  rows[p1Idx].legsLost += legsWon[1];
  rows[p2Idx].legsWon  += legsWon[1];
  rows[p2Idx].legsLost += legsWon[0];

  if (avgs) {
    if (avgs[0] !== null) { rows[p1Idx].avgSum += avgs[0]; rows[p1Idx].avgCount++; }
    if (avgs[1] !== null) { rows[p2Idx].avgSum += avgs[1]; rows[p2Idx].avgCount++; }
  }

  if (score0 > score1) {
    rows[p1Idx].pts += config.winPoints;
    rows[p2Idx].pts += config.lossPoints;
  } else if (score1 > score0) {
    rows[p2Idx].pts += config.winPoints;
    rows[p1Idx].pts += config.lossPoints;
  }

  rows.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const aDiff = a.legsWon - a.legsLost, bDiff = b.legsWon - b.legsLost;
    if (bDiff !== aDiff) return bDiff - aDiff;
    const aAvg = a.avgCount ? a.avgSum / a.avgCount : 0;
    const bAvg = b.avgCount ? b.avgSum / b.avgCount : 0;
    if (bAvg !== aAvg) return bAvg - aAvg;
    return a.index - b.index;
  });

  rows.forEach((row, i) => {
    const diff = row.legsWon - row.legsLost;
    const prev = rows[i - 1], next = rows[i + 1];
    row._tied = (prev && prev.pts === row.pts && (prev.legsWon - prev.legsLost) === diff) ||
                (next && next.pts === row.pts && (next.legsWon - next.legsLost) === diff);
    row._live = row.index === p1Idx || row.index === p2Idx;
  });

  return rows;
}

function computeLiveGroupStandings(tournament, groupIndex, liveData) {
  const rows = computeGroupStandings(tournament, groupIndex);

  const { p1Idx, p2Idx, legsWon, setsWon, avgs } = liveData;
  const useSets = tournament.config.matchConfig.totalSets > 1;
  const score0  = useSets ? setsWon[0] : legsWon[0];
  const score1  = useSets ? setsWon[1] : legsWon[1];

  const rowByIdx = new Map(rows.map(r => [r.playerIndex, r]));
  const r1 = rowByIdx.get(p1Idx);
  const r2 = rowByIdx.get(p2Idx);

  if (r1) { r1.legsWon += legsWon[0]; r1.legsLost += legsWon[1]; }
  if (r2) { r2.legsWon += legsWon[1]; r2.legsLost += legsWon[0]; }

  if (avgs) {
    if (avgs[0] !== null && r1) { r1.avgSum += avgs[0]; r1.avgCount++; }
    if (avgs[1] !== null && r2) { r2.avgSum += avgs[1]; r2.avgCount++; }
  }

  if (score0 > score1 && r1 && r2) {
    r1.W++; r1.pts += tournament.config.winPoints;
    r2.L++; r2.pts += tournament.config.lossPoints;
  } else if (score1 > score0 && r1 && r2) {
    r2.W++; r2.pts += tournament.config.winPoints;
    r1.L++; r1.pts += tournament.config.lossPoints;
  }

  // Count this in-progress match for both players
  if (r1) r1.M++;
  if (r2) r2.M++;

  rows.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const aDiff = a.legsWon - a.legsLost;
    const bDiff = b.legsWon - b.legsLost;
    if (bDiff !== aDiff) return bDiff - aDiff;
    const aAvg = a.avgCount ? a.avgSum / a.avgCount : 0;
    const bAvg = b.avgCount ? b.avgSum / b.avgCount : 0;
    if (bAvg !== aAvg) return bAvg - aAvg;
    return a.playerIndex - b.playerIndex;
  });

  return rows;
}

function _renderGroupStandingsHTML(tournament, groupIndex, rows) {
  const group    = tournament.config.groups[groupIndex];
  const advCount = group.advanceCount;
  let html = `<div class="group-section-header" style="margin-top:0">Grupa ${group.name}</div>`;
  html += '<table class="standings-table" style="margin-bottom:0"><thead><tr>';
  html += '<th>#</th><th class="left">Gracz</th><th>M</th><th>W</th><th>L</th><th>Legi</th><th>Avg</th><th>Pkt</th>';
  html += '</tr></thead><tbody>';
  rows.forEach((row, i) => {
    const rank      = i + 1;
    const advancing = rank <= advCount;
    const legDiff   = row.legsWon - row.legsLost;
    const avg       = row.avgCount ? (row.avgSum / row.avgCount).toFixed(1) : '—';
    const legsStr   = row.M === 0 ? '—' : `${row.legsWon}‑${row.legsLost}`;
    const legsClass = row.M === 0 ? '' : legDiff > 0 ? 'legs-pos' : legDiff < 0 ? 'legs-neg' : 'legs-even';
    html += `<tr${advancing ? ' class="group-advancing"' : ''}>`;
    html += `<td class="pos-num">${rank}</td>`;
    html += `<td class="left player-name-cell">${advancing ? '<span class="adv-dot"></span>' : ''}${escapeHtml(row.name)}</td>`;
    html += `<td>${row.M}</td><td>${row.W}</td><td>${row.L}</td>`;
    html += `<td class="${legsClass}">${legsStr}</td>`;
    html += `<td class="avg-cell">${avg}</td>`;
    html += `<td class="pts-cell">${row.pts}</td>`;
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

function computeGroupStandings(tournament, groupIndex) {
  const { players, matches, config } = tournament;
  const group = config.groups[groupIndex];

  const rows = group.playerIndices.map(pi => ({
    playerIndex: pi,
    name: players[pi].name,
    M: 0, W: 0, L: 0,
    legsWon: 0, legsLost: 0,
    avgSum: 0, avgCount: 0,
    pts: 0,
  }));

  const rowByIdx = new Map(rows.map(r => [r.playerIndex, r]));

  for (const m of matches) {
    if (m.phase !== 'group' || m.groupIndex !== groupIndex || m.winner === null) continue;
    const wIdx = m.winner === 0 ? m.p1 : m.p2;
    const lIdx = m.winner === 0 ? m.p2 : m.p1;
    const wr = rowByIdx.get(wIdx);
    const lr = rowByIdx.get(lIdx);
    if (!wr || !lr) continue;

    wr.M++; wr.W++; wr.pts += config.winPoints;
    lr.M++; lr.L++; lr.pts += config.lossPoints;

    const r1 = rowByIdx.get(m.p1);
    const r2 = rowByIdx.get(m.p2);
    if (r1) { r1.legsWon += m.legs[0] || 0; r1.legsLost += m.legs[1] || 0; }
    if (r2) { r2.legsWon += m.legs[1] || 0; r2.legsLost += m.legs[0] || 0; }

    if (m.avgs[0] !== null && r1) { r1.avgSum += m.avgs[0]; r1.avgCount++; }
    if (m.avgs[1] !== null && r2) { r2.avgSum += m.avgs[1]; r2.avgCount++; }
  }

  rows.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const aDiff = a.legsWon - a.legsLost;
    const bDiff = b.legsWon - b.legsLost;
    if (bDiff !== aDiff) return bDiff - aDiff;
    const aAvg = a.avgCount ? a.avgSum / a.avgCount : 0;
    const bAvg = b.avgCount ? b.avgSum / b.avgCount : 0;
    if (bAvg !== aAvg) return bAvg - aAvg;
    return a.playerIndex - b.playerIndex;
  });

  return rows;
}

function isGroupPhaseComplete(tournament) {
  return tournament.matches
    .filter(m => m.phase === 'group')
    .every(m => m.winner !== null);
}

function finalizeGroupPhase(tournament) {
  const { config, matches } = tournament;
  const numGroups = config.groups.length;
  const advCount  = config.groups[0].advanceCount;

  const groupStandings = config.groups.map((g, gi) => computeGroupStandings(tournament, gi));

  const labelToPlayerIdx = new Map();
  for (let rank = 0; rank < advCount; rank++) {
    for (let gi = 0; gi < numGroups; gi++) {
      const row = groupStandings[gi][rank];
      if (!row) continue;
      const label = String.fromCharCode(65 + gi) + (rank + 1);
      labelToPlayerIdx.set(label, row.playerIndex);
    }
  }

  const r1Matches = matches.filter(m => m.phase === 'bracket' && m.round === 0);
  r1Matches.forEach(m => {
    if (m.isBye) {
      m.p1 = labelToPlayerIdx.get(m.p1Label) ?? null;
      m.winner = 0;
    } else {
      m.p1 = labelToPlayerIdx.get(m.p1Label) ?? null;
      m.p2 = labelToPlayerIdx.get(m.p2Label) ?? null;
    }
  });

  r1Matches.filter(m => m.isBye).forEach(m => advanceBracketWinner(matches, m));
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
      const atLimitClass = active.length >= 5 ? ' t-list-limit--full' : '';
      body.insertAdjacentHTML('beforeend',
        `<div class="t-list-section-label">W toku<div class="t-list-section-right"><span class="t-list-limit${atLimitClass}">${active.length} / 5</span><button class="btn-delete-all" id="btn-delete-all-active">Usuń wszystkie</button></div></div>`);
      active.forEach(t => body.appendChild(buildTournamentCard(t)));
    }
    if (finished.length > 0) {
      const atLimitClass = finished.length >= 40 ? ' t-list-limit--full' : '';
      body.insertAdjacentHTML('beforeend',
        `<div class="t-list-section-label">Zakończone<div class="t-list-section-right"><span class="t-list-limit${atLimitClass}">${finished.length} / 40</span><button class="btn-delete-all" id="btn-delete-all-finished">Usuń wszystkie</button></div></div>`);
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
  const isBracket = t.config.format === 'bracket';
  const isGroups = t.config.format === 'groups';
  const formatLabel = isBracket ? 'Drabinka' : isGroups ? 'Grupy+Drabinka' : 'Liga';
  const meta  = formatLabel + ' · ' + t.players.length + ' graczy · ' + mc.variant + ' · First to ' + mc.totalLegs;
  const groupMatches = isGroups ? t.matches.filter(m => m.phase === 'group') : null;
  const played = isBracket
    ? t.matches.filter(m => !m.isBye && m.winner !== null).length
    : isGroups
      ? groupMatches.filter(m => m.winner !== null).length
      : t.matches.filter(m => m.winner !== null).length;
  const total = isBracket
    ? t.matches.filter(m => !m.isBye).length
    : isGroups
      ? groupMatches.length
      : t.matches.length;

  let statusHtml;
  if (t.status === 'active') {
    statusHtml = '<span class="tc-status tc-active">&#9654; W toku &mdash; ' + played + '/' + total + ' meczów</span>';
  } else {
    let winner;
    if (isBracket) {
      const numRounds  = Math.log2(t.config.bracketSize);
      const finalMatch = t.matches.find(m => m.round === numRounds - 1 && m.slot === 0);
      if (finalMatch && finalMatch.winner !== null) {
        const wIdx = finalMatch.winner === 0 ? finalMatch.p1 : finalMatch.p2;
        winner = escapeHtml(t.players[wIdx].name);
      } else {
        winner = '&mdash;';
      }
    } else if (isGroups) {
      // For groups format, find winner from the bracket final
      const bracketMatches = t.matches.filter(m => m.phase === 'bracket');
      if (bracketMatches.length > 0) {
        const maxRound = Math.max(...bracketMatches.map(m => m.round));
        const finalMatch = bracketMatches.find(m => m.round === maxRound && m.slot === 0);
        if (finalMatch && finalMatch.winner !== null) {
          const wIdx = finalMatch.winner === 0 ? finalMatch.p1 : finalMatch.p2;
          winner = escapeHtml(t.players[wIdx].name);
        } else {
          winner = '&mdash;';
        }
      } else {
        winner = '&mdash;';
      }
    } else {
      const standings = computeStandings(t);
      winner = standings[0] ? escapeHtml(standings[0].name) : '&mdash;';
    }
    statusHtml = '<span class="tc-status tc-done">&#10003; Zakończony &middot; Wygrał: ' + winner + '</span>';
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

function renderBracketScreen(tournament, container) {
  if (!container) container = document.getElementById('tv-bracket');
  container.innerHTML = '';

  const { matches, players, config } = tournament;
  const B         = config.bracketSize;
  const numRounds = Math.log2(B);
  const CARD_H = 44, GAP = 8, LABEL_H = 26, SVG_W = 20;

  const byRound = [];
  for (let r = 0; r < numRounds; r++) {
    byRound.push(matches.filter(m => m.round === r && !m.isThirdPlace).sort((a, b) => a.slot - b.slot));
  }

  const numR1Slots = B / 2;
  const bodyH = numR1Slots * CARD_H + (numR1Slots - 1) * GAP;

  const VISIBLE = 3;
  let offset = 0;

  function render() {
    container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'bk-nav-wrap';

    if (numRounds > VISIBLE) {
      const lBtn = document.createElement('button');
      lBtn.className = 'bk-arrow';
      lBtn.textContent = '←';
      lBtn.disabled = (offset === 0);
      lBtn.addEventListener('click', () => { offset--; render(); });
      wrap.appendChild(lBtn);
    }

    const viewport = document.createElement('div');
    viewport.className = 'bk-viewport';
    const track = document.createElement('div');
    track.className = 'bk-track';

    const end = Math.min(offset + VISIBLE, numRounds);
    for (let ri = offset; ri < end; ri++) {
      const roundMatches = byRound[ri];
      // find the absolute index in tournament.matches[] of the first match in this round
      const firstIdx = matches.findIndex(m => m.round === ri && m.slot === 0);
      const col = buildBracketRound(roundMatches, ri, numRounds, players, firstIdx, CARD_H, GAP, bodyH);
      track.appendChild(col);

      const isLastVisible = (ri === end - 1);
      const hasMoreRight  = (ri < numRounds - 1);
      if (!isLastVisible) {
        track.appendChild(buildBracketConnectorSvg(byRound[ri].length, ri, CARD_H, GAP, LABEL_H, bodyH, SVG_W, false));
      } else if (hasMoreRight) {
        track.appendChild(buildBracketConnectorSvg(byRound[ri].length, ri, CARD_H, GAP, LABEL_H, bodyH, Math.floor(SVG_W / 2), true));
      }
    }

    viewport.appendChild(track);
    wrap.appendChild(viewport);

    if (numRounds > VISIBLE) {
      const rBtn = document.createElement('button');
      rBtn.className = 'bk-arrow';
      rBtn.textContent = '→';
      rBtn.disabled = (offset + VISIBLE >= numRounds);
      rBtn.addEventListener('click', () => { offset++; render(); });
      wrap.appendChild(rBtn);
    }

    container.appendChild(wrap);
  }

  render();
}

function _setGroupsTab(name) {
  const standingsEl = document.getElementById('tv-standings');
  const matchesEl   = document.getElementById('tv-matches');
  const bracketEl   = document.getElementById('tv-bracket');
  standingsEl.style.display = name === 'groups'  ? '' : 'none';
  matchesEl.style.display   = name === 'matches' ? '' : 'none';
  bracketEl.style.display   = name === 'bracket' ? '' : 'none';

  const tabTable   = document.getElementById('tv-tab-table');
  const tabMatches = document.getElementById('tv-tab-matches');
  const tabBracket = document.getElementById('tv-tab-bracket');
  [tabTable, tabMatches, tabBracket].forEach(t => t && t.classList.remove('active'));
  if (name === 'groups')  tabTable.classList.add('active');
  if (name === 'matches') tabMatches.classList.add('active');
  if (name === 'bracket') tabBracket.classList.add('active');
}

function renderGroupsTab(tournament) {
  const container = document.getElementById('tv-standings');
  container.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'group-standings-wrap';

  tournament.config.groups.forEach((group, gi) => {
    const rows      = computeGroupStandings(tournament, gi);
    const advCount  = group.advanceCount;
    const finished  = tournament.status === 'finished';

    const sectionLabel = document.createElement('div');
    sectionLabel.className = 'group-section-header';
    sectionLabel.textContent = 'Grupa ' + group.name;
    wrap.appendChild(sectionLabel);

    const table = document.createElement('table');
    table.className = 'standings-table group-standings-table';

    const thead = document.createElement('thead');
    thead.innerHTML = `<tr>
      <th>#</th><th class="left">Gracz</th>
      <th>M</th><th>W</th><th>L</th>
      <th>Legi</th><th>Avg</th><th>Pkt</th>
    </tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    rows.forEach((row, rank0) => {
      const rank      = rank0 + 1;
      const advancing = rank <= advCount;
      const legDiff   = row.legsWon - row.legsLost;
      const avg       = row.avgCount ? (row.avgSum / row.avgCount).toFixed(1) : '&mdash;';
      const legsStr   = row.M === 0 ? '&mdash;' : `${row.legsWon}&#8209;${row.legsLost}`;
      const legsClass = row.M === 0 ? '' : legDiff > 0 ? 'legs-pos' : legDiff < 0 ? 'legs-neg' : 'legs-even';

      const MEDAL_POS  = ['pos-gold',  'pos-silver',  'pos-bronze'];
      const MEDAL_NAME = ['name-gold', 'name-silver', 'name-bronze'];
      let posClass  = 'pos-num';
      let nameClass = '';
      if (finished && rank <= 3) {
        posClass  = MEDAL_POS[rank - 1]  || 'pos-num';
        nameClass = MEDAL_NAME[rank - 1] || '';
      }

      const tr = document.createElement('tr');
      if (advancing) tr.classList.add('group-advancing');
      tr.innerHTML = `
        <td class="${posClass}">${rank}</td>
        <td class="left player-name-cell ${nameClass}">
          ${advancing ? '<span class="adv-dot"></span>' : ''}${escapeHtml(row.name)}
        </td>
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
    wrap.appendChild(table);
  });

  const legend = document.createElement('div');
  legend.className = 'adv-legend';
  legend.innerHTML = '<span class="adv-dot"></span> awansuje do fazy pucharowej';
  wrap.appendChild(legend);

  container.appendChild(wrap);
}

function renderGroupMatchesTab(tournament) {
  const container      = document.getElementById('tv-matches');
  container.innerHTML  = '';
  const groupPhaseDone = isGroupPhaseComplete(tournament);

  tournament.config.groups.forEach((group, gi) => {
    const label = document.createElement('div');
    label.className = 'tv-matches-section';
    label.textContent = 'Grupa ' + group.name;
    container.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'matches-grid';
    container.appendChild(grid);

    tournament.matches
      .filter(m => m.phase === 'group' && m.groupIndex === gi)
      .forEach(m => {
        const globalIdx = tournament.matches.indexOf(m);
        grid.appendChild(_buildGroupMatchCell(tournament, m, globalIdx));
      });
  });

  if (groupPhaseDone) {
    const bracketMatches = tournament.matches
      .filter(m => m.phase === 'bracket' && !m.isBye && !m.isThirdPlace)
      .sort((a, b) => a.round - b.round || a.slot - b.slot);

    if (bracketMatches.length > 0) {
      const label = document.createElement('div');
      label.className = 'tv-matches-section';
      label.textContent = 'Faza pucharowa';
      container.appendChild(label);

      const grid = document.createElement('div');
      grid.className = 'matches-grid';
      container.appendChild(grid);

      bracketMatches.forEach(m => {
        const globalIdx = tournament.matches.indexOf(m);
        grid.appendChild(_buildGroupMatchCell(tournament, m, globalIdx));
      });
    }

    const thirdMatch = tournament.matches.find(m => m.phase === 'bracket' && m.isThirdPlace);
    if (thirdMatch) {
      const label = document.createElement('div');
      label.className = 'tv-matches-section';
      label.textContent = 'Mecz o 3. miejsce';
      container.appendChild(label);

      const grid = document.createElement('div');
      grid.className = 'matches-grid';
      container.appendChild(grid);

      const globalIdx = tournament.matches.indexOf(thirdMatch);
      grid.appendChild(_buildGroupMatchCell(tournament, thirdMatch, globalIdx));
    }
  }
}

function _buildGroupMatchCell(tournament, m, globalIdx) {
  const cell = document.createElement('div');
  cell.className = 'match-cell';

  const numDiv = document.createElement('div');
  numDiv.className = 'match-num-above';
  numDiv.textContent = '#' + (globalIdx + 1);
  cell.appendChild(numDiv);

  const card = document.createElement('div');
  card.dataset.matchIndex = globalIdx;

  if (m.p1 === null || m.p2 === null) {
    card.className = 'match-card tbd-card';
    const pd = document.createElement('div');
    pd.className = 'match-players';
    pd.appendChild(_buildMatchPlayerRow(m.p1Label || '?', null, null, ''));
    pd.appendChild(_buildMatchPlayerRow(m.p2Label || '?', null, null, ''));
    card.appendChild(pd);
    cell.appendChild(card);
    return cell;
  }

  const p1Name = tournament.players[m.p1].name;
  const p2Name = tournament.players[m.p2].name;

  if (m.winner !== null) {
    card.className = 'match-card played';
    const useSet = m.sets && m.sets[0] !== null;
    const w = m.winner, l = 1 - w;
    const wPIdx  = w === 0 ? m.p1 : m.p2;
    const lPIdx  = l === 0 ? m.p1 : m.p2;
    const wScore = useSet ? m.sets[w]  : m.legs[w];
    const lScore = useSet ? m.sets[l]  : m.legs[l];
    const wAvgF  = m.avgs[w], lAvgF = m.avgs[l];
    const wAvg   = wAvgF !== null ? wAvgF.toFixed(1) : null;
    const lAvg   = lAvgF !== null ? lAvgF.toFixed(1) : null;
    const wBest  = wAvgF !== null && lAvgF !== null && wAvgF > lAvgF;
    const lBest  = wAvgF !== null && lAvgF !== null && lAvgF > wAvgF;
    const pd = document.createElement('div');
    pd.className = 'match-players';
    pd.appendChild(_buildMatchPlayerRow(tournament.players[wPIdx].name, wScore, wAvg, 'winner', wBest));
    pd.appendChild(_buildMatchPlayerRow(tournament.players[lPIdx].name, lScore, lAvg, 'loser',  lBest));
    card.appendChild(pd);
    card.addEventListener('click', () => openTournamentMatchStats(tournament, globalIdx));
  } else {
    card.className = 'match-card unplayed';
    const pd = document.createElement('div');
    pd.className = 'match-players';
    pd.appendChild(_buildMatchPlayerRow(p1Name, null, null, ''));
    pd.appendChild(_buildMatchPlayerRow(p2Name, null, null, ''));
    card.appendChild(pd);
    card.addEventListener('click', () => openTournamentStarterModal(tournament, globalIdx));
  }

  cell.appendChild(card);
  return cell;
}

function renderTournamentViewScreen(tournament) {
  _activeTournament = tournament;
  const isBracket = tournament.config.format === 'bracket';
  const isGroups  = tournament.config.format === 'groups';

  const tabBracket = document.getElementById('tv-tab-bracket');
  if (tabBracket) tabBracket.style.display = isGroups ? '' : 'none';
  const tabTable = document.getElementById('tv-tab-table');
  if (tabTable && !isGroups) tabTable.textContent = 'Tabela';

  if (isGroups) {
    document.getElementById('tv-title').textContent = tournament.name;
    document.getElementById('tv-tabs').style.display = '';

    if (tabTable) tabTable.textContent = 'Grupy';

    const mc           = tournament.config.matchConfig;
    const groupMatches = tournament.matches.filter(m => m.phase === 'group');
    const groupPlayed  = groupMatches.filter(m => m.winner !== null).length;
    const phaseLabel   = isGroupPhaseComplete(tournament) ? '● Faza pucharowa' : '● Faza grupowa';

    document.getElementById('tv-info-bar').innerHTML =
      `<span>Grupy+Drabinka &middot; ${mc.variant} &middot; First to ${mc.totalLegs}</span>` +
      `<span>${tournament.players.length} graczy &middot; ${groupPlayed}/${groupMatches.length} meczów gr. &middot; <b>${phaseLabel}</b></span>`;

    ['tv-tab-table', 'tv-tab-matches', 'tv-tab-bracket'].forEach(id => {
      const old = document.getElementById(id);
      if (!old) return;
      const fresh = old.cloneNode(true);
      old.parentNode.replaceChild(fresh, old);
    });

    document.getElementById('tv-tab-table').addEventListener('click', () => {
      _setGroupsTab('groups');
      renderGroupsTab(tournament);
    });
    document.getElementById('tv-tab-matches').addEventListener('click', () => {
      _setGroupsTab('matches');
      renderGroupMatchesTab(tournament);
    });
    document.getElementById('tv-tab-bracket').addEventListener('click', () => {
      _setGroupsTab('bracket');
      renderBracketScreen(tournament);
    });

    _setGroupsTab('groups');
    renderGroupsTab(tournament);
    return;
  }

  if (isBracket) {
    document.getElementById('tv-title').textContent = tournament.name;
    document.getElementById('tv-tabs').style.display      = 'none';
    document.getElementById('tv-standings').style.display = 'none';
    document.getElementById('tv-matches').style.display   = 'none';
    document.getElementById('tv-bracket').style.display   = '';
    const mc      = tournament.config.matchConfig;
    const played  = tournament.matches.filter(m => !m.isBye && m.winner !== null).length;
    const total   = tournament.matches.filter(m => !m.isBye).length;
    document.getElementById('tv-info-bar').innerHTML =
      '<span>Drabinka &middot; ' + mc.variant + ' &middot; First to ' + mc.totalLegs + ' &middot; ' + (CHECKOUT_LABELS[mc.checkoutMode] || mc.checkoutMode) + '</span>' +
      '<span>' + tournament.players.length + ' graczy &middot; ' + played + '/' + total + ' meczów rozegranych</span>';
    renderBracketScreen(tournament);
    return;
  }
  // --- league: restore tabs/standings visibility ---
  document.getElementById('tv-tabs').style.display = '';
  document.getElementById('tv-bracket').style.display = 'none';
  document.getElementById('tv-title').textContent = tournament.name;
  document.getElementById('tv-tab-matches').classList.remove('tv-tab-disabled');
  document.getElementById('tv-tab-table').classList.add('active');
  document.getElementById('tv-tab-matches').classList.remove('active');
  document.getElementById('tv-standings').style.display = '';
  document.getElementById('tv-matches').style.display = 'none';

  const mc = tournament.config.matchConfig;
  const roundsLabel = tournament.config.leagueRounds === 'double' ? 'Dwie rundy' : 'Jedna runda';
  const played = tournament.matches.filter(m => m.winner !== null).length;
  const total  = tournament.matches.length;
  document.getElementById('tv-info-bar').innerHTML =
    `<span>${mc.variant} &middot; First to ${mc.totalLegs} &middot; ${CHECKOUT_LABELS[mc.checkoutMode] || mc.checkoutMode}</span>` +
    `<span>${tournament.players.length} graczy &middot; ${roundsLabel} &middot; ${played}/${total} meczów rozegranych</span>`;

  const rows      = computeStandings(tournament);
  const finished  = tournament.status === 'finished' ||
                    tournament.matches.every(m => m.winner !== null);
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

  const MEDAL_POS  = ['pos-gold',  'pos-silver',  'pos-bronze'];
  const MEDAL_NAME = ['name-gold', 'name-silver', 'name-bronze'];

  const tbody = document.createElement('tbody');
  rows.forEach((row, i) => {
    const rank = i + 1;
    let posClass, nameClass;
    if (finished && rank <= 3) {
      posClass  = MEDAL_POS[rank - 1];
      nameClass = MEDAL_NAME[rank - 1];
    } else if (!finished && rank === 1 && row.M > 0) {
      posClass  = 'pos-gold';
      nameClass = 'name-gold';
    } else {
      posClass  = 'pos-num';
      nameClass = '';
    }

    const legDiff   = row.legsWon - row.legsLost;
    const avg       = row.avgCount ? (row.avgSum / row.avgCount).toFixed(1) : '&mdash;';
    const legsStr   = row.M === 0 ? '&mdash;' : `${row.legsWon}-${row.legsLost}`;
    const legsClass = row.M === 0 ? '' : legDiff > 0 ? 'legs-pos' : legDiff < 0 ? 'legs-neg' : 'legs-even';

    const tr = document.createElement('tr');
    if (row._tied) tr.classList.add('standings-tied');
    tr.innerHTML = `
      <td class="${posClass}">${rank}</td>
      <td class="left player-name-cell ${nameClass}">${escapeHtml(row.name)}</td>
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

function renderTournamentMatchesScreen(tournament) {
  const container = document.getElementById('tv-matches');
  container.innerHTML = '';

  const { matches, players } = tournament;

  const lastPlayedAt = new Array(players.length).fill(-1);
  matches.forEach((m, idx) => {
    if (m.winner !== null) {
      lastPlayedAt[m.p1] = idx;
      lastPlayedAt[m.p2] = idx;
    }
  });

  const unplayed = matches
    .map((m, idx) => ({ m, idx }))
    .filter(({ m }) => m.winner === null)
    .sort((a, b) =>
      Math.max(lastPlayedAt[a.m.p1], lastPlayedAt[a.m.p2]) -
      Math.max(lastPlayedAt[b.m.p1], lastPlayedAt[b.m.p2])
    );

  const played = matches
    .map((m, idx) => ({ m, idx }))
    .filter(({ m }) => m.winner !== null);

  if (unplayed.length > 0) {
    container.insertAdjacentHTML('beforeend', '<div class="tv-matches-section">Do rozegrania</div>');
    const grid = document.createElement('div');
    grid.className = 'matches-grid';
    unplayed.forEach(({ m, idx }) => grid.appendChild(_buildMatchCell(m, idx, players)));
    container.appendChild(grid);
  }

  if (played.length > 0) {
    container.insertAdjacentHTML('beforeend', '<div class="tv-matches-section">Rozegrane</div>');
    const grid = document.createElement('div');
    grid.className = 'matches-grid';
    played.forEach(({ m, idx }) => grid.appendChild(_buildMatchCell(m, idx, players)));
    container.appendChild(grid);
  }
}

function _buildMatchCell(m, idx, players) {
  const cell = document.createElement('div');
  cell.className = 'match-cell';

  const numDiv = document.createElement('div');
  numDiv.className = 'match-num-above';
  numDiv.textContent = '#' + (idx + 1);
  cell.appendChild(numDiv);

  const card = document.createElement('div');
  card.className = 'match-card' + (m.winner !== null ? ' played' : ' unplayed');
  card.dataset.matchIndex = idx;

  const playersDiv = document.createElement('div');
  playersDiv.className = 'match-players';

  if (m.winner !== null) {
    const useSetScore = m.sets && m.sets[0] !== null;
    const w = m.winner === 0 ? 0 : 1;
    const l = 1 - w;
    const wPIdx = w === 0 ? m.p1 : m.p2;
    const lPIdx = l === 0 ? m.p1 : m.p2;
    const wScore = useSetScore ? m.sets[w] : m.legs[w];
    const lScore = useSetScore ? m.sets[l] : m.legs[l];
    const wAvgF  = m.avgs[w];
    const lAvgF  = m.avgs[l];
    const wAvg   = wAvgF !== null ? wAvgF.toFixed(1) : null;
    const lAvg   = lAvgF !== null ? lAvgF.toFixed(1) : null;
    const wBest  = wAvgF !== null && lAvgF !== null && wAvgF > lAvgF;
    const lBest  = wAvgF !== null && lAvgF !== null && lAvgF > wAvgF;
    playersDiv.appendChild(_buildMatchPlayerRow(players[wPIdx].name, wScore, wAvg, 'winner', wBest));
    playersDiv.appendChild(_buildMatchPlayerRow(players[lPIdx].name, lScore, lAvg, 'loser', lBest));
  } else {
    playersDiv.appendChild(_buildMatchPlayerRow(players[m.p1].name, null, null, ''));
    playersDiv.appendChild(_buildMatchPlayerRow(players[m.p2].name, null, null, ''));
  }

  card.appendChild(playersDiv);
  cell.appendChild(card);
  return cell;
}

function _buildMatchPlayerRow(name, score, avg, rowClass, avgBest) {
  const row = document.createElement('div');
  row.className = 'match-player-row' + (rowClass ? ' ' + rowClass : '');

  const nameSpan = document.createElement('span');
  nameSpan.className = 'mpname';
  nameSpan.textContent = name;
  row.appendChild(nameSpan);

  if (score !== null && score !== undefined) {
    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'mpscore';
    scoreSpan.textContent = score;
    row.appendChild(scoreSpan);
  }

  if (avg !== null && avg !== undefined) {
    const avgSpan = document.createElement('span');
    avgSpan.className = 'mpavg' + (avgBest ? ' avg-best' : '');
    avgSpan.textContent = avg;
    row.appendChild(avgSpan);
  }

  return row;
}

function _buildBracketCard(m, matchIdx, players, topPx) {
  const wrap = document.createElement('div');
  wrap.className = 'bk-card-wrap';
  wrap.style.top = topPx + 'px';

  const classes = ['match-card'];
  if (m.isBye) {
    classes.push('bye-card');
  } else if (m.winner !== null) {
    classes.push('played');
  } else if (m.p1 === null && m.p2 === null) {
    classes.push('tbd-card');
  } else {
    classes.push('unplayed');
  }
  const card = document.createElement('div');
  card.className = classes.join(' ');
  card.dataset.matchIndex = matchIdx;

  const pd = document.createElement('div');
  pd.className = 'match-players';

  if (m.isBye) {
    // Bye: show seeded player name + "— wolny los —" placeholder
    pd.appendChild(_buildMatchPlayerRow(players[m.p1].name, null, null, ''));
    const byeRow = document.createElement('div');
    byeRow.className = 'match-player-row bye-slot-row';
    const byeSpan = document.createElement('span');
    byeSpan.className = 'mpname';
    byeSpan.textContent = '— wolny los —';
    byeRow.appendChild(byeSpan);
    pd.appendChild(byeRow);
  } else if (m.winner !== null) {
    // Played: show winner/loser with scores and averages
    const useSet = m.sets && m.sets[0] !== null;
    const w = m.winner, l = 1 - w;
    const wPIdx = w === 0 ? m.p1 : m.p2;
    const lPIdx = l === 0 ? m.p1 : m.p2;
    const wScore = useSet ? m.sets[w] : m.legs[w];
    const lScore = useSet ? m.sets[l] : m.legs[l];
    const wAvgF  = m.avgs[w], lAvgF = m.avgs[l];
    const wAvg   = wAvgF !== null ? wAvgF.toFixed(1) : null;
    const lAvg   = lAvgF !== null ? lAvgF.toFixed(1) : null;
    const wBest  = wAvgF !== null && lAvgF !== null && wAvgF > lAvgF;
    const lBest  = wAvgF !== null && lAvgF !== null && lAvgF > wAvgF;
    pd.appendChild(_buildMatchPlayerRow(players[wPIdx].name, wScore, wAvg, 'winner', wBest));
    pd.appendChild(_buildMatchPlayerRow(players[lPIdx].name, lScore, lAvg, 'loser',  lBest));
  } else {
    const name1 = m.p1 !== null ? players[m.p1].name : (m.p1Label || '?');
    const name2 = m.p2 !== null ? players[m.p2].name : (m.p2Label || '?');
    pd.appendChild(_buildMatchPlayerRow(name1, null, null, ''));
    pd.appendChild(_buildMatchPlayerRow(name2, null, null, ''));
  }

  card.appendChild(pd);
  wrap.appendChild(card);
  return wrap;
}

function buildBracketRound(roundMatches, roundIdx, numRounds, players, matchIdxOffset, CARD_H, GAP, bodyH) {
  const col = document.createElement('div');
  col.className = 'bk-col';

  const lbl = document.createElement('div');
  lbl.className = 'bk-label' + (roundIdx === numRounds - 1 ? ' bk-label-final' : '');
  lbl.textContent = computeRoundName(roundIdx, numRounds);
  col.appendChild(lbl);

  const body = document.createElement('div');
  body.className = 'bk-body';
  body.style.height = bodyH + 'px';
  col.appendChild(body);

  roundMatches.forEach((m, i) => {
    const topPx = _bracketCenterY(m.round, m.slot, CARD_H, GAP) - CARD_H / 2;
    body.appendChild(_buildBracketCard(m, matchIdxOffset + i, players, topPx));
  });

  return col;
}

function buildBracketConnectorSvg(numLeft, round, CARD_H, GAP, LABEL_H, bodyH, SVG_W, isDashed) {
  const totalH = LABEL_H + bodyH;
  const HOOK   = Math.floor(SVG_W / 2);
  const STROKE = '#2d2d2d';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width',  SVG_W);
  svg.setAttribute('height', totalH);
  svg.style.flexShrink = '0';
  svg.style.display    = 'block';

  const numPairs = Math.floor(numLeft / 2);
  for (let pair = 0; pair < numPairs; pair++) {
    const slot1 = pair * 2, slot2 = pair * 2 + 1;
    const y1   = LABEL_H + _bracketCenterY(round, slot1, CARD_H, GAP);
    const y2   = LABEL_H + _bracketCenterY(round, slot2, CARD_H, GAP);
    const midY = (y1 + y2) / 2;

    if (!isDashed) {
      const arm = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      arm.setAttribute('points',       `0,${y1} ${HOOK},${y1} ${HOOK},${y2} 0,${y2}`);
      arm.setAttribute('fill',         'none');
      arm.setAttribute('stroke',       STROKE);
      arm.setAttribute('stroke-width', '1');
      svg.appendChild(arm);
    }

    const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    ln.setAttribute('x1',           isDashed ? 0 : HOOK);
    ln.setAttribute('y1',           midY);
    ln.setAttribute('x2',           SVG_W);
    ln.setAttribute('y2',           midY);
    ln.setAttribute('stroke',       STROKE);
    ln.setAttribute('stroke-width', '1');
    if (isDashed) ln.setAttribute('stroke-dasharray', '3,3');
    svg.appendChild(ln);
  }

  return svg;
}
