// ============================================
// Arkanoid Multiplayer Server
// WebSocket relay + room management
// ============================================

const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3000;
const wss = new WebSocketServer({ port: PORT });

// --- Room Management ---
const rooms = new Map();

function generateCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

function createRoom(ws) {
    let code;
    do { code = generateCode(); } while (rooms.has(code));

    const room = {
        code,
        players: [ws],
        state: [{}, {}],
        started: false
    };
    rooms.set(code, room);
    ws.room = room;
    ws.playerIndex = 0;

    send(ws, { type: "room_created", roomCode: code, playerIndex: 0 });
    console.log(`Room ${code} created`);
}

function joinRoom(ws, code) {
    code = code.toUpperCase();
    const room = rooms.get(code);

    if (!room) {
        send(ws, { type: "error", message: "Room not found" });
        return;
    }
    if (room.players.length >= 2) {
        send(ws, { type: "error", message: "Room is full" });
        return;
    }

    room.players.push(ws);
    ws.room = room;
    ws.playerIndex = 1;

    send(ws, { type: "room_joined", roomCode: code, playerIndex: 1 });

    // Notify both players the room is full and ready
    for (const player of room.players) {
        send(player, {
            type: "room_ready",
            playerIndex: player.playerIndex,
            playerCount: 2
        });
    }
    console.log(`Room ${code} — player 2 joined, ready!`);
}

function startGame(room) {
    room.started = true;
    let countdown = 3;

    const tick = () => {
        for (const player of room.players) {
            send(player, { type: "countdown", value: countdown });
        }
        countdown--;
        if (countdown >= 0) {
            setTimeout(tick, 1000);
        } else {
            for (const player of room.players) {
                send(player, { type: "go" });
            }
        }
    };
    tick();
}

// --- Message Handling ---
function handleMessage(ws, data) {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }

    switch (msg.type) {
        case "create_room":
            createRoom(ws);
            break;

        case "join_room":
            joinRoom(ws, msg.roomCode);
            break;

        case "player_ready":
            if (ws.room) {
                ws.ready = true;
                // Check if both ready
                if (ws.room.players.length === 2 && ws.room.players.every(p => p.ready)) {
                    startGame(ws.room);
                }
            }
            break;

        case "game_state":
            // Relay this player's state to opponent
            if (ws.room) {
                const opponent = ws.room.players.find(p => p !== ws);
                if (opponent && opponent.readyState === 1) {
                    send(opponent, {
                        type: "opponent_state",
                        score: msg.score,
                        lives: msg.lives,
                        bricksLeft: msg.bricksLeft,
                        level: msg.level,
                        totalBricks: msg.totalBricks
                    });
                }
            }
            break;

        case "attack":
            if (ws.room) {
                const opponent = ws.room.players.find(p => p !== ws);
                if (opponent && opponent.readyState === 1) {
                    send(opponent, {
                        type: "incoming_attack",
                        attackType: msg.attackType
                    });
                }
            }
            break;

        case "player_lost":
            if (ws.room) {
                const opponent = ws.room.players.find(p => p !== ws);
                if (opponent && opponent.readyState === 1) {
                    send(opponent, { type: "opponent_lost" });
                }
            }
            break;

        case "player_won":
            if (ws.room) {
                const opponent = ws.room.players.find(p => p !== ws);
                if (opponent && opponent.readyState === 1) {
                    send(opponent, { type: "opponent_won" });
                }
            }
            break;
    }
}

// --- Disconnect ---
function handleDisconnect(ws) {
    if (!ws.room) return;
    const room = ws.room;
    const opponent = room.players.find(p => p !== ws);

    if (opponent && opponent.readyState === 1) {
        send(opponent, { type: "opponent_disconnected" });
    }

    // Clean up room
    rooms.delete(room.code);
    console.log(`Room ${room.code} closed`);
}

// --- Helpers ---
function send(ws, data) {
    if (ws.readyState === 1) {
        ws.send(JSON.stringify(data));
    }
}

// --- Connection Handler ---
wss.on("connection", (ws) => {
    console.log("Player connected");

    ws.on("message", (data) => handleMessage(ws, data.toString()));
    ws.on("close", () => handleDisconnect(ws));
    ws.on("error", () => handleDisconnect(ws));
});

console.log(`🎮 Arkanoid multiplayer server running on port ${PORT}`);
