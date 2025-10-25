import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [toast, setToast] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState("");

  const ensureName = () => {
    if (!username.trim()) {
      setErr("Please enter your name");
      return false;
    }
    setErr("");
    return true;
  };

  const handleCreate = () => {
    if (!ensureName()) return;
    setLoading(true);
    if (!socket.connected) socket.connect();

    socket.emit("createRoom", { username });

    socket.once("roomCreated", ({ roomId }) => {
      setLoading(false);
      setCreatedRoomId(roomId);
      setShowModal(true);
    });

    socket.once("errorMsg", (msg) => {
      setLoading(false);
      setErr(msg);
    });
  };

  const handleJoin = () => {
    if (!ensureName()) return;
    if (!joinRoomId.trim()) return setErr("Enter room ID");

    setErr("");
    setLoading(true);
    if (!socket.connected) socket.connect();

    const roomId = joinRoomId.trim();

    socket.emit("joinRoom", { roomId, username });

    socket.once("errorMsg", (msg) => {
      setLoading(false);
      setToast(msg);
      setTimeout(() => setToast(""), 2000);
    });

    socket.once("roomUpdated", () => {
      setLoading(false);
      navigate(`/room/${roomId}`, { state: { username } });
    });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(createdRoomId);
    setToast("Room ID copied!");
    setTimeout(() => setToast(""), 2000);
  };

  const handleStart = () => {
    setShowModal(false);
    navigate(`/room/${createdRoomId}`, { state: { username } });
  };

  return (
    <div className="home-container">
      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}

      <h1 className="title">🎨 Scribble Game</h1>

      <div className="form-group">
        <label>Your Name</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g. Azeem"
        />
      </div>

      <div className="button-group">
        <button onClick={handleCreate} disabled={loading} className="btn primary">
          Create Room
        </button>

        <div className="join-section">
          <input
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value)}
            placeholder="Enter room ID"
          />
          <button onClick={handleJoin} disabled={loading} className="btn secondary">
            Join Room
          </button>
        </div>
      </div>

      {err && <p className="error">{err}</p>}
      {loading && <p className="loading">Connecting...</p>}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>🎉 Room Created!</h2>
            <p className="room-id-label">Share this Room ID with your friends:</p>
            <div className="room-id-box">
              <span>{createdRoomId}</span>
              <button onClick={handleCopy} className="copy-btn">
                Copy
              </button>
            </div>
            <button onClick={handleStart} className="btn primary start-btn">
              Go to Room
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
