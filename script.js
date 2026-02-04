/**
 * MecaPro - Versión Final Estabilizada + Control de Sonido
 * Sin cambios en el posicionamiento CSS original.
 */

// --- Variables de Estado ---
let frasesDisponibles = []; 
let fraseActual = "";
let startTime = null;
let totalTyped = 0;   
let errorsCount = 0;  
let isMuted = false; // Estado del sonido

// --- Elementos del DOM ---
const textDisplay = document.getElementById('text-display');
const hiddenInput = document.getElementById('hidden-input');
const wpmDisplay = document.getElementById('wpm'); 
const kpmDisplay = document.getElementById('kpm'); 
const errorsDisplay = document.getElementById('errors-display'); 
const precisionDisplay = document.getElementById('precision');
const resetBtn = document.getElementById('reset-btn');
const toggleBackspace = document.getElementById('toggle-backspace');
const errorSound = document.getElementById('error-sound');

// Elementos Control Sonido
const muteBtn = document.getElementById('mute-btn');
const muteIcon = document.getElementById('mute-icon');

// Modal Resultados
const modal = document.getElementById('result-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const finalPpm = document.getElementById('final-ppm');
const finalRpm = document.getElementById('final-rpm');
const finalErrors = document.getElementById('final-errors');
const finalPrecision = document.getElementById('final-precision');
const modalReviewDisplay = document.getElementById('modal-review-display');

// Modal Ayuda
const helpBtn = document.getElementById('help-btn');
const helpModal = document.getElementById('help-modal');
const closeHelpBtn = document.getElementById('close-help-btn');

/**
 * Mapeos de Teclado
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
    1: 'f-pinky', 10: 'f-pinky', 2: 'f-ring', 9: 'f-ring',
    3: 'f-middle', 8: 'f-middle', 4: 'f-index', 7: 'f-index',
    5: 'f-thumb', 6: 'f-thumb'
};

function reproducirError() {
    // Solo se reproduce si isMuted es falso
    if (errorSound && !isMuted) {
        errorSound.currentTime = 0;
        errorSound.play().catch(() => {});
    }
}

function obtenerFraseNueva() {
    if (typeof listaFrases === 'undefined' || listaFrases.length === 0) {
        fraseActual = "Error de carga."; return;
    }
    if (frasesDisponibles.length === 0) frasesDisponibles = [...listaFrases]; 
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

function validarProgreso() {
    if (!startTime && hiddenInput.value.length > 0) startTime = new Date();
    
    const userInput = hiddenInput.value;
    const chars = textDisplay.querySelectorAll('span');

    chars.forEach((span, index) => {
        const charTyped = userInput[index];
        if (charTyped === undefined) {
            span.className = ''; 
        } else if (charTyped === fraseActual[index]) {
            span.className = 'char-correct';
        } else {
            if (span.className !== 'char-error') {
                errorsCount++;
                reproducirError();
            }
            span.className = 'char-error';
        }
    });

    calculateStats();
    updateHighlights();

    if (userInput.length === fraseActual.length && fraseActual.length > 0) {
        mostrarResultados();
    }
}

function mostrarResultados() {
    setTimeout(() => {
        finalPpm.innerText = wpmDisplay.innerText;
        finalRpm.innerText = kpmDisplay.innerText;
        finalErrors.innerText = errorsCount; 
        finalPrecision.innerText = precisionDisplay.innerText;
        generarRevisionFrase();
        modal.style.display = "flex";
        hiddenInput.blur();
    }, 100);
}

function updateHighlights() {
    const chars = textDisplay.querySelectorAll('span');
    const cleanValue = hiddenInput.value.replace(/[´`¨^]/g, '');
    const currentIndex = cleanValue.length;
    
    const allColors = Object.values(fingerColors);
    document.querySelectorAll('.key, .finger').forEach(el => el.classList.remove(...allColors));

    chars.forEach(s => s.classList.remove('char-current'));

    if (currentIndex < chars.length) {
        const spanActual = chars[currentIndex];
        spanActual.classList.add('char-current');
        
        const char = spanActual.innerText; 
        let charLower = char.toLowerCase();
        let keyId = "";
        let needsShift = false;

        const normalSymbols = {
            ' ': 'key-space', '¡': 'key-exclamation-open', "'": 'key-question-open',
            ',': 'key-comma', '.': 'key-period', '-': 'key-dash', '´': 'key-tilde'
        };

        const acentos = {'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u'};
        
        if (charLower === 'ñ') keyId = 'key-ñ';
        else if (normalSymbols[char]) keyId = normalSymbols[char];
        else {
            const shiftSymbols = {'!': 'key-1', '"': 'key-2', '$': 'key-4', '%': 'key-5', '&': 'key-6', '/': 'key-7', '(': 'key-8', ')': 'key-9', '=': 'key-0', ':': 'key-period', ';': 'key-comma', '_': 'key-dash', '?': 'key-question-open', '¿': 'key-exclamation-open'};
            if (shiftSymbols[char]) { keyId = shiftSymbols[char]; needsShift = true; }
            else {
                if (char !== charLower) needsShift = true;
                keyId = `key-${acentos[charLower] || charLower}`;
            }
        }

        if (acentos[charLower]) {
            const tildeKey = document.getElementById('key-tilde');
            if (tildeKey) tildeKey.classList.add('f-pinky');
        }

        const fingerIdx = fingerMap[keyId];
        const colorClass = fingerColors[fingerIdx];

        if (keyId && colorClass) {
            const keyEl = document.getElementById(keyId);
            const fingerEl = document.getElementById(`finger-${fingerIdx}`);
            if (keyEl) keyEl.classList.add(colorClass);
            if (fingerEl) fingerEl.classList.add(colorClass);
        }

        if (needsShift) {
            const shiftL = document.getElementById('key-shift-left');
            const finger1 = document.getElementById('finger-1');
            if (shiftL) shiftL.classList.add('f-pinky');
            if (finger1) finger1.classList.add('f-pinky');
        }
    }
}

function calculateStats() {
    if (!startTime) return;
    const timeMins = (new Date() - startTime) / 60000;
    const typedLength = hiddenInput.value.length;
    const wpm = timeMins > 0 ? Math.round((typedLength / 5) / timeMins) : 0;
    const kpm = timeMins > 0 ? Math.round(typedLength / timeMins) : 0;
    wpmDisplay.innerText = wpm;
    kpmDisplay.innerText = kpm;
    errorsDisplay.innerText = errorsCount;
    const acc = totalTyped > 0 ? Math.round(((totalTyped - errorsCount) / totalTyped) * 100) : 100;
    precisionDisplay.innerText = Math.max(0, acc);
}

function generarRevisionFrase() {
    const userInput = hiddenInput.value;
    let html = "";
    for (let i = 0; i < fraseActual.length; i++) {
        const char = fraseActual[i] === " " ? "&nbsp;" : fraseActual[i];
        if (userInput[i] === undefined) html += `<span>${char}</span>`;
        else if (userInput[i] === fraseActual[i]) html += `<span class="review-correct">${char}</span>`;
        else html += `<span class="review-error">${char}</span>`;
    }
    modalReviewDisplay.innerHTML = html;
}

// --- EVENTOS ---

// NUEVO: Lógica del Botón Mute
if (muteBtn) {
    muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        
        // Actualizamos icono y clase visual
        if (isMuted) {
            muteIcon.innerText = "🔇";
            muteBtn.classList.add('is-muted');
        } else {
            muteIcon.innerText = "🔊";
            muteBtn.classList.remove('is-muted');
        }
        
        // Devolvemos el foco al input para seguir escribiendo
        hiddenInput.focus();
    });
}

hiddenInput.addEventListener('compositionend', () => {
    validarProgreso();
});

hiddenInput.addEventListener('input', (e) => {
    if (e.isComposing) {
        updateHighlights();
        return;
    }
    if (e.inputType !== "deleteContentBackward") totalTyped++;
    validarProgreso();
});

hiddenInput.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && toggleBackspace.checked) {
        e.preventDefault();
        textDisplay.classList.add('shake');
        setTimeout(() => textDisplay.classList.remove('shake'), 200);
        return;
    }
    if (e.key === 'Dead' || e.isComposing) return;

    if (e.key.length === 1) { 
        const currentIndex = hiddenInput.value.length;
        const charCorrecto = fraseActual[currentIndex];
        if (charCorrecto && e.key !== charCorrecto) {
            let keyId = `key-${e.key.toLowerCase()}`;
            if (e.key === " ") keyId = "key-space";
            if (e.key === "ñ" || e.key === "Ñ") keyId = "key-ñ";
            const keyElement = document.getElementById(keyId);
            if (keyElement) {
                keyElement.classList.add('key-wrong');
                setTimeout(() => keyElement.classList.remove('key-wrong'), 500);
            }
        }
    }
});

helpBtn.addEventListener('click', () => helpModal.style.display = "flex");
closeHelpBtn.addEventListener('click', () => { helpModal.style.display = "none"; hiddenInput.focus(); });
closeModalBtn.addEventListener('click', () => { modal.style.display = "none"; init(); });
resetBtn.addEventListener('click', init);

document.addEventListener('click', () => {
    if (modal.style.display !== "flex" && helpModal.style.display !== "flex") {
        hiddenInput.focus();
    }
});

/**
 * FUNCIÓN DE ESCALADO RESTAURADA (Original Segura)
 */
function ajustarEscala() {
    const container = document.querySelector('.container');
    if (!container) return;
    const anchoVentana = window.innerWidth;
    const altoVentana = window.innerHeight;
    const anchoBase = 1250; 
    const altoBase = 900;

    const escala = Math.min(
        (anchoVentana * 0.9) / anchoBase,
        (altoVentana * 0.9) / altoBase,
        1 
    );
    container.style.transform = `scale(${escala})`;
}

window.addEventListener('resize', ajustarEscala);
window.addEventListener('load', () => {
    ajustarEscala();
    init();
});