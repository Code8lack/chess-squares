// Game state
let currentSquare = "";
let correctAnswers = 0;
let totalQuestions = 0;
let isWaiting = false;
let timerDuration = 0;
let timerRemaining = 0;
let timerInterval = null;
let nextQuestionTimeout = null;
let currentStreak = 0;
let peakStreak = 0;
let isMuted = localStorage.getItem('chessSquares_mute') === 'true';


// DOM elements
const squareNameEl = document.getElementById('squareName');
const scoreLabelEl = document.getElementById('scoreLabel');
const feedbackMessageEl = document.getElementById('feedbackMessage');
const darkBtn = document.getElementById('darkBtn');
const lightBtn = document.getElementById('lightBtn');

// Toggle Logic for Pro Mode
const toggleArea = document.getElementById('toggleArea');
const boardSvg = document.getElementById('boardSvg');
const knightImg = document.getElementById('knightImg');
const imageCaption = document.getElementById('imageCaption');

//Sound
const clickSound = document.getElementById('clickSound');

// Player state
const STORAGE_KEY = 'chessSquares_players';
let players = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
let currentPlayer = null;

const savedPlayer = localStorage.getItem('chessSquares_currentPlayer');
if (savedPlayer && players[savedPlayer]) {
    currentPlayer = savedPlayer;
    document.getElementById('playerBtn').textContent = '👤 ' + savedPlayer.toUpperCase();
}

const HISTORY_KEY = 'chessSquares_history';
const HS_TIMED_KEY   = 'chessSquares_hs_timed';
const HS_UNTIMED_KEY = 'chessSquares_hs_untimed';
const HS_ALLTIME_KEY = 'chessSquares_hs_alltime';

// Theme
const THEME_KEY = 'chessSquares_theme';
(function applyStoredTheme() {
    const t = localStorage.getItem(THEME_KEY);
    if (t) document.documentElement.setAttribute('data-theme', t);
})();

function setTheme(name) {
    document.documentElement.setAttribute('data-theme', name);
    if (name) localStorage.setItem(THEME_KEY, name);
    else localStorage.removeItem(THEME_KEY);
    closeSettingsOverlay();
}

function openSettingsSub(name) {
    document.querySelectorAll('.settings-sub').forEach(el => el.style.display = 'none');
    document.getElementById('settingsSub-' + name).style.display = 'block';
    document.getElementById('settingsRoot').style.display = 'none';
    document.getElementById('settingsBackBtn').style.display = 'block';
    document.getElementById('settingsPanelTitle').textContent =
        ({ timer: 'Timer', history: 'History', themes: 'Themes' })[name];
    if (name === 'history') renderHistory();
}

function closeSettingsSub() {
    document.querySelectorAll('.settings-sub').forEach(el => el.style.display = 'none');
    document.getElementById('settingsRoot').style.display = 'flex';
    document.getElementById('settingsBackBtn').style.display = 'none';
    document.getElementById('settingsPanelTitle').textContent = 'Settings';
}

function newGame() {
    saveSession();
    scoreLabelEl.classList.remove('score-label-expired');
    correctAnswers = 0;
    totalQuestions = 0;
    clearInterval(timerInterval);
    timerInterval = null;
    timerDuration = 0;
    timerRemaining = 0;
    currentStreak = 0;
    peakStreak = 0;
    updateStreakDisplay();
    saveCurrentPlayer();
    updateScoreDisplay();
    clearTimeout(nextQuestionTimeout);
    nextQuestionTimeout = null;
    askNewQuestion(true);
}

function toggleMode() {
    if (!isMuted) clickSound.play().catch(() => {});

    const isBoardVisible = boardSvg.style.display !== 'none';
    if (isBoardVisible) {
        boardSvg.style.display = 'none';
        knightImg.style.display = 'block';
        imageCaption.textContent = 'Grandmaster Mode';
        sessionMode = isBoardVisible ? 'Grandmaster' : 'Beginner';
    } else {
        boardSvg.style.display = 'block';
        knightImg.style.display = 'none';
        imageCaption.textContent = 'Beginner Mode';
        sessionMode = isBoardVisible ? 'Grandmaster' : 'Beginner';
    }
}

function currentMode() {
    return boardSvg.style.display === 'none' ? 'Grandmaster' : 'Beginner';
}

function selectPlayer(name) {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        if (!confirm(`Stop current game and switch to ${name}?`)) {
            timerInterval = setInterval(tickTimer, 1000); // resume if cancelled
            return;
        }
    }
    saveSession();
    saveCurrentPlayer();
    currentPlayer = name;
    if (!players[name]) players[name] = { correct: 0, total: 0 };
    correctAnswers = players[name].correct;
    totalQuestions = players[name].total;
    currentStreak = 0;
    peakStreak = 0;
    updateStreakDisplay();   
    clearInterval(timerInterval);
    timerInterval = null;
    timerDuration = 0;
    timerRemaining = 0;
    clearTimeout(nextQuestionTimeout);
    nextQuestionTimeout = null;
    document.getElementById('playerBtn').textContent = '👤 ' + name.toUpperCase();
    localStorage.setItem('chessSquares_currentPlayer', name);
    closePlayerPanel();
    askNewQuestion();
}

function saveCurrentPlayer() {
    if (!currentPlayer) return;
    players[currentPlayer] = { correct: correctAnswers, total: totalQuestions };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
}

function openPlayerPanel() {
    renderPlayerList();
    document.getElementById('playerOverlay').style.display = 'flex';
}

function closePlayerPanel() {
    document.getElementById('playerOverlay').style.display = 'none';
    document.getElementById('newPlayerInput').value = '';
}

function renderPlayerList() {
    const list = document.getElementById('playerList');
    list.innerHTML = '';

    const guestRow = document.createElement('div');
    guestRow.className = 'player-row' + (!currentPlayer ? ' active' : '');
    guestRow.innerHTML = `<span class="player-name">👤 GUEST</span>
                          <span class="player-score">—</span>`;
    guestRow.onclick = () => {
        saveCurrentPlayer();
        currentPlayer = null;
        correctAnswers = 0;
        totalQuestions = 0;
        currentStreak = 0;
        updateStreakDisplay();
        document.getElementById('playerBtn').textContent = '👤 GUEST';
        localStorage.removeItem('chessSquares_currentPlayer');
        updateScoreDisplay();
        closePlayerPanel();
    };
    list.appendChild(guestRow);

    for (const name in players) {
        const p = players[name];
        const pct = p.total ? Math.round(p.correct / p.total * 100) : 0;
        const row = document.createElement('div');
        row.className = 'player-row' + (name === currentPlayer ? ' active' : '');
        row.innerHTML = `<span class="player-name">${name}</span>
                        <span class="player-score">${p.correct}/${p.total}</span>`
        row.onclick = () => selectPlayer(name);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-player-btn';
        deleteBtn.textContent = '✕';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deletePlayer(name);
        };
        row.appendChild(deleteBtn);
        list.appendChild(row);
    }
}

function addPlayer() {
    const input = document.getElementById('newPlayerInput');
    const name = input.value.trim();
    if (!name || players[name]) return;
    players[name] = { correct: 0, total: 0 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
    selectPlayer(name);
}

function deletePlayer(name) {
    if (!confirm(`Delete ${name}?`)) return;
    delete players[name];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
    if (currentPlayer === name) {
        currentPlayer = null;
        correctAnswers = 0;
        totalQuestions = 0;
        currentStreak = 0;
        updateStreakDisplay();
        document.getElementById('playerBtn').textContent = '👤 GUEST';
        updateScoreDisplay();
    }
    renderPlayerList();
}

// Allow Enter key in the input
document.getElementById('newPlayerInput')
    .addEventListener('keydown', e => { if (e.key === 'Enter') addPlayer(); });

boardSvg.addEventListener('click', toggleMode);
knightImg.addEventListener('click', toggleMode);

// Determine if a chess square is dark or light
function determineSquareColor(squareName) {
    const columnChar = squareName.charAt(0).toUpperCase();
    const rowNum = parseInt(squareName.charAt(1));
    const columnNum = columnChar.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
    return (columnNum + rowNum) % 2 === 0 ? "dark" : "light";
}

// Generate random square (A1-H8)
function generateRandomSquare() {
    const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const rows = ['1', '2', '3', '4', '5', '6', '7', '8'];
    return columns[Math.floor(Math.random() * 8)] + rows[Math.floor(Math.random() * 8)];
}

function saveSession() {
    if (!currentPlayer || totalQuestions === 0) return false;

    const category = timerDuration > 0 ? 'timed' : 'untimed';
    const hsKey = category === 'timed' ? HS_TIMED_KEY : HS_UNTIMED_KEY;
    const currentHS = JSON.parse(localStorage.getItem(hsKey) || 'null');

    const beatsCategoryHS = peakStreak > 5 && (!currentHS || peakStreak > currentHS.peakStreak);

    const entry = {
        player:     currentPlayer,
        correct:    correctAnswers,
        total:      totalQuestions,
        peakStreak: peakStreak,
        mode:       currentMode(),
        category:   category,
        duration:   category === 'timed' ? timerDuration - timerRemaining : null,
        date:       new Date().toISOString(),
        isRecord:   beatsCategoryHS,
    };

    if (beatsCategoryHS) localStorage.setItem(hsKey, JSON.stringify(entry));

    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.push(entry);
        if (history.length > 10) history.splice(0, history.length - 10);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        return true;
    }

function showToast(msg = '✦ New Game ✦') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.pointerEvents = 'none';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.animation = 'none';
    setTimeout(() => {
        toast.style.animation = 'toastIn 1.6s ease forwards';
    }, 10);
}

function updateScoreDisplay() {
    const timer = timerDuration > 0 ? `\n${formatTime(timerRemaining)}` : '';
    scoreLabelEl.textContent = `Score: ${correctAnswers}/${totalQuestions}${timer}`;
}

// Enable/disable buttons
function setButtonsEnabled(enabled) {
    if (enabled) {
        darkBtn.classList.remove('disabled');
        lightBtn.classList.remove('disabled');
        darkBtn.disabled = false;
        lightBtn.disabled = false;
    } else {
        darkBtn.classList.add('disabled');
        lightBtn.classList.add('disabled');
        darkBtn.disabled = true;
        lightBtn.disabled = true;
    }
}

// Ask a new question
function askNewQuestion(isNewGame = false) {
    isWaiting = false;
    currentSquare = generateRandomSquare();
    squareNameEl.textContent = currentSquare;

    if (isNewGame) {
        showToast();
        squareNameEl.classList.remove('square-new-game');
        setTimeout(() => squareNameEl.classList.add('square-new-game'), 10);
    }
    
    feedbackMessageEl.innerHTML = "Can you guess? 🤔";
    feedbackMessageEl.className = "feedback-message";
    
    updateScoreDisplay();
    setButtonsEnabled(true);
}

function spawnConfetti() {
    const particles = ['✦','✧','★','✿','♦','·','❋'];
    const colors = ['#f472b6','#a78bfa','#60a5fa','#34d399','#fbbf24','#f87171'];
    const area = document.querySelector('.message-area');

    for (let i = 0; i < 12; i++) {
        const el = document.createElement('span');
        el.className = 'confetti-particle';
        el.textContent = particles[Math.floor(Math.random() * particles.length)];
        el.style.color = colors[Math.floor(Math.random() * colors.length)];
        el.style.left = (20 + Math.random() * 60) + '%';
        el.style.top  = (20 + Math.random() * 60) + '%';
        el.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
        el.style.setProperty('--dy', (Math.random() * -80 - 20) + 'px');
        el.style.animationDelay = (Math.random() * 0.2) + 's';
        area.appendChild(el);
        el.addEventListener('animationend', () => el.remove());
    }
}

function updateStreakDisplay() {
    const badge = document.getElementById('streakBadge');
    const count = document.getElementById('streakCount');
    if (currentStreak >= 3) {
        count.textContent = currentStreak;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
    const toasts = { 3: '🔥 3 in a row!', 5: '⚡ On fire!', 10: '🌟 Unstoppable!', 25: '👑 Chess genius!' };
    if (toasts[currentStreak]) showToast(toasts[currentStreak]);
}

// Check user's answer
function checkAnswer(userGuess) {
    if (isWaiting) return;
    
    // Play click sound immediately
    //clickSound.currentTime = 0;
    if (!isMuted) clickSound.play().catch(() => {}); // ignore browser autoplay blocks

    const actualColor = determineSquareColor(currentSquare);
    totalQuestions++;
        
    if (userGuess === actualColor) {
        feedbackMessageEl.innerHTML = `Correct! ${currentSquare} is ${actualColor}.`;
        feedbackMessageEl.className = "feedback-message feedback-correct";
        correctAnswers++;
        currentStreak++;
        if (currentStreak > peakStreak) peakStreak = currentStreak;
        spawnConfetti();
    } else {
        feedbackMessageEl.innerHTML = `Incorrect. ${currentSquare} is ${actualColor}.`;
        feedbackMessageEl.className = "feedback-message feedback-incorrect";
        currentStreak = 0;
    }

    updateStreakDisplay();
    updateScoreDisplay();
    saveCurrentPlayer();
    setButtonsEnabled(false);
    isWaiting = true;
    
    nextQuestionTimeout = setTimeout(() => {
        askNewQuestion();
    }, 1000);
}

function openSettingsPanel() {
    document.getElementById('timerMinutes').value = 1;
    closeSettingsSub();
    document.getElementById('settingsOverlay').style.display = 'flex';
}

function closeSettingsOverlay() {
    document.getElementById('settingsOverlay').style.display = 'none';
}

function renderHistory() {
    const list = document.getElementById('historyList');
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

    const hsAllTime = JSON.parse(localStorage.getItem(HS_ALLTIME_KEY) || 'null');
    const hsTimed   = JSON.parse(localStorage.getItem(HS_TIMED_KEY)   || 'null');
    const hsUntimed = JSON.parse(localStorage.getItem(HS_UNTIMED_KEY) || 'null');

    list.innerHTML = '';

    // --- High score records block ---
    const recordsEl = document.createElement('div');
    recordsEl.className = 'history-records';

    function recordRow(label, hs) {
        if (!hs) return `<div class="record-row"><span class="record-label">${label}</span><span class="record-empty">—</span></div>`;
        const dur = hs.duration ? formatTime(hs.duration) : '—';
        return `<div class="record-row record-highlight">
            <span class="record-label">${label}</span>
            <span class="record-player">${hs.player.toUpperCase()}</span>
            <span class="record-streak">🔥 ${hs.peakStreak}</span>
            <span class="record-mode">${hs.mode}</span>
            <span class="record-duration">${dur}</span>
        </div>`;
    }

    recordsEl.innerHTML = `
        <div class="records-title">🏆 HIGH SCORE STREAK</div>
        ${(hsTimed?.peakStreak || 0) >= (hsUntimed?.peakStreak || 0)
        ? recordRow('TIMED', hsTimed) + recordRow('UNTIMED', hsUntimed)
        : recordRow('UNTIMED', hsUntimed) + recordRow('TIMED', hsTimed)}
    `;
    list.appendChild(recordsEl);

    if (history.length === 0) {
        list.innerHTML += '<p class="no-history">No sessions yet.</p>';
        return;
    }

    // Sort: record-beaters first, then by date descending
    const sorted = [...history].map((e, i) => ({ ...e, _idx: i }))
        .sort((a, b) => (b.peakStreak || 0) - (a.peakStreak || 0));

    const sessionsList = document.createElement('div');
    sessionsList.className = 'history-sessions';

    for (const s of sorted) {
         const date = new Date(s.date).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short',
            hour: '2-digit', minute: '2-digit'
        }).replace(',', '');
        const duration = s.duration ? formatTime(s.duration) : '—';
        const streak   = s.peakStreak > 5 ? `🔥 ${s.peakStreak}` : '—';

        const row = document.createElement('div');
        
        row.innerHTML = `
            <div class="history-row-main">
                <span class="history-player">${s.player ? s.player.toUpperCase() : 'GUEST'}</span>
                <span class="history-score">${s.correct}/${s.total}</span>
                <span class="history-streak">${streak}</span>
                <span class="history-mode">${s.mode || '—'}</span>
                <span class="history-duration">${duration}</span>
                <span class="history-date">${date}</span>
            </div>
        `;

        sessionsList.appendChild(row);
    }

    list.appendChild(sessionsList);
}

function deleteHistoryEntry(idx) {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.splice(idx, 1);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
}

function clearHistory() {
    if (!confirm('Clear all history?')) return;
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
}

function startTimer() {
    const mins = parseInt(document.getElementById('timerMinutes').value);
    if (!mins || mins < 1) return;
    clearInterval(timerInterval);
    scoreLabelEl.classList.remove('score-label-expired');
    timerDuration = mins * 60;
    timerRemaining = timerDuration;
    correctAnswers = 0;
    totalQuestions = 0;
    currentStreak = 0;
    peakStreak = 0;
    updateStreakDisplay();
    closeSettingsOverlay();
    timerInterval = setInterval(tickTimer, 1000);
    askNewQuestion(true);
}

function clearTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerDuration = 0;
    timerRemaining = 0;
    updateScoreDisplay();
    closeSettingsOverlay();
}

function tickTimer() {
    timerRemaining--;
    if (!isMuted) tickSound.play().catch(() => {});
    if (timerRemaining <= 0) {
        if (!isMuted) timerSound.play().catch(() => {});
        scoreLabelEl.classList.add('score-label-expired');
        timerRemaining = 0;
        clearInterval(timerInterval);
        timerInterval = null;
        clearTimeout(nextQuestionTimeout);
        nextQuestionTimeout = null;
        isWaiting = true;
        setButtonsEnabled(false);
        saveSession();
        feedbackMessageEl.textContent = "⏰ Time's Up!";
        feedbackMessageEl.className = "feedback-message feedback-incorrect";
        updateScoreDisplay();
        return;
    }
    updateScoreDisplay();
}

function toggleMute() {
    isMuted = !isMuted;
    localStorage.setItem('chessSquares_mute', isMuted);
    document.getElementById('muteBtn').textContent = isMuted ? '🔕 Sound: OFF' : '🔔 Sound: ON';
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// Event listeners
let lastTouch = 0;
darkBtn.addEventListener('click', (e) => { if (Date.now() - lastTouch > 300) checkAnswer("dark"); });
lightBtn.addEventListener('click', (e) => { if (Date.now() - lastTouch > 300) checkAnswer("light"); });

// Touch optimization for mobile
darkBtn.addEventListener('touchstart', (e) => {
    if (!darkBtn.disabled) {
        lastTouch = Date.now();
        e.preventDefault();
        checkAnswer("dark");
    }
});

lightBtn.addEventListener('touchstart', (e) => {
    if (!lightBtn.disabled) {
        lastTouch = Date.now();
        e.preventDefault();
        checkAnswer("light");
    }
});

// Start the game
document.getElementById('muteBtn').textContent = isMuted ? '🔕 Sound: OFF' : '🔔 Sound: ON';
askNewQuestion();