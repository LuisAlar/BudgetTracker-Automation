# Architecture Decision Record (ADR): Transaction Ingestion and Parsing Strategy

## Status
**Status:** Accepted (Portfolio & Educational)

---

## Context and Problem Statement
To build a personal budget tracker that seamlessly logs transaction data into a local Obsidian Markdown vault in real-time, the system needs to:
1. **Detect** new financial transaction emails (e.g., from banks or receipt emails) immediately upon arrival.
2. **Authorize** access to email inboxes securely, handling modern OAuth protocols without exposing master credentials.
3. **Parse** highly variable email bodies to extract numbers, merchants, and dates, and map them to custom categories (budget buckets).
4. **Synchronize** the parsed transaction as clean Markdown text inside a local Obsidian directory.

The architectural challenge lies in choosing where the **ingestion** (email listening), **parsing** (regex and logic), and **sinking** (writing to files) layers should live. 

We evaluated three primary design architectures:
- **Option A: Pure Low-Code (Power Automate entirely)**
- **Option B: Hybrid Cloud/Serverless (Power Automate + Azure Function)** *(Chosen)*
- **Option C: Pure Local Pro-Code (Python Cron/IMAP script or Local Obsidian Plugin)**

---

## Decision Driver Factors
1. **Security & Authentication:** Minimizing custom implementation of email login/OAuth.
2. **Reliability/Always-on Execution:** The ingestion pipeline must be active 24/7 without needing a dedicated home server running constantly.
3. **Maintainability & Testability:** The parsing logic must be easy to edit, debug, and test locally without triggering real cloud events.
4. **Educational & Career Alignment:** Aligning the technologies directly with real-world enterprise architectures to build resume-grade experience for incoming software engineering/solutions architect internships.

---

## Options Evaluated

### Option A: Pure Low-Code (Power Automate only)
In this design, Power Automate listens for incoming emails, uses its native low-code text parsing actions (e.g., `split`, `substring`, `compose`) to isolate data points, and appends them directly to a file in OneDrive.

* **Pros:** 
  - Extremely fast to construct simple flows.
  - Zero custom code servers to host.
* **Cons:**
  - **Severe Maintenance Overhead:** Low-code string manipulation is incredibly fragile. If a bank alters their email template format, editing complex low-code expressions is slow and lacks visual debugging.
  - **No Testing Suite:** You cannot easily run unit tests or mock runs offline.
  - **No Version Control:** Changes are made directly in the cloud portal with no git history.

### Option B: Hybrid Cloud/Serverless (Power Automate + Azure Function)
Power Automate serves as the **Ingestion and Routing Layer** (connecting to email, triggering on receipt, and writing output to OneDrive). It forwards the raw email text via HTTP POST webhook to a custom **Azure Function** (JavaScript/TypeScript/Python), which handles the extraction, bucketing, and Markdown building, returning it to Power Automate.

* **Pros:**
  - **Separation of Concerns:** The trigger layer doesn't need to know *how* to parse; the parsing layer doesn't need to know *how* to authenticate with Outlook/OneDrive.
  - **Robust Testing (Local Emulators):** Developers can run the Azure Function locally using Azure Functions Core Tools. Messy transaction parsing can be unit-tested against mock email payloads in seconds (`simulate_flow.py` / `scratch_test.py`).
  - **Security Delegation:** Leverages Microsoft's managed connectors to securely handle Gmail/Outlook OAuth out-of-the-box.
  - **Resume Grade:** Mirrors the **"Enterprise Service Bus" / Microservices** pattern used globally by engineering organizations.
* **Cons:**
  - Multi-platform overhead (requires navigating both Azure and Power Platform).
  - Potential cloud latency/cold start delays.

### Option C: Pure Local Pro-Code (Local IMAP Script or Obsidian Plugin)
A local background process (like a Python cron daemon) or a custom Obsidian plugin directly logs into the user's email server via IMAP, pulls receipts, parses them locally, and writes them straight to the local hard drive.

* **Pros:**
  - **100% Privacy:** No third-party clouds (like Power Automate or Azure servers) ever see the transaction details.
  - **Zero Cost:** No cloud compute or platform subscription fees.
  - **Single Repository:** The entire project can be self-contained in a single codebase.
* **Cons:**
  - **IMAP/OAuth Headache:** Hand-coding secure connections to modern email providers (which require strict MFA, App Passwords, or OAuth) is a secure-networking nightmare.
  - **No Background execution:** The system only processes data when your local machine is booted up and active.

---

## Decision & Justification
We selected **Option B: Hybrid Cloud/Serverless (Power Automate + Azure Function)**. 

### Why this decision brings immense value to the software:
1. **The Ingestion Value (Why PA is not a toy):**
   Power Automate is highly valuable here because it solves the hardest part of email integration: **identity management and push triggers**. Developing a custom, secure OAuth email listener that doesn't constantly break is a multi-week engineering project in itself. Delegating this to Power Automate is a smart, pragmatic architectural decision.
2. **The Logic Value (Why the Azure Function is not overkill):**
   Isolating the parsing logic inside standard code (instead of low-code components) respects the **Single Responsibility Principle**. By utilizing standard functions, we can version control our parsing code via Git, write automated unit tests, and easily swap out our frontend or ingestion triggers later without touching our core business logic.
3. **The Educational Factor:**
   For an incoming intern, this architecture teaches crucial skills: **Event-Driven Architecture (EDA)**, **REST API/Webhook patterns**, and **Hybrid Cloud Integration**. It proves to recruiters that you can architect solutions across professional enterprise boundaries rather than just writing script files.

---

## Consequences & Trade-offs
* **Vendor Lock-in:** The trigger layer is heavily coupled to the Microsoft 365 environment.
* **Packaged Product Friction:** If this were released as an open-source product for consumer-level users, Power Automate would be a high-friction setup step. To package this for a wider audience later, we would keep the parsing engine identical but write a secondary Local Ingestion script (like Option C) to offer users a zero-cloud alternative.
