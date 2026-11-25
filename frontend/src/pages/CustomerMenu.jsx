import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Menu, Bell, Wifi, Gamepad2, Receipt, MessageSquare, ShoppingBag,
  X, Flame, AlertTriangle, UtensilsCrossed, Star, Plus, Minus,
  Soup, Utensils, CupSoda, Sparkles, ArrowRight, Coffee, Cookie, IceCream
} from "lucide-react";
import { MENU_ITEMS } from "../data/menudata";
import { socket } from "../socket";

export default function CustomerMenu() {
  const { tableId = "1" } = useParams();
  const numTableId = Number(tableId);

  const [activeView, setActiveView] = useState("Recommended");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [menuPopupOpen, setMenuPopupOpen] = useState(false);

  const [cart, setCart] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [liveMessage, setLiveMessage] = useState("");
  const [waiterCalled, setWaiterCalled] = useState(false);

  const [tableData, setTableData] = useState({ bill: 0, paid: false, eta: null, billSent: false });
  const [tttGame, setTttGame] = useState({ board: Array(9).fill(null), turn: "X", players: {}, winner: null });

  const [phone, setPhone] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  useEffect(() => {
    socket.on("state_sync", (data) => {
      const myTable = data.tables.find((t) => t.id === numTableId);
      if (myTable) setTableData(myTable);
      if (data.tttGame) setTttGame(data.tttGame);
    });

    socket.on("table_message", (msg) => {
      if (Number(msg.tableId) === numTableId) {
        setLiveMessage(msg.text);
        setTimeout(() => setLiveMessage(""), 6000);
      }
    });

    socket.emit("get_state");
    return () => {
      socket.off("state_sync");
      socket.off("table_message");
    };
  }, [numTableId]);

  const displayedItems =
    activeView === "Recommended"
      ? MENU_ITEMS.filter((i) => i.recommended)
      : MENU_ITEMS.filter((i) => i.category === activeView);

  const addToCart = (item, portion) => {
    const price = portion === "Half" ? item.priceHalf : item.priceFull;
    const key = `${item.id}-${portion}`;
    setCart((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) => (i.key === key ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        { key, id: item.id, name: item.name, station: item.station, portion, price, quantity: 1, notes: "" },
      ];
    });
  };

  const updateQty = (key, delta) => {
    setCart((prev) =>
      prev
        .map((i) => (i.key === key ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const updateNote = (key, notes) => {
    setCart((prev) => prev.map((i) => (i.key === key ? { ...i, notes } : i)));
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handlePlaceOrder = () => {
    const orderItems = cart.map((i) => ({
      name: i.name,
      portion: i.portion,
      qty: i.quantity,
      station: i.station,
      notes: i.notes,
    }));
    socket.emit("place_order", { tableId: numTableId, items: orderItems, totalAmount: cartTotal });
    setMyOrders((prev) => [...prev, ...orderItems]);
    setCart([]);
    setActiveModal(null);
    setLiveMessage("Order sent to Zaika counter! Cooking will start shortly.");
    setTimeout(() => setLiveMessage(""), 4000);
  };

  const handleCallWaiter = () => {
    socket.emit("call_waiter", { tableId: numTableId });
    setWaiterCalled(true);
    setTimeout(() => setWaiterCalled(false), 4000);
  };

  const openFromDrawer = (modalName) => {
    setDrawerOpen(false);
    setActiveModal(modalName);
    if (modalName === "game") socket.emit("ttt_join", { tableId: numTableId });
  };

const categoryCircles = [
  { key: "Recommended", label: "Best", icon: <Sparkles size={20} /> },
  { key: "Starters", label: "Starters", icon: <Soup size={20} /> },
  { key: "Mains", label: "Mains", icon: <Utensils size={20} /> },
  { key: "Breakfast", label: "Breakfast", icon: <Coffee size={20} /> },
  { key: "Sides", label: "Sides", icon: <Cookie size={20} /> },
  { key: "Drinks", label: "Drinks", icon: <CupSoda size={20} /> },
  { key: "Desserts", label: "Desserts", icon: <IceCream size={20} /> },
  ];
  
  return (
    <div className="zaika-shell">
      <div className="zaika-app">
        {/* Top Bar */}
        <header className="zaika-header">
          <button className="zaika-icon-btn" onClick={() => setDrawerOpen(true)} aria-label="Menu">
            <Menu size={24} />
          </button>

          <div className="zaika-brand">
            <h1>ZAIKA</h1>
            <span className="table-pill">Table #{tableId}</span>
          </div>

          <button
            className={`zaika-waiter-btn ${waiterCalled ? "ringing" : ""}`}
            onClick={handleCallWaiter}
          >
            <Bell size={15} /> {waiterCalled ? "Called!" : "Call Waiter"}
          </button>
        </header>

        {/* Live Notifications & ETA */}
        {liveMessage && <div className="zaika-toast">{liveMessage}</div>}
        {tableData.eta > 0 && (
          <div className="zaika-eta-bar">
            Kitchen is preparing your order • Est. Wait: <strong>{tableData.eta} mins</strong>
          </div>
        )}

        {/* Hero Banner */}
        <section className="hero-banner">
          <div className="hero-overlay">
            <span className="hero-eyebrow">Authentic Taste, Always Warm</span>
            <h2>Good Food,<br />Great Memories</h2>
            <p>Freshly grilled starters & royal curries served straight to Table #{tableId}.</p>
            <button className="hero-cta" onClick={() => setActiveView("Starters")}>
              Explore Menu <ArrowRight size={15} />
            </button>
          </div>
        </section>

        {/* Circular Category Bar */}
        <section className="cat-row">
          {categoryCircles.map((c) => (
            <button
              key={c.key}
              className={`cat-circle-btn ${activeView === c.key ? "active" : ""}`}
              onClick={() => setActiveView(c.key)}
            >
              <div className="cat-icon-ring">{c.icon}</div>
              <span>{c.label}</span>
            </button>
          ))}
        </section>

        {/* Menu Cards */}
        <main className="zaika-main">
          <div className="section-title">
            <h2>{activeView === "Recommended" ? "Chef's Recommended" : activeView}</h2>
            {activeView !== "Recommended" && (
              <button className="reset-link" onClick={() => setActiveView("Recommended")}>
                View Best Picks →
              </button>
            )}
          </div>

          <div className="zaika-menu-grid">
            {displayedItems.map((item) => (
              <div key={item.id} className="zaika-dish-card">
                <div className="dish-img-wrap">
                  <img src={item.image} alt={item.name} />
                  {item.recommended && <span className="dish-badge">BESTSELLER</span>}
                  <span className="dish-rating">★ {item.rating}</span>
                </div>

                <div className="dish-body">
                  <h3>{item.name}</h3>
                  <p className="dish-desc">{item.description}</p>

                  <div className="badges">
                    {item.spiceLevel !== "None" && (
                      <span className="badge spice"><Flame size={12} /> {item.spiceLevel}</span>
                    )}
                    {item.allergens.length > 0 && (
                      <span className="badge allergy"><AlertTriangle size={12} /> {item.allergens.join(", ")}</span>
                    )}
                  </div>

                  <div className="portion-actions">
                    {item.priceHalf && (
                      <button className="zaika-add-btn half" onClick={() => addToCart(item, "Half")}>
                        Half ₹{item.priceHalf} +
                      </button>
                    )}
                    <button className="zaika-add-btn full" onClick={() => addToCart(item, "Full")}>
                      Full ₹{item.priceFull} +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Sticky Cart Bar */}
        {cart.length > 0 && (
          <div className="zaika-cart-bar" onClick={() => setActiveModal("orders")}>
            <span><ShoppingBag size={18} /> {cart.reduce((s, i) => s + i.quantity, 0)} items</span>
            <strong>Customize & Order • ₹{cartTotal} →</strong>
          </div>
        )}

        {/* Bottom-Right Floating Menu Button */}
        <div className={`fab-wrapper ${cart.length > 0 ? "above-cart" : ""}`}>
          {menuPopupOpen && (
            <div className="fab-popup">
            {["Recommended", "Starters", "Mains", "Breakfast", "Sides", "Drinks", "Desserts"].map((cat) => (                <button
                  key={cat}
                  className={activeView === cat ? "active" : ""}
                  onClick={() => {
                    setActiveView(cat);
                    setMenuPopupOpen(false);
                  }}
                >
                  {cat === "Recommended" ? "Best Dishes" : cat}
                </button>
              ))}
            </div>
          )}
          <button className="zaika-fab" onClick={() => setMenuPopupOpen(!menuPopupOpen)}>
            <UtensilsCrossed size={18} /> Menu
          </button>
        </div>

        {/* Top-Left 3-Line Slide-Out Drawer */}
        {drawerOpen && (
          <div className="drawer-overlay" onClick={() => setDrawerOpen(false)}>
            <aside className="zaika-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="drawer-head">
                <div>
                  <h2>ZAIKA</h2>
                  <small>Table #{tableId}</small>
                </div>
                <button onClick={() => setDrawerOpen(false)}><X size={22} /></button>
              </div>
              <div className="drawer-links">
                <button onClick={() => openFromDrawer("orders")}>
                  <ShoppingBag size={18} /> My Orders & Customize ({cart.length})
                </button>
                <button onClick={() => openFromDrawer("game")}>
                  <Gamepad2 size={18} /> Play Tic-Tac-Toe (Cafe Wi-Fi)
                </button>
                <button onClick={() => openFromDrawer("wifi")}>
                  <Wifi size={18} /> Free Wi-Fi & Password
                </button>
                <button onClick={() => openFromDrawer("bill")}>
                  <Receipt size={18} /> Ask for Bill / Pay (₹{tableData.bill})
                </button>
                <button onClick={() => openFromDrawer("feedback")}>
                  <MessageSquare size={18} /> Give Feedback
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Feature Modals */}
        {activeModal && (
          <div className="modal-overlay" onClick={() => setActiveModal(null)}>
            <div className="zaika-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <h3>
                  {activeModal === "orders" && "Your Order & Customization"}
                  {activeModal === "game" && "Cafe Tic-Tac-Toe (Live)"}
                  {activeModal === "wifi" && "Zaika Free Wi-Fi"}
                  {activeModal === "bill" && "Bill & Payment"}
                  {activeModal === "feedback" && "Rate Your Experience"}
                </h3>
                <button onClick={() => setActiveModal(null)}><X size={20} /></button>
              </div>

              {activeModal === "orders" && (
                <div>
                  {cart.length > 0 ? (
                    <>
                      {cart.map((item) => (
                        <div key={item.key} className="custom-item">
                          <div className="custom-row">
                            <strong>{item.name} ({item.portion})</strong>
                            <div className="qty-controls">
                              <button onClick={() => updateQty(item.key, -1)}><Minus size={14} /></button>
                              <span>{item.quantity}</span>
                              <button onClick={() => updateQty(item.key, 1)}><Plus size={14} /></button>
                            </div>
                          </div>
                          <input
                            type="text"
                            placeholder="Customize: e.g. Less spicy, no onion..."
                            value={item.notes}
                            onChange={(e) => updateNote(item.key, e.target.value)}
                            className="note-input"
                          />
                        </div>
                      ))}
                      <button className="zaika-primary-btn" onClick={handlePlaceOrder}>
                        Confirm & Place Order • ₹{cartTotal}
                      </button>
                    </>
                  ) : (
                    <p className="muted">Your cart is empty. Add dishes from the menu!</p>
                  )}

                  {myOrders.length > 0 && (
                    <div className="past-orders">
                      <h4>Already Ordered</h4>
                      {myOrders.map((o, idx) => (
                        <div key={idx} className="past-row">
                          <span>{o.qty}x {o.name} ({o.portion})</span>
                          {o.notes && <small>Note: {o.notes}</small>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeModal === "game" && (
                <div className="ttt-box">
                  <p className="ttt-players">
                    <strong>X:</strong> {tttGame.players?.X || "Waiting..."} vs{" "}
                    <strong>O:</strong> {tttGame.players?.O || "Waiting for another table..."}
                  </p>
                  <div className="ttt-grid">
                    {tttGame.board.map((cell, idx) => (
                      <button
                        key={idx}
                        className="ttt-cell"
                        onClick={() => socket.emit("ttt_move", { index: idx })}
                      >
                        {cell}
                      </button>
                    ))}
                  </div>
                  <p className="ttt-status">
                    {tttGame.winner
                      ? tttGame.winner === "DRAW"
                        ? "It's a Draw!"
                        : `Winner: ${tttGame.winner}!`
                      : `Current Turn: ${tttGame.turn}`}
                  </p>
                  <button className="zaika-secondary-btn" onClick={() => socket.emit("ttt_reset")}>
                    New Game
                  </button>
                </div>
              )}

              {activeModal === "wifi" && (
                <div className="wifi-box">
                  <p>Connect to play Tic-Tac-Toe with other tables on the same network!</p>
                  <div className="wifi-creds">
                    <div><strong>Network:</strong> Zaika_Cafe_5G</div>
                    <div><strong>Password:</strong> zaika@2026</div>
                  </div>
                </div>
              )}

              {activeModal === "bill" && (
                <div className="bill-box">
                  <div className="bill-total">Total Bill: <strong>₹{tableData.bill}</strong></div>
                  <input
                    type="tel"
                    placeholder="Phone number for digital receipt"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="note-input"
                  />
                  {!tableData.paid ? (
                    <div className="bill-actions">
                      <button
                        className="zaika-secondary-btn"
                        onClick={() => {
                          socket.emit("ask_bill", { tableId: numTableId, phone });
                          setLiveMessage("Bill requested! Counter attendant notified.");
                          setActiveModal(null);
                        }}
                      >
                        Ask Counter for Bill
                      </button>
                      <button
                        className="zaika-primary-btn"
                        onClick={() => {
                          socket.emit("pay_bill", { tableId: numTableId, method: "UPI / App", phone });
                          setLiveMessage("Paid via UPI! Receipt will arrive shortly.");
                          setActiveModal(null);
                        }}
                      >
                        Pay Now (UPI / GPay)
                      </button>
                      <button
                        className="zaika-outline-btn"
                        onClick={() => {
                          socket.emit("pay_bill", { tableId: numTableId, method: "Cash at Table", phone });
                          setLiveMessage("Cash payment selected. Waiter notified!");
                          setActiveModal(null);
                        }}
                      >
                        Pay Cash at Table
                      </button>
                    </div>
                  ) : (
                    <p className="paid-msg">Bill Paid! Waiting for counter to send your receipt.</p>
                  )}
                </div>
              )}

              {activeModal === "feedback" && (
                <div className="feedback-box">
                  <div className="stars">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} onClick={() => setRating(s)} className={rating >= s ? "star active" : "star"}>
                        <Star size={28} fill={rating >= s ? "#DAB716" : "none"} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows="3"
                    placeholder="Tell us what you loved at Zaika..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="note-input"
                  />
                  <button
                    className="zaika-primary-btn"
                    onClick={() => {
                      socket.emit("submit_feedback", { tableId: numTableId, rating, comment });
                      setComment("");
                      setLiveMessage("Thank you for your feedback!");
                      setActiveModal(null);
                    }}
                  >
                    Submit Feedback
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}