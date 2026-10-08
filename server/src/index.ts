import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";

const app = express();

app.use(cors());
app.use(express.json());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

type Player = {
  id: string;
  name: string;
  balance: number;
  ready: boolean;
};

type Lobby = {
  code: string;
  hostId: string;
  startingBalance: number;
  mines: number;
  players: Player[];
  started: boolean;
};

const lobbies = new Map<string, Lobby>();

function generateCode(): string {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  do {
    code = "";

    for (let i = 0; i < 6; i++) {
      code += characters[
        Math.floor(Math.random() * characters.length)
      ];
    }
  } while (lobbies.has(code));

  return code;
}

function getLobby(code: string) {
  return lobbies.get(code.toUpperCase());
}

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    game: "mines"
  });
});

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on(
    "create_lobby",
    (
      data: {
        playerName: string;
        startingBalance: number;
        mines: number;
      },
      callback
    ) => {
      const playerName = data.playerName?.trim();

      if (!playerName) {
        callback({
          success: false,
          error: "Please enter your name."
        });
        return;
      }

      if (
        !Number.isInteger(data.startingBalance) ||
        data.startingBalance < 1
      ) {
        callback({
          success: false,
          error: "Invalid starting balance."
        });
        return;
      }

      if (
        !Number.isInteger(data.mines) ||
        data.mines < 1 ||
        data.mines > 24
      ) {
        callback({
          success: false,
          error: "Mines must be between 1 and 24."
        });
        return;
      }

      const code = generateCode();

      const lobby: Lobby = {
        code,
        hostId: socket.id,
        startingBalance: data.startingBalance,
        mines: data.mines,
        started: false,
        players: [
          {
            id: socket.id,
            name: playerName,
            balance: data.startingBalance,
            ready: true
          }
        ]
      };

      lobbies.set(code, lobby);

      socket.join(code);

      callback({
        success: true,
        lobby: {
          code,
          hostId: lobby.hostId,
          startingBalance: lobby.startingBalance,
          mines: lobby.mines,
          players: lobby.players
        }
      });

      console.log(`Lobby created: ${code}`);
    }
  );

  socket.on(
  "join_lobby",
  (
    data: {
      playerName: string;
      code: string;
    },
    callback
  ) => {
    const playerName = data.playerName?.trim();
    const code = data.code?.trim().toUpperCase();

    if (!playerName) {
      callback({
        success: false,
        error: "Please enter your name."
      });
      return;
    }

    if (!code) {
      callback({
        success: false,
        error: "Please enter a game code."
      });
      return;
    }

    const lobby = getLobby(code);

    if (!lobby) {
      callback({
        success: false,
        error: "Match not found."
      });
      return;
    }

    if (lobby.started) {
      callback({
        success: false,
        error: "This match has already started."
      });
      return;
    }

    if (lobby.players.length >= 5) {
      callback({
        success: false,
        error: "This match is full."
      });
      return;
    }

    const duplicateName = lobby.players.some(
      (player) =>
        player.name.toLowerCase() === playerName.toLowerCase()
    );

    if (duplicateName) {
      callback({
        success: false,
        error: "That name is already being used."
      });
      return;
    }

    const player: Player = {
      id: socket.id,
      name: playerName,
      balance: lobby.startingBalance,
      ready: true
    };

    lobby.players.push(player);

    socket.join(code);

    const lobbyData = {
      code: lobby.code,
      hostId: lobby.hostId,
      startingBalance: lobby.startingBalance,
      mines: lobby.mines,
      players: lobby.players
    };

    callback({
      success: true,
      lobby: lobbyData
    });

    io.to(code).emit("lobby_updated", lobbyData);

    console.log(
      `${playerName} joined lobby ${code}`
    );
  }
);

  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);

    for (const [code, lobby] of lobbies.entries()) {
      const playerIndex = lobby.players.findIndex(
        (player) => player.id === socket.id
      );

      if (playerIndex === -1) {
        continue;
      }

      lobby.players.splice(playerIndex, 1);

      if (lobby.players.length === 0) {
        lobbies.delete(code);
        console.log(`Lobby deleted: ${code}`);
        continue;
      }

      if (lobby.hostId === socket.id) {
        const newHost =
          lobby.players[
            Math.floor(Math.random() * lobby.players.length)
          ];

        lobby.hostId = newHost.id;
      }

      io.to(code).emit("lobby_updated", {
        code: lobby.code,
        hostId: lobby.hostId,
        startingBalance: lobby.startingBalance,
        mines: lobby.mines,
        players: lobby.players
      });
    }
  });
});

const PORT = Number(process.env.PORT) || 3000;

httpServer.listen(PORT, () => {
  console.log(`Mines server running on port ${PORT}`);
});