# 🍽️ Zaika — Full-Stack Restaurant OS

A modern, real-time restaurant management and QR ordering platform built with **React (Vite)**, **Node.js**, **Express**, and **Socket.io**. Designed for seamless dine-in ordering, live kitchen coordination, floor management, and online delivery tracking.

---

## 🌐 Live Demo

View the application live:

👉 **[Zaika Restaurant OS Live](https://restaurant-software-6mo4.netlify.app/)**

### Direct Route Links
* **Guest Menu (Table #1):** [Open Table #1 Menu](https://restaurant-software-6mo4.netlify.app/table/1)
* **Staff Floor Dashboard:** [Open Staff Floor](https://restaurant-software-6mo4.netlify.app/staff)
* **Kitchen Display System (KDS):** [Open Kitchen Display](https://restaurant-software-6mo4.netlify.app/kitchen)
* **Table QR Code Generator:** [Open Table QRs](https://restaurant-software-6mo4.netlify.app/qr)

---

## 📸 Project Preview

### Welcome & Role Selection
![Welcome Screen](preview/Screenshot%202026-11-26%20032614.png)

### Customer QR Menu (Table #1)
![Customer QR Menu](preview/Screenshot%202026-11-26%20032439.jpg)

### Live Staff Floor Dashboard
![Staff Floor Dashboard](preview/Screenshot%202026-11-26%20032508.jpg)

### Kitchen Display System (KDS)
![Kitchen Display System](preview/Screenshot%202026-11-26%20032542.png)

### Permanent Table QR Code Generator
![Table QR Codes](preview/Screenshot%202026-11-26%20032600.png)

---

## ✨ Features

* **Role-Based Entry:** Clean welcome screen allowing guests to browse/order and staff to access floor, kitchen, and QR tools.
* **QR Code Table Ordering:** Customers scan their table's QR code to browse categories, view chef's recommendations, place orders, call a waiter, play games, and pay via UPI/App.
* **Live Staff Floor Dashboard:** Real-time overview of all 6 tables, billing totals, audio order buzzers, waiter call alerts, and Swiggy/Zomato online delivery integration.
* **Kitchen Display System (KDS):** Station-filtered live order queue (**All**, **Kitchen**, **Grill**, **Bar**) with elapsed timers, target ETAs, and one-click **Mark Ready** notifications.
* **Printable Permanent QR Cards:** Built-in generator to print ready-to-use QR cards for every table.

---

## 🛠️ Tech Stack

### Frontend
* React (Vite)
* CSS3 & Responsive UI
* Socket.io Client

### Backend
* Node.js
* Express.js
* Socket.io (Real-Time WebSockets)

### Deployment
* **Frontend:** Netlify
* **Backend:** Railway

---

## ⚙️ Installation

### Clone the repository
```bash
git clone https://github.com/adi-tech-01/RESTAURANT-SOFTWARE.git
cd RESTAURANT-SOFTWARE
```

### Run Backend
```bash
cd backend
npm install
node server.js
```

### Run Frontend
```bash
cd frontend
npm install
npm run dev
```