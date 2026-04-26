// =================================================================================
// === QUINIELA MUNDIAL 2026 - CÓDIGO JAVASCRIPT MAESTRO, FINAL Y VERIFICADO      ===
// =================================================================================

// --- CONFIGURACIÓN GLOBAL ---
const STORAGE_KEY = 'quinielaMundial2026_data_v2'; // v2 para evitar conflictos con datos viejos
const TEAMS_DATA = {};
let isLoading = false;
let currentUserId = null; // ¡NUEVO! Guardará el ID del usuario de la URL.
let storageKey = 'quinielaMundial2026_data'; // Clave base, la haremos única.

// Ajustes manuales guardados por usuario/dispositivo.
// Sirven para resolver desempates especiales FIFA, fair play/ranking o combinaciones de mejores terceros.
let manualGroupOrders = {};
let manualThirdOrder = [];
let manualThirdAssignments = {};
let confirmedThirdSignature = null;

// Pronósticos personales del usuario.
// No afectan el cálculo FIFA ni la fase eliminatoria; solo sirven como referencia personal.
let userPredictions = {};


// Calendario mostrado en hora local de Ciudad de México (CDMX).
// Si existe window.MATCH_SCHEDULE se usa ese; si no, esta copia interna evita depender de otro archivo.
const MATCH_SCHEDULE_FALLBACK = {
  groups: {
    A: [
      { no: 1, date: 'Jue 11 junio 2026', time: '13:00 CDMX', venue: 'Estadio Azteca', city: 'Ciudad de México' },
      { no: 2, date: 'Jue 11 junio 2026', time: '20:00 CDMX', venue: 'Estadio Akron', city: 'Guadalajara' },
      { no: 28, date: 'Jue 18 junio 2026', time: '19:00 CDMX', venue: 'Estadio Akron', city: 'Guadalajara' },
      { no: 25, date: 'Jue 18 junio 2026', time: '10:00 CDMX', venue: 'Mercedes-Benz Stadium', city: 'Atlanta' },
      { no: 53, date: 'Mié 24 junio 2026', time: '19:00 CDMX', venue: 'Estadio Azteca', city: 'Ciudad de México' },
      { no: 54, date: 'Mié 24 junio 2026', time: '19:00 CDMX', venue: 'Estadio BBVA', city: 'Monterrey' },
    ],
    B: [
      { no: 3, date: 'Vie 12 junio 2026', time: '13:00 CDMX', venue: 'BMO Field', city: 'Toronto' },
      { no: 8, date: 'Sáb 13 junio 2026', time: '13:00 CDMX', venue: "Levi's Stadium", city: 'San Francisco Bay Area' },
      { no: 27, date: 'Jue 18 junio 2026', time: '16:00 CDMX', venue: 'BC Place', city: 'Vancouver' },
      { no: 26, date: 'Jue 18 junio 2026', time: '13:00 CDMX', venue: 'SoFi Stadium', city: 'Los Ángeles' },
      { no: 51, date: 'Mié 24 junio 2026', time: '13:00 CDMX', venue: 'BC Place', city: 'Vancouver' },
      { no: 52, date: 'Mié 24 junio 2026', time: '13:00 CDMX', venue: 'Lumen Field', city: 'Seattle' },
    ],
    C: [
      { no: 7, date: 'Sáb 13 junio 2026', time: '16:00 CDMX', venue: 'MetLife Stadium', city: 'New York/New Jersey' },
      { no: 5, date: 'Sáb 13 junio 2026', time: '19:00 CDMX', venue: 'Gillette Stadium', city: 'Boston' },
      { no: 29, date: 'Vie 19 junio 2026', time: '19:00 CDMX', venue: 'Lincoln Financial Field', city: 'Philadelphia' },
      { no: 30, date: 'Vie 19 junio 2026', time: '16:00 CDMX', venue: 'Gillette Stadium', city: 'Boston' },
      { no: 49, date: 'Mié 24 junio 2026', time: '16:00 CDMX', venue: 'Hard Rock Stadium', city: 'Miami' },
      { no: 50, date: 'Mié 24 junio 2026', time: '16:00 CDMX', venue: 'Mercedes-Benz Stadium', city: 'Atlanta' },
    ],
    D: [
      { no: 4, date: 'Vie 12 junio 2026', time: '19:00 CDMX', venue: 'SoFi Stadium', city: 'Los Ángeles' },
      { no: 6, date: 'Vie 12 junio 2026', time: '22:00 CDMX', venue: 'BC Place', city: 'Vancouver' },
      { no: 32, date: 'Vie 19 junio 2026', time: '13:00 CDMX', venue: 'Lumen Field', city: 'Seattle' },
      { no: 31, date: 'Vie 19 junio 2026', time: '21:00 CDMX', venue: "Levi's Stadium", city: 'San Francisco Bay Area' },
      { no: 59, date: 'Jue 25 junio 2026', time: '20:00 CDMX', venue: 'SoFi Stadium', city: 'Los Ángeles' },
      { no: 60, date: 'Jue 25 junio 2026', time: '20:00 CDMX', venue: "Levi's Stadium", city: 'San Francisco Bay Area' },
    ],
    E: [
      { no: 10, date: 'Dom 14 junio 2026', time: '11:00 CDMX', venue: 'NRG Stadium', city: 'Houston' },
      { no: 9, date: 'Dom 14 junio 2026', time: '17:00 CDMX', venue: 'Lincoln Financial Field', city: 'Philadelphia' },
      { no: 33, date: 'Sáb 20 junio 2026', time: '14:00 CDMX', venue: 'BMO Field', city: 'Toronto' },
      { no: 34, date: 'Sáb 20 junio 2026', time: '18:00 CDMX', venue: 'Arrowhead Stadium', city: 'Kansas City' },
      { no: 56, date: 'Jue 25 junio 2026', time: '14:00 CDMX', venue: 'MetLife Stadium', city: 'New York/New Jersey' },
      { no: 55, date: 'Jue 25 junio 2026', time: '14:00 CDMX', venue: 'Lincoln Financial Field', city: 'Philadelphia' },
    ],
    F: [
      { no: 11, date: 'Dom 14 junio 2026', time: '14:00 CDMX', venue: 'AT&T Stadium', city: 'Dallas' },
      { no: 12, date: 'Dom 14 junio 2026', time: '20:00 CDMX', venue: 'Estadio BBVA', city: 'Monterrey' },
      { no: 35, date: 'Sáb 20 junio 2026', time: '11:00 CDMX', venue: 'NRG Stadium', city: 'Houston' },
      { no: 36, date: 'Vie 19 junio 2026', time: '22:00 CDMX', venue: 'Estadio BBVA', city: 'Monterrey' },
      { no: 58, date: 'Jue 25 junio 2026', time: '17:00 CDMX', venue: 'Arrowhead Stadium', city: 'Kansas City' },
      { no: 57, date: 'Jue 25 junio 2026', time: '17:00 CDMX', venue: 'AT&T Stadium', city: 'Dallas' },
    ],
    G: [
      { no: 16, date: 'Lun 15 junio 2026', time: '13:00 CDMX', venue: 'Lumen Field', city: 'Seattle' },
      { no: 15, date: 'Lun 15 junio 2026', time: '19:00 CDMX', venue: 'SoFi Stadium', city: 'Los Ángeles' },
      { no: 39, date: 'Dom 21 junio 2026', time: '13:00 CDMX', venue: 'SoFi Stadium', city: 'Los Ángeles' },
      { no: 40, date: 'Dom 21 junio 2026', time: '19:00 CDMX', venue: 'BC Place', city: 'Vancouver' },
      { no: 64, date: 'Vie 26 junio 2026', time: '21:00 CDMX', venue: 'BC Place', city: 'Vancouver' },
      { no: 63, date: 'Vie 26 junio 2026', time: '21:00 CDMX', venue: 'Lumen Field', city: 'Seattle' },
    ],
    H: [
      { no: 14, date: 'Lun 15 junio 2026', time: '10:00 CDMX', venue: 'Mercedes-Benz Stadium', city: 'Atlanta' },
      { no: 13, date: 'Lun 15 junio 2026', time: '16:00 CDMX', venue: 'Hard Rock Stadium', city: 'Miami' },
      { no: 38, date: 'Dom 21 junio 2026', time: '10:00 CDMX', venue: 'Mercedes-Benz Stadium', city: 'Atlanta' },
      { no: 37, date: 'Dom 21 junio 2026', time: '16:00 CDMX', venue: 'Hard Rock Stadium', city: 'Miami' },
      { no: 66, date: 'Vie 26 junio 2026', time: '18:00 CDMX', venue: 'Estadio Akron', city: 'Guadalajara' },
      { no: 65, date: 'Vie 26 junio 2026', time: '18:00 CDMX', venue: 'NRG Stadium', city: 'Houston' },
    ],
    I: [
      { no: 17, date: 'Mar 16 junio 2026', time: '13:00 CDMX', venue: 'MetLife Stadium', city: 'New York/New Jersey' },
      { no: 18, date: 'Mar 16 junio 2026', time: '16:00 CDMX', venue: 'Gillette Stadium', city: 'Boston' },
      { no: 42, date: 'Lun 22 junio 2026', time: '15:00 CDMX', venue: 'Lincoln Financial Field', city: 'Philadelphia' },
      { no: 41, date: 'Lun 22 junio 2026', time: '18:00 CDMX', venue: 'MetLife Stadium', city: 'New York/New Jersey' },
      { no: 61, date: 'Vie 26 junio 2026', time: '13:00 CDMX', venue: 'Gillette Stadium', city: 'Boston' },
      { no: 62, date: 'Vie 26 junio 2026', time: '13:00 CDMX', venue: 'BMO Field', city: 'Toronto' },
    ],
    J: [
      { no: 19, date: 'Mar 16 junio 2026', time: '19:00 CDMX', venue: 'Arrowhead Stadium', city: 'Kansas City' },
      { no: 20, date: 'Mar 16 junio 2026', time: '22:00 CDMX', venue: "Levi's Stadium", city: 'San Francisco Bay Area' },
      { no: 43, date: 'Lun 22 junio 2026', time: '11:00 CDMX', venue: 'AT&T Stadium', city: 'Dallas' },
      { no: 44, date: 'Lun 22 junio 2026', time: '21:00 CDMX', venue: "Levi's Stadium", city: 'San Francisco Bay Area' },
      { no: 70, date: 'Sáb 27 junio 2026', time: '20:00 CDMX', venue: 'AT&T Stadium', city: 'Dallas' },
      { no: 69, date: 'Sáb 27 junio 2026', time: '20:00 CDMX', venue: 'Arrowhead Stadium', city: 'Kansas City' },
    ],
    K: [
      { no: 23, date: 'Mié 17 junio 2026', time: '11:00 CDMX', venue: 'NRG Stadium', city: 'Houston' },
      { no: 24, date: 'Mié 17 junio 2026', time: '20:00 CDMX', venue: 'Estadio Azteca', city: 'Ciudad de México' },
      { no: 47, date: 'Mar 23 junio 2026', time: '11:00 CDMX', venue: 'NRG Stadium', city: 'Houston' },
      { no: 48, date: 'Mar 23 junio 2026', time: '20:00 CDMX', venue: 'Estadio Akron', city: 'Guadalajara' },
      { no: 71, date: 'Sáb 27 junio 2026', time: '17:30 CDMX', venue: 'Hard Rock Stadium', city: 'Miami' },
      { no: 72, date: 'Sáb 27 junio 2026', time: '17:30 CDMX', venue: 'Mercedes-Benz Stadium', city: 'Atlanta' },
    ],
    L: [
      { no: 22, date: 'Mié 17 junio 2026', time: '14:00 CDMX', venue: 'AT&T Stadium', city: 'Dallas' },
      { no: 21, date: 'Mié 17 junio 2026', time: '17:00 CDMX', venue: 'BMO Field', city: 'Toronto' },
      { no: 45, date: 'Mar 23 junio 2026', time: '14:00 CDMX', venue: 'Gillette Stadium', city: 'Boston' },
      { no: 46, date: 'Mar 23 junio 2026', time: '17:00 CDMX', venue: 'BMO Field', city: 'Toronto' },
      { no: 67, date: 'Sáb 27 junio 2026', time: '15:00 CDMX', venue: 'MetLife Stadium', city: 'New York/New Jersey' },
      { no: 68, date: 'Sáb 27 junio 2026', time: '15:00 CDMX', venue: 'Lincoln Financial Field', city: 'Philadelphia' },
    ],
  },
  bracket: {
    '16-1': { no: 73, date: 'Dom 28 junio 2026', time: '13:00 CDMX', venue: 'SoFi Stadium', city: 'Los Ángeles' },
    '16-2': { no: 74, date: 'Lun 29 junio 2026', time: '14:30 CDMX', venue: 'Gillette Stadium', city: 'Boston' },
    '16-3': { no: 75, date: 'Lun 29 junio 2026', time: '19:00 CDMX', venue: 'Estadio BBVA', city: 'Monterrey' },
    '16-4': { no: 76, date: 'Lun 29 junio 2026', time: '11:00 CDMX', venue: 'NRG Stadium', city: 'Houston' },
    '16-5': { no: 77, date: 'Mar 30 junio 2026', time: '15:00 CDMX', venue: 'MetLife Stadium', city: 'New York/New Jersey' },
    '16-6': { no: 78, date: 'Mar 30 junio 2026', time: '11:00 CDMX', venue: 'AT&T Stadium', city: 'Dallas' },
    '16-7': { no: 79, date: 'Mar 30 junio 2026', time: '19:00 CDMX', venue: 'Estadio Azteca', city: 'Ciudad de México' },
    '16-8': { no: 80, date: 'Mié 1 julio 2026', time: '10:00 CDMX', venue: 'Mercedes-Benz Stadium', city: 'Atlanta' },
    '16-9': { no: 81, date: 'Mié 1 julio 2026', time: '18:00 CDMX', venue: "Levi's Stadium", city: 'San Francisco Bay Area' },
    '16-10': { no: 82, date: 'Mié 1 julio 2026', time: '14:00 CDMX', venue: 'Lumen Field', city: 'Seattle' },
    '16-11': { no: 83, date: 'Jue 2 julio 2026', time: '17:00 CDMX', venue: 'BMO Field', city: 'Toronto' },
    '16-12': { no: 84, date: 'Jue 2 julio 2026', time: '13:00 CDMX', venue: 'SoFi Stadium', city: 'Los Ángeles' },
    '16-13': { no: 85, date: 'Jue 2 julio 2026', time: '21:00 CDMX', venue: 'BC Place', city: 'Vancouver' },
    '16-14': { no: 86, date: 'Vie 3 julio 2026', time: '16:00 CDMX', venue: 'Hard Rock Stadium', city: 'Miami' },
    '16-15': { no: 87, date: 'Vie 3 julio 2026', time: '19:30 CDMX', venue: 'Arrowhead Stadium', city: 'Kansas City' },
    '16-16': { no: 88, date: 'Vie 3 julio 2026', time: '12:00 CDMX', venue: 'AT&T Stadium', city: 'Dallas' },
    '8-1': { no: 89, date: 'Sáb 4 julio 2026', time: '15:00 CDMX', venue: 'Lincoln Financial Field', city: 'Philadelphia' },
    '8-2': { no: 90, date: 'Sáb 4 julio 2026', time: '11:00 CDMX', venue: 'NRG Stadium', city: 'Houston' },
    '8-3': { no: 91, date: 'Dom 5 julio 2026', time: '14:00 CDMX', venue: 'MetLife Stadium', city: 'New York/New Jersey' },
    '8-4': { no: 92, date: 'Dom 5 julio 2026', time: '18:00 CDMX', venue: 'Estadio Azteca', city: 'Ciudad de México' },
    '8-5': { no: 93, date: 'Lun 6 julio 2026', time: '13:00 CDMX', venue: 'AT&T Stadium', city: 'Dallas' },
    '8-6': { no: 94, date: 'Lun 6 julio 2026', time: '18:00 CDMX', venue: 'Lumen Field', city: 'Seattle' },
    '8-7': { no: 95, date: 'Mar 7 julio 2026', time: '10:00 CDMX', venue: 'Mercedes-Benz Stadium', city: 'Atlanta' },
    '8-8': { no: 96, date: 'Mar 7 julio 2026', time: '14:00 CDMX', venue: 'BC Place', city: 'Vancouver' },
    '4-1': { no: 97, date: 'Jue 9 julio 2026', time: '14:00 CDMX', venue: 'Gillette Stadium', city: 'Boston' },
    '4-2': { no: 99, date: 'Sáb 11 julio 2026', time: '15:00 CDMX', venue: 'Hard Rock Stadium', city: 'Miami' },
    '4-3': { no: 98, date: 'Vie 10 julio 2026', time: '13:00 CDMX', venue: 'SoFi Stadium', city: 'Los Ángeles' },
    '4-4': { no: 100, date: 'Sáb 11 julio 2026', time: '19:00 CDMX', venue: 'Arrowhead Stadium', city: 'Kansas City' },
    '2-1': { no: 101, date: 'Mar 14 julio 2026', time: '13:00 CDMX', venue: 'AT&T Stadium', city: 'Dallas' },
    '2-2': { no: 102, date: 'Mié 15 julio 2026', time: '13:00 CDMX', venue: 'Mercedes-Benz Stadium', city: 'Atlanta' },
    '3-1': { no: 103, date: 'Sáb 18 julio 2026', time: '15:00 CDMX', venue: 'Hard Rock Stadium', city: 'Miami' },
    '1-1': { no: 104, date: 'Dom 19 julio 2026', time: '13:00 CDMX', venue: 'MetLife Stadium', city: 'New York/New Jersey' },
  }
};

function getScheduleData() {
    return (window.MATCH_SCHEDULE && window.MATCH_SCHEDULE.groups) ? window.MATCH_SCHEDULE : MATCH_SCHEDULE_FALLBACK;
}

function escapeHTML(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getTeamDisplayName(code) {
    return TEAMS_DATA[code]?.name || code;
}

function getTeamFlag(code) {
    return TEAMS_DATA[code]?.flag || '';
}

function renderGroupMatchMeta(groupId, matchIndex) {
    const item = getScheduleData()?.groups?.[groupId]?.[matchIndex];
    if (!item) return '';
    const no = item.no ? `M${item.no}` : '';
    const main = [item.date, item.time].filter(Boolean).join(' · ');
    const place = [item.venue, item.city].filter(Boolean).join(' · ');
    return `
        <div class="group-match-meta">
            <div class="group-match-meta-main">
                ${no ? `<span class="match-no-badge">${escapeHTML(no)}</span>` : ''}
                <span>${escapeHTML(main)}</span>
            </div>
            ${place ? `<div class="group-match-venue">${escapeHTML(place)}</div>` : ''}
        </div>`;
}

function renderTeamName(code, side) {
    const name = getTeamDisplayName(code);
    const flag = getTeamFlag(code);
    const safeName = escapeHTML(name);
    const safeCode = escapeHTML(code);
    const safeFlag = escapeHTML(flag);
    if (side === 'local') {
        return `<span class="team-name local" title="${safeName}">
            <span class="team-label">${safeName}</span>
            <span class="team-flag" aria-hidden="true">${safeFlag}</span>
            <span class="team-code-mini">${safeCode}</span>
        </span>`;
    }
    return `<span class="team-name visitor" title="${safeName}">
        <span class="team-code-mini">${safeCode}</span>
        <span class="team-flag" aria-hidden="true">${safeFlag}</span>
        <span class="team-label">${safeName}</span>
    </span>`;
}

const THIRD_ASSIGNMENT_SLOTS = [
    { matchId: '16-2',  matchNo: 'M74', winnerGroup: 'E', label: '1E vs 3º A/B/C/D/F', allowed: ['A','B','C','D','F'] },
    { matchId: '16-5',  matchNo: 'M77', winnerGroup: 'I', label: '1I vs 3º C/D/F/G/H', allowed: ['C','D','F','G','H'] },
    { matchId: '16-7',  matchNo: 'M79', winnerGroup: 'A', label: '1A vs 3º C/E/F/H/I', allowed: ['C','E','F','H','I'] },
    { matchId: '16-8',  matchNo: 'M80', winnerGroup: 'L', label: '1L vs 3º E/H/I/J/K', allowed: ['E','H','I','J','K'] },
    { matchId: '16-9',  matchNo: 'M81', winnerGroup: 'D', label: '1D vs 3º B/E/F/I/J', allowed: ['B','E','F','I','J'] },
    { matchId: '16-10', matchNo: 'M82', winnerGroup: 'G', label: '1G vs 3º A/E/H/I/J', allowed: ['A','E','H','I','J'] },
    { matchId: '16-13', matchNo: 'M85', winnerGroup: 'B', label: '1B vs 3º E/F/G/I/J', allowed: ['E','F','G','I','J'] },
    { matchId: '16-15', matchNo: 'M87', winnerGroup: 'K', label: '1K vs 3º D/E/I/J/L', allowed: ['D','E','I','J','L'] }
];

function getThirdConfirmationSignature(qualified) {
    if (!qualified?.allGroupsFinished || !Array.isArray(qualified.thirdPlaceData)) return null;
    const topEight = qualified.thirdPlaceData.slice(0, 8);
    if (topEight.length !== 8) return null;
    return topEight.map(team => `${team.group}:${team.code}`).join('|');
}

function areThirdsConfirmed(qualified) {
    const signature = getThirdConfirmationSignature(qualified);
    return Boolean(signature && confirmedThirdSignature === signature);
}

function getConfirmedThirdTeams(qualified) {
    if (!areThirdsConfirmed(qualified)) return [];
    return (qualified.thirdPlaceData || []).slice(0, 8);
}

function resetThirdConfirmation() {
    confirmedThirdSignature = null;
    manualThirdAssignments = {};
}

function setBracketPlaceholder(matchId, position, label, icon = '⏳') {
    const matchEl = document.querySelector(`[data-match-id="${matchId}"]`);
    if (!matchEl) return;

    const pill = matchEl.querySelector(`.team-pill[data-team-pos="${position}"]`);
    if (!pill) return;

    pill.classList.add('placeholder');
    pill.classList.remove('loser');
    delete pill.dataset.teamCode;
    pill.innerHTML = `<span class="flag">${escapeHTML(icon)}</span><span class="code placeholder-label" title="${escapeHTML(label)}">${escapeHTML(label)}</span>`;
}

function getGroupOrderedCodesFromTable(groupId) {
    const groupCard = document.getElementById(`group-${groupId}`);
    if (!groupCard) return [];
    return Array.from(groupCard.querySelectorAll('tbody tr[data-team-code]'))
        .map(row => row.dataset.teamCode)
        .filter(Boolean);
}

function isGroupCompleteForBracket(groupId) {
    const groupCard = document.getElementById(`group-${groupId}`);
    if (!groupCard) return false;

    const matches = Array.from(groupCard.querySelectorAll('.match-grid'));
    if (matches.length !== 6) return false;

    return matches.every(match => {
        const inputs = Array.from(match.children).filter(el => el.classList && el.classList.contains('score-input'));
        return inputs.length >= 2 && inputs[0].value !== '' && inputs[1].value !== '';
    });
}

function resolveFixedBracketTeamFromCurrentTable(placeholderLabel) {
    const text = String(placeholderLabel || '');
    const m = text.match(/^(1|2)º\s+Grupo\s+([A-L])$/i);
    if (!m) return null;

    const rank = Number(m[1]);
    const groupId = m[2].toUpperCase();

    // Para evitar que se llene antes de tiempo, solo usamos la tabla si el grupo ya tiene sus 6 partidos capturados.
    if (!isGroupCompleteForBracket(groupId)) return null;

    const ordered = getGroupOrderedCodesFromTable(groupId);
    return ordered[rank - 1] || null;
}

function setBracketSlot(matchId, position, teamCode, placeholderLabel) {
    const resolvedCode = teamCode || resolveFixedBracketTeamFromCurrentTable(placeholderLabel);
    if (resolvedCode) updateNextMatch(matchId, position, resolvedCode);
    else setBracketPlaceholder(matchId, position, placeholderLabel);
}

function getTopThirdGroupSet(qualified) {
    return new Set((qualified.thirdPlaceData || []).slice(0, 8).map(team => team.group));
}


function getUserIdFromUrlLegacy() {
    const params = new URLSearchParams(window.location.search);
    return params.get('user'); // Legacy: solo para pruebas locales (file:// / localhost)
}

const SESSION_STORAGE_KEY = 'qm2026_session_id';
const DEVICE_STORAGE_KEY  = 'qm2026_device_id';

const IS_LOCAL =
    window.location.protocol === 'file:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

function getInviteTokenFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('invite') || params.get('token'); // ?invite=... ó ?token=...
}

function extractTokenFromAny(raw) {
    // Permite pegar: token directo o un link completo
    const value = (raw || '').trim();
    if (!value) return null;

    // Si es URL, extraemos ?invite= / ?token=
    try {
        const u = new URL(value);
        return u.searchParams.get('invite') || u.searchParams.get('token') || null;
    } catch (e) {
        // no es URL, asumimos token
        return value;
    }
}

function getOrCreateDeviceId() {
    let deviceId = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (!deviceId) {
        if (crypto && crypto.randomUUID) {
            deviceId = crypto.randomUUID();
        } else {
            // Fallback simple
            deviceId = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        }
        localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
    }
    return deviceId;
}

async function callFunction(fnName, payload) {
    const res = await fetch(`/.netlify/functions/${fnName}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload || {})
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = (data && data.error) ? data.error : `Error ${res.status}`;
        throw new Error(msg);
    }
    return data;
}

function showAuthGate(msg) {
    // Oculta splash para que el usuario vea claramente el acceso
    try { hideSplash(0); } catch (e) {}

    const gate = document.getElementById('auth-gate');
    const err = document.getElementById('auth-gate-error');
    if (!gate) return;
    gate.classList.remove('is-hidden');
    gate.style.display = 'flex';
    gate.style.visibility = 'visible';
    gate.style.opacity = '1';
    gate.style.pointerEvents = 'auto';
    gate.setAttribute('aria-hidden', 'false');
    if (err) err.textContent = msg || '';
}

function hideAuthGate() {
    const gate = document.getElementById('auth-gate');
    const err = document.getElementById('auth-gate-error');
    if (!gate) return;
    gate.classList.add('is-hidden');
    gate.style.display = 'none';
    gate.style.visibility = 'hidden';
    gate.style.opacity = '0';
    gate.style.pointerEvents = 'none';
    gate.setAttribute('aria-hidden', 'true');
    if (err) err.textContent = '';
}

async function redeemInvite(token) {
    const deviceId = getOrCreateDeviceId();
    const data = await callFunction('redeem-invite', { token, deviceId });
    localStorage.setItem(SESSION_STORAGE_KEY, data.sessionId);
    currentUserId = data.userId;
    storageKey = `quinielaMundial2026_${currentUserId}`;
}

async function verifySession(sessionId) {
    const deviceId = getOrCreateDeviceId();
    const data = await callFunction('verify-session', { sessionId, deviceId });
    currentUserId = data.userId;
    storageKey = `quinielaMundial2026_${currentUserId}`;
}

function clearInviteFromUrl() {
    try {
        const u = new URL(window.location.href);
        u.searchParams.delete('invite');
        u.searchParams.delete('token');
        // Mantiene hash si existe
        window.history.replaceState({}, '', u.pathname + (u.search || '') + (u.hash || ''));
    } catch (e) {}
}

let appInitialized = false;
async function ensureAccessOrShowGate() {
    // En local (file:// o localhost) permitimos modo demo sin seguridad, para que puedas diseñar/ajustar UI.
    if (IS_LOCAL) {
        const legacy = getUserIdFromUrlLegacy() || 'local';
        currentUserId = legacy;
        storageKey = `quinielaMundial2026_${currentUserId}`;
        hideAuthGate();
        return true;
    }

    const inviteFromUrl = getInviteTokenFromUrl();
    const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);

    // 1) Si ya hay sesión, validamos
    if (sessionId) {
        try {
            await verifySession(sessionId);
            hideAuthGate();
            return true;
        } catch (e) {
            // Sesión inválida o cambió dispositivo
            localStorage.removeItem(SESSION_STORAGE_KEY);
        }
    }

    // 2) Si viene invite en URL, intentamos canjearlo
    if (inviteFromUrl) {
        try {
            await redeemInvite(inviteFromUrl);
            clearInviteFromUrl();
            hideAuthGate();
            return true;
        } catch (e) {
            showAuthGate(e.message || 'Token inválido.');
            return false;
        }
    }

    // 3) Si no hay nada, mostramos gate
    showAuthGate('');
    return false;
}

async function redeemFromGate() {
    const input = document.getElementById('invite-token-input');
    const btn = document.getElementById('btn-redeem-invite');
    const err = document.getElementById('auth-gate-error');
    const raw = input ? input.value : '';
    const token = extractTokenFromAny(raw);

    if (!token) {
        if (err) err.textContent = 'Pega tu token o link de invitación.';
        return;
    }

    try {
        if (btn) btn.disabled = true;
        if (err) err.textContent = 'Validando…';
        await redeemInvite(token);
        hideAuthGate();
        if (!appInitialized) initApp();
    } catch (e) {
        if (err) err.textContent = e.message || 'No se pudo validar el token.';
    } finally {
        if (btn) btn.disabled = false;
    }
}

// --- Mejoras UX (validaciones, progreso, guardado, export) ---
const MAX_SCORE = 20;
const TOTAL_GROUP_MATCHES = 72; // 12 grupos * 6 partidos
const TOTAL_KO_MATCHES = 31;    // 16 + 8 + 4 + 2 + 1 (sin 3er lugar)

let lastSavedAt = null;
let isDirty = false;
let _saveTicker = null;

function clampNumber(n, min, max) {
    if (Number.isNaN(n)) return NaN;
    return Math.min(max, Math.max(min, n));
}

function sanitizeScoreInput(inputEl, max = MAX_SCORE) {
    if (!inputEl) return;
    if (inputEl.value === '') return;

    const raw = Number(inputEl.value);
    if (Number.isNaN(raw)) {
        inputEl.value = '';
        return;
    }
    const clamped = clampNumber(raw, 0, max);
    inputEl.value = String(clamped);
}

function setSaveIndicator(text) {
    const el = document.getElementById('save-indicator');
    if (!el) return;
    el.textContent = text;
}

function markDirty() {
    isDirty = true;
    setSaveIndicator('Guardando…');
}

function markSaved() {
    isDirty = false;
    lastSavedAt = Date.now();
    updateSaveIndicator();
}

function updateSaveIndicator() {
    const el = document.getElementById('save-indicator');
    if (!el) return;

    if (isLoading) {
        el.textContent = 'Cargando…';
        return;
    }

    if (isDirty) {
        el.textContent = 'Guardando…';
        return;
    }

    if (!lastSavedAt) {
        el.textContent = 'Listo ✓';
        return;
    }

    const secs = Math.max(0, Math.floor((Date.now() - lastSavedAt) / 1000));
    el.textContent = `Guardado ✓ hace ${secs}s`;
}

function startSaveTicker() {
    if (_saveTicker) return;
    _saveTicker = setInterval(updateSaveIndicator, 1000);
}

function openBracketModal() {
    const modal = document.getElementById('bracket-modal');
    if (modal) modal.style.display = 'flex';
}

function closeBracketModal() {
    const modal = document.getElementById('bracket-modal');
    if (modal) modal.style.display = 'none';
}

function getKnockoutMatchIds() {
    // Sin 3er lugar: 16-*, 8-*, 4-*, 2-*, 1-1
    const ids = [];
    for (let i = 1; i <= 16; i++) ids.push(`16-${i}`);
    for (let i = 1; i <= 8; i++) ids.push(`8-${i}`);
    for (let i = 1; i <= 4; i++) ids.push(`4-${i}`);
    for (let i = 1; i <= 2; i++) ids.push(`2-${i}`);
    ids.push('1-1');
    return ids;
}

function isGroupMatchComplete(matchEl) {
    const [a, b] = matchEl.querySelectorAll('.score-input');
    return a && b && a.value !== '' && b.value !== '';
}

function isKnockoutMatchComplete(matchEl) {
    const scores = matchEl.querySelectorAll('.score');
    if (scores.length !== 2) return false;
    if (scores[0].value === '' || scores[1].value === '') return false;

    const hs = Number(scores[0].value);
    const as = Number(scores[1].value);
    if (Number.isNaN(hs) || Number.isNaN(as)) return false;

    if (hs !== as) return true;

    // Empate: solo cuenta si hay ganador por penales seleccionado
    return Boolean(matchEl.dataset.tiebreakWinner);
}

function updateProgressUI() {
    const groupsDone = Array.from(document.querySelectorAll('.group-card .match-grid'))
        .filter(isGroupMatchComplete).length;

    const koIds = new Set(getKnockoutMatchIds());
    const koDone = Array.from(document.querySelectorAll('.bracket-container-topdown .match-container'))
        .filter(m => koIds.has(m.dataset.matchId))
        .filter(isKnockoutMatchComplete).length;

    const pg = document.getElementById('progress-groups');
    const pk = document.getElementById('progress-ko');
    if (pg) pg.textContent = `${groupsDone}/${TOTAL_GROUP_MATCHES}`;
    if (pk) pk.textContent = `${koDone}/${TOTAL_KO_MATCHES}`;
}

function highlightOnce(el) {
    if (!el) return;
    el.classList.add('pulse-highlight');
    setTimeout(() => el.classList.remove('pulse-highlight'), 2500);
}

function goToNextIncomplete() {
    // 1) grupos
    const groupMatches = Array.from(document.querySelectorAll('.group-card .match-grid'));
    const nextGroup = groupMatches.find(m => !isGroupMatchComplete(m));
    if (nextGroup) {
        nextGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const [a, b] = nextGroup.querySelectorAll('.score-input');
        const target = (a && a.value === '') ? a : b;
        if (target) target.focus({ preventScroll: true });
        highlightOnce(nextGroup);
        return;
    }

    // 2) eliminatoria
    const koIds = new Set(getKnockoutMatchIds());
    const koMatches = Array.from(document.querySelectorAll('.bracket-container-topdown .match-container'))
        .filter(m => koIds.has(m.dataset.matchId));

    const nextKo = koMatches.find(m => !isKnockoutMatchComplete(m));
    if (nextKo) {
        openBracketModal();
        setTimeout(() => {
            nextKo.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'center' });
            const firstScore = nextKo.querySelector('.score');
            if (firstScore) firstScore.focus({ preventScroll: true });
            highlightOnce(nextKo);
        }, 50);
        return;
    }

    alert('✅ ¡Ya completaste todos los partidos!');
}

function openExportModal() {
    const m = document.getElementById('export-modal');
    if (m) m.style.display = 'flex';
}
function closeExportModal() {
    const m = document.getElementById('export-modal');
    if (m) m.style.display = 'none';
}

async function exportElementToPNG(element, filenameBase) {
    if (!element) return;
    if (typeof html2canvas !== 'function') {
        alert('No se pudo cargar el exportador (html2canvas). Revisa tu conexión.');
        return;
    }

    const scale = Math.min(2, window.devicePixelRatio || 1);
    const canvas = await html2canvas(element, {
        backgroundColor: '#070A14',
        scale,
        useCORS: true,
        logging: false
    });

    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    link.download = `${filenameBase}-${stamp}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

async function exportGroupsPNG() {
    closeExportModal();
    const groupsContainer = document.querySelector('.main-content');
    await exportElementToPNG(groupsContainer, 'quiniela-grupos');
}

async function exportBracketPNG() {
    closeExportModal();

    // Clonamos el bracket completo para capturar TODO (aunque sea scrollable)
    openBracketModal();

    const original = document.getElementById('bracket-container');
    if (!original) return;

    const tmp = document.createElement('div');
    tmp.style.position = 'fixed';
    tmp.style.left = '-10000px';
    tmp.style.top = '0';
    tmp.style.zIndex = '-1';
    tmp.style.padding = '20px';
    tmp.style.background = '#070A14';

    const clone = original.cloneNode(true);
    clone.style.overflow = 'visible';
    clone.style.maxWidth = 'none';
    clone.style.width = 'max-content';
    tmp.appendChild(clone);
    document.body.appendChild(tmp);

    try {
        await exportElementToPNG(clone, 'quiniela-eliminatoria');
    } finally {
        tmp.remove();
    }
}
const BRACKET_MAP = {
    // =====================================
    // FIFA World Cup 26™ (48 equipos)
    // Round of 32 (M73-M88)  -> usamos ids 16-1..16-16
    // Round of 16 (M89-M96)  -> usamos ids 8-1..8-8
    // QF (M97-M100)          -> usamos ids 4-1..4-4
    // SF (M101-M102)         -> usamos ids 2-1..2-2
    // 3rd place (M103)       -> id 3-1
    // Final (M104)           -> id 1-1
    // =====================================

    // --- Round of 32 -> Round of 16 (según Art. 12.7 del reglamento)
    // M89: W74 vs W77  => (16-2) vs (16-5)
    '16-2':  { winnerTo: { match: '8-1', pos: 'home' } },
    '16-5':  { winnerTo: { match: '8-1', pos: 'away' } },

    // M90: W73 vs W75  => (16-1) vs (16-3)
    '16-1':  { winnerTo: { match: '8-2', pos: 'home' } },
    '16-3':  { winnerTo: { match: '8-2', pos: 'away' } },

    // M91: W76 vs W78  => (16-4) vs (16-6)
    '16-4':  { winnerTo: { match: '8-3', pos: 'home' } },
    '16-6':  { winnerTo: { match: '8-3', pos: 'away' } },

    // M92: W79 vs W80  => (16-7) vs (16-8)
    '16-7':  { winnerTo: { match: '8-4', pos: 'home' } },
    '16-8':  { winnerTo: { match: '8-4', pos: 'away' } },

    // M93: W83 vs W84  => (16-11) vs (16-12)
    '16-11': { winnerTo: { match: '8-5', pos: 'home' } },
    '16-12': { winnerTo: { match: '8-5', pos: 'away' } },

    // M94: W81 vs W82  => (16-9) vs (16-10)
    '16-9':  { winnerTo: { match: '8-6', pos: 'home' } },
    '16-10': { winnerTo: { match: '8-6', pos: 'away' } },

    // M95: W86 vs W88  => (16-14) vs (16-16)
    '16-14': { winnerTo: { match: '8-7', pos: 'home' } },
    '16-16': { winnerTo: { match: '8-7', pos: 'away' } },

    // M96: W85 vs W87  => (16-13) vs (16-15)
    '16-13': { winnerTo: { match: '8-8', pos: 'home' } },
    '16-15': { winnerTo: { match: '8-8', pos: 'away' } },

    // --- Round of 16 -> Quarter-finals (según Art. 12.8)
    // M97: W89 vs W90
    '8-1': { winnerTo: { match: '4-1', pos: 'home' } },
    '8-2': { winnerTo: { match: '4-1', pos: 'away' } },

    // M99: W91 vs W92
    '8-3': { winnerTo: { match: '4-2', pos: 'home' } },
    '8-4': { winnerTo: { match: '4-2', pos: 'away' } },

    // M98: W93 vs W94
    '8-5': { winnerTo: { match: '4-3', pos: 'home' } },
    '8-6': { winnerTo: { match: '4-3', pos: 'away' } },

    // M100: W95 vs W96
    '8-7': { winnerTo: { match: '4-4', pos: 'home' } },
    '8-8': { winnerTo: { match: '4-4', pos: 'away' } },

    // --- Quarter-finals -> Semi-finals (según Art. 12.9)
    // SF1 (M101): W97 vs W98
    '4-1': { winnerTo: { match: '2-1', pos: 'home' } },
    '4-3': { winnerTo: { match: '2-1', pos: 'away' } },

    // SF2 (M102): W99 vs W100
    '4-2': { winnerTo: { match: '2-2', pos: 'home' } },
    '4-4': { winnerTo: { match: '2-2', pos: 'away' } },

    // --- Semi-finals -> Final + 3rd place (según Art. 12.10)
    '2-1': { winnerTo: { match: '1-1', pos: 'home' }, loserTo: { match: '3-1', pos: 'home' } },
    '2-2': { winnerTo: { match: '1-1', pos: 'away' }, loserTo: { match: '3-1', pos: 'away' } },

    // --- Final -> Champion
    '1-1': { winnerTo: { match: 'champion', pos: null } },

    // --- 3rd place doesn't advance
    '3-1': {}
};


// --- INICIO DE LA APLICACIÓN ---
// --- INICIO DE LA APLICACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    // Botón del gate de acceso (si aplica)
    const redeemBtn = document.getElementById('btn-redeem-invite');
    if (redeemBtn) redeemBtn.addEventListener('click', redeemFromGate);

    // Permite Enter en el input
    const inviteInput = document.getElementById('invite-token-input');
    if (inviteInput) {
        inviteInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') redeemFromGate();
        });
    }

    const ok = await ensureAccessOrShowGate();
    if (!ok) return;

    initApp();
});

function initApp() {
    if (appInitialized) return;
    appInitialized = true;

// Preparamos los datos de los equipos
    groupsData.forEach(group => {
        group.codes.forEach((code, index) => {
            TEAMS_DATA[code] = { name: group.teams[index], flag: group.flags[index] };
        });
    });

    // Generamos el HTML base
    generateGroupsHTML();
    hideSplash(6000);
    generateBracketHTML();
    initializeEventListeners();

    startSaveTicker();
    updateSaveIndicator();

    // Cargamos el estado del usuario
    loadStateFromStorage();
    updateProgressUI();
    updateSaveIndicator();

    // Verificamos si el usuario ya tiene un nombre guardado
    const savedState = JSON.parse(localStorage.getItem(storageKey));
    if (savedState && savedState.userName) {
        document.getElementById('user-name-display').textContent = `Quiniela de: ${savedState.userName}`;
    } else {
        // Si no hay nombre, mostramos el modal para que lo ingrese.
        document.getElementById('name-modal').style.display = 'flex';
    }

}


// --- PRONÓSTICOS PERSONALES ---
function getGroupPredictionMatchId(groupId, matchIndex) {
    return `G${groupId}-M${Number(matchIndex) + 1}`;
}

function renderPredictionBlock(matchId, team1, team2) {
    const homeName = getTeamDisplayName(team1);
    const awayName = getTeamDisplayName(team2);
    const safeHomeName = escapeHTML(homeName);
    const safeAwayName = escapeHTML(awayName);
    const safeTeam1 = escapeHTML(team1);
    const safeTeam2 = escapeHTML(team2);
    return `
        <div class="prediction-block" data-prediction-match="${escapeHTML(matchId)}">
            <div class="prediction-title">MI PRONÓSTICO</div>
            <div class="prediction-row">
                <span class="prediction-team prediction-home" title="${safeHomeName}"><span class="prediction-code">${safeTeam1}</span><span class="prediction-name">${safeHomeName}</span></span>
                <input type="number" min="0" max="20" step="1" inputmode="numeric" class="prediction-input" data-side="home" aria-label="Pronóstico ${safeHomeName}">
                <span class="prediction-separator">-</span>
                <input type="number" min="0" max="20" step="1" inputmode="numeric" class="prediction-input" data-side="away" aria-label="Pronóstico ${safeAwayName}">
                <span class="prediction-team prediction-away" title="${safeAwayName}"><span class="prediction-code">${safeTeam2}</span><span class="prediction-name">${safeAwayName}</span></span>
            </div>
            <div class="prediction-status" data-prediction-status>Agrega tu pronóstico antes del partido.</div>
        </div>`;
}

function getPredictionForMatch(matchId) {
    if (!matchId) return { home: '', away: '' };
    if (!userPredictions[matchId]) userPredictions[matchId] = { home: '', away: '' };
    return userPredictions[matchId];
}

function getMatchTrend(home, away) {
    const h = Number(home);
    const a = Number(away);
    if (Number.isNaN(h) || Number.isNaN(a)) return null;
    if (h === a) return 'draw';
    return h > a ? 'home' : 'away';
}

function evaluatePrediction(predHome, predAway, realHome, realAway) {
    if (predHome === '' || predAway === '' || realHome === '' || realAway === '') return null;
    const ph = Number(predHome);
    const pa = Number(predAway);
    const rh = Number(realHome);
    const ra = Number(realAway);
    if ([ph, pa, rh, ra].some(Number.isNaN)) return null;
    if (ph === rh && pa === ra) {
        return { points: 3, label: 'Marcador exacto' };
    }
    if (getMatchTrend(ph, pa) === getMatchTrend(rh, ra)) {
        return { points: 1, label: 'Acertaste ganador/empate' };
    }
    return { points: 0, label: 'Sin acierto' };
}

function updatePredictionStatusForMatch(matchEl) {
    if (!matchEl) return;
    const matchId = matchEl.dataset.matchId;
    const status = matchEl.querySelector('[data-prediction-status]');
    if (!matchId || !status) return;

    const prediction = getPredictionForMatch(matchId);
    const [realHomeInput, realAwayInput] = matchEl.querySelectorAll('.score-input');
    const predHome = prediction.home ?? '';
    const predAway = prediction.away ?? '';

    status.classList.remove('prediction-ok', 'prediction-pending', 'prediction-empty');

    if (predHome === '' && predAway === '') {
        status.textContent = 'Agrega tu pronóstico antes del partido.';
        status.classList.add('prediction-empty');
        return;
    }

    if (predHome === '' || predAway === '') {
        status.textContent = 'Completa ambos marcadores del pronóstico.';
        status.classList.add('prediction-pending');
        return;
    }

    const result = evaluatePrediction(predHome, predAway, realHomeInput?.value ?? '', realAwayInput?.value ?? '');
    if (!result) {
        status.textContent = `Pronóstico guardado: ${predHome} - ${predAway}`;
        status.classList.add('prediction-pending');
        return;
    }

    status.textContent = `${result.label}: ${result.points} ${result.points === 1 ? 'punto' : 'puntos'}`;
    status.classList.add(result.points > 0 ? 'prediction-ok' : 'prediction-empty');
}

function restorePredictionInputs() {
    document.querySelectorAll('.match-grid[data-match-id]').forEach(matchEl => {
        const matchId = matchEl.dataset.matchId;
        const prediction = getPredictionForMatch(matchId);
        const homeInput = matchEl.querySelector('.prediction-input[data-side="home"]');
        const awayInput = matchEl.querySelector('.prediction-input[data-side="away"]');
        if (homeInput) homeInput.value = prediction.home ?? '';
        if (awayInput) awayInput.value = prediction.away ?? '';
        updatePredictionStatusForMatch(matchEl);
    });
}

function handlePredictionInput(inputEl) {
    const matchEl = inputEl.closest('.match-grid');
    if (!matchEl) return;
    const matchId = matchEl.dataset.matchId;
    const side = inputEl.dataset.side;
    if (!matchId || !side) return;

    sanitizeScoreInput(inputEl);
    const prediction = getPredictionForMatch(matchId);
    prediction[side] = inputEl.value;
    userPredictions[matchId] = prediction;
    updatePredictionStatusForMatch(matchEl);
    markDirty();
}


// --- GENERACIÓN DE HTML ---
function generateGroupsHTML() {
    const container = document.getElementById('groups-container');
    container.innerHTML = groupsData.map(group => `
        <div class="group-card" id="group-${group.id}" data-group-id="${group.id}">
            <div class="group-header" style="background-image: linear-gradient(45deg, ${group.color1}, ${group.color2});">
                <span>GRUPO ${group.id}</span>
                <button class="reset-group-btn" title="Limpiar marcadores del grupo">&#x21bb;</button>
            </div>
            <div class="group-matches">
                ${[[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]].map(([i, j], matchIndex) => {
        const team1 = group.codes[i], team2 = group.codes[j];
        const matchId = getGroupPredictionMatchId(group.id, matchIndex);
        return `
                    <div class="match-grid" data-team1="${escapeHTML(team1)}" data-team2="${escapeHTML(team2)}" data-match-id="${escapeHTML(matchId)}">
                        ${renderGroupMatchMeta(group.id, matchIndex)}
                        ${renderTeamName(team1, 'local')}
                        <input type="number" min="0" max="20" step="1" inputmode="numeric" class="score-input" aria-label="Resultado final ${escapeHTML(getTeamDisplayName(team1))}">
                        <span class="match-separator">-</span>
                        <input type="number" min="0" max="20" step="1" inputmode="numeric" class="score-input" aria-label="Resultado final ${escapeHTML(getTeamDisplayName(team2))}">
                        ${renderTeamName(team2, 'visitor')}
                        ${renderPredictionBlock(matchId, team1, team2)}
                    </div>`;
    }).join('')}
            </div>
            <div class="group-view-toggle-wrap">
                <button class="group-view-toggle" type="button" aria-pressed="false">Ver tabla</button>
            </div>
            <div class="manual-group-tools">
                <button class="btn btn-sm manual-group-auto" type="button" data-group-id="${group.id}">Auto FIFA</button>
                <span class="manual-help">Orden automático + ajuste manual</span>
            </div>
            <table class="standings-table">
                <thead><tr><th>Eq</th><th>Pts</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>Ajuste</th></tr></thead>
                <tbody>
                    ${group.codes.map(code => `<tr data-team-code="${code}"><td>${TEAMS_DATA[code].flag} ${code}</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td class="manual-rank-cell"><button class="manual-rank-btn" data-direction="up" data-code="${code}" title="Subir">▲</button><button class="manual-rank-btn" data-direction="down" data-code="${code}" title="Bajar">▼</button></td></tr>`).join('')}
                </tbody>
            </table>
        </div>
    `).join('');
}

function generateBracketHTML() {
    const container = document.getElementById('bracket-container');
    if (!container) return;

    // Nueva estructura: dos alas (izquierda y derecha) y una columna central para la final
    container.innerHTML = `
        <div class="bracket-wing left-wing">
            <div class="bracket-round r32">
                ${Array.from({ length: 8 }, (_, i) => `
                    <div class="match-container" data-match-id="16-${i + 1}">
                        <div class="team-pill placeholder" data-team-pos="home"></div>
                        <div class="team-pill placeholder" data-team-pos="away"></div>
                    </div>
                `).join('')}
            </div>
            <div class="bracket-round r16">
                ${Array.from({ length: 4 }, (_, i) => `
                    <div class="match-container" data-match-id="8-${i + 1}">
                        <div class="team-pill placeholder" data-team-pos="home"></div>
                        <div class="team-pill placeholder" data-team-pos="away"></div>
                    </div>
                `).join('')}
            </div>
            <div class="bracket-round r8">
                ${Array.from({ length: 2 }, (_, i) => `
                    <div class="match-container" data-match-id="4-${i + 1}">
                        <div class="team-pill placeholder" data-team-pos="home"></div>
                        <div class="team-pill placeholder" data-team-pos="away"></div>
                    </div>
                `).join('')}
            </div>
            <div class="bracket-round sf">
                <div class="match-container" data-match-id="2-1">
                    <div class="team-pill placeholder" data-team-pos="home"></div>
                    <div class="team-pill placeholder" data-team-pos="away"></div>
                </div>
            </div>
        </div>

        <div class="bracket-center-final">
                <!-- ============================================ -->
        <!-- === ¡AQUÍ VA EL NUEVO ÍCONO DEL TROFEO! === -->
        <!-- ============================================ -->
        <div class="trophy-container">
            <img src="images/copa-mundial.png" alt="Copa del Mundo" class="trophy-image">
        </div>
        <!-- ============================================ -->
        <!-- ===          FIN DEL ÍCONO               === -->
        <!-- ============================================ -->
            <div class="final-match-wrapper">
                <h3 class="final-title">FINAL</h3>
                <div class="match-container" data-match-id="1-1">
                    <div class="team-pill placeholder" data-team-pos="home"></div>
                    <div class="team-pill placeholder" data-team-pos="away"></div>
                </div>
                <div class="champion-wrapper">
                    <h3 class="champion-title">¡CAMPEÓN!</h3>
                    <div class="team-pill placeholder champion-pill" data-match-id="champion"></div>
                </div>
            </div>
            <div class="third-place-match-wrapper">
                <h3 class="final-title">Tercer Lugar</h3>
                <div class="match-container" data-match-id="3-1">
                    <div class="team-pill placeholder" data-team-pos="home"></div>
                    <div class="team-pill placeholder" data-team-pos="away"></div>
                </div>
            </div>
        </div>

        <div class="bracket-wing right-wing">
            <div class="bracket-round r32">
                ${Array.from({ length: 8 }, (_, i) => `
                    <div class="match-container" data-match-id="16-${i + 9}">
                        <div class="team-pill placeholder" data-team-pos="home"></div>
                        <div class="team-pill placeholder" data-team-pos="away"></div>
                    </div>
                `).join('')}
            </div>
            <div class="bracket-round r16">
                ${Array.from({ length: 4 }, (_, i) => `
                    <div class="match-container" data-match-id="8-${i + 5}">
                        <div class="team-pill placeholder" data-team-pos="home"></div>
                        <div class="team-pill placeholder" data-team-pos="away"></div>
                    </div>
                `).join('')}
            </div>
            <div class="bracket-round r8">
                ${Array.from({ length: 2 }, (_, i) => `
                    <div class="match-container" data-match-id="4-${i + 3}">
                        <div class="team-pill placeholder" data-team-pos="home"></div>
                        <div class="team-pill placeholder" data-team-pos="away"></div>
                    </div>
                `).join('')}
            </div>
            <div class="bracket-round sf">
                <div class="match-container" data-match-id="2-2">
                    <div class="team-pill placeholder" data-team-pos="home"></div>
                    <div class="team-pill placeholder" data-team-pos="away"></div>
                </div>
            </div>
        </div>
    `;

    // Añadimos un contenedor de meta (penales) por partido (no interfiere con tu HTML actual)
    container.querySelectorAll('.match-container').forEach(m => {
        if (!m.querySelector('.match-meta')) {
            const meta = document.createElement('div');
            meta.className = 'match-meta';
            m.appendChild(meta);
        }
    });

    addScrollIndicatorToBracket();
}


function addScrollIndicatorToBracket() {
    const bracketContainer = document.getElementById('bracket-container');
    if (!bracketContainer) return;

    // Comprobar si ya existe un indicador para no duplicarlo
    if (bracketContainer.querySelector('.scroll-indicator')) {
        return;
    }

    // Crear el elemento del indicador
    const indicator = document.createElement('div');
    indicator.className = 'scroll-indicator';
    indicator.innerHTML = '‹‹ Desliza para ver todas las rondas ››';

    // Añadirlo al contenedor del bracket
    bracketContainer.appendChild(indicator);

    // Ocultar el indicador una vez que el usuario empieza a deslizar
    bracketContainer.addEventListener('scroll', () => {
        indicator.style.opacity = '0';
        // Opcional: eliminarlo después de la transición para limpiar el DOM
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 500);
    }, { once: true }); // { once: true } hace que el evento se dispare solo una vez
}


// --- LÓGICA DE EVENTOS ---
function initializeEventListeners() {
    // ... (listener de la fase de grupos, sin cambios) ...
    document.getElementById('groups-container').addEventListener('input', (e) => {
        if (e.target.classList.contains('prediction-input')) {
            handlePredictionInput(e.target);
            updateProgressUI();
            return;
        }

        if (e.target.classList.contains('score-input')) {
            sanitizeScoreInput(e.target);
            const matchEl = e.target.closest('.match-grid');
            validateMatchInputs(matchEl);
            updatePredictionStatusForMatch(matchEl);
            resetThirdConfirmation();
            markDirty();
            updateAllCalculations();
            updateProgressUI();
        }
    });
    document.getElementById('groups-container').addEventListener('click', (e) => {
        if (e.target.classList.contains('reset-group-btn')) {
            const card = e.target.closest('.group-card');
            card.querySelectorAll('.score-input').forEach(input => {
                input.value = '';
                input.classList.remove('input-invalid');
            });
            resetThirdConfirmation();
            markDirty();
            updateAllCalculations();
            updateProgressUI();
        }

        if (e.target.classList.contains('manual-rank-btn')) {
            const card = e.target.closest('.group-card');
            const code = e.target.dataset.code;
            const direction = e.target.dataset.direction;
            if (!card || !code || !direction) return;
            const groupId = card.dataset.groupId;
            const current = sortTeamsInGroup(getGroupStats(card), groupId);
            const idx = current.indexOf(code);
            const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
            if (idx >= 0 && swapIdx >= 0 && swapIdx < current.length) {
                [current[idx], current[swapIdx]] = [current[swapIdx], current[idx]];
                manualGroupOrders[groupId] = current;
                resetThirdConfirmation();
                markDirty();
                updateAllCalculations();
                updateProgressUI();
            }
        }

        if (e.target.classList.contains('manual-group-auto')) {
            const groupId = e.target.dataset.groupId;
            if (groupId && manualGroupOrders[groupId]) {
                delete manualGroupOrders[groupId];
                resetThirdConfirmation();
                markDirty();
                updateAllCalculations();
                updateProgressUI();
            }
        }

        // Toggle móvil: ver tabla / ver partidos
        if (e.target.classList.contains('group-view-toggle')) {
            const card = e.target.closest('.group-card');
            if (!card) return;
            const willShowStandings = !card.classList.contains('show-standings');
            card.classList.toggle('show-standings', willShowStandings);
            e.target.setAttribute('aria-pressed', willShowStandings ? 'true' : 'false');
            e.target.textContent = willShowStandings ? 'Ver partidos' : 'Ver tabla';
        }
    });

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('manual-third-rank-btn')) {
            const code = e.target.dataset.code;
            const direction = e.target.dataset.direction;
            const qualified = getQualifiedTeams();
            const current = (qualified.thirdPlaceData || []).map(team => team.code);
            const idx = current.indexOf(code);
            const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
            if (idx >= 0 && swapIdx >= 0 && swapIdx < current.length) {
                [current[idx], current[swapIdx]] = [current[swapIdx], current[idx]];
                manualThirdOrder = current;
                resetThirdConfirmation();
                markDirty();
                updateAllCalculations();
                updateProgressUI();
            }
        }

        if (e.target.id === 'third-auto-reset') {
            manualThirdOrder = [];
            resetThirdConfirmation();
            markDirty();
            updateAllCalculations();
            updateProgressUI();
        }

        if (e.target.id === 'third-confirm-btn') {
            const qualified = getQualifiedTeams();
            const signature = getThirdConfirmationSignature(qualified);
            if (signature) {
                confirmedThirdSignature = signature;
                manualThirdAssignments = {};
                markDirty();
                updateAllCalculations();
                updateProgressUI();
            }
        }

        if (e.target.id === 'third-confirm-reset') {
            resetThirdConfirmation();
            markDirty();
            updateAllCalculations();
            updateProgressUI();
        }

        if (e.target.id === 'third-assignment-reset') {
            manualThirdAssignments = {};
            markDirty();
            updateAllCalculations();
            updateProgressUI();
        }
    });

    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('third-assignment-select') || e.target.classList.contains('bracket-third-select')) {
            const matchId = e.target.dataset.matchId;
            const value = e.target.value;
            if (!matchId) return;
            if (value) {
                Object.keys(manualThirdAssignments).forEach(existingMatchId => {
                    if (existingMatchId !== matchId && manualThirdAssignments[existingMatchId] === value) {
                        delete manualThirdAssignments[existingMatchId];
                    }
                });
                manualThirdAssignments[matchId] = value;
            } else {
                delete manualThirdAssignments[matchId];
            }
            markDirty();
            updateAllCalculations();
            updateProgressUI();
        }
    });

    // --- ¡NUEVO Y SIMPLIFICADO LISTENER PARA EL BRACKET! ---
    document.getElementById('bracket-container').addEventListener('input', (e) => {
        if (e.target.classList.contains('score')) {
            sanitizeScoreInput(e.target);
            markDirty();
            // Cuando se cambia un marcador, validamos y avanzamos
            handleBracketScoreChange(e.target.closest('.match-container'));
            updateProgressUI();
        }
    });
    // ¡NUEVO LISTENER para el formulario de nombre!
    document.getElementById('name-form').addEventListener('submit', (e) => {
        e.preventDefault(); // Evita que la página se recargue
        const userNameInput = document.getElementById('user-name-input');
        const userName = userNameInput.value.trim();

        if (userName) {
            document.getElementById('user-name-display').textContent = `Quiniela de: ${userName}`;

            // Guardamos el nombre junto con el resto de los datos
            const currentState = JSON.parse(localStorage.getItem(storageKey)) || {};
            currentState.userName = userName;
            localStorage.setItem(storageKey, JSON.stringify(currentState));
            markSaved();

            document.getElementById('name-modal').style.display = 'none'; // Ocultamos el modal
        }
    });

    // --- Topbar acciones ---
    const btnNext = document.getElementById('btn-next-incomplete');
    if (btnNext) btnNext.addEventListener('click', goToNextIncomplete);

    const btnExport = document.getElementById('btn-export');
    if (btnExport) btnExport.addEventListener('click', openExportModal);

    const btnReset = document.getElementById('btn-reset-all');
    if (btnReset) btnReset.addEventListener('click', () => {
        const typed = prompt('Esto borrará tu quiniela en este dispositivo. Escribe BORRAR para confirmar:');
        if (typed === 'BORRAR') {
            localStorage.removeItem(storageKey);
            location.reload();
        }
    });

    // --- Export modal ---
    const exportClose = document.getElementById('export-close');
    const exportCancel = document.getElementById('export-cancel');
    const exportGroups = document.getElementById('export-groups');
    const exportBracket = document.getElementById('export-bracket');

    if (exportClose) exportClose.addEventListener('click', closeExportModal);
    if (exportCancel) exportCancel.addEventListener('click', closeExportModal);

    const exportModal = document.getElementById('export-modal');
    if (exportModal) exportModal.addEventListener('click', (e) => {
        if (e.target === exportModal) closeExportModal();
    });

    if (exportGroups) exportGroups.addEventListener('click', exportGroupsPNG);
    if (exportBracket) exportBracket.addEventListener('click', exportBracketPNG);

    // --- Bracket: penales (empates) ---
    const bracketContainer = document.getElementById('bracket-container');
    if (bracketContainer) {
        bracketContainer.addEventListener('change', (e) => {
            if (e.target.classList.contains('penalties-toggle')) {
                const match = e.target.closest('.match-container');
                if (!match) return;
                if (e.target.checked) {
                    match.dataset.penalties = '1';
                } else {
                    delete match.dataset.penalties;
                    delete match.dataset.tiebreakWinner;
                }
                markDirty();
                handleBracketScoreChange(match);
                updateProgressUI();
            }
        });

        bracketContainer.addEventListener('click', (e) => {
            const pick = e.target.closest('.tiebreak-pick');
            if (!pick) return;
            const match = pick.closest('.match-container');
            if (!match) return;

            const homePill = match.querySelector('.team-pill[data-team-pos="home"]');
            const awayPill = match.querySelector('.team-pill[data-team-pos="away"]');
            const homeCode = homePill?.dataset.teamCode;
            const awayCode = awayPill?.dataset.teamCode;
            if (!homeCode || !awayCode) return;

            const chosen = (pick.dataset.pick === 'home') ? homeCode : awayCode;
            match.dataset.penalties = '1';
            match.dataset.tiebreakWinner = chosen;

            // Re-render de selección visual
            const meta = match.querySelector('.match-meta');
            if (meta) {
                meta.querySelectorAll('.tiebreak-pick').forEach(btn => btn.classList.remove('is-selected'));
                pick.classList.add('is-selected');

                const toggle = meta.querySelector('.penalties-toggle');
                if (toggle) toggle.checked = true;
            }

            markDirty();
            handleBracketScoreChange(match);
            updateProgressUI();
        });
    }

}


function ensureMatchMeta(matchContainer) {
    if (!matchContainer) return null;
    let meta = matchContainer.querySelector('.match-meta');
    if (!meta) {
        meta = document.createElement('div');
        meta.className = 'match-meta';
        matchContainer.appendChild(meta);
    }
    return meta;
}

function showPenaltiesUI(matchContainer) {
    const meta = ensureMatchMeta(matchContainer);
    if (!meta) return;

    const homePill = matchContainer.querySelector('.team-pill[data-team-pos="home"]');
    const awayPill = matchContainer.querySelector('.team-pill[data-team-pos="away"]');
    const homeCode = homePill?.dataset.teamCode;
    const awayCode = awayPill?.dataset.teamCode;

    if (!homeCode || !awayCode) {
        meta.classList.remove('is-visible');
        meta.innerHTML = '';
        return;
    }

    const isOn = matchContainer.dataset.penalties === '1';
    const winner = matchContainer.dataset.tiebreakWinner || '';

    const homeLabel = `${TEAMS_DATA[homeCode].flag} ${TEAMS_DATA[homeCode].name}`;
    const awayLabel = `${TEAMS_DATA[awayCode].flag} ${TEAMS_DATA[awayCode].name}`;

    meta.classList.add('is-visible');
    meta.innerHTML = `
        <div class="tiebreak-row">
            <label title="Si hay empate, selecciona ganador por penales.">
                <input type="checkbox" class="penalties-toggle" ${isOn ? 'checked' : ''}>
                Penales
            </label>
            <div class="tiebreak-winner" aria-label="Seleccionar ganador">
                <button type="button" class="tiebreak-pick ${winner === homeCode ? 'is-selected' : ''}" data-pick="home" ${isOn ? '' : 'disabled'}>${homeLabel}</button>
                <button type="button" class="tiebreak-pick ${winner === awayCode ? 'is-selected' : ''}" data-pick="away" ${isOn ? '' : 'disabled'}>${awayLabel}</button>
            </div>
        </div>
    `;
}

function hidePenaltiesUI(matchContainer) {
    const meta = ensureMatchMeta(matchContainer);
    if (!meta) return;
    meta.classList.remove('is-visible');
    meta.innerHTML = '';
    delete matchContainer.dataset.penalties;
    delete matchContainer.dataset.tiebreakWinner;
}

function handleBracketScoreChange(matchContainer) {
    if (!matchContainer) return;
    const [homeScoreInput, awayScoreInput] = matchContainer.querySelectorAll('.score');
    if (!homeScoreInput || !awayScoreInput) return;

    // Limpiamos cualquier resaltado de error previo
    homeScoreInput.classList.remove('tie-score');
    awayScoreInput.classList.remove('tie-score');

    // Si faltan marcadores, ocultamos penales y guardamos
    if (homeScoreInput.value === '' || awayScoreInput.value === '') {
        hidePenaltiesUI(matchContainer);
        saveStateToStorage();
        return;
    }

    const homeScore = parseInt(homeScoreInput.value, 10);
    const awayScore = parseInt(awayScoreInput.value, 10);

    if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
        saveStateToStorage();
        return;
    }

    if (homeScore === awayScore) {
        // EMPATE: permitimos definir ganador por penales
        showPenaltiesUI(matchContainer);

        const hasWinner = (matchContainer.dataset.penalties === '1') && Boolean(matchContainer.dataset.tiebreakWinner);
        if (!hasWinner) {
            homeScoreInput.classList.add('tie-score');
            awayScoreInput.classList.add('tie-score');
            saveStateToStorage();
            return;
        }

        // Con ganador definido, avanzamos usando override
        advanceWinner(matchContainer, matchContainer.dataset.tiebreakWinner);
    } else {
        // Resultado normal
        hidePenaltiesUI(matchContainer);
        advanceWinner(matchContainer, null);
    }

    // Guardamos el estado en cualquier cambio
    saveStateToStorage();
}


// --- VERSIÓN SIMPLIFICADA DE advanceWinner ---
function advanceWinner(matchContainer, overrideWinnerCode = null) {
    const [homePill, awayPill] = matchContainer.querySelectorAll('.team-pill');
    if (!homePill || !awayPill) return;

    const homeCode = homePill.dataset.teamCode;
    const awayCode = awayPill.dataset.teamCode;
    if (!homeCode || !awayCode) return;

    const homeScoreEl = matchContainer.querySelector('[data-team-pos="home"] .score');
    const awayScoreEl = matchContainer.querySelector('[data-team-pos="away"] .score');
    const homeScore = homeScoreEl ? parseInt(homeScoreEl.value, 10) : NaN;
    const awayScore = awayScoreEl ? parseInt(awayScoreEl.value, 10) : NaN;

    let winnerCode, loserCode;

    if (overrideWinnerCode) {
        winnerCode = overrideWinnerCode;
        loserCode = (overrideWinnerCode === homeCode) ? awayCode : homeCode;
    } else {
        if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) return;
        if (homeScore === awayScore) return; // por seguridad (debería resolverse con penales)
        if (homeScore > awayScore) {
            winnerCode = homeCode;
            loserCode = awayCode;
        } else {
            winnerCode = awayCode;
            loserCode = homeCode;
        }
    }

    homePill.classList.toggle('loser', winnerCode === awayCode);
    awayPill.classList.toggle('loser', winnerCode === homeCode);

    const destination = BRACKET_MAP[matchContainer.dataset.matchId];
    if (destination?.winnerTo) {
        updateNextMatch(destination.winnerTo.match, destination.winnerTo.pos, winnerCode);
    }
    if (destination?.loserTo) {
        updateNextMatch(destination.loserTo.match, destination.loserTo.pos, loserCode);
    }
}

// --- LÓGICA DE CÁLCULO Y ACTUALIZACIÓN ---
function updateAllCalculations() {
    // Recalcular standings de cada grupo
    const finishedGroups = new Set();
    groupsData.forEach(group => {
        const isFinished = updateGroupStandings(document.getElementById(`group-${group.id}`));
        if (isFinished) finishedGroups.add(group.id);
    });

    // Calcular clasificados (soporta avance parcial)
    const qualified = getQualifiedTeams({ finishedGroups });

    // Actualizar tabla de terceros SIEMPRE (muestra provisional si faltan grupos)
    updateThirdPlaceTable(qualified);
    renderThirdAssignmentControls(qualified);

    // Poblar bracket con lo que ya se pueda (y placeholders donde falte)
    populateBracketFIFA(qualified);

    // Estadísticas globales
    updateGlobalStats();

    updateProgressUI();
    saveStateToStorage();
}

function updateGroupStandings(groupCard) {
    const stats = getGroupStats(groupCard);
    const sortedCodes = sortTeamsInGroup(stats, groupCard.dataset.groupId);
    const tableBody = groupCard.querySelector('tbody');
    let isFinished = true;
    sortedCodes.forEach((code, index) => {
        const row = tableBody.querySelector(`tr[data-team-code="${code}"]`);
        const s = stats[code];
        row.innerHTML = `<td>${TEAMS_DATA[code].flag} ${code}</td><td>${s.Pts}</td><td>${s.PJ}</td><td>${s.G}</td><td>${s.E}</td><td>${s.P}</td><td>${s.GF}</td><td>${s.GC}</td><td class="manual-rank-cell"><button class="manual-rank-btn" data-direction="up" data-code="${code}" title="Subir">▲</button><button class="manual-rank-btn" data-direction="down" data-code="${code}" title="Bajar">▼</button></td>`;
        row.className = '';
        if (index < 2) row.classList.add(index === 0 ? 'pos-first' : 'pos-second');
        if (s.PJ < 3) isFinished = false;
    });
    sortedCodes.forEach(code => tableBody.appendChild(tableBody.querySelector(`tr[data-team-code="${code}"]`)));
    return isFinished;
}

function updateThirdPlaceTable(qualified) {
    const tableBody = document.getElementById('third-place-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    // Nota: el ranking de terceros solo es definitivo cuando terminaron los 12 grupos.
    qualified.thirdPlaceData.forEach((team, index) => {
        const diff = team.GF - team.GC;
        const row = document.createElement('tr');

        // Marcamos en verde a los 8 mejores terceros (provisional si aún faltan grupos)
        row.className = index < 8 ? 'qualified' : 'not-qualified';

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${TEAMS_DATA[team.code]?.flag ?? '🏳️'} ${TEAMS_DATA[team.code]?.name ?? team.code}</td>
            <td>${team.Pts}</td>
            <td>${team.PJ}</td>
            <td>${team.GF}</td>
            <td>${team.GC}</td>
            <td>${diff > 0 ? '+' : ''}${diff}</td>
            <td class="manual-rank-cell"><button class="manual-third-rank-btn" data-direction="up" data-code="${team.code}" title="Subir">▲</button><button class="manual-third-rank-btn" data-direction="down" data-code="${team.code}" title="Bajar">▼</button></td>
        `;
        tableBody.appendChild(row);
    });
}


// (advanceWinner duplicado eliminado: se usa la versión validada de arriba)


function updateNextMatch(nextMatchId, position, teamCode) {
    const nextMatchEl = document.querySelector(`[data-match-id="${nextMatchId}"]`);
    if (!nextMatchEl) return;

    // --- Lógica para el CAMPEÓN (se muestra completo) ---
    if (nextMatchId === 'champion') {
        nextMatchEl.classList.remove('placeholder');
        // Mostramos bandera y nombre completo
        nextMatchEl.innerHTML = `<span class="flag">${TEAMS_DATA[teamCode].flag}</span><span class="code">${TEAMS_DATA[teamCode].name}</span>`;
        return;
    }

    const targetPill = nextMatchEl.querySelector(`.team-pill[data-team-pos="${position}"]`);
    if (targetPill) {
        targetPill.classList.remove('placeholder');
        targetPill.dataset.teamCode = teamCode;
        // ¡CAMBIO CLAVE! Mostramos solo la bandera y el nombre completo. El score se añadirá después.
        targetPill.innerHTML = `<span class="flag">${TEAMS_DATA[teamCode].flag}</span><span class="code">${TEAMS_DATA[teamCode].name}</span>`;
    }

    // --- Lógica para añadir los inputs de score ---
    // Verificamos si ambos equipos del partido ya están definidos.
    const homePill = nextMatchEl.querySelector('.team-pill[data-team-pos="home"]');
    const awayPill = nextMatchEl.querySelector('.team-pill[data-team-pos="away"]');

    // Si ambos oponentes están listos, añadimos los campos de marcador a las dos píldoras.
    if (homePill && !homePill.classList.contains('placeholder') && awayPill && !awayPill.classList.contains('placeholder')) {
        if (!homePill.querySelector('.score')) {
            homePill.innerHTML += `<input type="number" min="0" max="20" step="1" inputmode="numeric" class="score">`;
        }
        if (!awayPill.querySelector('.score')) {
            awayPill.innerHTML += `<input type="number" min="0" max="20" step="1" inputmode="numeric" class="score">`;
        }
    }
}

// --- FUNCIONES AUXILIARES ---
function getGroupStats(groupCard) {
    const stats = {};
    groupCard.querySelectorAll('tbody tr').forEach(row => {
        stats[row.dataset.teamCode] = { Pts: 0, PJ: 0, G: 0, E: 0, P: 0, GF: 0, GC: 0 };
    });
    groupCard.querySelectorAll('.match-grid').forEach(match => {
        const [score1Str, score2Str] = Array.from(match.querySelectorAll('.score-input')).map(i => i.value);
        if (score1Str === '' || score2Str === '') return;
        const score1 = parseInt(score1Str, 10), score2 = parseInt(score2Str, 10);
        const team1 = match.dataset.team1, team2 = match.dataset.team2;
        stats[team1].PJ++; stats[team2].PJ++;
        stats[team1].GF += score1; stats[team2].GF += score2;
        stats[team1].GC += score2; stats[team2].GC += score1;
        if (score1 > score2) { stats[team1].Pts += 3; stats[team1].G++; stats[team2].P++; }
        else if (score2 > score1) { stats[team2].Pts += 3; stats[team2].G++; stats[team1].P++; }
        else { stats[team1].Pts++; stats[team2].Pts++; stats[team1].E++; stats[team2].E++; }
    });
    return stats;
}

function getHeadToHeadStats(groupId, tiedCodes) {
    const mini = {};
    tiedCodes.forEach(code => {
        mini[code] = { Pts: 0, GF: 0, GC: 0 };
    });

    const groupCard = document.getElementById(`group-${groupId}`);
    if (!groupCard) return mini;

    groupCard.querySelectorAll('.match-grid').forEach(match => {
        const team1 = match.dataset.team1;
        const team2 = match.dataset.team2;
        if (!tiedCodes.includes(team1) || !tiedCodes.includes(team2)) return;

        const [score1Str, score2Str] = Array.from(match.querySelectorAll('.score-input')).map(i => i.value);
        if (score1Str === '' || score2Str === '') return;

        const score1 = parseInt(score1Str, 10);
        const score2 = parseInt(score2Str, 10);
        if (Number.isNaN(score1) || Number.isNaN(score2)) return;

        mini[team1].GF += score1;
        mini[team1].GC += score2;
        mini[team2].GF += score2;
        mini[team2].GC += score1;

        if (score1 > score2) mini[team1].Pts += 3;
        else if (score2 > score1) mini[team2].Pts += 3;
        else {
            mini[team1].Pts += 1;
            mini[team2].Pts += 1;
        }
    });

    return mini;
}

function compareGeneralStats(stats, a, b) {
    const diffB = stats[b].GF - stats[b].GC;
    const diffA = stats[a].GF - stats[a].GC;
    if (diffB !== diffA) return diffB - diffA;
    if (stats[b].GF !== stats[a].GF) return stats[b].GF - stats[a].GF;
    return a.localeCompare(b);
}

function sortTeamsAutomatic(stats, groupId) {
    const byPoints = Object.keys(stats).sort((a, b) => {
        if (stats[b].Pts !== stats[a].Pts) return stats[b].Pts - stats[a].Pts;
        return compareGeneralStats(stats, a, b);
    });

    const finalOrder = [];
    for (let i = 0; i < byPoints.length;) {
        const samePoints = [byPoints[i]];
        let j = i + 1;
        while (j < byPoints.length && stats[byPoints[j]].Pts === stats[byPoints[i]].Pts) {
            samePoints.push(byPoints[j]);
            j++;
        }

        if (samePoints.length === 1 || !groupId) {
            finalOrder.push(...samePoints);
        } else {
            const h2h = getHeadToHeadStats(groupId, samePoints);
            samePoints.sort((a, b) => {
                if (h2h[b].Pts !== h2h[a].Pts) return h2h[b].Pts - h2h[a].Pts;
                const h2hDiffB = h2h[b].GF - h2h[b].GC;
                const h2hDiffA = h2h[a].GF - h2h[a].GC;
                if (h2hDiffB !== h2hDiffA) return h2hDiffB - h2hDiffA;
                if (h2h[b].GF !== h2h[a].GF) return h2h[b].GF - h2h[a].GF;
                return compareGeneralStats(stats, a, b);
            });
            finalOrder.push(...samePoints);
        }
        i = j;
    }

    return finalOrder;
}

function applyManualGroupOrder(autoOrder, groupId) {
    const manual = manualGroupOrders[groupId];
    if (!Array.isArray(manual) || !manual.length) return autoOrder;

    const autoIndex = new Map(autoOrder.map((code, idx) => [code, idx]));
    const manualIndex = new Map(manual.map((code, idx) => [code, idx]));

    return autoOrder.slice().sort((a, b) => {
        const ia = manualIndex.has(a) ? manualIndex.get(a) : 100 + (autoIndex.get(a) ?? 0);
        const ib = manualIndex.has(b) ? manualIndex.get(b) : 100 + (autoIndex.get(b) ?? 0);
        return ia - ib;
    });
}

function sortTeamsInGroup(stats, groupId) {
    return applyManualGroupOrder(sortTeamsAutomatic(stats, groupId), groupId);
}


function compareThirdPlaceTeams(a, b) {
    if (b.Pts !== a.Pts) return b.Pts - a.Pts;
    const diffB = b.GF - b.GC;
    const diffA = a.GF - a.GC;
    if (diffB !== diffA) return diffB - diffA;
    if (b.GF !== a.GF) return b.GF - a.GF;
    return a.code.localeCompare(b.code);
}

function applyManualThirdOrder(thirdPlaceData) {
    if (!Array.isArray(manualThirdOrder) || !manualThirdOrder.length) return thirdPlaceData;
    const autoIndex = new Map(thirdPlaceData.map((team, idx) => [team.code, idx]));
    const manualIndex = new Map(manualThirdOrder.map((code, idx) => [code, idx]));
    thirdPlaceData.sort((a, b) => {
        const ia = manualIndex.has(a.code) ? manualIndex.get(a.code) : 100 + (autoIndex.get(a.code) ?? 0);
        const ib = manualIndex.has(b.code) ? manualIndex.get(b.code) : 100 + (autoIndex.get(b.code) ?? 0);
        return ia - ib;
    });
    return thirdPlaceData;
}

function getQualifiedTeams({ finishedGroups } = {}) {
    const qualified = { first: {}, second: {}, thirdByGroup: {}, finishedGroups: finishedGroups ?? new Set() };
    const thirdPlaceData = [];

    groupsData.forEach(group => {
        const groupCard = document.getElementById(`group-${group.id}`);
        const stats = getGroupStats(groupCard);
        const sortedCodes = sortTeamsInGroup(stats, group.id);

        const groupFinished = sortedCodes.length === 4 && Object.values(stats).every(s => s.PJ === 3);
        if (groupFinished) {
            qualified.first[group.id] = sortedCodes[0];
            qualified.second[group.id] = sortedCodes[1];
            qualified.thirdByGroup[group.id] = sortedCodes[2];
            thirdPlaceData.push({ code: sortedCodes[2], group: group.id, ...stats[sortedCodes[2]] });
        }
    });

    // Ranking de terceros (provisional si no han terminado todos los grupos)
    thirdPlaceData.sort(compareThirdPlaceTeams);
    applyManualThirdOrder(thirdPlaceData);

    qualified.thirds = thirdPlaceData.slice(0, 8).map(t => t.code);
    qualified.thirdGroups = thirdPlaceData.slice(0, 8).map(t => t.group);
    qualified.thirdPlaceData = thirdPlaceData;

    // true cuando ya tenemos 12 terceros (terminaron los 12 grupos)
    qualified.allGroupsFinished = thirdPlaceData.length === 12;

    return qualified;
}


function populateBracketFIFA(qualified) {
    // Siempre limpiamos todo el bracket (para que recalcular no deje basura)
    clearBracket();

    // --------------------------------------------------
    // 1) Sembrado oficial Round of 32
    //    Los 1º y 2º de grupo entran automáticamente.
    //    Los terceros quedan como espacios pendientes hasta confirmarlos y seleccionarlos.
    // --------------------------------------------------

    // M73: 2A vs 2B
    setBracketSlot('16-1', 'home', qualified.second['A'], '2º Grupo A');
    setBracketSlot('16-1', 'away', qualified.second['B'], '2º Grupo B');

    // M75: 1F vs 2C
    setBracketSlot('16-3', 'home', qualified.first['F'], '1º Grupo F');
    setBracketSlot('16-3', 'away', qualified.second['C'], '2º Grupo C');

    // M76: 1C vs 2F
    setBracketSlot('16-4', 'home', qualified.first['C'], '1º Grupo C');
    setBracketSlot('16-4', 'away', qualified.second['F'], '2º Grupo F');

    // M78: 2E vs 2I
    setBracketSlot('16-6', 'home', qualified.second['E'], '2º Grupo E');
    setBracketSlot('16-6', 'away', qualified.second['I'], '2º Grupo I');

    // M83: 2K vs 2L
    setBracketSlot('16-11', 'home', qualified.second['K'], '2º Grupo K');
    setBracketSlot('16-11', 'away', qualified.second['L'], '2º Grupo L');

    // M84: 1H vs 2J
    setBracketSlot('16-12', 'home', qualified.first['H'], '1º Grupo H');
    setBracketSlot('16-12', 'away', qualified.second['J'], '2º Grupo J');

    // M86: 1J vs 2H
    setBracketSlot('16-14', 'home', qualified.first['J'], '1º Grupo J');
    setBracketSlot('16-14', 'away', qualified.second['H'], '2º Grupo H');

    // M88: 2D vs 2G
    setBracketSlot('16-16', 'home', qualified.second['D'], '2º Grupo D');
    setBracketSlot('16-16', 'away', qualified.second['G'], '2º Grupo G');

    // Partidos con terceros: lado fijo automático + tercer lugar pendiente/manual.
    THIRD_ASSIGNMENT_SLOTS.forEach(slot => {
        setBracketSlot(slot.matchId, 'home', qualified.first[slot.winnerGroup], `1º Grupo ${slot.winnerGroup}`);
        setBracketPlaceholder(slot.matchId, 'away', `3º ${slot.allowed.join('/')}`);
    });

    // Si el usuario ya confirmó terceros y asignó cruces, se colocan aquí.
    applyThirdAssignmentsToBracket(qualified);
}

// --- Tabla Annexe C (FIFA) ---
// IMPORTANTE:
//  - Annexe C tiene 495 combinaciones. Cada combinación depende de QUÉ 8 grupos aportan un 3er lugar que clasifica.
//  - Si quieres que el sistema sea 100% oficial, necesitas cargar ese mapeo aquí.
//  - Estructura esperada: clave = string con 8 letras ordenadas (ej: 'CEFGHIJK')
//    valor = { A:'E', B:'J', D:'I', E:'F', G:'H', I:'G', K:'L', L:'K' }  // indica qué grupo (3E, 3J...) enfrenta a 1A, 1B, 1D, 1E, 1G, 1I, 1K, 1L
const ANNEX_C_MAP = {
    // EJEMPLO (NO COMPLETO): cuando los terceros clasificados vienen de E,F,G,H,I,J,K,L
    // key: 'EFGHIJKL'
    // (Ejemplo tomado del reglamento, Option 1)
    'EFGHIJKL': { A: 'E', B: 'J', D: 'I', E: 'F', G: 'H', I: 'G', K: 'L', L: 'K' }
};

function getAnnexCBaseAssignments(qualified) {
    const result = {};
    if (!qualified.allGroupsFinished) return result;

    const thirdGroups = (qualified.thirdGroups || []).slice().sort().join('');
    if (thirdGroups.length !== 8) return result;

    const mapping = ANNEX_C_MAP[thirdGroups];
    if (!mapping) return result;

    const slotByWinner = new Map(THIRD_ASSIGNMENT_SLOTS.map(slot => [slot.winnerGroup, slot]));
    Object.entries(mapping).forEach(([winnerGroup, thirdGroup]) => {
        const slot = slotByWinner.get(winnerGroup);
        if (slot && qualified.thirdByGroup[thirdGroup]) {
            result[slot.matchId] = thirdGroup;
        }
    });
    return result;
}

function getSuggestedThirdAssignments(qualified) {
    // En este flujo no asignamos terceros automáticamente.
    // Se confirma el top 8 y después el usuario selecciona manualmente cada cruce.
    return {};
}

function getEffectiveThirdAssignments(qualified) {
    if (!areThirdsConfirmed(qualified)) return {};

    const topThirdGroups = getTopThirdGroupSet(qualified);
    const used = new Set();
    const result = {};

    THIRD_ASSIGNMENT_SLOTS.forEach(slot => {
        const group = manualThirdAssignments?.[slot.matchId];
        if (!group) return;
        if (!topThirdGroups.has(group)) return;
        if (!slot.allowed.includes(group)) return;
        if (!qualified.thirdByGroup[group]) return;
        if (used.has(group)) return;

        result[slot.matchId] = group;
        used.add(group);
    });

    return result;
}

function getAvailableThirdOptionsForSlot(qualified, slot) {
    if (!areThirdsConfirmed(qualified)) return [];

    const topEight = (qualified.thirdPlaceData || []).slice(0, 8);
    const current = manualThirdAssignments?.[slot.matchId] || '';
    const usedByOther = new Set(Object.entries(manualThirdAssignments || {})
        .filter(([id, group]) => id !== slot.matchId && group)
        .map(([, group]) => group));

    return topEight.filter(team =>
        slot.allowed.includes(team.group) &&
        (!usedByOther.has(team.group) || team.group === current) &&
        qualified.thirdByGroup?.[team.group]
    );
}

function renderThirdSelectorInBracket(qualified, slot) {
    const matchEl = document.querySelector(`[data-match-id="${slot.matchId}"]`);
    if (!matchEl) return;

    const pill = matchEl.querySelector('.team-pill[data-team-pos="away"]');
    if (!pill || pill.dataset.teamCode) return;

    if (!areThirdsConfirmed(qualified)) {
        setBracketPlaceholder(slot.matchId, 'away', `3º ${slot.allowed.join('/')}`);
        return;
    }

    const current = manualThirdAssignments?.[slot.matchId] || '';
    const options = getAvailableThirdOptionsForSlot(qualified, slot);
    const optionHTML = options.map(team => {
        const data = TEAMS_DATA[team.code] || {};
        const label = `3${team.group} · ${data.flag || ''} ${data.name || team.code}`;
        return `<option value="${team.group}" ${team.group === current ? 'selected' : ''}>${escapeHTML(label)}</option>`;
    }).join('');

    pill.classList.add('placeholder', 'third-select-pill');
    pill.classList.remove('loser');
    delete pill.dataset.teamCode;
    pill.innerHTML = `
        <span class="flag">⏳</span>
        <select class="bracket-third-select" data-match-id="${escapeHTML(slot.matchId)}" title="Seleccionar tercer lugar para ${escapeHTML(slot.matchNo)}">
            <option value="">3º ${escapeHTML(slot.allowed.join('/'))}</option>
            ${optionHTML}
        </select>`;
}

function renderThirdSelectorsInBracket(qualified) {
    THIRD_ASSIGNMENT_SLOTS.forEach(slot => renderThirdSelectorInBracket(qualified, slot));
}

function applyThirdAssignmentsToBracket(qualified) {
    if (!areThirdsConfirmed(qualified)) {
        renderThirdSelectorsInBracket(qualified);
        return;
    }

    const assignments = getEffectiveThirdAssignments(qualified);
    THIRD_ASSIGNMENT_SLOTS.forEach(slot => {
        const group = assignments[slot.matchId];
        const code = group ? qualified.thirdByGroup[group] : null;
        if (code) updateNextMatch(slot.matchId, 'away', code);
    });

    renderThirdSelectorsInBracket(qualified);
}

function renderThirdAssignmentControls(qualified) {
    const container = document.getElementById('third-assignment-controls');
    if (!container) return;

    if (!qualified.allGroupsFinished) {
        container.innerHTML = `<div class="third-confirm-card"><div class="third-assignment-title">Confirmación de mejores terceros</div><div class="third-assignment-note">Termina los resultados de los 12 grupos para confirmar los 8 mejores terceros.</div></div>`;
        return;
    }

    const topEight = (qualified.thirdPlaceData || []).slice(0, 8);
    const signature = getThirdConfirmationSignature(qualified);
    const confirmed = areThirdsConfirmed(qualified);
    const chips = topEight.map(team => {
        const data = TEAMS_DATA[team.code] || {};
        return `<span class="confirmed-third-chip">3${team.group} · ${escapeHTML(data.flag || '')} ${escapeHTML(data.name || team.code)}</span>`;
    }).join('');

    if (!confirmed) {
        container.innerHTML = `
            <div class="third-confirm-card">
                <div class="third-assignment-title">Confirmar mejores terceros</div>
                <div class="third-assignment-note">Revisa que estos sean los 8 terceros que clasifican. Después de confirmar, podrás colocarlos manualmente en los 8 espacios de la ronda de 32.</div>
                <div class="confirmed-third-list">${chips}</div>
                <button class="btn btn-sm third-confirm-btn" type="button" id="third-confirm-btn" ${signature ? '' : 'disabled'}>Confirmar mejores terceros</button>
            </div>`;
        return;
    }

    const selectedByOther = (matchId) => new Set(Object.entries(manualThirdAssignments || {})
        .filter(([id, group]) => id !== matchId && group)
        .map(([, group]) => group));

    container.innerHTML = `
        <div class="third-assignment-title">Cruces manuales de mejores terceros</div>
        <div class="third-assignment-note">Los 24 equipos de 1.º y 2.º pasan automático. Selecciona aquí qué tercer lugar confirmado entra en cada espacio permitido.</div>
        <div class="confirmed-third-list">${chips}</div>
        <div class="third-assignment-grid">
            ${THIRD_ASSIGNMENT_SLOTS.map(slot => {
                const current = manualThirdAssignments[slot.matchId] || '';
                const blocked = selectedByOther(slot.matchId);
                const validOptions = topEight.filter(team =>
                    slot.allowed.includes(team.group) && (!blocked.has(team.group) || team.group === current)
                );
                const options = validOptions.map(team => {
                    const data = TEAMS_DATA[team.code] || {};
                    return `<option value="${team.group}" ${team.group === current ? 'selected' : ''}>3${team.group} · ${escapeHTML(data.flag || '')} ${escapeHTML(data.name || team.code)}</option>`;
                }).join('');
                return `
                    <label class="third-assignment-item">
                        <span>${slot.matchNo} · ${slot.label}</span>
                        <select class="third-assignment-select" data-match-id="${slot.matchId}">
                            <option value="">Seleccionar tercer lugar</option>
                            ${options}
                        </select>
                    </label>`;
            }).join('')}
        </div>
        <div class="third-assignment-actions">
            <button class="btn btn-sm" type="button" id="third-assignment-reset">Limpiar cruces</button>
            <button class="btn btn-sm" type="button" id="third-confirm-reset">Revisar terceros de nuevo</button>
        </div>
    `;
}

function resolveThirdOpponentsFromAnnexC(qualified) {
    applyThirdAssignmentsToBracket(qualified);
}


// --- Compat: mantenemos el nombre antiguo por si lo llamaba alguna parte ---
function populateBracket(qualified) {
    return populateBracketFIFA(qualified);
}


function clearBracket() {
    document.querySelectorAll('.bracket-container-topdown .match-container').forEach(match => {
        // Limpiar estados visuales
        match.querySelectorAll('.team-pill').forEach(pill => {
            pill.classList.remove('loser');
            if (!pill.classList.contains('placeholder')) {
                pill.classList.add('placeholder');
                pill.innerHTML = '';
                delete pill.dataset.teamCode;
            } else {
                pill.innerHTML = '';
                delete pill.dataset.teamCode;
            }
            const scoreInput = pill.querySelector('.score');
            if (scoreInput) scoreInput.remove();
        });
    });

    // Limpiar campeón
    const champ = document.querySelector('[data-match-id="champion"]');
    if (champ) {
        champ.classList.add('placeholder');
        champ.innerHTML = '';
        delete champ.dataset.teamCode;
    }
}


function validateMatchInputs(matchRow) {
    const [input1, input2] = matchRow.querySelectorAll('.score-input');
    input1.classList.toggle('input-invalid', input1.value === '' && input2.value !== '');
    input2.classList.toggle('input-invalid', input1.value !== '' && input2.value === '');
}

// --- LÓGICA DE ALMACENAMIENTO ---
function saveStateToStorage() {
    // Si estamos en medio de la carga inicial, no guardamos nada para evitar sobrescribir.
    if (isLoading) return;

    // Obtenemos el estado actual para no perder el nombre de usuario.
    const currentState = JSON.parse(localStorage.getItem(storageKey)) || {};

    // Creamos el objeto que contendrá toda la información a guardar.
    const newState = {
        userName: currentState.userName, // Mantenemos el nombre de usuario existente.
        groups: {},
        bracket: {},
        bracketMeta: {},
        manual: {
            groupOrders: manualGroupOrders,
            thirdOrder: manualThirdOrder,
            thirdAssignments: manualThirdAssignments,
            thirdConfirmation: confirmedThirdSignature
        },
        predictions: userPredictions
    };

    // 1. Guardar marcadores de la fase de grupos
    document.querySelectorAll('.group-card').forEach(card => {
        const groupId = card.dataset.groupId;
        newState.groups[groupId] = {};
        card.querySelectorAll('.match-grid').forEach(match => {
            const matchKey = `${match.dataset.team1}-${match.dataset.team2}`;
            const scores = Array.from(match.querySelectorAll('.score-input')).map(i => i.value);
            // Guardamos solo si hay datos para no llenar el storage de vacíos
            if (scores[0] !== '' || scores[1] !== '') {
                newState.groups[groupId][matchKey] = scores;
            }
        });
    });

    // 2. Guardar marcadores de la fase eliminatoria (bracket)
    document.querySelectorAll('.bracket-container-topdown .match-container').forEach(match => {
        const matchId = match.dataset.matchId;
        const scoreInputs = match.querySelectorAll('.score');

        // Solo procedemos si el partido tiene inputs de marcador
        if (scoreInputs.length === 2) {
            const scores = [scoreInputs[0].value, scoreInputs[1].value];
            if (scores[0] !== '' || scores[1] !== '') {
                newState.bracket[matchId] = scores;

                // Meta: penales / ganador en empate
                const meta = {};
                if (match.dataset.penalties === '1') meta.penalties = true;
                if (match.dataset.tiebreakWinner) meta.winner = match.dataset.tiebreakWinner;
                if (Object.keys(meta).length) newState.bracketMeta[matchId] = meta;
            }
        }
    });

    // 3. Guardar el objeto completo en localStorage usando la clave ÚNICA del usuario.
    localStorage.setItem(storageKey, JSON.stringify(newState));
    markSaved();
}

function loadStateFromStorage() {
    isLoading = true; // --- Activamos la bandera de carga ---

    const savedState = JSON.parse(localStorage.getItem(storageKey));

    manualGroupOrders = savedState?.manual?.groupOrders || {};
    manualThirdOrder = savedState?.manual?.thirdOrder || [];
    manualThirdAssignments = savedState?.manual?.thirdAssignments || {};
    confirmedThirdSignature = savedState?.manual?.thirdConfirmation || savedState?.manual?.confirmedThirdSignature || null;
    userPredictions = savedState?.predictions || savedState?.userPredictions || {};

    // Cargar marcadores de grupos
    if (savedState && savedState.groups) {
        document.querySelectorAll('.group-card').forEach(card => {
            const groupId = card.dataset.groupId;
            if (savedState.groups[groupId]) {
                card.querySelectorAll('.match-grid').forEach(match => {
                    const matchKey = `${match.dataset.team1}-${match.dataset.team2}`;
                    if (savedState.groups[groupId][matchKey]) {
                        const [score1, score2] = savedState.groups[groupId][matchKey];
                        const inputs = match.querySelectorAll('.score-input');
                        inputs[0].value = score1;
                        inputs[1].value = score2;
                    }
                });
            }
        });
    }

    // Recalca grupos y puebla el bracket con los equipos iniciales
    updateAllCalculations();
    restorePredictionInputs();

    // Cargar marcadores del bracket
    if (savedState && savedState.bracket) {
        const roundOrder = ['16-', '8-', '4-', '2-', '3-', '1-'];
        roundOrder.forEach(prefix => {
            Object.keys(savedState.bracket).forEach(matchId => {
                if (matchId.startsWith(prefix)) {
                    const matchEl = document.querySelector(`.match-container[data-match-id="${matchId}"]`);
                    if (matchEl) {
                        const scores = savedState.bracket[matchId];
                        const inputs = matchEl.querySelectorAll('.score');

                        // Asegurarse de que los inputs existan antes de asignarles valor
                        if (inputs.length === 2 && scores && scores.length === 2) {
                            inputs[0].value = scores[0];
                            inputs[1].value = scores[1];

                            // Una vez puestos los marcadores, validamos y avanzamos
                            const homeScore = parseInt(scores[0], 10);
                            const awayScore = parseInt(scores[1], 10);

                            const meta = savedState.bracketMeta?.[matchId] || null;

                            if (!isNaN(homeScore) && !isNaN(awayScore) && homeScore !== awayScore) {
                                // Resultado normal
                                hidePenaltiesUI(matchEl);
                                advanceWinner(matchEl, null);
                            } else if (!isNaN(homeScore) && !isNaN(awayScore) && homeScore === awayScore) {
                                // Empate: restaurar penales si existían
                                if (meta?.penalties) matchEl.dataset.penalties = '1';
                                if (meta?.winner) matchEl.dataset.tiebreakWinner = meta.winner;

                                showPenaltiesUI(matchEl);

                                if ((matchEl.dataset.penalties === '1') && matchEl.dataset.tiebreakWinner) {
                                    inputs[0].classList.remove('tie-score');
                                    inputs[1].classList.remove('tie-score');
                                    advanceWinner(matchEl, matchEl.dataset.tiebreakWinner);
                                } else {
                                    inputs[0].classList.add('tie-score');
                                    inputs[1].classList.add('tie-score');
                                }
                            }
                        }
                    }
                }
            });
        });
    }

    isLoading = false; // --- Desactivamos la bandera de carga al finalizar ---
}

// ==================================================
// === LÓGICA PARA ESTADÍSTICAS GLOBALES ===
// ==================================================

function getAllMatchesData() {
    const allMatches = [];
    // Recopilar partidos de fase de grupos
    document.querySelectorAll('.group-card .match-grid').forEach(matchEl => {
        const [score1Input, score2Input] = matchEl.querySelectorAll('.score-input');
        if (score1Input.value !== '' && score2Input.value !== '') {
            allMatches.push({
                team1: matchEl.dataset.team1,
                team2: matchEl.dataset.team2,
                score1: parseInt(score1Input.value, 10),
                score2: parseInt(score2Input.value, 10),
            });
        }
    });
    // Recopilar partidos de fase eliminatoria
    document.querySelectorAll('.bracket-container-topdown .match-container').forEach(matchEl => {
        const [score1Input, score2Input] = matchEl.querySelectorAll('.score');
        const homePill = matchEl.querySelector('[data-team-pos="home"]');
        const awayPill = matchEl.querySelector('[data-team-pos="away"]');
        if (score1Input && score2Input && score1Input.value !== '' && score2Input.value !== '' && homePill.dataset.teamCode && awayPill.dataset.teamCode) {
            allMatches.push({
                team1: homePill.dataset.teamCode,
                team2: awayPill.dataset.teamCode,
                score1: parseInt(score1Input.value, 10),
                score2: parseInt(score2Input.value, 10),
            });
        }
    });
    return allMatches;
}

function updateGlobalStats() {
    const allMatches = getAllMatchesData();
    const teamStats = {};

    // Inicializar estadísticas para todos los equipos
    Object.keys(TEAMS_DATA).forEach(code => {
        teamStats[code] = { GF: 0, GC: 0 };
    });

    // Calcular GF y GC para cada equipo
    allMatches.forEach(match => {
        teamStats[match.team1].GF += match.score1;
        teamStats[match.team1].GC += match.score2;
        teamStats[match.team2].GF += match.score2;
        teamStats[match.team2].GC += match.score1;
    });

    // 1. Máximos Goleadores
    const sortedByGF = Object.entries(teamStats).sort(([, a], [, b]) => b.GF - a.GF);
    const topScorersBody = document.getElementById('stats-top-scorers');
    topScorersBody.innerHTML = sortedByGF.slice(0, 5).map(([code, stats]) => `
        <tr>
            <td class="team-info">${TEAMS_DATA[code].flag} ${TEAMS_DATA[code].name}</td>
            <td class="stat-value">${stats.GF}</td>
        </tr>
    `).join('');

    // 2. Mejores Defensas (menos goles recibidos)
    const sortedByGC = Object.entries(teamStats).sort(([, a], [, b]) => a.GC - b.GC);
    const bestDefenseBody = document.getElementById('stats-best-defense');
    bestDefenseBody.innerHTML = sortedByGC.slice(0, 5).map(([code, stats]) => `
        <tr>
            <td class="team-info">${TEAMS_DATA[code].flag} ${TEAMS_DATA[code].name}</td>
            <td class="stat-value">${stats.GC}</td>
        </tr>
    `).join('');

    // 3. Partidos con más goles
    allMatches.sort((a, b) => (b.score1 + b.score2) - (a.score1 + a.score2));
    const topMatchesBody = document.getElementById('stats-top-matches');
    topMatchesBody.innerHTML = allMatches.slice(0, 5).map(match => `
        <tr>
            <td>
                <div class="team-info">${TEAMS_DATA[match.team1].flag} ${match.team1} ${match.score1} - ${match.score2} ${match.team2} ${TEAMS_DATA[match.team2].flag}</div>
                <div class="match-details">${TEAMS_DATA[match.team1].name} vs ${TEAMS_DATA[match.team2].name}</div>
            </td>
            <td class="stat-value">${match.score1 + match.score2}</td>
        </tr>
    `).join('');
}

function hideSplash(durationMs = 6000){
  const splash = document.getElementById('splash');
  if(!splash) return;

  // Asegura que se pinte el splash primero
  requestAnimationFrame(() => {
    setTimeout(() => {
      splash.classList.add('is-hidden');
      // Remover del DOM después del fade (0.35s aprox + margen)
      setTimeout(() => splash.remove(), 800);
    }, durationMs);
  });
}