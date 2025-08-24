document.addEventListener('DOMContentLoaded', () => {
    // Referenčni elementi iz HTML
    const player = document.getElementById('player');
    const incinerator = document.getElementById('incinerator');
    const gameContainer = document.getElementById('game-container');
    const sackStatusEl = document.getElementById('sack-status');
    const scoreEl = document.getElementById('score');
    const messageLogEl = document.getElementById('message-log');
    const upgradeSackBtn = document.getElementById('upgrade-sack');
    const upgradeSpeedBtn = document.getElementById('upgrade-speed');
    const costSackEl = document.getElementById('cost-sack');
    const costSpeedEl = document.getElementById('cost-speed');
    const openUpgradesBtn = document.getElementById('open-upgrades-btn');
    const closeUpgradesBtn = document.getElementById('close-upgrades-btn');
    const overlayContainer = document.getElementById('overlay-container');

    // Nastavitve igre
    let playerSpeed = 10;
    let sackCapacity = 5;
    const GAME_WIDTH = gameContainer.clientWidth;
    const GAME_HEIGHT = gameContainer.clientHeight;
    const TRASH_TYPES = ['papir', 'plastika', 'piksna'];
    let trashItems = [];

    // Stanje nadgradenj
    let upgrades = {
        sack: { level: 1, cost: 10, increase: 5 },
        speed: { level: 1, cost: 25, increase: 2 }
    };

    // Stanje igre
    let playerPos = { x: 50, y: 50 };
    let sackContent = 0;
    let score = 0;
    let tabCount = 0;
    let isPaused = false;

    // --- LOGIKA ZA UPRAVLJANJE NA DOTIK ---
    let touchStartX = 0;
    let touchStartY = 0;
    let currentDirection = { x: 0, y: 0 };
    const DEAD_ZONE = 20;
    let movementInterval = null;

    function handleTouchStart(e) {
        if (isPaused) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        
        // Začnemo z neprekinjenim premikanjem
        if (movementInterval) clearInterval(movementInterval);
        movementInterval = setInterval(gameLoop, 16); // ~60 FPS
    }

    function handleTouchMove(e) {
        if (isPaused || !e.touches.length) return;
        e.preventDefault(); // Prepreči scrollanje strani
        
        let currentX = e.touches[0].clientX;
        let currentY = e.touches[0].clientY;
        
        let diffX = currentX - touchStartX;
        let diffY = currentY - touchStartY;

        // Preverimo mrtvo cono
        if (Math.sqrt(diffX*diffX + diffY*diffY) < DEAD_ZONE) {
            currentDirection = { x: 0, y: 0 };
            return;
        }

        // Določimo smer
        if (Math.abs(diffX) > Math.abs(diffY)) {
            // Horizontalno gibanje
            currentDirection = { x: Math.sign(diffX), y: 0 };
        } else {
            // Vertikalno gibanje
            currentDirection = { x: 0, y: Math.sign(diffY) };
        }
    }

    function handleTouchEnd(e) {
        // Ustavimo premikanje
        clearInterval(movementInterval);
        movementInterval = null;
        currentDirection = { x: 0, y: 0 };
    }

    gameContainer.addEventListener('touchstart', handleTouchStart);
    gameContainer.addEventListener('touchmove', handleTouchMove);
    gameContainer.addEventListener('touchend', handleTouchEnd);
    // ------------------------------------

    function gameLoop() {
        if (isPaused) return;
        
        // Premakni igralca, če je smer določena
        if (currentDirection.x !== 0 || currentDirection.y !== 0) {
            movePlayer(currentDirection.x * playerSpeed, currentDirection.y * playerSpeed);
        }
    }

    function movePlayer(dx, dy) {
        let newX = playerPos.x + dx;
        let newY = playerPos.y + dy;
        if (newX >= 0 && newX <= GAME_WIDTH - player.clientWidth) playerPos.x = newX;
        if (newY >= 0 && newY <= GAME_HEIGHT - player.clientHeight) playerPos.y = newY;
        
        updatePlayerPosition();
        afterMove();
    }
    
    // --- OSTALE FUNKCIJE ---
    function updatePlayerPosition() { player.style.left = playerPos.x + 'px'; player.style.top = playerPos.y + 'px'; }
    function updateUI() {
        const tabCountEl = document.getElementById('tab-count');
        sackStatusEl.textContent = `${sackContent}/${sackCapacity}`;
        scoreEl.textContent = score;
        tabCountEl.textContent = tabCount;
        costSackEl.textContent = upgrades.sack.cost;
        costSpeedEl.textContent = upgrades.speed.cost;
    }
    function logMessage(message) {
        messageLogEl.textContent = message;
        setTimeout(() => { messageLogEl.textContent = ''; }, 2000);
    }
    function checkCollision(elem1, elem2) {
        const rect1 = elem1.getBoundingClientRect(); const rect2 = elem2.getBoundingClientRect();
        return !(rect1.right < rect2.left || rect1.left > rect2.right || rect1.bottom < rect2.top || rect1.top > rect2.bottom);
    }

    function afterMove() {
        trashItems.forEach((trashItem, index) => {
            if (checkCollision(player, trashItem.element)) {
                if (sackContent < sackCapacity) {
                    sackContent++;
                    if (trashItem.type === 'piksna') {
                        tabCount++; logMessage("Pobral si piksno in jeziček!");
                    } else { logMessage(`Pobral si ${trashItem.type}!`); }
                    gameContainer.removeChild(trashItem.element);
                    trashItems.splice(index, 1);
                } else { logMessage("Vreča je polna! Pojdi do sežig."); }
            }
        });
        if (checkCollision(player, incinerator)) {
            if (sackContent > 0) {
                score += sackContent; logMessage(`Izpraznil si vrečo za ${sackContent} točk!`); sackContent = 0;
            }
        }
        updateUI();
    }

    function buyUpgrade(type) {
        let upgrade, currency, cost;
        if (type === 'sack') { upgrade = upgrades.sack; } 
        else if (type === 'speed') { upgrade = upgrades.speed; }

        if (score >= upgrade.cost) {
            score -= upgrade.cost;
            if (type === 'sack') sackCapacity += upgrade.increase;
            if (type === 'speed') playerSpeed += upgrade.increase;
            upgrade.level++;
            upgrade.cost = Math.floor(upgrade.cost * (type === 'sack' ? 1.8 : 2));
            logMessage(`${type === 'sack' ? 'Kapaciteta' : 'Hitrost'} povečana!`);
        } else { logMessage("Nimaš dovolj točk!"); }
        updateUI();
    }
    upgradeSackBtn.addEventListener('click', () => buyUpgrade('sack'));
    upgradeSpeedBtn.addEventListener('click', () => buyUpgrade('speed'));

    // --- LOGIKA ZA OVERLAY MENI ---
    function openUpgradesMenu() {
        isPaused = true;
        overlayContainer.classList.add('visible');
    }
    function closeUpgradesMenu() {
        overlayContainer.classList.remove('visible');
        isPaused = false;
        // Če je igralec držal prst med pavzo, preprečimo takojšnje nadaljevanje gibanja
        handleTouchEnd(); 
    }
    openUpgradesBtn.addEventListener('click', openUpgradesMenu);
    closeUpgradesBtn.addEventListener('click', closeUpgradesMenu);

    // --- ZAGON IGRE ---
    function createTrash(count) {
        for (let i = 0; i < count; i++) {
            const trashEl = document.createElement('div');
            trashEl.className = 'trash';
            const randomType = TRASH_TYPES[Math.floor(Math.random() * TRASH_TYPES.length)];
            trashEl.classList.add(randomType);
            const trashPos = { x: Math.floor(Math.random() * (GAME_WIDTH - 15)), y: Math.floor(Math.random() * (GAME_HEIGHT - 15)) };
            trashEl.style.left = trashPos.x + 'px'; trashEl.style.top = trashPos.y + 'px';
            gameContainer.appendChild(trashEl);
            trashItems.push({ element: trashEl, pos: trashPos, type: randomType });
        }
    }
    function init() {
        updatePlayerPosition();
        createTrash(10);
        updateUI();
    }
    init();
});