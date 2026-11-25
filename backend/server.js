const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// 1. Live State
let tables = [
  { id: 1, status: "EMPTY", bill: 0, paid: false, eta: null, phone: "", billSent: false },
  { id: 2, status: "EMPTY", bill: 0, paid: false, eta: null, phone: "", billSent: false },
  { id: 3, status: "EMPTY", bill: 0, paid: false, eta: null, phone: "", billSent: false },
  { id: 4, status: "EMPTY", bill: 0, paid: false, eta: null, phone: "", billSent: false },
  { id: 5, status: "EMPTY", bill: 0, paid: false, eta: null, phone: "", billSent: false },
  { id: 6, status: "EMPTY", bill: 0, paid: false, eta: null, phone: "", billSent: false },
];

let pendingOrders = [];   // Dine-in orders waiting for counter attendant
let onlineOrders = [];    // Swiggy & Zomato orders
let kitchenTickets = [];  // Active KDS tickets
let notifications = [];   // Ready messages & receipts
let feedbacks = [];

// Tic-Tac-Toe multiplayer room state
let tttGame = {
  board: Array(9).fill(null),
  turn: "X",
  players: { X: null, O: null }, // stores tableId
  winner: null,
};

let nextOrderId = 101;
let nextTicketId = 201;

// Helper: Calculate minimum ETA based on current kitchen queue
function calculateQueueETA(itemCount) {
  const activeCount = kitchenTickets.length;
  return 10 + activeCount * 4 + itemCount * 2; // mins
}

function broadcastState(target = io) {
  target.emit("state_sync", {
    tables,
    pendingOrders,
    onlineOrders,
    kitchenTickets,
    notifications: notifications.slice(0, 8),
    tttGame,
  });
}

function checkWinner(b) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const [a, c, d] of lines) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  }
  return b.every(Boolean) ? "DRAW" : null;
}

io.on("connection", (socket) => {
  console.log(`Connected: ${socket.id}`);
  broadcastState(socket);

  socket.on("get_state", () => broadcastState(socket));

  // --- CUSTOMER EVENTS ---
  socket.on("place_order", ({ tableId, items, totalAmount }) => {
    const numId = Number(tableId);
    pendingOrders.push({
      id: nextOrderId++,
      tableId: numId,
      source: "DINE_IN",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      items,
      totalAmount,
    });
    tables = tables.map((t) =>
      t.id === numId
        ? { ...t, status: "WAITING", bill: t.bill + totalAmount, paid: false }
        : t
    );
    broadcastState();
  });

  socket.on("call_waiter", ({ tableId }) => {
    const numId = Number(tableId);
    tables = tables.map((t) => (t.id === numId ? { ...t, status: "CALLING_WAITER" } : t));
    broadcastState();
  });

socket.on("ask_bill", ({ tableId, phone }) => {
    const table = tables.find((t) => t.id === Number(tableId));
    if (table) {
      table.status = "ASKING_BILL";
      if (phone) table.phone = phone;
      broadcastState();
    }
  });

  socket.on("pay_bill", ({ tableId, method, phone }) => {
    const table = tables.find((t) => t.id === Number(tableId));
    if (table) {
      table.paid = true;
      table.paymentMethod = method;
      if (phone) table.phone = phone;
      notifications.unshift({
        id: Date.now(),
        text: `Table #${tableId} paid ₹${table.bill} via ${method}`,
      });
      broadcastState();
    }
  });

  socket.on("send_receipt", ({ tableId }) => {
    const table = tables.find((t) => t.id === Number(tableId));
    if (table) {
      io.emit("table_message", {
        tableId,
        text: "Digital receipt sent to your WhatsApp! Thank you for dining at Zaika.",
      });
      table.status = "EMPTY";
      table.bill = 0;
      table.paid = false;
      table.eta = null;
      table.billSent = false;
      table.phone = "";
      broadcastState();
    }
  });

  socket.on("clear_table", ({ tableId }) => {
    const table = tables.find((t) => t.id === Number(tableId));
    if (table) {
      table.status = "EMPTY";
      table.bill = 0;
      table.paid = false;
      table.eta = null;
      table.billSent = false;
      table.phone = "";
      broadcastState();
    }
  });
  
  socket.on("submit_feedback", ({ tableId, rating, comment }) => {
    feedbacks.push({ tableId, rating, comment, time: new Date().toISOString() });
    notifications.unshift({
      id: Date.now(),
      text: `Table #${tableId} left a ${rating}★ review!`,
    });
    broadcastState();
  });

  // --- FLOOR DASHBOARD (COUNTER ATTENDANT) EVENTS ---
  socket.on("send_to_kitchen", ({ orderId, source }) => {
    let order;
    if (source === "ONLINE") {
      order = onlineOrders.find((o) => o.id === orderId);
      onlineOrders = onlineOrders.filter((o) => o.id !== orderId);
    } else {
      order = pendingOrders.find((o) => o.id === orderId);
      pendingOrders = pendingOrders.filter((o) => o.id !== orderId);
    }
    if (!order) return;

    const eta = calculateQueueETA(order.items.length);

    // Split items by station (Kitchen, Grill, Bar)
    const byStation = {};
    order.items.forEach((item) => {
      const st = item.station || "Kitchen";
      if (!byStation[st]) byStation[st] = [];
      byStation[st].push(item);
    });

    Object.entries(byStation).forEach(([station, items]) => {
      kitchenTickets.push({
        id: nextTicketId++,
        label: source === "ONLINE" ? `${order.platform} #${order.id}` : `Table #${order.tableId}`,
        tableId: order.tableId || null,
        source: order.platform || "DINE_IN",
        station,
        eta,
        startedAt: Date.now(),
        items,
      });
    });

    if (order.tableId) {
      tables = tables.map((t) =>
        t.id === order.tableId ? { ...t, status: "PREPARING", eta } : t
      );
    }
    broadcastState();
  });

  socket.on("simulate_online_order", ({ platform }) => {
    onlineOrders.push({
      id: nextOrderId++,
      platform, // "Swiggy" or "Zomato"
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      items: [
        { name: "Paneer Tikka", portion: "Full", qty: 1, station: "Grill", notes: "Extra spicy" },
        { name: "Butter Chicken", portion: "Full", qty: 1, station: "Kitchen", notes: "" },
      ],
      totalAmount: 740,
    });
    broadcastState();
  });

  socket.on("send_waiter", ({ tableId }) => {
    tables = tables.map((t) => (t.id === tableId ? { ...t, status: "WAITING" } : t));
    io.emit("table_message", { tableId, text: "A waiter is on the way to your table!" });
    broadcastState();
  });

  socket.on("send_bill_to_app", ({ tableId }) => {
    tables = tables.map((t) => (t.id === tableId ? { ...t, billSent: true } : t));
    io.emit("table_message", { tableId, text: "Your bill is ready in the app. You can pay now!" });
    broadcastState();
  });

  socket.on("send_receipt", ({ tableId }) => {
    const t = tables.find((tbl) => tbl.id === tableId);
    io.emit("table_message", {
      tableId,
      text: `Receipt sent to ${t?.phone || "your phone"}! Thank you for dining at Zaika.`,
    });
    socket.on("clear_table", ({ tableId }) => {
    const table = tables.find((t) => t.id === Number(tableId));
    if (table) {
      table.status = "EMPTY";
      table.bill = 0;
      table.paid = false;
      table.eta = null;
      table.billSent = false;
      broadcastState();
    }
  });
    tables = tables.map((tbl) =>
      tbl.id === tableId
        ? { ...tbl, status: "EMPTY", bill: 0, paid: false, eta: null, phone: "", billSent: false }
        : tbl
    );
    broadcastState();
  });

  // --- KDS (CHEF) EVENTS ---
  socket.on("mark_ready", ({ ticketId }) => {
    const ticket = kitchenTickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    kitchenTickets = kitchenTickets.filter((t) => t.id !== ticketId);
    notifications.unshift({
      id: Date.now(),
      text: `READY: ${ticket.label} (${ticket.station}) is ready for pickup!`,
    });

    if (ticket.tableId) {
      tables = tables.map((t) =>
        t.id === ticket.tableId ? { ...t, status: "WAITING", eta: 0 } : t
      );
      io.emit("table_message", {
        tableId: ticket.tableId,
        text: `Your ${ticket.station} order is ready and coming to your table!`,
      });
    }
    broadcastState();
  });

  // --- MULTIPLAYER TIC-TAC-TOE (SAME WI-FI TABLES) ---
  socket.on("ttt_join", ({ tableId }) => {
    if (!tttGame.players.X) tttGame.players.X = `Table #${tableId}`;
    else if (!tttGame.players.O && tttGame.players.X !== `Table #${tableId}`) {
      tttGame.players.O = `Table #${tableId}`;
    }
    broadcastState();
  });

  socket.on("ttt_move", ({ index }) => {
    if (tttGame.board[index] || tttGame.winner) return;
    tttGame.board[index] = tttGame.turn;
    tttGame.winner = checkWinner(tttGame.board);
    if (!tttGame.winner) tttGame.turn = tttGame.turn === "X" ? "O" : "X";
    broadcastState();
  });

  socket.on("ttt_reset", () => {
    tttGame = {
      board: Array(9).fill(null),
      turn: "X",
      players: { X: null, O: null },
      winner: null,
    };
    broadcastState();
  });
});
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Zaika Backend running on port ${PORT}`));