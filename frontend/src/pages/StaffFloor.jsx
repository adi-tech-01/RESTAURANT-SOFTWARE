import { useState, useEffect, useRef } from "react";
import {
  Bell,
  ChefHat,
  Receipt,
  Send,
  CheckCircle,
  Clock,
  Bike,
  Volume2,
  RotateCcw,
  MessageSquare,
  ShoppingBag,
} from "lucide-react";
import { socket } from "../socket";

let sharedAudioCtx = null;

function getAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

function playTone(
  ctx,
  { freq, endFreq = null, startOffset, duration, wave = "sawtooth", volume = 1.0 }
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = wave;
  const startTime = ctx.currentTime + startOffset;
  const endTime = startTime + duration;

  osc.frequency.setValueAtTime(freq, startTime);
  if (endFreq !== null) {
    osc.frequency.linearRampToValueAtTime(endFreq, endTime);
  }

  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.015);
  gain.gain.setValueAtTime(
    volume,
    Math.max(startTime + 0.02, endTime - 0.04)
  );
  gain.gain.exponentialRampToValueAtTime(0.001, endTime);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(endTime + 0.01);
}

// 1. Loud dual-tone restaurant call buzzer for waiter requests
function playWaiterBuzzer() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    playTone(ctx, { freq: 780, endFreq: 1480, startOffset: 0.0, duration: 0.24, wave: "sawtooth", volume: 1.0 });
    playTone(ctx, { freq: 520, endFreq: 980, startOffset: 0.0, duration: 0.24, wave: "square", volume: 0.85 });

    playTone(ctx, { freq: 780, endFreq: 1480, startOffset: 0.28, duration: 0.24, wave: "sawtooth", volume: 1.0 });
    playTone(ctx, { freq: 520, endFreq: 980, startOffset: 0.28, duration: 0.24, wave: "square", volume: 0.85 });

    playTone(ctx, { freq: 1040, endFreq: 1560, startOffset: 0.56, duration: 0.34, wave: "sawtooth", volume: 1.0 });
    playTone(ctx, { freq: 690, endFreq: 1040, startOffset: 0.56, duration: 0.34, wave: "square", volume: 0.85 });
  } catch {
    // Audio blocked before user gesture
  }
}

// 2. Crisp double-ding buzzer + voice "New order"
function playNewOrderAlert(sourceText = "") {
  try {
    const ctx = getAudioContext();
    if (ctx) {
      playTone(ctx, { freq: 880, startOffset: 0.0, duration: 0.14, wave: "square", volume: 0.9 });
      playTone(ctx, { freq: 1174.66, startOffset: 0.15, duration: 0.16, wave: "square", volume: 0.95 });
      playTone(ctx, { freq: 1567.98, startOffset: 0.32, duration: 0.28, wave: "sawtooth", volume: 0.9 });
    }
  } catch {
    // Audio blocked before user gesture
  }

  try {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const spoken = sourceText ? `New order from ${sourceText}` : "New order";
      const msg = new SpeechSynthesisUtterance(spoken);
      msg.rate = 1.0;
      msg.pitch = 1.05;
      msg.volume = 1.0;
      window.speechSynthesis.speak(msg);
    }
  } catch {
    // Speech API unavailable
  }
}

// 3. Distinct chime + spoken alert when a bill is paid
function playPaymentDoneAlert(tableId) {
  try {
    const ctx = getAudioContext();
    if (ctx) {
      playTone(ctx, { freq: 1046.5, startOffset: 0.0, duration: 0.16, wave: "triangle", volume: 1.0 });
      playTone(ctx, { freq: 1318.5, startOffset: 0.17, duration: 0.16, wave: "triangle", volume: 1.0 });
      playTone(ctx, { freq: 1567.98, startOffset: 0.34, duration: 0.32, wave: "sine", volume: 1.0 });
    }
  } catch {
    // Audio blocked before user gesture
  }

  try {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance(`Table number ${tableId} has paid the bill`);
      msg.rate = 0.98;
      msg.pitch = 1.05;
      msg.volume = 1.0;
      window.speechSynthesis.speak(msg);
    }
  } catch {
    // Speech API unavailable
  }
}

// Clears the table first so the modal always closes, then opens SMS if phone exists
function handleSendTextReceipt(table) {
  socket.emit("send_receipt", { tableId: table.id });

  if (table.phone && table.phone.trim() !== "") {
    let cleanPhone = table.phone.replace(/[^\d+]/g, "");
    if (/^\d{10}$/.test(cleanPhone)) {
      cleanPhone = `+91${cleanPhone}`;
    }

    const dateStr = new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const smsBody =
      `ZAIKA Receipt\n` +
      `Table #${table.id} | ${dateStr}\n` +
      `Paid: Rs.${table.bill} (${table.paymentMethod || "Paid"})\n` +
      `Thank you for dining at Zaika!`;

    const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(smsBody)}`;
    window.location.href = smsUrl;
  }
}

export default function StaffFloor() {
  const [tables, setTables] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [onlineOrders, setOnlineOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [soundReady, setSoundReady] = useState(false);
  const [newOrderPopup, setNewOrderPopup] = useState(null);

  const alertedWaiterRef = useRef(new Set());
  const alertedPaidRef = useRef(new Set());
  const seenOrdersRef = useRef(new Set());
  const isInitialSyncRef = useRef(true);

  const unlockSound = () => {
    getAudioContext();
    setSoundReady(true);
  };

  useEffect(() => {
    socket.on("state_sync", (data) => {
      const incomingTables = data.tables || [];
      const incomingDineIn = data.pendingOrders || [];
      const incomingOnline = data.onlineOrders || [];

      setTables(incomingTables);
      setPendingOrders(incomingDineIn);
      setOnlineOrders(incomingOnline);
      setNotifications(data.notifications || []);

      // 1. Check for NEW Waiter Calls
      const callingNow = incomingTables.filter((t) => t.status === "CALLING_WAITER");
      let buzzWaiter = false;
      callingNow.forEach((t) => {
        if (!alertedWaiterRef.current.has(t.id)) {
          alertedWaiterRef.current.add(t.id);
          buzzWaiter = true;
        }
      });
      alertedWaiterRef.current.forEach((id) => {
        if (!callingNow.some((t) => t.id === id)) alertedWaiterRef.current.delete(id);
      });
      if (buzzWaiter) playWaiterBuzzer();

      // 2. Check for NEW Paid Bills
      const paidNow = incomingTables.filter((t) => t.paid);
      paidNow.forEach((t) => {
        if (!alertedPaidRef.current.has(t.id)) {
          alertedPaidRef.current.add(t.id);
          playPaymentDoneAlert(t.id);
        }
      });
      alertedPaidRef.current.forEach((id) => {
        if (!paidNow.some((t) => t.id === id)) alertedPaidRef.current.delete(id);
      });

      // 3. Check for NEW Orders (Dine-In + Swiggy/Zomato)
      const allIncomingOrders = [
        ...incomingDineIn.map((o) => ({ ...o, source: "DINE_IN", label: `Table #${o.tableId}` })),
        ...incomingOnline.map((o) => ({ ...o, source: "ONLINE", label: `${o.platform} #${o.id}` })),
      ];

      if (isInitialSyncRef.current) {
        allIncomingOrders.forEach((o) => seenOrdersRef.current.add(o.id));
        isInitialSyncRef.current = false;
      } else {
        const brandNewOrder = allIncomingOrders.find((o) => !seenOrdersRef.current.has(o.id));
        allIncomingOrders.forEach((o) => seenOrdersRef.current.add(o.id));

        if (brandNewOrder) {
          setNewOrderPopup(brandNewOrder);
          playNewOrderAlert(brandNewOrder.label);
        }
      }
    });

    socket.emit("get_state");
    return () => socket.off("state_sync");
  }, []);

  const callingTables = tables.filter((t) => t.status === "CALLING_WAITER");
  const paidTables = tables.filter((t) => t.paid);

  return (
    <div className="staff-page" onClick={unlockSound}>
      {/* 1. URGENT WAITER CALL POP-UP */}
      {callingTables.length > 0 && (
        <div className="buzzer-overlay">
          <div className="buzzer-modal">
            <div className="buzzer-icon-ring">
              <Bell size={38} />
            </div>
            <h2>Waiter Requested!</h2>
            <p className="buzzer-sub">
              {callingTables.map((t) => `Table #${t.id}`).join(", ")}{" "}
              {callingTables.length === 1 ? "is" : "are"} calling for a waiter right now.
            </p>
            <div className="buzzer-actions">
              {callingTables.map((t) => (
                <button
                  key={t.id}
                  className="buzzer-send-btn"
                  onClick={() => socket.emit("send_waiter", { tableId: t.id })}
                >
                  <Send size={16} /> Send Waiter to Table #{t.id}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. NEW ORDER POP-UP */}
      {callingTables.length === 0 && newOrderPopup && (
        <div className="buzzer-overlay">
          <div className="buzzer-modal order-modal">
            <div className="buzzer-icon-ring order-ring">
              <ShoppingBag size={38} />
            </div>
            <h2>New Order!</h2>
            <p className="buzzer-sub">
              <strong>{newOrderPopup.label}</strong> placed a new order ({newOrderPopup.items.length} item
              {newOrderPopup.items.length > 1 ? "s" : ""}).
            </p>
            <ul className="order-popup-list">
              {newOrderPopup.items.map((item, idx) => (
                <li key={idx}>
                  {item.qty}x {item.name} {item.portion ? `(${item.portion})` : ""}
                </li>
              ))}
            </ul>
            <div className="buzzer-actions">
              <button
                className="buzzer-send-btn order-btn"
                onClick={() => {
                  socket.emit("send_to_kitchen", {
                    orderId: newOrderPopup.id,
                    source: newOrderPopup.source,
                  });
                  setNewOrderPopup(null);
                }}
              >
                <ChefHat size={16} /> Send Directly to KDS
              </button>
              <button
                className="act-btn outline-clear"
                onClick={() => setNewOrderPopup(null)}
              >
                Dismiss &amp; View on Floor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. BILL PAID POP-UP */}
      {callingTables.length === 0 && !newOrderPopup && paidTables.length > 0 && (
        <div className="buzzer-overlay">
          <div className="buzzer-modal paid-modal">
            <div className="buzzer-icon-ring paid-ring">
              <CheckCircle size={38} />
            </div>
            <h2>Bill Paid!</h2>
            <p className="buzzer-sub">
              {paidTables.map((t) => `Table #${t.id} (₹${t.bill})`).join(", ")} paid the bill.
              Send text receipt and mark table as empty?
            </p>
            <div className="buzzer-actions">
              {paidTables.map((t) => (
                <div key={t.id} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    className="buzzer-send-btn paid-btn"
                    onClick={() => handleSendTextReceipt(t)}
                  >
                    <MessageSquare size={16} /> Send Text Receipt &amp; Mark Table #{t.id} Empty
                  </button>
                  <button
                    className="act-btn outline-clear"
                    onClick={() => socket.emit("clear_table", { tableId: t.id })}
                  >
                    Skip Text &amp; Return to Floor
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <header className="staff-header">
        <div>
          <h1>Zaika Live Floor Dashboard</h1>
          <p>Counter Attendant Monitor • Dine-In, Waiter Calls, Billing &amp; Online Delivery</p>
        </div>
        <div className="online-sim-btns">
          <button
            className="btn-sound-test"
            onClick={(e) => {
              e.stopPropagation();
              unlockSound();
              playWaiterBuzzer();
            }}
            title="Test Waiter Call Buzzer"
          >
            <Volume2 size={15} /> {soundReady ? "Buzzer On" : "Enable Buzzer"}
          </button>
          <button
            className="btn-sound-test"
            onClick={(e) => {
              e.stopPropagation();
              unlockSound();
              playNewOrderAlert("Table 1");
            }}
            title="Test New Order Sound"
          >
            <ShoppingBag size={15} /> Test Order Sound
          </button>
          <button
            className="btn-swiggy"
            onClick={() => socket.emit("simulate_online_order", { platform: "Swiggy" })}
          >
            <Bike size={15} /> + Swiggy
          </button>
          <button
            className="btn-zomato"
            onClick={() => socket.emit("simulate_online_order", { platform: "Zomato" })}
          >
            <Bike size={15} /> + Zomato
          </button>
        </div>
      </header>

      {/* Live KDS Ready & Payment Alerts */}
      {notifications.length > 0 && (
        <div className="alerts-strip">
          {notifications.slice(0, 3).map((n) => (
            <div key={n.id} className="alert-pill">
              <CheckCircle size={15} /> {n.text}
            </div>
          ))}
        </div>
      )}

      <div className="staff-grid-layout">
        {/* Left: All Tables Grid */}
        <section className="floor-section">
          <h2>Floor Status ({tables.length} Tables)</h2>
          <div className="floor-cards">
            {tables.map((t) => (
              <div key={t.id} className={`floor-table-card st-${t.status.toLowerCase()}`}>
                <div className="ft-top">
                  <h3>Table #{t.id}</h3>
                  <span className="ft-status">{t.status.replace("_", " ")}</span>
                </div>

                <div className="ft-info">
                  <div>
                    Bill: <strong>₹{t.bill}</strong>
                  </div>
                  <span className={`pay-badge ${t.paid ? "paid" : "unpaid"}`}>
                    {t.paid ? "PAID" : t.bill > 0 ? "UNPAID" : "—"}
                  </span>
                </div>

                {t.eta > 0 && (
                  <div className="ft-eta">
                    <Clock size={13} /> Kitchen ETA: {t.eta} mins
                  </div>
                )}

                <div className="ft-actions">
                  {t.status === "CALLING_WAITER" && (
                    <button
                      className="act-btn red"
                      onClick={() => socket.emit("send_waiter", { tableId: t.id })}
                    >
                      <Bell size={14} /> Send Waiter
                    </button>
                  )}
                  {t.status === "ASKING_BILL" && !t.billSent && (
                    <button
                      className="act-btn gold"
                      onClick={() => socket.emit("send_bill_to_app", { tableId: t.id })}
                    >
                      <Receipt size={14} /> Send Bill to App
                    </button>
                  )}
                  {t.paid && (
                    <button
                      className="act-btn green"
                      onClick={() => handleSendTextReceipt(t)}
                    >
                      <Send size={14} /> Send Text &amp; Clear
                    </button>
                  )}
                  {(t.status !== "EMPTY" || t.bill > 0) && (
                    <button
                      className="act-btn outline-clear"
                      onClick={() => socket.emit("clear_table", { tableId: t.id })}
                    >
                      <RotateCcw size={13} /> Mark Empty
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right: Incoming Dine-In + Swiggy/Zomato Orders */}
        <aside className="orders-sidebar">
          <div className="sidebar-box">
            <h3>Dine-In Orders ({pendingOrders.length})</h3>
            {pendingOrders.length === 0 ? (
              <p className="empty-txt">No pending dine-in orders.</p>
            ) : (
              pendingOrders.map((order) => (
                <div key={order.id} className="order-ticket">
                  <div className="ot-head">
                    <strong>Table #{order.tableId}</strong>
                    <span>{order.time}</span>
                  </div>
                  <ul>
                    {order.items.map((item, i) => (
                      <li key={i}>
                        {item.qty}x {item.name} ({item.portion}) — <em>{item.station}</em>
                        {item.notes && <div className="ot-note">Note: {item.notes}</div>}
                      </li>
                    ))}
                  </ul>
                  <button
                    className="btn-send-kds"
                    onClick={() =>
                      socket.emit("send_to_kitchen", { orderId: order.id, source: "DINE_IN" })
                    }
                  >
                    <ChefHat size={15} /> Send to KDS
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="sidebar-box">
            <h3>Swiggy &amp; Zomato ({onlineOrders.length})</h3>
            {onlineOrders.length === 0 ? (
              <p className="empty-txt">No online delivery orders right now.</p>
            ) : (
              onlineOrders.map((order) => (
                <div
                  key={order.id}
                  className={`order-ticket online-${order.platform.toLowerCase()}`}
                >
                  <div className="ot-head">
                    <span className={`plat-tag ${order.platform.toLowerCase()}`}>
                      {order.platform} #{order.id}
                    </span>
                    <span>{order.time}</span>
                  </div>
                  <ul>
                    {order.items.map((item, i) => (
                      <li key={i}>
                        {item.qty}x {item.name} ({item.station})
                      </li>
                    ))}
                  </ul>
                  <button
                    className="btn-send-kds"
                    onClick={() =>
                      socket.emit("send_to_kitchen", { orderId: order.id, source: "ONLINE" })
                    }
                  >
                    <ChefHat size={15} /> Redirect to KDS
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}