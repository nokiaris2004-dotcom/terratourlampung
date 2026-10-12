# Terra Tour

Landing page and lightweight Node.js backend for Terra Tour Lampung. Requires Node.js 18 or newer; there are no external npm dependencies.

## Run locally

```powershell
npm start
```

Open `http://localhost:3000`. The WhatsApp number provided by Terra Tour is configured by default. To override it, or to enable protected PDF uploads, set these values before starting the server:

```powershell
$env:WHATSAPP_NUMBER="628127289020"
$env:ARTICLE_UPLOAD_KEY="ganti-dengan-kunci-admin-yang-kuat"
npm start
```

The article upload form is protected by `ARTICLE_UPLOAD_KEY`; PDF files are limited to 8 MB. Uploaded PDFs and their titles are stored under `data/articles/` and `data/articles.jsonl`. New inquiries are appended to `data/inquiries.jsonl`. These local data files are ignored by Git. Production hosting must provide persistent storage and protect customer data with suitable access controls and retention policies.

The uploaded Terra Tour photos are used directly in the destination cards and Keunggulan section. Their destination mapping is documented in [assets/README.md](assets/README.md). Package cards intentionally do not display prices.

## GitHub

Create an empty repository on GitHub, then from this folder run `git init`, `git add .`, `git commit -m "Build Terra Tour landing page"`, `git branch -M main`, `git remote add origin <repository-url>`, then `git push -u origin main`. GitHub Actions runs backend tests on every push and pull request. The Node backend needs a Node.js host; GitHub Pages alone cannot run the inquiry API.

## API

- `GET /api/health` returns server health.
- `GET /api/config` returns the configured public WhatsApp number.
- `POST /api/contact` validates and saves an inquiry.