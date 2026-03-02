// =================================================================================
// === QUINIELA MUNDIAL 2026 - CÓDIGO JAVASCRIPT MAESTRO, FINAL Y VERIFICADO      ===
// =================================================================================

// --- CONFIGURACIÓN GLOBAL ---
const STORAGE_KEY = 'quinielaMundial2026_data_v2'; // v2 para evitar conflictos con datos viejos
const TEAMS_DATA = {};
let isLoading = false;
let currentUserId = null; // ¡NUEVO! Guardará el ID del usuario de la URL.
let storageKey = 'quinielaMundial2026_data'; // Clave base, la haremos única.

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
    if (err) err.textContent = msg || '';
}

function hideAuthGate() {
    const gate = document.getElementById('auth-gate');
    const err = document.getElementById('auth-gate-error');
    if (!gate) return;
    gate.classList.add('is-hidden');
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
        return true;
    }

    const inviteFromUrl = getInviteTokenFromUrl();
    const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);

    // 1) Si ya hay sesión, validamos
    if (sessionId) {
        try {
            await verifySession(sessionId);
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
                ${[[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]].map(([i, j]) => {
        const team1 = group.codes[i], team2 = group.codes[j];
        return `
                    <div class="match-grid" data-team1="${team1}" data-team2="${team2}">
                        <span class="team-name local">
  ${TEAMS_DATA[team1].name}
  <span class="team-flag">${TEAMS_DATA[team1].flag}</span>
</span>

<input type="number" min="0" max="20" step="1" inputmode="numeric" class="score-input">
<span class="match-separator">-</span>
<input type="number" min="0" max="20" step="1" inputmode="numeric" class="score-input">

<span class="team-name visitor">
  <span class="team-flag">${TEAMS_DATA[team2].flag}</span>
  ${TEAMS_DATA[team2].name}
</span>
                    </div>`;
    }).join('')}
            </div>
            <div class="group-view-toggle-wrap">
                <button class="group-view-toggle" type="button" aria-pressed="false">Ver tabla</button>
            </div>
            <table class="standings-table">
                <thead><tr><th>Eq</th><th>Pts</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th></tr></thead>
                <tbody>
                    ${group.codes.map(code => `<tr data-team-code="${code}"><td>${TEAMS_DATA[code].flag} ${code}</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>`).join('')}
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
        if (e.target.classList.contains('score-input')) {
            sanitizeScoreInput(e.target);
            validateMatchInputs(e.target.closest('.match-grid'));
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
            markDirty();
            updateAllCalculations();
            updateProgressUI();
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

    // Poblar bracket con lo que ya se pueda (y placeholders donde falte)
    populateBracketFIFA(qualified);

    // Estadísticas globales
    updateGlobalStats();

    updateProgressUI();
    saveStateToStorage();
}

function updateGroupStandings(groupCard) {
    const stats = getGroupStats(groupCard);
    const sortedCodes = sortTeamsInGroup(stats);
    const tableBody = groupCard.querySelector('tbody');
    let isFinished = true;
    sortedCodes.forEach((code, index) => {
        const row = tableBody.querySelector(`tr[data-team-code="${code}"]`);
        const s = stats[code];
        row.innerHTML = `<td>${TEAMS_DATA[code].flag} ${code}</td><td>${s.Pts}</td><td>${s.PJ}</td><td>${s.G}</td><td>${s.E}</td><td>${s.P}</td><td>${s.GF}</td><td>${s.GC}</td>`;
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

function sortTeamsInGroup(stats) {
    return Object.keys(stats).sort((a, b) => {
        if (stats[b].Pts !== stats[a].Pts) return stats[b].Pts - stats[a].Pts;
        const diffB = stats[b].GF - stats[b].GC, diffA = stats[a].GF - stats[a].GC;
        if (diffB !== diffA) return diffB - diffA;
        if (stats[b].GF !== stats[a].GF) return stats[b].GF - stats[a].GF;
        return 0;
    });
}

function getQualifiedTeams({ finishedGroups } = {}) {
    const qualified = { first: {}, second: {}, thirdByGroup: {}, finishedGroups: finishedGroups ?? new Set() };
    const thirdPlaceData = [];

    groupsData.forEach(group => {
        const groupCard = document.getElementById(`group-${group.id}`);
        const stats = getGroupStats(groupCard);
        const sortedCodes = sortTeamsInGroup(stats);

        const groupFinished = sortedCodes.length === 4 && stats[sortedCodes[0]].PJ === 3;
        if (groupFinished) {
            qualified.first[group.id] = sortedCodes[0];
            qualified.second[group.id] = sortedCodes[1];
            qualified.thirdByGroup[group.id] = sortedCodes[2];
            thirdPlaceData.push({ code: sortedCodes[2], group: group.id, ...stats[sortedCodes[2]] });
        }
    });

    // Ranking de terceros (provisional si no han terminado todos los grupos)
    thirdPlaceData.sort((a, b) => {
        if (b.Pts !== a.Pts) return b.Pts - a.Pts;
        const diffB = b.GF - b.GC, diffA = a.GF - a.GC;
        if (diffB !== diffA) return diffB - diffA;
        return b.GF - a.GF;
    });

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
    // 1) Sembrado oficial Round of 32 (Art. 12.6)
    // --------------------------------------------------

    // Helper: set a real team
    const setTeam = (matchId, pos, code) => {
        if (!code) return;
        updateNextMatch(matchId, pos, code);
    };

    // Helper: set a placeholder "Mejor 3º ..." (si aún no se puede resolver)
    const setThirdPlaceholder = (matchId, pos, label) => {
        const pseudoCode = `TBD_${label}`;
        if (!TEAMS_DATA[pseudoCode]) {
            TEAMS_DATA[pseudoCode] = { name: `Mejor 3º (${label})`, flag: '⏳' };
        }
        updateNextMatch(matchId, pos, pseudoCode);
    };

    // --- Matches fijos (runner-up / winner)
    // (16-1)  M73: 2A vs 2B
    setTeam('16-1', 'home', qualified.second['A']);
    setTeam('16-1', 'away', qualified.second['B']);

    // (16-3)  M75: 1F vs 2C
    setTeam('16-3', 'home', qualified.first['F']);
    setTeam('16-3', 'away', qualified.second['C']);

    // (16-4)  M76: 1C vs 2F
    setTeam('16-4', 'home', qualified.first['C']);
    setTeam('16-4', 'away', qualified.second['F']);

    // (16-6)  M78: 2E vs 2I
    setTeam('16-6', 'home', qualified.second['E']);
    setTeam('16-6', 'away', qualified.second['I']);

    // (16-11) M83: 2K vs 2L
    setTeam('16-11', 'home', qualified.second['K']);
    setTeam('16-11', 'away', qualified.second['L']);

    // (16-12) M84: 1H vs 2J
    setTeam('16-12', 'home', qualified.first['H']);
    setTeam('16-12', 'away', qualified.second['J']);

    // (16-14) M86: 1J vs 2H
    setTeam('16-14', 'home', qualified.first['J']);
    setTeam('16-14', 'away', qualified.second['H']);

    // (16-16) M88: 2D vs 2G
    setTeam('16-16', 'home', qualified.second['D']);
    setTeam('16-16', 'away', qualified.second['G']);

    // --- Matches que dependen de los 8 mejores terceros (Art. 12.6 + Annexe C)
    // Si todavía no se puede resolver (porque faltan grupos o no está la tabla de Annexe C), mostramos placeholder.

    // (16-2)  M74: 1E vs (mejor 3º de ABCDF)
    setTeam('16-2', 'home', qualified.first['E']);
    setThirdPlaceholder('16-2', 'away', 'ABCDF');

    // (16-5)  M77: 1I vs (mejor 3º de CDFGH)
    setTeam('16-5', 'home', qualified.first['I']);
    setThirdPlaceholder('16-5', 'away', 'CDFGH');

    // (16-7)  M79: 1A vs (mejor 3º de CEFHI)
    setTeam('16-7', 'home', qualified.first['A']);
    setThirdPlaceholder('16-7', 'away', 'CEFHI');

    // (16-8)  M80: 1L vs (mejor 3º de EHIJK)
    setTeam('16-8', 'home', qualified.first['L']);
    setThirdPlaceholder('16-8', 'away', 'EHIJK');

    // (16-9)  M81: 1D vs (mejor 3º de BEFIJ)
    setTeam('16-9', 'home', qualified.first['D']);
    setThirdPlaceholder('16-9', 'away', 'BEFIJ');

    // (16-10) M82: 1G vs (mejor 3º de AEHIJ)
    setTeam('16-10', 'home', qualified.first['G']);
    setThirdPlaceholder('16-10', 'away', 'AEHIJ');

    // (16-13) M85: 1B vs (mejor 3º de EFGIJ)
    setTeam('16-13', 'home', qualified.first['B']);
    setThirdPlaceholder('16-13', 'away', 'EFGIJ');

    // (16-15) M87: 1K vs (mejor 3º de DEIJL)
    setTeam('16-15', 'home', qualified.first['K']);
    setThirdPlaceholder('16-15', 'away', 'DEIJL');

    // --------------------------------------------------
    // 2) Intentar resolver placeholders usando Annexe C
    // --------------------------------------------------
    // Si tienes el mapeo completo (495 combinaciones), aquí es donde se asignan los terceros reales.
    // Ver función resolveThirdOpponentsFromAnnexC().
    resolveThirdOpponentsFromAnnexC(qualified);
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

function resolveThirdOpponentsFromAnnexC(qualified) {
    // Solo cuando terminó la fase de grupos completa.
    if (!qualified.allGroupsFinished) return;

    // Necesitamos que ya existan los 8 grupos que aportan tercero clasificado.
    const thirdGroups = (qualified.thirdGroups || []).slice().sort().join('');
    if (thirdGroups.length !== 8) return;

    const mapping = ANNEX_C_MAP[thirdGroups];
    if (!mapping) {
        // No hay mapping cargado: nos quedamos con placeholders.
        console.warn('[Annexe C] Falta el mapping para la combinación:', thirdGroups);
        return;
    }

    // Para cada ganador de grupo que enfrenta a un tercero, reemplazamos el placeholder por el tercero real.
    const thirdTeam = (groupLetter) => qualified.thirdByGroup[groupLetter];

    // 1A vs 3?
    if (mapping.A) updateNextMatch('16-7', 'away', thirdTeam(mapping.A));
    // 1B vs 3?
    if (mapping.B) updateNextMatch('16-13', 'away', thirdTeam(mapping.B));
    // 1D vs 3?
    if (mapping.D) updateNextMatch('16-9', 'away', thirdTeam(mapping.D));
    // 1E vs 3?
    if (mapping.E) updateNextMatch('16-2', 'away', thirdTeam(mapping.E));
    // 1G vs 3?
    if (mapping.G) updateNextMatch('16-10', 'away', thirdTeam(mapping.G));
    // 1I vs 3?
    if (mapping.I) updateNextMatch('16-5', 'away', thirdTeam(mapping.I));
    // 1K vs 3?
    if (mapping.K) updateNextMatch('16-15', 'away', thirdTeam(mapping.K));
    // 1L vs 3?
    if (mapping.L) updateNextMatch('16-8', 'away', thirdTeam(mapping.L));
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
        bracketMeta: {}
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

    // Recalcula grupos y puebla el bracket con los equipos iniciales
    updateAllCalculations();

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