/**
 * MecaPro - Lógica Final con Feedback de Error Temporal Refinado
 */

// --- Variables de Estado ---
let frasesDisponibles = []; 
let fraseActual = "";
let startTime = null;
let totalTyped = 0;   
let errorsCount = 0;  

// --- Elementos del DOM ---
const textDisplay = document.getElementById('text-display');
const hiddenInput = document.getElementById('hidden-input');
const wpmDisplay = document.getElementById('wpm'); 
const kpmDisplay = document.getElementById('kpm'); 
const errorsDisplay = document.getElementById('errors-display'); 
const precisionDisplay = document.getElementById('precision');
const resetBtn = document.getElementById('reset-btn');
const toggleBackspace = document.getElementById('toggle-backspace');

// Elementos del Modal de Resultados
const modal = document.getElementById('result-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const finalPpm = document.getElementById('final-ppm');
const finalRpm = document.getElementById('final-rpm');
const finalErrors = document.getElementById('final-errors');
const finalPrecision = document.getElementById('final-precision');
const modalReviewDisplay = document.getElementById('modal-review-display');

// Elementos del Modal de Ayuda
const helpBtn = document.getElementById('help-btn');
const helpModal = document.getElementById('help-modal');
const closeHelpBtn = document.getElementById('close-help-btn');

/**
 * Mapeo de teclas a dedos y colores
 */
const fingerMap = {
    'key-1': 1, 'key-q': 1, 'key-a': 1, 'key-z': 1, 'key-shift-left': 1,
    'key-2': 2, 'key-w': 2, 'key-s': 2, 'key-x': 2,
    'key-3': 3, 'key-e': 3, 'key-d': 3, 'key-c': 3,
    'key-4': 4, 'key-r': 4, 'key-f': 4, 'key-v': 4, 'key-5': 4, 'key-t': 4, 'key-g': 4, 'key-b': 4,
    'key-space': 5, 
    'key-6': 7, 'key-y': 7, 'key-h': 7, 'key-n': 7,
    'key-7': 7, 'key-u': 7, 'key-j': 7, 'key-m': 7,
    'key-8': 8, 'key-i': 8, 'key-k': 8, 'key-comma': 8,
    'key-9': 9, 'key-o': 9, 'key-l': 9, 'key-period': 9,
    'key-0': 10, 'key-p': 10, 'key-ñ': 10, 'key-tilde': 10, 'key-dash': 10,
    'key-question-open': 10, 'key-exclamation-open': 10
};

const fingerColors = {
    1: 'f-pinky', 10: 'f-pinky',
    2: 'f-ring',  9: 'f-ring',
    3: 'f-middle', 8: 'f-middle',
    4: 'f-index', 7: 'f-index',
    5: 'f-thumb', 6: 'f-thumb'
};

function obtenerFraseNueva() {
    if (typeof listaFrases === 'undefined') {
        fraseActual = "Error al cargar frases.";
        return;
    }
    if (frasesDisponibles.length === 0) {
        frasesDisponibles = [...listaFrases]; 
    }
    const randomIndex = Math.floor(Math.random() * frasesDisponibles.length);
    fraseActual = frasesDisponibles.splice(randomIndex, 1)[0];
}

function init() {
    obtenerFraseNueva();
    textDisplay.innerHTML = "";
    if (fraseActual) {
        fraseActual.split("").forEach(char => {
            const span = document.createElement('span');
            span.innerText = char;
            textDisplay.appendChild(span);
        });
    }
    hiddenInput.value = "";
    startTime = null;
    totalTyped = 0;
    errorsCount = 0;
    wpmDisplay.innerText = "0";
    kpmDisplay.innerText = "0";
    errorsDisplay.innerText = "0";
    precisionDisplay.innerText = "100";

    updateHighlights();
    hiddenInput.focus();
}

function updateHighlights() {
    const chars = textDisplay.querySelectorAll('span');
    const currentIndex = hiddenInput.value.length;
    const allColors = Object.values(fingerColors);

    document.querySelectorAll('.key, .finger').forEach(el => el.classList.remove(...allColors));

    if (currentIndex < chars.length) {
        chars.forEach(s => s.classList.remove('char-current'));
        const spanActual = chars[currentIndex];
        spanActual.classList.add('char-current');
        
        const char = spanActual.innerText; 
        let charLower = char.toLowerCase();
        let keyId = "";
        let needsShift = false;

        const shiftSymbols = {
            '!': 'key-1', '"': 'key-2', '$': 'key-4', '%': 'key-5',
            '&': 'key-6', '/': 'key-7', '(': 'key-8', ')': 'key-9',
            '=': 'key-0', '?': 'key-question-open', '¿': 'key-exclamation-open',
            ':': 'key-period', ';': 'key-comma', '_': 'key-dash'
        };

        const normalSymbols = {
            ' ': 'key-space', '¡': 'key-exclamation-open', "'": 'key-question-open',
            ',': 'key-comma', '.': 'key-period', '-': 'key-dash', '´': 'key-tilde'
        };

        if (shiftSymbols[char]) { keyId = shiftSymbols[char]; needsShift = true; }
        else if (char !== charLower && !normalSymbols[char]) { needsShift = true; keyId = `key-${charLower}`; }
        else if (normalSymbols[char]) { keyId = normalSymbols[char]; }
        else { keyId = `key-${charLower}`; }

        const acentos = {'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u'};
        if (acentos[charLower]) {
            const tildeKey = document.getElementById('key-tilde');
            if (tildeKey) tildeKey.classList.add('f-pinky');
            keyId = `key-${acentos[charLower]}`;
            if (char !== charLower) needsShift = true;
        }

        const fingerIdx = fingerMap[keyId];
        const colorClass = fingerColors[fingerIdx];

        if (keyId && colorClass) {
            const keyElement = document.getElementById(keyId);
            const fingerElement = document.getElementById(`finger-${fingerIdx}`);
            if (keyElement) keyElement.classList.add(colorClass);
            if (fingerElement) fingerElement.classList.add(colorClass);
        }

        if (needsShift) {
            const shiftL = document.getElementById('key-shift-left');
            const fingerPinkyL = document.getElementById('finger-1');
            if (shiftL) shiftL.classList.add('f-pinky');
            if (fingerPinkyL) fingerPinkyL.classList.add('f-pinky');
        }
    }
}

function calculateStats() {
    if (!startTime) return;
    const timeInMinutes = (new Date() - startTime) / 60000;
    const wordsTyped = hiddenInput.value.length / 5;
    wpmDisplay.innerText = timeInMinutes > 0 ? Math.round(wordsTyped / timeInMinutes) : 0;
    const keysTyped = hiddenInput.value.length;
    kpmDisplay.innerText = timeInMinutes > 0 ? Math.round(keysTyped / timeInMinutes) : 0;
    errorsDisplay.innerText = errorsCount;
    const accuracy = totalTyped > 0 ? Math.round(((totalTyped - errorsCount) / totalTyped) * 100) : 100;
    precisionDisplay.innerText = Math.max(0, accuracy);
}

function generarRevisionFrase() {
    const userInput = hiddenInput.value;
    let reviewHTML = "";
    for (let i = 0; i < fraseActual.length; i++) {
        const charOriginal = fraseActual[i];
        const charUsuario = userInput[i];
        if (charUsuario === undefined) {
            reviewHTML += `<span>${charOriginal}</span>`;
        } else if (charUsuario === charOriginal) {
            reviewHTML += `<span class="review-correct">${charOriginal}</span>`;
        } else {
            reviewHTML += `<span class="review-error">${charOriginal}</span>`;
        }
    }
    modalReviewDisplay.innerHTML = reviewHTML;
}

// Lógica de Modales
helpBtn.addEventListener('click', () => { helpModal.style.display = "flex"; });
closeHelpBtn.addEventListener('click', () => { helpModal.style.display = "none"; hiddenInput.focus(); });

// MANEJO DE TECLADO (Keydown) - Feedback Temporal
hiddenInput.addEventListener('keydown', (e) => {
    // 1. Bloquear retroceso
    if (e.key === 'Backspace' && toggleBackspace.checked) {
        e.preventDefault();
        textDisplay.classList.add('shake');
        setTimeout(() => textDisplay.classList.remove('shake'), 200);
        return;
    }

    // 2. Feedback de error TEMPORAL (700ms)
    if (e.key.length === 1) { 
        const currentIndex = hiddenInput.value.length;
        const charCorrecto = fraseActual[currentIndex];

        if (e.key !== charCorrecto) {
            let keyId = `key-${e.key.toLowerCase()}`;
            if (e.key === " ") keyId = "key-space";
            if (e.key === ",") keyId = "key-comma";
            if (e.key === ".") keyId = "key-period";
            if (e.key === "-") keyId = "key-dash";
            if (e.key === "ñ" || e.key === "Ñ") keyId = "key-ñ";

            const keyElement = document.getElementById(keyId);
            if (keyElement) {
                // Añadimos la clase roja
                keyElement.classList.add('key-wrong');
                
                // La quitamos automáticamente después de 700ms
                setTimeout(() => {
                    keyElement.classList.remove('key-wrong');
                }, 700);
            }
        }
    }
});

hiddenInput.addEventListener('input', (e) => {
    if (!startTime && hiddenInput.value.length > 0) startTime = new Date();
    if (e.inputType !== "deleteContentBackward") { totalTyped++; }

    const userInput = hiddenInput.value;
    const chars = textDisplay.querySelectorAll('span');

    userInput.split("").forEach((char, index) => {
        if (index < chars.length) {
            if (char === fraseActual[index]) {
                chars[index].className = 'char-correct';
            } else {
                if (chars[index].className !== 'char-error') { errorsCount++; }
                chars[index].className = 'char-error';
            }
        }
    });

    for (let i = userInput.length; i < chars.length; i++) chars[i].className = '';

    calculateStats();
    updateHighlights();

    if (userInput.length === fraseActual.length && fraseActual.length > 0) {
        finalPpm.innerText = wpmDisplay.innerText;
        finalRpm.innerText = kpmDisplay.innerText;
        finalErrors.innerText = errorsCount; 
        finalPrecision.innerText = precisionDisplay.innerText;
        generarRevisionFrase();
        modal.style.display = "flex";
        hiddenInput.blur(); 
    }
});

closeModalBtn.addEventListener('click', () => { modal.style.display = "none"; init(); });
resetBtn.addEventListener('click', init);

document.addEventListener('click', () => {
    if (modal.style.display !== "flex" && helpModal.style.display !== "flex") {
        hiddenInput.focus();
    }
});

window.addEventListener('load', init);