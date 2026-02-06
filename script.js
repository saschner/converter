// script.js — LocallyConvert (OCR + parse + downloads + redeem credits)

(() => {
  const fileInput = document.getElementById("fileInput");
  const ocrOut = document.getElementById("ocrOut");
  const csvOut = document.getElementById("csvOut");

  // Credit UI
  const trialPill = document.getElementById("trialPill");
  const creditsBadge = document.getElementById("creditsBadge");

  // Redeem UI
  const redeemOpenBtn = document.getElementById("redeemOpenBtn");
  const redeemOverlay = document.getElementById("redeemOverlay");
  const redeemCodeInput = document.getElementById("redeemCodeInput");
  const redeemApplyBtn = document.getElementById("redeemApplyBtn");
  const redeemCloseBtn = document.getElementById("redeemCloseBtn");
  const redeemMsg = document.getElementById("redeemMsg");

  // Download UI
  const downloadArea = document.getElementById("downloadArea");
  const downloadCsvBtn = document.getElementById("downloadCsvBtn");
  const downloadXlsxBtn = document.getElementById("downloadXlsxBtn");
  const downloadHint = document.getElementById("downloadHint");

  if (!fileInput || !ocrOut || !csvOut) {
    console.error("Required elements not found");
    return;
  }

  // -------------------------
  // Credits (localStorage)
  // -------------------------
  const LS_PAID = "lc_paid_credits_v1";
  const LS_TRIAL = "lc_trial_credits_v1";
  const LS_REDEEMED = "lc_redeemed_codes_v1";

  function getInt(key, fallback) {
    const raw = localStorage.getItem(key);
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : fallback;
  }

  function setInt(key, val) {
    localStorage.setItem(key, String(Math.max(0, Number(val) || 0)));
  }

  function getRedeemedSet() {
    try {
      const arr = JSON.parse(localStorage.getItem(LS_REDEEMED) || "[]");
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  }

  function saveRedeemedSet(set) {
    localStorage.setItem(LS_REDEEMED, JSON.stringify(Array.from(set)));
  }

  function ensureDefaults() {
    // Trial starts at 5 if never set
    if (localStorage.getItem(LS_TRIAL) === null) setInt(LS_TRIAL, 3);
    if (localStorage.getItem(LS_PAID) === null) setInt(LS_PAID, 0);
  }

  function updateCreditUI() {
    if (!trialPill || !creditsBadge) return;
    const trial = getInt(LS_TRIAL, 3);
    const paid = getInt(LS_PAID, 0);
    trialPill.textContent = `Free Credits: ${trial}`;
    creditsBadge.textContent = `Paid Credits: ${paid}`;
  }

  ensureDefaults();
  updateCreditUI();

  // -------------------------
  // Redeem Credit Codes
  // -------------------------
  // Format we accept:
  //   LC-10-XXXXXXXX-CC
  //   LC-50-XXXXXXXX-CC
  //   LC-100-XXXXXXXX-CC
  //
  // Where:
  //   XXXXXXXX = 8 chars [A-Z0-9]
  //   CC = 2-char checksum [A-Z0-9]
  //
  // This is not "unhackable" (no server), but it prevents random guessing
  // and blocks double-redeem on the same browser.
  const CODE_PREFIX = "LC";
  const SECRET = "lc-secret-v1-keep-private-ish"; // visible in JS; deterrent only

  function base36(n) {
    return (n >>> 0).toString(36).toUpperCase();
  }

  function checksum2(payload) {
    // tiny deterministic checksum
    let h = 0;
    const s = payload + "|" + SECRET;
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) >>> 0;
    }
    // 2 chars base36
    const out = base36(h);
    return out.slice(-2).padStart(2, "0");
  }

  function parseCreditCode(codeRaw) {
    const code = String(codeRaw || "").trim().toUpperCase();
    // LC-50-AB12CD34-EF
    const m = code.match(/^LC-(10|50|100)-([A-Z0-9]{8})-([A-Z0-9]{2})$/);
    if (!m) return { ok: false, reason: "That code format doesn’t look right." };

    const amount = Number(m[1]);
    const body = m[2];
    const cc = m[3];

    const payload = `LC-${amount}-${body}`;
    const expected = checksum2(payload);

    if (cc !== expected) return { ok: false, reason: "That code is invalid (checksum failed)." };

    return { ok: true, amount, code };
  }

  function openRedeem() {
    if (!redeemOverlay) return;
    redeemMsg.textContent = "";
    redeemMsg.style.color = "#334155";
    redeemCodeInput.value = "";
    redeemOverlay.style.display = "flex";
    setTimeout(() => redeemCodeInput?.focus(), 50);
  }

  function closeRedeem() {
    if (!redeemOverlay) return;
    redeemOverlay.style.display = "none";
  }

  function setRedeemMsg(text, good) {
    redeemMsg.textContent = text;
    redeemMsg.style.color = good ? "#166534" : "#7b2020";
  }

  function applyRedeem() {
    const parsed = parseCreditCode(redeemCodeInput.value);
    if (!parsed.ok) {
      setRedeemMsg(parsed.reason, false);
      return;
    }

    const redeemed = getRedeemedSet();
    if (redeemed.has(parsed.code)) {
      setRedeemMsg("That code was already redeemed in this browser.", false);
      return;
    }

    // Add credits
    const paid = getInt(LS_PAID, 0);
    setInt(LS_PAID, paid + parsed.amount);

    redeemed.add(parsed.code);
    saveRedeemedSet(redeemed);

    updateCreditUI();
    setRedeemMsg(`Success — added ${parsed.amount} paid credits.`, true);
  }

  redeemOpenBtn?.addEventListener("click", openRedeem);
  redeemCloseBtn?.addEventListener("click", closeRedeem);
  redeemApplyBtn?.addEventListener("click", applyRedeem);

  redeemCodeInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") applyRedeem();
    if (e.key === "Escape") closeRedeem();
  });

  redeemOverlay?.addEventListener("click", (e) => {
    if (e.target === redeemOverlay) closeRedeem();
  });

  // -------------------------
  // Downloads (CSV + XLSX)
  // -------------------------
  let downloadUrls = { csv: null, xlsx: null };

  function cleanupDownloadUrls() {
    if (downloadUrls.csv) URL.revokeObjectURL(downloadUrls.csv);
    if (downloadUrls.xlsx) URL.revokeObjectURL(downloadUrls.xlsx);
    downloadUrls = { csv: null, xlsx: null };
  }

  function hideDownloads() {
    if (downloadArea) downloadArea.style.display = "none";
    if (downloadHint) downloadHint.textContent = "";
    if (downloadCsvBtn) {
      downloadCsvBtn.href = "#";
      downloadCsvBtn.style.pointerEvents = "none";
      downloadCsvBtn.style.opacity = ".5";
    }
    if (downloadXlsxBtn) {
      downloadXlsxBtn.href = "#";
      downloadXlsxBtn.style.pointerEvents = "none";
      downloadXlsxBtn.style.opacity = ".5";
    }
  }

  function showDownloads({ csvText, rowsAoa, baseName = "locallyconvert-output" }) {
    if (!downloadArea || !downloadCsvBtn || !downloadXlsxBtn || !downloadHint) return;

    cleanupDownloadUrls();

    // CSV
    if (typeof csvText === "string" && csvText.trim().length) {
      const csvBlob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
      downloadUrls.csv = URL.createObjectURL(csvBlob);
      downloadCsvBtn.href = downloadUrls.csv;
      downloadCsvBtn.download = `${baseName}.csv`;
      downloadCsvBtn.style.pointerEvents = "auto";
      downloadCsvBtn.style.opacity = "1";
    }

    // XLSX
    if (window.XLSX && Array.isArray(rowsAoa) && rowsAoa.length) {
      const ws = XLSX.utils.aoa_to_sheet(rowsAoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data");

      const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const xlsxBlob = new Blob([arrayBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      downloadUrls.xlsx = URL.createObjectURL(xlsxBlob);
      downloadXlsxBtn.href = downloadUrls.xlsx;
      downloadXlsxBtn.download = `${baseName}.xlsx`;
      downloadXlsxBtn.style.pointerEvents = "auto";
      downloadXlsxBtn.style.opacity = "1";
    }

    downloadHint.textContent = "Downloads are created locally in your browser.";
    downloadArea.style.display = "block";
  }

  window.addEventListener("beforeunload", cleanupDownloadUrls);

  // -------------------------
  // OCR + Parse
  // -------------------------
  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    cleanupDownloadUrls();
    hideDownloads();

    ocrOut.value = "Reading image…";
    csvOut.value = "";

    try {
      const { data } = await Tesseract.recognize(file, "eng");
      const text = (data?.text || "").trim();

      ocrOut.value = text || "(No text detected)";

      const { csvText, rowsAoa } = textToCsvAndRows(text);
      csvOut.value = csvText || "(Nothing to parse)";

      if (csvText && csvText.trim().length) {
        showDownloads({ csvText, rowsAoa, baseName: "locallyconvert-output" });
      }
    } catch (err) {
      console.error(err);
      ocrOut.value = "OCR error:\n" + (err?.message || String(err));
      csvOut.value = "";
      cleanupDownloadUrls();
      hideDownloads();
    } finally {
      fileInput.value = "";
    }
  });

  function textToCsvAndRows(text) {
    if (!text) return { csvText: "", rowsAoa: [] };

    const lines = text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);

    const rowsAoa = lines.map(line => line.split(/\s+/).map(String));
    const csvText = rowsAoa.map(r => r.map(csvEscape).join(",")).join("\n");

    return { csvText, rowsAoa };
  }

  function csvEscape(v) {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  // -------------------------
  // Optional: a helper to generate codes (for YOU, in the browser console)
  // Usage in DevTools console:
  //   LocallyConvertMakeCode(50)
  // -------------------------
  window.LocallyConvertMakeCode = function(amount) {
    const allowed = new Set([10, 50, 100]);
    if (!allowed.has(Number(amount))) {
      return "Use 10, 50, or 100";
    }
    const rand = Array.from({ length: 8 }, () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      return chars[Math.floor(Math.random() * chars.length)];
    }).join("");

    const payload = `LC-${Number(amount)}-${rand}`;
    const cc = checksum2(payload);
    return `${payload}-${cc}`;
  };
})();


