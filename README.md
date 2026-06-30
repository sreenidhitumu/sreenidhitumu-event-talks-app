# BigQuery Release Notes Hub

An elegant, real-time web application to fetch, search, and filter official Google Cloud BigQuery release notes. Built using Python Flask on the backend and plain vanilla HTML5, CSS3, and JavaScript on the frontend.

## 🚀 Features

* **Real-time Feed Syncing**: Fetches release notes directly from Google's official release notes XML feed.
* **Smart Parsing**: Automatically categorizes updates by parsing embedded HTML headings (e.g., *Feature*, *Change*, *Issue*, *Announcement*, *Deprecation*).
* **Dual-State Caching**: Implements a 30-minute backend memory cache to guarantee rapid load times and prevent request throttling.
* **Instant Filtering & Search**:
  * Multi-select category filtering (view features, changes, and issues simultaneously).
  * Fast client-side keyword search matching titles, content, and tags.
* **Premium Dark/Light UI**: Built with a sleek dark-mode first design, featuring modern glassmorphism panels, responsive layouts, theme persistence using `localStorage`, and skeleton loaders.

---

## 🛠️ Technology Stack

* **Backend**: Python 3, Flask
* **Frontend**: Vanilla HTML5, Vanilla CSS3 (custom CSS custom properties/variables), ES6 JavaScript
* **Icons & Fonts**: Google Material Symbols, Inter, and JetBrains Mono

---

## 📁 Directory Structure

```text
sreenidhitumu-event-talks-app/
│
├── static/
│   ├── css/
│   │   └── styles.css      # Core responsive styles & dark/light theme variables
│   └── js/
│       └── main.js         # State controller, search/filter logic, API connector
│
├── templates/
│   └── index.html          # Semantic dashboard structure
│
├── app.py                  # Flask server, feed fetcher, and cache manager
├── requirements.txt        # Backend dependencies
├── .gitignore              # Files ignored by version control
└── README.md               # Project documentation
```

---

## 🏃 How to Run Locally

### Prerequisites

Ensure you have Python 3 installed. You can verify this by running:
```bash
python --version
```

### Installation Steps

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/sreenidhitumu/sreenidhitumu-event-talks-app.git
   cd sreenidhitumu-event-talks-app
   ```

2. **Install Dependencies**:
   Install Flask and requests requirements:
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the Flask Development Server**:
   ```bash
   python app.py
   ```

4. **Open in Browser**:
   Navigate to **[http://127.0.0.1:5000](http://127.0.0.1:5000)** to view the live dashboard.

---

## 🔗 Architecture Details

For a detailed look at the request-response workflow, backend parsing logic, and component interactions, check out:
* **[project_architecture_and_flow.md](file:///C:/Users/nidhi/.gemini/antigravity-cli/brain/ddfb8c47-f6ec-4648-abc9-821972249413/project_architecture_and_flow.md)** (Local Artifact)
