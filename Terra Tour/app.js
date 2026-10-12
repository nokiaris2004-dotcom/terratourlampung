const form = document.querySelector("#inquiry-form");
const feedback = document.querySelector(".form-feedback");
const toast = document.querySelector(".toast");
const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");
let whatsappNumber = "628127289020";

document.querySelector("#year").textContent = new Date().getFullYear();

fetch("api/config")
  .then((response) => response.ok ? response.json() : Promise.reject())
  .then((config) => { whatsappNumber = config.whatsappNumber || ""; })
  .catch(() => {});

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.setTimeout(() => toast.classList.remove("visible"), 3800);
}

document.querySelectorAll(".whatsapp-link").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    if (!whatsappNumber) {
      showToast("Nomor WhatsApp belum diatur. Silakan kirim rencana lewat formulir.");
      document.querySelector("#kontak").scrollIntoView({ behavior: "smooth" });
      return;
    }
    const message = encodeURIComponent(link.dataset.message || "Halo Terra Tour!");
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, "_blank", "noopener,noreferrer");
  });
});

menuToggle.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

mainNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = form.querySelector("button[type='submit']");
  const data = Object.fromEntries(new FormData(form).entries());
  submitButton.disabled = true;
  feedback.textContent = "Mengirim rencana perjalanan...";

  try {
    const response = await fetch("api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Rencana belum berhasil dikirim.");
    feedback.textContent = "Rencana terkirim. Tim Terra Tour akan segera menghubungimu.";
    form.reset();
    if (whatsappNumber) {
      const message = encodeURIComponent(`Halo Terra Tour, saya ${data.name} (${data.phone}) tertarik dengan ${data.destination}. ${data.message || ""}`);
      window.open(`https://wa.me/${whatsappNumber}?text=${message}`, "_blank", "noopener,noreferrer");
    }
  } catch (error) {
    feedback.textContent = error.message || "Tidak dapat terhubung. Coba lagi sebentar.";
  } finally {
    submitButton.disabled = false;
  }
});

const articleList = document.querySelector("#article-list");
const articleUpload = document.querySelector("#article-upload");
const uploadToggle = document.querySelector("#article-add-toggle");

function renderArticles(articles) {
  articleList.replaceChildren();
  if (!articles.length) {
    const empty = document.createElement("p");
    empty.className = "article-empty";
    empty.textContent = "Belum ada jurnal terbit. Unggah PDF pertama untuk mengisi ruang ini.";
    articleList.append(empty);
    return;
  }

  articles.forEach((article) => {
    const entry = document.createElement("article");
    entry.className = "article-entry";
    const date = document.createElement("span");
    date.className = "article-date";
    date.textContent = new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(article.uploadedAt));
    const title = document.createElement("h3");
    title.textContent = article.title;
    const filename = document.createElement("p");
    filename.textContent = article.fileName;
    const link = document.createElement("a");
    link.className = "article-read";
    link.href = article.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "Baca jurnal PDF ↗";
    entry.append(date, title, filename, link);
    articleList.append(entry);
  });
}

async function loadArticles() {
  try {
    const response = await fetch("api/articles");
    if (!response.ok) throw new Error();
    const result = await response.json();
    renderArticles(result.articles || []);
  } catch {
    const empty = document.createElement("p");
    empty.className = "article-empty";
    empty.textContent = "Daftar artikel tersedia saat website dijalankan melalui server Terra Tour.";
    articleList.replaceChildren(empty);
  }
}

uploadToggle.addEventListener("click", () => {
  const isOpen = articleUpload.hidden;
  articleUpload.hidden = !isOpen;
  uploadToggle.setAttribute("aria-expanded", String(isOpen));
  if (isOpen) articleUpload.querySelector("input[name='title']").focus();
});

document.querySelector("#article-upload-close").addEventListener("click", () => {
  articleUpload.hidden = true;
  uploadToggle.setAttribute("aria-expanded", "false");
});

articleUpload.addEventListener("submit", async (event) => {
  event.preventDefault();
  const feedback = articleUpload.querySelector(".upload-feedback");
  const submitButton = articleUpload.querySelector("button[type='submit']");
  const formData = new FormData(articleUpload);
  const file = formData.get("pdf");
  if (!file || file.type !== "application/pdf" || file.size > 8 * 1024 * 1024) {
    feedback.textContent = "Pilih file PDF valid dengan ukuran maksimal 8 MB.";
    return;
  }

  submitButton.disabled = true;
  feedback.textContent = "Mengunggah jurnal...";
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    const response = await fetch("api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": formData.get("uploadKey") },
      body: JSON.stringify({ title: formData.get("title"), fileName: file.name, pdfBase64: btoa(binary) }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Artikel belum berhasil diunggah.");
    articleUpload.reset();
    feedback.textContent = "Artikel berhasil diterbitkan.";
    await loadArticles();
  } catch (error) {
    feedback.textContent = error.message || "Tidak dapat terhubung. Coba lagi sebentar.";
  } finally {
    submitButton.disabled = false;
  }
});

loadArticles();