// ============================================
// Arkanoid — Multiplayer Client Manager
// Handles WebSocket connection, lobby, attacks
// ============================================

const MP = {
    ws: null,
    active: false,
    roomCode: null,
    playerIndex: -1,
    opponentState: null,
    connected: false,
    countdown: null,
    gameGo: false,
    attackQueue: [],
    comboCounter: 0,
    statusMessage: "",
    resultMessage: "",

    // --- Connect to server ---
    connect(url) {
        return new Promise((resolve, reject) => {
            try {
                MP.ws = new WebSocket(url);
            } catch (e) {
                reject(e);
                return;
            }

            MP.ws.onopen = () => {
                MP.connected = true;
                resolve();
            };

            MP.ws.onerror = () => {
                MP.connected = false;
                reject(new Error("Connection failed"));
            };

            MP.ws.onclose = () => {
                MP.connected = false;
                if (MP.active && !MP.resultMessage) {
                    MP.statusMessage = "Connection lost";
                }
            };

            MP.ws.onmessage = (e) => {
                let msg;
                try { msg = JSON.parse(e.data); } catch { return; }
                MP.handleMessage(msg);
            };
        });
    },

    // --- Send message ---
    send(data) {
        if (MP.ws && MP.ws.readyState === 1) {
            MP.ws.send(JSON.stringify(data));
        }
    },

    // --- Handle incoming messages ---
    handleMessage(msg) {
        switch (msg.type) {
            case "room_created":
                MP.roomCode = msg.roomCode;
                MP.playerIndex = msg.playerIndex;
                MP.statusMessage = `Room ${msg.roomCode} — waiting for opponent...`;
                MP.updateLobbyUI();
                break;

            case "room_joined":
                MP.roomCode = msg.roomCode;
                MP.playerIndex = msg.playerIndex;
                MP.statusMessage = "Joined! Waiting to start...";
                MP.updateLobbyUI();
                break;

            case "room_ready":
                MP.statusMessage = "Opponent found! Click READY";
                MP.updateLobbyUI();
                break;

            case "countdown":
                MP.countdown = msg.value;
                MP.statusMessage = `Starting in ${msg.value}...`;
                break;

            case "go":
                MP.countdown = null;
                MP.gameGo = true;
                MP.active = true;
                MP.hideLobby();
                break;

            case "opponent_state":
                MP.opponentState = {
                    score: msg.score,
                    lives: msg.lives,
                    bricksLeft: msg.bricksLeft,
                    level: msg.level,
                    totalBricks: msg.totalBricks
                };
                break;

            case "incoming_attack":
                MP.attackQueue.push(msg.attackType);
                break;

            case "opponent_lost":
                MP.resultMessage = "🏆 YOU WIN! Opponent lost all lives!";
                break;

            case "opponent_won":
                MP.resultMessage = "Opponent cleared all levels first!";
                break;

            case "opponent_disconnected":
                if (!MP.resultMessage) {
                    MP.resultMessage = "🏆 YOU WIN! Opponent disconnected.";
                }
                break;

            case "error":
                MP.statusMessage = `Error: ${msg.message}`;
                MP.updateLobbyUI();
                break;
        }
    },

    // --- Create room ---
    createRoom() {
        MP.send({ type: "create_room" });
    },

    // --- Join room ---
    joinRoom(code) {
        MP.send({ type: "join_room", roomCode: code.toUpperCase() });
    },

    // --- Signal ready ---
    setReady() {
        MP.send({ type: "player_ready" });
        MP.statusMessage = "Ready! Waiting for opponent...";
        MP.updateLobbyUI();
    },

    // --- Send game state (called from game loop) ---
    sendState(score, lives, bricksLeft, level, totalBricks) {
        if (!MP.active) return;
        MP.send({
            type: "game_state",
            score, lives, bricksLeft, level, totalBricks
        });
    },

    // --- Send attack to opponent ---
    sendAttack(attackType) {
        if (!MP.active) return;
        MP.send({ type: "attack", attackType });
    },

    // --- Notify server of loss ---
    sendLost() {
        if (!MP.active) return;
        MP.send({ type: "player_lost" });
    },

    // --- Notify server of win ---
    sendWon() {
        if (!MP.active) return;
        MP.send({ type: "player_won" });
    },

    // --- Track combo for attack triggers ---
    onBrickDestroyed() {
        if (!MP.active) return;
        MP.comboCounter++;
        // Every 8 consecutive bricks → send an attack
        if (MP.comboCounter >= 8) {
            MP.comboCounter = 0;
            const attacks = ["speed", "shrink", "dark"];
            const attack = attacks[Math.floor(Math.random() * attacks.length)];
            MP.sendAttack(attack);
            return attack; // So game.js can show "ATTACK SENT!"
        }
        return null;
    },

    // --- Reset combo on life lost ---
    resetCombo() {
        MP.comboCounter = 0;
    },

    // --- Process incoming attacks (called from game loop) ---
    popAttack() {
        if (MP.attackQueue.length === 0) return null;
        return MP.attackQueue.shift();
    },

    // --- Lobby UI ---
    showLobby() {
        document.getElementById("mpLobby").style.display = "flex";
    },

    hideLobby() {
        document.getElementById("mpLobby").style.display = "none";
    },

    updateLobbyUI() {
        const status = document.getElementById("mpStatus");
        const readyBtn = document.getElementById("mpReadyBtn");
        const codeDisplay = document.getElementById("mpCodeDisplay");

        if (status) status.textContent = MP.statusMessage;
        if (codeDisplay && MP.roomCode) {
            codeDisplay.textContent = MP.roomCode;
            codeDisplay.style.display = "block";
        }
        if (readyBtn && MP.statusMessage.includes("Click READY")) {
            readyBtn.style.display = "block";
        }
    },

    // --- Disconnect ---
    disconnect() {
        if (MP.ws) {
            MP.ws.close();
            MP.ws = null;
        }
        MP.active = false;
        MP.connected = false;
        MP.roomCode = null;
        MP.playerIndex = -1;
        MP.opponentState = null;
        MP.countdown = null;
        MP.gameGo = false;
        MP.attackQueue.length = 0;
        MP.comboCounter = 0;
        MP.statusMessage = "";
        MP.resultMessage = "";
    }
};
