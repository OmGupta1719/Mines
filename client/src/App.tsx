import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  autoConnect: true
});

type Screen = "home" | "create" | "join" | "lobby";

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
};

function App() {
  const [screen, setScreen] = useState<Screen>("home");

  const [playerName, setPlayerName] = useState("");
  const [startingBalance, setStartingBalance] = useState(1000);
  const [mines, setMines] = useState(5);
  const [gameCode, setGameCode] = useState("");

  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleLobbyUpdate = (updatedLobby: Lobby) => {
      setLobby(updatedLobby);
      setScreen("lobby");
    };

    socket.on("lobby_updated", handleLobbyUpdate);

    return () => {
      socket.off("lobby_updated", handleLobbyUpdate);
    };
  }, []);

  function createMatch() {
    setError("");

    socket.emit(
      "create_lobby",
      {
        playerName,
        startingBalance,
        mines
      },
      (response: {
        success: boolean;
        error?: string;
        lobby?: Lobby;
      }) => {
        if (!response.success || !response.lobby) {
          setError(response.error || "Could not create match.");
          return;
        }

        setLobby(response.lobby);
        setScreen("lobby");
      }
    );
  }

  function joinMatch() {
    setError("");

    socket.emit(
      "join_lobby",
      {
        playerName,
        code: gameCode
      },
      (response: {
        success: boolean;
        error?: string;
        lobby?: Lobby;
      }) => {
        if (!response.success || !response.lobby) {
          setError(response.error || "Could not join match.");
          return;
        }

        setLobby(response.lobby);
        setScreen("lobby");
      }
    );
  }

  if (screen === "lobby" && lobby) {
    return (
      <main className="app">
        <section className="card lobby-card">
          <div className="logo">
            <span>◆</span> MINES
          </div>

          <p className="lobby-label">GAME CODE</p>

          <div className="game-code">
            {lobby.code}
          </div>

          <p className="subtitle">
            Share this code with your friends.
          </p>

          <div className="lobby-settings">
            <div>
              <span>Starting Balance</span>
              <strong>₹ {lobby.startingBalance}</strong>
            </div>

            <div>
              <span>Mines</span>
              <strong>{lobby.mines}</strong>
            </div>
          </div>

          <div className="players-section">
            <div className="section-title">
              Players ({lobby.players.length}/5)
            </div>

            {lobby.players.map((player) => (
              <div className="player-row" key={player.id}>
                <div className="player-avatar">
                  {player.name.charAt(0).toUpperCase()}
                </div>

                <div className="player-name">
                  {player.name}

                  {player.id === lobby.hostId && (
                    <span className="host-badge">
                      HOST
                    </span>
                  )}
                </div>

                <div className="ready">
                  Ready
                </div>
              </div>
            ))}
          </div>

          <div className="waiting">
            Waiting for players...
          </div>
        </section>
      </main>
    );
  }

  if (screen === "create") {
    return (
      <main className="app">
        <section className="card">
          <button
            className="back-button"
            onClick={() => {
              setError("");
              setScreen("home");
            }}
          >
            ← Back
          </button>

          <div className="logo">
            <span>◆</span> MINES
          </div>

          <h1>Create Match</h1>

          <p className="subtitle">
            Create a private game for your friends.
          </p>

          <div className="form-group">
            <label>Your Name</label>

            <input
              type="text"
              placeholder="Enter your name"
              maxLength={20}
              value={playerName}
              onChange={(event) =>
                setPlayerName(event.target.value)
              }
            />
          </div>

          <div className="form-group">
            <label>Starting Balance</label>

            <input
              type="number"
              min="1"
              value={startingBalance}
              onChange={(event) =>
                setStartingBalance(Number(event.target.value))
              }
            />
          </div>

          <div className="form-group">
            <label>Number of Mines</label>

            <select
              value={mines}
              onChange={(event) =>
                setMines(Number(event.target.value))
              }
            >
              <option value="1">1 Mine</option>
              <option value="3">3 Mines</option>
              <option value="5">5 Mines</option>
              <option value="7">7 Mines</option>
              <option value="10">10 Mines</option>
              <option value="15">15 Mines</option>
              <option value="20">20 Mines</option>
              <option value="24">24 Mines</option>
            </select>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            className="primary-button"
            onClick={createMatch}
          >
            Create Match
          </button>
        </section>
      </main>
    );
  }

  if (screen === "join") {
    return (
      <main className="app">
        <section className="card">
          <button
            className="back-button"
            onClick={() => {
              setError("");
              setScreen("home");
            }}
          >
            ← Back
          </button>

          <div className="logo">
            <span>◆</span> MINES
          </div>

          <h1>Join Match</h1>

          <p className="subtitle">
            Enter the game code shared by your friend.
          </p>

          <div className="form-group">
            <label>Your Name</label>

            <input
              type="text"
              placeholder="Enter your name"
              maxLength={20}
              value={playerName}
              onChange={(event) =>
                setPlayerName(event.target.value)
              }
            />
          </div>

          <div className="form-group">
            <label>Game Code</label>

            <input
              type="text"
              placeholder="ABCD12"
              maxLength={6}
              className="code-input"
              value={gameCode}
              onChange={(event) =>
                setGameCode(
                  event.target.value.toUpperCase()
                )
              }
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            className="primary-button"
            onClick={joinMatch}
          >
            Join Match
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="app">
      <section className="home-card">
        <div className="logo large">
          <span>◆</span> MINES
        </div>

        <p className="tagline">
          Multiplayer Mines. Play with your friends.
        </p>

        <div className="home-actions">
          <button
            className="primary-button"
            onClick={() => {
              setError("");
              setScreen("create");
            }}
          >
            Create Match
          </button>

          <button
            className="secondary-button"
            onClick={() => {
              setError("");
              setScreen("join");
            }}
          >
            Join Match
          </button>
        </div>

        <div className="game-info">
          <div>
            <strong>2–5</strong>
            <span>Players</span>
          </div>

          <div>
            <strong>5×5</strong>
            <span>Board</span>
          </div>

          <div>
            <strong>∞</strong>
            <span>Rounds</span>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;