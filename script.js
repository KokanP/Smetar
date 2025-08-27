// --- Added section for proper mobile height handling ---
function setGameContainerHeight() {
    // Set the real height based on visible viewport
    document.getElementById('game-container').style.height = window.innerHeight + 'px';
}

// --- Variables for screen width/height (not const anymore) ---
let SCREEN_WIDTH = 0;
let SCREEN_HEIGHT = 0;

function updateScreenSizeVars() {
    const gameContainer = document.getElementById('game-container');
    SCREEN_WIDTH = gameContainer.clientWidth;
    SCREEN_HEIGHT = gameContainer.clientHeight;
}

// Handles both height setting and variable updating, and updates camera/player visuals
function handleResize() {
    setGameContainerHeight();
    updateScreenSizeVars();
    if (typeof updateCamera === 'function') updateCamera();
    if (typeof updatePlayerVisuals === 'function') updatePlayerVisuals();
}

// --- Attach resize/orientationchange listeners and on DOMContentLoaded ---
window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', handleResize);
document.addEventListener('DOMContentLoaded', handleResize);

document.addEventListener('DOMContentLoaded', () => {
    // Referenčni elementi
    const gameContainer = document.getElementById('game-container');
    const map = document.getElementById('map');
    const player = document.getElementById('player');
    const incinerator = document.getElementById('incinerator');
    const sackStatusEl = document.getElementById('sack-status');
    const scoreEl = document.getElementById('score');
    const tabCountEl = document.getElementById('tab-count');
    const messageLogEl = document.getElementById('message-log');
    const upgradeSackBtn = document.getElementById('upgrade-sack');
    const upgradeSpeedBtn = document.getElementById('upgrade-speed');
    const costSackEl = document.getElementById('cost-sack');
    const costSpeedEl = document.getElementById('cost-speed');
    const openUpgradesBtn = document.getElementById('open-upgrades-btn');
    const closeUpgradesBtn = document.getElementById('close-upgrades-btn');
    const overlayContainer = document.getElementById('overlay-container');

    // Nastavitve igre
    let playerSpeed = 3;
    let sackCapacity = 5;

    // --- USE global SCREEN_WIDTH/SCREEN_HEIGHT variables ---
    // SCREEN_WIDTH and SCREEN_HEIGHT are now dynamic and updated by handleResize

    // Vse vrste smeti, vključno z novimi
    const TRASH_TYPES = ['casopis', 'detergent', 'fizol', 'kozarec', 'mehcalec', 'pivo', 'pixna', 'pizza', 'plastenka', 'skatla', 'skodelica', 'sprej', 'starbucks', 'steklenica', 'tuna', 'vrecka'];
    
    // Točkovanje za vsako vrsto smeti
    const TRASH_SCORES = {
        'casopis': 1,
        'detergent': 2,
        'fizol': 3,
        'kozarec': 2,
        'mehcalec': 2,
        'pivo': 5,
        'pixna': 5, // Pixna daje tudi jeziček, kar je poseben primer
        'pizza': 1,
        'plastenka': 2,
        'skatla': 1,
        'skodelica': 1,
        'sprej': 3,
        'starbucks': 3,
        'steklenica': 3,
        'tuna': 3,
        'vrecka': 1
    };

    const levels = {
        "visok_park": { mapWidthMultiplier: 1, mapHeightMultiplier: 3, trashCount: 30, sceneryCount: 40 },
        "sirok_park": { mapWidthMultiplier: 3, mapHeightMultiplier: 1, trashCount: 30, sceneryCount: 40 }
    };
    let mapSize = { width: 0, height: 0 };
    let trashItems = [];

    let upgrades = {
        sack: { level: 1, cost: 10, increase: 5 },
        speed: { level: 1, cost: 25, increase: 1 }
    };

    let playerPos = { x: 0, y: 0 };
    let cameraOffset = { x: 0, y: 0 };
    let sackContent = 0;
    let score = 0;
    let tabCount = 0;
    let isPaused = false;
    let lastDirection = 'right'; // Začetna smer

    let touchStartX = 0, touchStartY = 0;
    let currentDirection = { x: 0, y: 0 };
    const DEAD_ZONE = 20;
    let movementInterval = null;

    function gameLoop() {
        if (isPaused) return;
        
        if (currentDirection.x !== 0 || currentDirection.y !== 0) {
            updatePlayerMapPosition(currentDirection.x * playerSpeed, currentDirection.y * playerSpeed);
        }
        
        updateCamera();
        updatePlayerVisuals();
        updatePlayerDirection(); // Posodobitev smeri
        afterMove();
    }

    function updatePlayerMapPosition(dx, dy) {
        let newX = playerPos.x + dx;
        let newY = playerPos.y + dy;
        playerPos.x = Math.max(0, Math.min(newX, mapSize.width - player.clientWidth));
        playerPos.y = Math.max(0, Math.min(newY, mapSize.height - player.clientHeight));
    }
    
    // --- updateCamera uses global SCREEN_WIDTH/SCREEN_HEIGHT ---
    function updateCamera() {
        // Izboljšan izračun kamere, ki igralca centrira in preprečuje, da bi šel izven zaslona
        let targetX = playerPos.x - SCREEN_WIDTH / 2;
        let targetY = playerPos.y - SCREEN_HEIGHT / 2;
        
        // Prilagodimo, da se kamera ne premika izven roba mape
        cameraOffset.x = Math.max(0, Math.min(targetX, mapSize.width - SCREEN_WIDTH));
        cameraOffset.y = Math.max(0, Math.min(targetY, mapSize.height - SCREEN_HEIGHT));
        
        map.style.transform = `translate(-${cameraOffset.x}px, -${cameraOffset.y}px)`;
    }

    function updatePlayerVisuals() {
        player.style.left = playerPos.x + 'px';
        player.style.top = playerPos.y + 'px';
    }

    // Funkcija za posodabljanje smeri igralca
    function updatePlayerDirection() {
        if (currentDirection.x > 0) {
            player.classList.remove('left');
            player.classList.add('right');
            lastDirection = 'right';
        } else if (currentDirection.x < 0) {
            player.classList.remove('right');
            player.classList.add('left');
            lastDirection = 'left';
        } else {
            // Če igralec stoji ali se premika gor/dol, obdrži zadnjo smer
            if (lastDirection === 'left') {
                player.classList.remove('right');
                player.classList.add('left');
            } else {
                player.classList.remove('left');
                player.classList.add('right');
            }
        }
    }

    // --- loadLevel uses dynamic SCREEN_WIDTH/SCREEN_HEIGHT ---
    function loadLevel(levelName) {
        const levelData = levels[levelName];
        
        mapSize.width = SCREEN_WIDTH * levelData.mapWidthMultiplier;
        mapSize.height = SCREEN_HEIGHT * levelData.mapHeightMultiplier;
        map.style.width = mapSize.width + 'px';
        map.style.height = mapSize.height + 'px';
        
        playerPos.x = SCREEN_WIDTH / 2;
        playerPos.y = SCREEN_HEIGHT / 2;
        
        incinerator.style.left = (mapSize.width - 50) + 'px';
        incinerator.style.top = (mapSize.height - 50) + 'px';

        // Spremenimo klic funkcije, da uporablja novi razred "bush1"
        createScenery(levelData.sceneryCount, 'bush1');
        createTrash(levelData.trashCount);
        
        updateUI();
    }
    
    function createScenery(count, className) {
        for (let i = 0; i < count; i++) {
            const sceneryEl = document.createElement('div');
            sceneryEl.className = className;
            const sPos = {
                x: Math.floor(Math.random() * mapSize.width),
                y: Math.floor(Math.random() * mapSize.height)
            };
            sceneryEl.style.left = sPos.x + 'px';
            sceneryEl.style.top = sPos.y + 'px';
            map.appendChild(sceneryEl);
        }
    }

    function createTrash(count) {
        for (let i = 0; i < count; i++) {
            const el = document.createElement('div');
            el.className = 'trash';
            // Izbira med vsemi novimi vrstami smeti
            const type = TRASH_TYPES[Math.floor(Math.random() * TRASH_TYPES.length)];
            el.classList.add(type);
            const pos = { 
                x: Math.floor(Math.random() * mapSize.width), 
                y: Math.floor(Math.random() * mapSize.height) 
            };
            el.style.left = pos.x + 'px';
            el.style.top = pos.y + 'px';
            map.appendChild(el);
            trashItems.push({ element: el, pos: pos, type: type });
        }
    }

    function init() {
        // --- Ensure screen vars are updated before level load ---
        updateScreenSizeVars();
        loadLevel("visok_park");
        updateCamera();
        updatePlayerVisuals();
        // Dodana začetna smer, da je igralec viden ob zagonu
        player.classList.add('right');
    }
    
    // SPREMEMBA NAZAJ NA PRAVILNO LOGIKO
    function afterMove() {
        for (const [index, trashItem] of trashItems.entries()) {
            if (checkCollision(player, trashItem.element)) {
                // POPRAVEK: Dodano preverjanje, če je prostor v vreči
                if (sackContent < sackCapacity) {
                    sackContent++;
                    // Prištejemo točke glede na vrsto smeti
                    score += TRASH_SCORES[trashItem.type];
                    if (trashItem.type === 'pixna') {
                        tabCount++;
                        logMessage("Pobral si piksno in jeziček!");
                    } else {
                        logMessage(`Pobral si ${trashItem.type}!`);
                    }
                    map.removeChild(trashItem.element);
                    trashItems.splice(index, 1);
                    break; // Prekini zanko, ker smo pobrali eno smet
                } else {
                    logMessage("Vreča je polna!");
                    break; // Prekini zanko, ker ne moremo pobrati smeti
                }
            }
        }

        if (checkCollision(player, incinerator)) {
            if (sackContent > 0) {
                // Točke se prištejejo že ob pobiranju, tako da jih tukaj ne dodajamo
                logMessage(`Izpraznil si vrečo!`);
                sackContent = 0;
            }
        }
        updateUI();
    }
    
    function handleTouchStart(e) { if (isPaused) return; touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; if (movementInterval) clearInterval(movementInterval); movementInterval = setInterval(gameLoop, 16); }
    function handleTouchMove(e) { if (isPaused || !e.touches.length) return; e.preventDefault(); let cX = e.touches[0].clientX, cY = e.touches[0].clientY; let dX = cX - touchStartX, dY = cY - touchStartY; if (Math.sqrt(dX * dX + dY * dY) < DEAD_ZONE) { currentDirection = { x: 0, y: 0 }; return; } if (Math.abs(dX) > Math.abs(dY)) { currentDirection = { x: Math.sign(dX), y: 0 }; } else { currentDirection = { x: 0, y: Math.sign(dY) }; } }
    function handleTouchEnd(e) { clearInterval(movementInterval); movementInterval = null; currentDirection = { x: 0, y: 0 }; }
    
    gameContainer.addEventListener('touchstart', handleTouchStart);
    gameContainer.addEventListener('touchmove', handleTouchMove);
    gameContainer.addEventListener('touchend', handleTouchEnd);
    
    function updateUI() { sackStatusEl.textContent = `${sackContent}/${sackCapacity}`; scoreEl.textContent = score; tabCountEl.textContent = tabCount; costSackEl.textContent = upgrades.sack.cost; costSpeedEl.textContent = upgrades.speed.cost; }
    function logMessage(message) { messageLogEl.textContent = message; setTimeout(() => { messageLogEl.textContent = ''; }, 2000); }
    
    function checkCollision(elem1, elem2) {
        if (!elem1 || !elem2) return false;
        const rect1 = elem1.getBoundingClientRect();
        const rect2 = elem2.getBoundingClientRect();
        return !(rect1.right < rect2.left || rect1.left > rect2.right || rect1.bottom < rect2.top || rect1.top > rect2.bottom);
    }
    
    function buyUpgrade(type) {
        let upgrade = upgrades[type];
        if (score >= upgrade.cost) {
            score -= upgrade.cost;
            upgrade.level++;

            if (type === 'sack') {
                sackCapacity += upgrade.increase;
                upgrade.cost = Math.floor(upgrade.cost * 1.8);
                logMessage("Kapaciteta vreče povečana!");
            } else if (type === 'speed') {
                playerSpeed += upgrade.increase;
                upgrade.cost = Math.floor(upgrade.cost * 2);
                logMessage("Hitrost povečana!");
            }
        } else {
            logMessage("Nimaš dovolj točk!");
        }
        updateUI();
    }
    
    upgradeSackBtn.addEventListener('click', () => buyUpgrade('sack'));
    upgradeSpeedBtn.addEventListener('click', () => buyUpgrade('speed'));
    
    function openUpgradesMenu() { isPaused = true; overlayContainer.classList.add('visible'); }
    function closeUpgradesMenu() { overlayContainer.classList.remove('visible'); isPaused = false; handleTouchEnd(); }
    
    openUpgradesBtn.addEventListener('click', openUpgradesMenu);
    closeUpgradesBtn.addEventListener('click', closeUpgradesMenu);

    // --- Listen for resize inside the game as well to keep map/camera in sync ---
    window.addEventListener('resize', () => {
        updateScreenSizeVars();
        updateCamera();
        updatePlayerVisuals();
    });
    window.addEventListener('orientationchange', () => {
        updateScreenSizeVars();
        updateCamera();
        updatePlayerVisuals();
    });

    init();
});