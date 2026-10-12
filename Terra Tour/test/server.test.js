const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { createServer } = require("../server");

let server;
let baseUrl;
let dataDirectory;

before(async () => {
  dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "terra-tour-test-"));
  server = createServer({ dataDirectory, whatsappNumber: "+62 812-3456-7890", articleUploadKey: "test-secret" });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await fs.rm(dataDirectory, { recursive: true, force: true });
});

test("serves landing page and public WhatsApp configuration", async () => {
  const page = await fetch(baseUrl);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Lampung, lebih dekat/);
  const config = await fetch(`${baseUrl}/api/config`);
  assert.deepEqual(await config.json(), { whatsappNumber: "6281234567890" });
});

test("valid inquiry is saved as a JSON line", async () => {
  const response = await fetch(`${baseUrl}/api/contact`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Nadia", phone: "08123456789", destination: "Pulau Pahawang", message: "Dua orang" }) });
  assert.equal(response.status, 201);
  assert.equal((await response.json()).ok, true);
  const [savedInquiry] = (await fs.readFile(path.join(dataDirectory, "inquiries.jsonl"), "utf8")).trim().split("\n");
  assert.equal(JSON.parse(savedInquiry).destination, "Pulau Pahawang");
});

test("rejects inquiries missing required fields", async () => {
  const response = await fetch(`${baseUrl}/api/contact`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Nadia" }) });
  assert.equal(response.status, 400);
});

test("protects article uploads and publishes valid PDFs", async () => {
  const payload = { title: "Panduan Pulau Wayang", fileName: "panduan.pdf", pdfBase64: Buffer.from("%PDF-1.4\nTerra Tour journal").toString("base64") };
  const unauthorized = await fetch(`${baseUrl}/api/articles`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  assert.equal(unauthorized.status, 401);

  const upload = await fetch(`${baseUrl}/api/articles`, { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": "test-secret" }, body: JSON.stringify(payload) });
  assert.equal(upload.status, 201);
  const { article } = await upload.json();
  assert.equal(article.title, payload.title);

  const publishedPdf = await fetch(`${baseUrl}${article.url}`);
  assert.equal(publishedPdf.headers.get("content-type"), "application/pdf");
  assert.equal(Buffer.from(await publishedPdf.arrayBuffer()).toString("ascii"), "%PDF-1.4\nTerra Tour journal");
  const listing = await fetch(`${baseUrl}/api/articles`);
  assert.equal((await listing.json()).articles[0].title, payload.title);
});

test("rejects uploaded files that are not PDFs", async () => {
  const response = await fetch(`${baseUrl}/api/articles`, { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": "test-secret" }, body: JSON.stringify({ title: "File palsu", fileName: "jurnal.pdf", pdfBase64: Buffer.from("not a pdf").toString("base64") }) });
  assert.equal(response.status, 400);
});