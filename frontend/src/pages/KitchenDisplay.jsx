import { useState, useEffect } from "react";
import { Clock, CheckCircle, Flame } from "lucide-react";
import { socket } from "../socket";

export default function KitchenDisplay() {
  const [tickets, setTickets] = useState([]);
  const [stationFilter, setStationFilter] = useState("All");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    socket.on("state_sync", (data) => {
      setTickets(data.kitchenTickets || []);
    });
    socket.emit("get_state");
    return () => socket.off("state_sync");
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (startedAt) => {
    const totalSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
    const mins = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const secs = String(totalSeconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  }; 

  const stations = ["All", "Kitchen", "Grill", "Bar"];
  const visibleTickets =
    stationFilter === "All"
      ? tickets
      : tickets.filter((t) => t.station === stationFilter);

  return (
    <div className="kds-page">
      <header className="kds-header">
        <div>
          <h1><Flame size={26} color="#FF671A" /> ZAIKA Kitchen Display (KDS)</h1>
          <p>{visibleTickets.length} active orders in queue</p>
        </div>

        <div className="kds-tabs">
          {stations.map((st) => (
            <button
              key={st}
              className={`kds-tab ${stationFilter === st ? "active" : ""}`}
              onClick={() => setStationFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </header>

      <div className="kds-grid">
        {visibleTickets.length === 0 ? (
          <div className="kds-empty">All caught up! No active tickets for {stationFilter}.</div>
        ) : (
          visibleTickets.map((ticket) => {
            const elapsedMins = (now - ticket.startedAt) / 60000;
            const isLate = elapsedMins >= 10;

            return (
              <div key={ticket.id} className={`kds-card ${isLate ? "late" : ""}`}>
                <div className="kds-card-top">
                  <div>
                    <span className="kds-label">{ticket.label}</span>
                    <span className="kds-station">{ticket.station}</span>
                  </div>
                  <span className="kds-timer">
                    <Clock size={15} /> {formatTimer(ticket.startedAt)}
                  </span>
                </div>

                <div className="kds-eta-tag">Target ETA: {ticket.eta} mins</div>

                <ul className="kds-items">
                  {ticket.items.map((item, idx) => (
                    <li key={idx}>
                      <strong>{item.qty}x</strong> {item.name} <span>({item.portion})</span>
                      {item.notes && <div className="kds-note">★ {item.notes}</div>}
                    </li>
                  ))}
                </ul>

                <button
                  className="kds-ready-btn"
                  onClick={() => socket.emit("mark_ready", { ticketId: ticket.id })}
                >
                  <CheckCircle size={18} /> MARK READY
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}