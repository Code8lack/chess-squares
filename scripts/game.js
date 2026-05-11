// Game state
let currentSquare = "";
let correctAnswers = 0;
let totalQuestions = 0;
let isWaiting = false;

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

function toggleMode() {
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

// Update score display
function updateScoreDisplay() {
    scoreLabelEl.textContent = `Score: ${correctAnswers}/${totalQuestions}`;
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
function askNewQuestion() {
    isWaiting = false;
    currentSquare = generateRandomSquare();
    squareNameEl.textContent = currentSquare;
    
    feedbackMessageEl.innerHTML = "🤔 Is this a dark or light square?";
    feedbackMessageEl.className = "feedback-message";
    
    updateScoreDisplay();
    setButtonsEnabled(true);
}

// Check user's answer
function checkAnswer(userGuess) {
    if (isWaiting) return;
    
    const actualColor = determineSquareColor(currentSquare);
    totalQuestions++;
    
    if (userGuess === actualColor) {
        feedbackMessageEl.innerHTML = `✓ Correct! ${currentSquare} is a ${actualColor} square. ✓`;
        feedbackMessageEl.className = "feedback-message feedback-correct";
        correctAnswers++;
<<<<<<< Updated upstream
    } else {
        feedbackMessageEl.innerHTML = `✗ Incorrect. ${currentSquare} is a ${actualColor} square. ✗`;
        feedbackMessageEl.className = "feedback-message feedback-incorrect";
=======
        
 
    } else {
        feedbackMessageEl.innerHTML = `✗ Incorrect. ${currentSquare} is a ${actualColor} square. ✗`;
        feedbackMessageEl.className = "feedback-message feedback-incorrect";
        
>>>>>>> Stashed changes
    }
    
    updateScoreDisplay();
    setButtonsEnabled(false);
    isWaiting = true;
    
    setTimeout(() => {
        askNewQuestion();
    }, 1000);
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