# LedgeGuard

**LedgeGuard** is a modern application designed to help users monitor, manage, and analyze data through a centralized platform.

## ✨ Features

- 📊 Interactive dashboard for monitoring key information
- 🔐 User authentication and access control
- ⚡ Modular architecture with separate application services
- 🛠️ API and background worker support
- 📱 Responsive and user-friendly interface
- 🔒 Environment-based configuration

## 🏗️ Project Structure

```text
LedgeGuard/
├── apps/
│   ├── api/
│   ├── frontend/
│   └── worker/
├── packages/
├── scripts/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 🧰 Tech Stack

#### **Frontend**
* **Framework:** React 18 (Modern ESM & Hooks)
* **Build Tool:** Vite 6
* **Routing:** React Router DOM (v6)
* **Styling:** Tailwind CSS with PostCSS & Autoprefixer
* **Data Visualization & Charts:** Recharts
* **Icons:** Lucide React
* **Client-Side Security Audio:** Web Audio API (synthesized alerts) & Web Speech API (real-time voice guardian)
  
#### **Backend & Financial Engine**
* **Runtime:** Node.js (ESM Monorepo Architecture)
* **API Framework:** Next.js 15 (Route Handlers)
* **Ledger Core:** Custom double-entry bookkeeping engine with strict `BIGINT` integer paise arithmetic (`₹1 = 100 paise`, zero decimal float rounding errors)
* **Concurrency & Safety:** PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) & distributed idempotency keys
* **Schema Validation:** Zod
* **Authentication & Security:** JWT (`jose`), bcrypt password hashing, and real-time Account Takeover (ATO) anomaly detection
* **Logging:** Pino (high-performance structured JSON logging)
  
#### **Database & Storage**
* **Primary Database:** PostgreSQL (ACID-compliant relational database)
* **Connection Pool:** `pg` with custom 64-bit integer parser and SSL support
* **In-Memory Testing:** `pg-mem` for zero-latency isolated test suites
  
#### **Testing & DevOps**
* **Testing Framework:** Vitest (40/40 comprehensive invariant, concurrency, and security tests)
* **Version Control & Package Manager:** Git, GitHub, npm workspaces

## 🚀 Getting Started

### Prerequisites

- Node.js
- npm
- Git

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/suvansha-ag21/LedgeGuard.git
   ```

2. Navigate to the project:

   ```bash
   cd LedgeGuard
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Configure environment variables using `.env.example`. Add the required values to your local `.env` file.

5. Start the application using the scripts defined in `package.json`.

## ⚙️ Configuration

Never commit `.env` files, API keys, database credentials, or other secrets. Use `.env.example` to document the required environment variables without real secret values.

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Open a pull request.

## 📄 License

Add your chosen license here.

---

Developed by [Suvansha Agarwal](https://github.com/suvansha-ag21).
