import React, { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { socket } from "../socket";
import DrawingCanvas from "../Components/DrawingCanvas";
import "./Room.css";

export default function Room() {
  const { roomId } = useParams();
  const location = useLocation();
  const username = location.state?.username || "Unknown";

  const [roomInfo, setRoomInfo] = useState({ users: [], drawer: null, scores: {} });
  const [word, setWord] = useState("");
  const [timer, setTimer] = useState(0);
  const [guess, setGuess] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    socket.on("roomUpdated", (info) => setRoomInfo(info));
    socket.on("yourWord", (w) => {
      setWord(w);
      setToast(`🎨 Your word to draw: ${w}`);
      setTimeout(() => setToast(""), 3000); // hide after 3 seconds
    });
    socket.on("roundStarted", ({ drawer, timeLeft }) => {
      setTimer(timeLeft);
      setRoomInfo(prev => ({ ...prev, drawer }));
    });
    socket.on("timer", (t) => setTimer(t));
    socket.on("drawingTimeOver", () => { setWord(""); setTimer(0); });
    socket.on("correctGuess", ({ username: winner, word: correctWord, scores }) => {
      setToast(`${winner} guessed correctly! Word was: ${correctWord}`);
      setTimeout(() => setToast(""), 3000);
      setRoomInfo(prev => ({ ...prev, scores }));
      setWord("");
      setTimer(0);
    });

    socket.emit("getRoomInfo", { roomId });

    return () => {
      socket.off("roomUpdated");
      socket.off("yourWord");
      socket.off("roundStarted");
      socket.off("timer");
      socket.off("drawingTimeOver");
      socket.off("correctGuess");
    };
  }, [roomId]);

  const handleClickToPlay = () => socket.emit("selectDrawer", { roomId });
  const handleGuess = () => {
    if (!guess.trim()) return;
    socket.emit("guessWord", { roomId, username, guess });
    setGuess("");
  };

  return (
    <div className="room-container">
      {toast && <div className="toast">{toast}</div>}

      <h2 className="room-title">Room: {roomId}</h2>
      <p>You: <b>{username}</b></p>
      <p className="timer">Time Left: {timer}s</p>

      <div className="players-section">
        <h4>Players</h4>
        <ul className="players-list">
          {(roomInfo.users || []).map((u, i) => (
            <li key={i} className={roomInfo.drawer === u ? "drawer" : ""}>
              {u} {roomInfo.drawer === u ? "🎨" : ""} — Score: {roomInfo.scores?.[u] || 0}
            </li>
          ))}
        </ul>
        <button
          onClick={handleClickToPlay}
          disabled={timer > 0}
          className="btn primary play-btn"
        >
          Click to Play
        </button>
      </div>

      <DrawingCanvas
        roomId={roomId}
        username={username}
        isDrawer={roomInfo.drawer === username}
      />

      {roomInfo.drawer === username && word && (
        <div className="word-display">
          Your word to draw: <span>{word}</span>
        </div>
      )}

      {roomInfo.drawer && roomInfo.drawer !== username && timer > 0 && (
        <div className="guess-section">
          <input
            type="text"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="Enter your guess"
          />
          <button onClick={handleGuess} className="btn secondary">Guess</button>
        </div>
      )}
    </div>
  );
}
