// Game state
let currentSquare = "";
let correctAnswers = 0;
let totalQuestions = 0;
let isWaiting = false;
let timerDuration = 0;
let timerRemaining = 0;
let timerInterval = null;
let nextQuestionTimeout = null;


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
    document.getElementById('playerBtn').textContent = '👤 ' + savedPlayer;
}

const HISTORY_KEY = 'chessSquares_history';

function toggleMode() {
    levelSound.play().catch(() => {});
    const isBoardVisible = boardSvg.style.display !== 'none';

    if (isBoardVisible) {
        // Switch to Grandmaster Mode
        boardSvg.style.display = 'none';
        knightImg.style.display = 'block';
        imageCaption.textContent = 'Grandmaster Mode';
    } else {
        // Switch back to Beginner Mode
        boardSvg.style.display = 'block';
        knightImg.style.display = 'none';
        imageCaption.textContent = 'Beginner Mode';
    }
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
    saveCurrentPlayer(); // flush outgoing player
    // zero out the outgoing player's live score in storage
    if (currentPlayer) {
        players[currentPlayer] = { correct: 0, total: 0 };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
    }
    currentPlayer = name;
    if (!players[name]) players[name] = { correct: 0, total: 0 };
    correctAnswers = players[name].correct;
    totalQuestions = players[name].total;
    clearInterval(timerInterval);
    timerInterval = null;
    timerDuration = 0;
    timerRemaining = 0;
    clearTimeout(nextQuestionTimeout);
    nextQuestionTimeout = null;
    document.getElementById('playerBtn').textContent = '👤 ' + name;
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
    guestRow.innerHTML = `<span class="player-name">👤 Guest</span>
                          <span class="player-score">—</span>`;
    guestRow.onclick = () => {
        if (currentPlayer && totalQuestions > 0) {
            if (!confirm('Save current game and switch to Guest?')) return;
            saveSession();
        }
        saveCurrentPlayer();
        currentPlayer = null;
        correctAnswers = 0;
        totalQuestions = 0;
        document.getElementById('playerBtn').textContent = '👤 Guest';
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
                         <span class="player-score">${p.correct}/${p.total} (${pct}%)</span>`;
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
        document.getElementById('playerBtn').textContent = '👤 Guest';
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
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.push({
        player: currentPlayer,
        correct: correctAnswers,
        total: totalQuestions,
        pct: Math.round(correctAnswers / totalQuestions * 100),
        duration: timerDuration > 0 ? timerDuration - timerRemaining : null,
        date: new Date().toISOString()
    });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    return true;
}

function newGame() {
    const midGame = totalQuestions > 0;
    if (midGame && !confirm('Start a new game?')) return;

    saveSession();
    correctAnswers = 0;
    totalQuestions = 0;
    clearInterval(timerInterval);
    timerInterval = null;
    timerDuration = 0;
    timerRemaining = 0;
    saveCurrentPlayer();
    updateScoreDisplay();
    clearTimeout(nextQuestionTimeout);
    nextQuestionTimeout = null;
    askNewQuestion(true);
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
    
    feedbackMessageEl.innerHTML = "🤔 Is this a dark or light square?";
    feedbackMessageEl.className = "feedback-message";
    
    updateScoreDisplay();
    setButtonsEnabled(true);
}

// Check user's answer
function checkAnswer(userGuess) {
    if (isWaiting) return;
    
    // Play click sound immediately
    //clickSound.currentTime = 0;
    clickSound.play().catch(() => {}); // ignore browser autoplay blocks

    const actualColor = determineSquareColor(currentSquare);
    totalQuestions++;
    
if (userGuess === actualColor) {
        feedbackMessageEl.innerHTML = `✓ Correct! ${currentSquare} is a ${actualColor} square. ✓`;
        feedbackMessageEl.className = "feedback-message feedback-correct";
        correctAnswers++;
    } else {
        feedbackMessageEl.innerHTML = `✗ Incorrect. ${currentSquare} is a ${actualColor} square. ✗`;
        feedbackMessageEl.className = "feedback-message feedback-incorrect";
    }

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
    renderHistory();
    document.getElementById('settingsOverlay').style.display = 'flex';
}

function closeSettingsOverlay() {
    document.getElementById('settingsOverlay').style.display = 'none';
}

function renderHistory() {
    const list = document.getElementById('historyList');
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]').reverse();
    if (history.length === 0) {
        list.innerHTML = '<p class="no-history">No sessions yet.</p>';
        return;
    }
    list.innerHTML = '';
    for (const s of history) {
        const date = new Date(s.date).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        const duration = s.duration ? formatTime(s.duration) : '—';
        const row = document.createElement('div');
        row.className = 'history-row';
        row.innerHTML = `<span class="history-player">${s.player}</span>
                         <span class="history-score">${s.correct}/${s.total} (${s.pct}%)</span>
                         <span class="history-duration">${duration}</span>
                         <span class="history-date">${date}</span>`;
        list.appendChild(row);
    }
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
    timerDuration = mins * 60;
    timerRemaining = timerDuration;
    closeSettingsOverlay();
    tickTimer();
    timerInterval = setInterval(tickTimer, 1000);
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
    if (timerRemaining <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        setButtonsEnabled(false);
        feedbackMessageEl.textContent = "⏰ Time's Up!";
        feedbackMessageEl.className = "feedback-message feedback-incorrect";
        updateScoreDisplay();
        return;
    }
    timerRemaining--;
    updateScoreDisplay();
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// Event listeners
darkBtn.addEventListener('click', () => checkAnswer("dark"));
lightBtn.addEventListener('click', () => checkAnswer("light"));

// Touch optimization for mobile
darkBtn.addEventListener('touchstart', (e) => {
    if (!darkBtn.disabled) {
        e.preventDefault();
        checkAnswer("dark");
    }
});

lightBtn.addEventListener('touchstart', (e) => {
    if (!lightBtn.disabled) {
        e.preventDefault();
        checkAnswer("light");
    }
});

// Start the game
askNewQuestion();