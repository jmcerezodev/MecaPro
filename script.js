/**
 * MecaPro - Versión Actualizada 2026
 * Solución optimizada para tildes y gestión de estado.
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
 * Mapeo de teclas a dedos
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
    if (typeof listaFrases === 'undefined' || listaFrases.length === 0) {
        fraseActual = "El archivo de frases no está cargado correctamente.";
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
    
    // Reset de estado
    hiddenInput.value = "";
    startTime = null;
    totalTyped = 0;
    errorsCount = 0;
    
    // Reset UI
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

    userInput.split("").forEach((char, index) => {
        if (index < chars.length) {
            if (char === fraseActual[index]) {
                chars[index].className = 'char-correct';
            } else {
                // Solo incrementa error si es un cambio nuevo y no estaba ya marcado
                if (chars[index].className !== 'char-error') {
                    errorsCount++;
                }
                chars[index].className = 'char-error';
            }
        }
    });

    // Limpiar clases de caracteres no alcanzados aún
    for (let i = userInput.length; i < chars.length; i++) {
        chars[i].className = '';
    }

    calculateStats();
    updateHighlights();

    // Comprobar fin de frase
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
    // Normalizamos el valor para que las tildes muertas no muevan el cursor visualmente
    const cleanValue = hiddenInput.value.replace(/[´`¨^]/g, '');
    const currentIndex = cleanValue.length;
    
    // Limpiar teclados y dedos
    const allColors = Object.values(fingerColors);
    document.querySelectorAll('.key, .finger').forEach(el => el.classList.remove(...allColors, 'key-active'));

    if (currentIndex < chars.length) {
        chars.forEach(s => s.classList.remove('char-current'));
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

        // Iluminar tecla de tilde si es vocal acentuada
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
    
    // WPM: estándar de 5 caracteres por palabra
    const wpm = timeMins > 0 ? Math.round((typedLength / 5) / timeMins) : 0;
    const kpm = timeMins > 0 ? Math.round(typedLength / timeMins) : 0;
    
    wpmDisplay.innerText = wpm;
    kpmDisplay.innerText = kpm;
    errorsDisplay.innerText = errorsCount;

    // Precisión basada en el total de pulsaciones vs errores
    const acc = totalTyped > 0 ? Math.round(((totalTyped - errorsCount) / totalTyped) * 100) : 100;
    precisionDisplay.innerText = Math.max(0, acc);
}

function generarRevisionFrase() {
    const userInput = hiddenInput.value;
    let html = "";
    for (let i = 0; i < fraseActual.length; i++) {
        const char = fraseActual[i] === " " ? "&nbsp;" : fraseActual[i];
        if (userInput[i] === undefined) {
            html += `<span>${char}</span>`;
        } else if (userInput[i] === fraseActual[i]) {
            html += `<span class="review-correct">${char}</span>`;
        } else {
            html += `<span class="review-error">${char}</span>`;
        }
    }
    modalReviewDisplay.innerHTML = html;
}

// --- EVENTOS ---

hiddenInput.addEventListener('compositionend', () => {
    validarProgreso();
});

hiddenInput.addEventListener('input', (e) => {
    if (e.isComposing) {
        updateHighlights();
        return;
    }
    // Solo contamos como pulsación si no es borrar
    if (e.inputType !== "deleteContentBackward") {
        totalTyped++;
    }
    validarProgreso();
});

hiddenInput.addEventListener('keydown', (e) => {
    // Bloqueo de Backspace si el toggle está activo
    if (e.key === 'Backspace' && toggleBackspace.checked) {
        e.preventDefault();
        textDisplay.classList.add('shake');
        setTimeout(() => textDisplay.classList.remove('shake'), 200);
        return;
    }

    // Ignorar teclas muertas para la validación inmediata (se validan en input o compositionend)
    if (e.isComposing || e.key === 'Dead') return;

    // Feedback de tecla errónea (Visual)
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

// Modales y Control
helpBtn.addEventListener('click', () => helpModal.style.display = "flex");
closeHelpBtn.addEventListener('click', () => { helpModal.style.display = "none"; hiddenInput.focus(); });
closeModalBtn.addEventListener('click', () => { modal.style.display = "none"; init(); });
resetBtn.addEventListener('click', init);

document.addEventListener('click', (e) => {
    // Mantener el foco a menos que se interactúe con modales
    if (modal.style.display !== "flex" && helpModal.style.display !== "flex") {
        hiddenInput.focus();
    }
});

// Responsividad - Ajuste de escala
function ajustarEscala() {
    const container = document.querySelector('.container');
    if (!container) return;

    const anchoVentana = window.innerWidth;
    const altoVentana = window.innerHeight;
    const anchoBase = 1250; 
    const altoBase = 900;

    const escala = Math.min(
        (anchoVentana * 0.95) / anchoBase,
        (altoVentana * 0.95) / altoBase,
        1 
    );

    container.style.transform = `translate(-50%, -50%) scale(${escala})`;
    container.style.left = '50%';
    container.style.top = '50%';
    container.style.position = 'absolute';
}

window.addEventListener('resize', ajustarEscala);
window.addEventListener('load', () => {
    ajustarEscala();
    init();
});