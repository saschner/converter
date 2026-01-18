document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("fileInput");
  const convertButton = document.getElementById("convertButton");
  const receiptButton = document.getElementById("receiptButton");
  const downloadCsvButton = document.getElementById("downloadCsvButton");

  const ocrOut = document.getElementById("ocrOut");
  const csvOut = document.getElementById("csvOut");

  // Safety checks
  if (!convertButton || !receiptButton || !downloadCsvButton) {
    console.error("Missing one or more required buttons:", {
      
       convertButton,console.log("script.js EXECUTING ✅");

const fileInput = document.getElementById("fileInput");
const convertButton = document.getElementById("convertButton");
const receiptButton = document.getElementById("receiptButton");
const downloadCsvButton = document.getElementById("downloadCsvButton");

convertButton.onclick = () => alert("Convert clicked");
receiptButton.onclick = () => alert("Receipt clicked");
downloadCsvButton.onclick = () => alert("Download clicked");
      receiptButton,
      downloadCsvButton,
    });
    return;
  }

  // Start with download disabled until we have data
  setDisabled(downloadCsvButton, true);

  const uiLog = (msg) => {
    console.log(msg);
    if (ocrOut) ocrOut.textContent = msg;
  };

  convertButton.addEventListener("click", async () => {
    try {
      lastMode = "generic";
      const file = getSelectedFile(fileInput);
      if (!file) return friendlyAlert("Please choose an image file first.");

      uiLog("Running OCR… (generic mode)");
      const text = await ocrImageToText(file, uiLog);

      const lines = normalizeLines(text);
      const rows = lines
        .filter((l) => l.trim().length > 0)
        .map((l, idx) => ({ line_number: idx + 1, text: l.trim() }));

      lastFilename = makeDownloadName(file.name, "generic");
      lastCsvText = toCsv(rows, ["line_number", "text"]);

      if (csvOut) csvOut.textContent = lastCsvText;
      setDisabled(downloadCsvButton, false);

      uiLog("✅ OCR complete. Ready to download CSV.");
    } catch (err) {
      console.error(err);
      friendlyAlert("OCR failed. Check Console for details.");
      uiLog("❌ OCR failed.");
    }
  });

  receiptButton.addEventListener("click", async () => {
    try {
      lastMode = "receipt";
      const file = getSelectedFile(fileInput);
      if (!file) return friendlyAlert("Please choose a receipt image first.");

      uiLog("Running OCR… (receipt mode)");
      const text = await ocrImageToText(file, uiLog);

      const parsed = parseReceipt(text);

      const rows = [];
      rows.push({
        record_type: "receipt",
        vendor: parsed.vendor || "",
        date: parsed.date || "",
        total: parsed.total || "",
        subtotal: parsed.subtotal || "",
        tax: parsed.tax || "",
        payment: parsed.payment || "",
        item: "",
        qty: "",
        price: "",
        amount: "",
      });

      for (const it of parsed.items) {
        rows.push({
          record_type: "item",
          vendor: parsed.vendor || "",
          date: parsed.date || "",
          total: parsed.total || "",
          subtotal: parsed.subtotal || "",
          tax: parsed.tax || "",
          payment: parsed.payment || "",
          item: it.item || "",
          qty: it.qty ?? "",
          price: it.price ?? "",
          amount: it.amount ?? "",
        });
      }

      lastFilename = makeDownloadName(file.name, "receipt");
      lastCsvText = toCsv(rows, [
        "record_type",
        "vendor",
        "date",
        "total",
        "subtotal",
        "tax",
        "payment",
        "item",
        "qty",
        "price",
        "amount",
      ]);

      if (csvOut) csvOut.textContent = lastCsvText;
      setDisabled(downloadCsvButton, false);

      uiLog("✅ Receipt OCR complete. Ready to download CSV.");
    } catch (err) {
      console.error(err);
      friendlyAlert("Receipt OCR failed. Check Console for details.");
      uiLog("❌ Receipt OCR failed.");
    }
  });

  downloadCsvButton.addEventListener("click", () => {
    if (!lastCsvText) return friendlyAlert("Nothing to download yet.");
    downloadText(lastCsvText, lastFilename, "text/csv;charset=utf-8");
  });

  if (fileInput) {
    fileInput.addEventListener("change", () => {
      setDisabled(downloadCsvButton, true);
      lastCsvText = "";
      lastFilename = "locallyconvert.csv";
      if (ocrOut) ocrOut.textContent = "";
      if (csvOut) csvOut.textContent = "";
    });
  }

  if (typeof window.Tesseract === "undefined") {
    console.warn("Tesseract is not loaded. OCR buttons will fail until you add it.");
  }

  console.log("script.js parsed to end ✅");
});

/* ------------------------
   Core OCR
------------------------- */

async function ocrImageToText(file, uiLog) {
  if (typeof window.Tesseract === "undefined") {
    throw new Error("Tesseract.js not found. Include it in index.html.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload an image (PNG/JPG/WebP).");
  }

  const { data } = await window.Tesseract.recognize(file, "eng", {
    logger: (m) => {
      if (m && typeof m.progress === "number") {
        uiLog?.(`OCR… ${Math.round(m.progress * 100)}%`);
      }
    },
  });

  return (data?.text || "").trim();
}

/* ------------------------
   Receipt parsing (heuristics)
------------------------- */

function parseReceipt(rawText) {
  const lines = normalizeLines(rawText).map((l) => l.trim()).filter(Boolean);
  return {
    vendor: findVendor(lines),
    date: findDate(lines),
    total: findMoneyAfterLabel(lines, ["total", "amount due", "balance due"]),
    subtotal: findMoneyAfterLabel(lines, ["subtotal", "sub total"]),
    tax: findMoneyAfterLabel(lines, ["tax", "sales tax"]),
    payment: findPaymentType(lines),
    items: extractLineItems(lines),
  };
}

function findVendor(lines) {
  const skip = new Set(["thank you", "thanks", "welcome", "receipt", "customer copy", "merchant copy"]);
  for (const l of lines.slice(0, 8)) {
    const lc = l.toLowerCase();
    if (lc.length < 3) continue;
    if (skip.has(lc)) continue;
    if (/^\d+$/.test(lc)) continue;
    if (/\d{3}[-)\s]\d{3}[-\s]\d{4}/.test(lc)) continue;
    if (/\b(st|ave|road|rd|blvd|suite|ste|fl)\b/i.test(l)) continue;
    return l;
  }
  return "";
}

function findDate(lines) {
  const patterns = [
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/,
    /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/,
    /\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{2,4})\b/i,
  ];
  for (const l of lines.slice(0, 30)) {
    for (const p of patterns) {
      const m = l.match(p);
      if (m) return m[0];
    }
  }
  return "";
}

function findMoneyAfterLabel(lines, labels) {
  for (const l of lines) {
    const lc = l.toLowerCase();
    if (!labels.some((lab) => lc.includes(lab))) continue;
    const money = extractMoneyTokens(l).pop();
    if (money) return money;
  }
  return "";
}

function findPaymentType(lines) {
  const joined = lines.join(" ").toLowerCase();
  if (joined.includes("visa")) return "VISA";
  if (joined.includes("mastercard") || joined.includes("mc")) return "MASTERCARD";
  if (joined.includes("amex") || joined.includes("american express")) return "AMEX";
  if (joined.includes("discover")) return "DISCOVER";
  if (joined.includes("cash")) return "CASH";
  if (joined.includes("debit")) return "DEBIT";
  if (joined.includes("credit")) return "CREDIT";
  return "";
}

function extractLineItems(lines) {
  const items = [];
  const skipLabels = ["total","subtotal","tax","amount due","balance due","change","tender","cash","credit","debit","visa","mastercard","amex","discover"];

  for (const l of lines) {
    const lc = l.toLowerCase();
    if (skipLabels.some((s) => lc.includes(s))) continue;

    const money = extractMoneyTokens(l);
    if (money.length === 0) continue;

    const cleaned = l.replace(/\s+/g, " ").trim();

    const m1 = cleaned.match(/^(.*)\b(\d+)\s*x\s*([$]?\d+\.\d{2})\s+([$]?\d+\.\d{2})\s*$/i);
    if (m1) {
      items.push({ item: m1[1].trim(), qty: Number(m1[2]), price: stripDollar(m1[3]), amount: stripDollar(m1[4]) });
      continue;
    }

    const trailing = cleaned.match(/^(.*\D)\s+([$]?\d+\.\d{2})\s*$/);
    if (trailing) {
      const name = trailing[1].trim();
      if (name.length >= 2) {
        items.push({ item: name, qty: "", price: "", amount: stripDollar(trailing[2]) });
      }
    }
  }

  return items.slice(0, 200);
}

/* ------------------------
   CSV + utilities
------------------------- */

function toCsv(rows, headers) {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines = [];
  lines.push(headers.map(esc).join(","));
  for (const r of rows) lines.push(headers.map((h) => esc(r[h])).join(","));
  return lines.join("\n");
}

function normalizeLines(text) {
  return String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

function extractMoneyTokens(s) {
  const matches = String(s).match(/[$]?\d+\.\d{2}/g);
  return matches ? matches : [];
}

function stripDollar(m) {
  return String(m || "").replace(/^\$/, "");
}

function makeDownloadName(originalName, mode) {
  const base = (originalName || "upload")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9_\-]+/gi, "_")
    .slice(0, 40);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `${base}_${mode}_${stamp}.csv`;
}

function downloadText(text, filename, mime) {
  const blob = new Blob([text], { type: mime || "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "download.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function setDisabled(el, disabled) {
  if (!el) return;
  el.disabled = !!disabled;
  el.style.opacity = disabled ? "0.5" : "1";
  el.style.cursor = disabled ? "not-allowed" : "pointer";
}

function friendlyAlert(msg) {
  alert(msg);
}

function getSelectedFile(fileInput) {
  if (!fileInput) return null;
  const files = fileInput.files;
  return files && files[0] ? files[0] : null;
}
