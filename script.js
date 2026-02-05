// script.js — LocallyConvert
(() => {
  const fileInput = document.getElementById("fileInput");
  const ocrOut = document.getElementById("ocrOut");
  const csvOut = document.getElementById("csvOut");

  if (!fileInput || !ocrOut || !csvOut) return;

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    ocrOut.value = "Reading image…";
    csvOut.value = "";

    try {
      // OCR
      const { data } = await Tesseract.recognize(file, "eng");
      const text = (data && data.text ? data.text : "").trim();

      ocrOut.value = text || "(No text detected)";

      // Parse to CSV (simple + robust)
      const csv = textToCsv(text);
      csvOut.value = csv || "(Nothing to parse)";
    } catch (err) {
      ocrOut.value = "OCR error:\n" + (err?.message || String(err));
      csvOut.value = "";
      console.error(err);
    } finally {
      // allow selecting same file again
      fileInput.value = "";
    }
  });

  function textToCsv(text) {
    if (!text) return "";

    const lines = text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return "";

    // If it looks like columns (multiple spaces), split on 2+ spaces.
    const rows = lines.map(line => {
      const cols = line.split(/\s{2,}|\t+/).map(c => c.trim()).filter(Boolean);
      return cols.length > 1 ? cols : [line];
    });

    const maxCols = Math.max(...rows.map(r => r.length));
    const normalized = rows.map(r => {
      const out = r.slice();
      while (out.length < maxCols) out.push("");
      return out;
    });

    return normalized.map(r => r.map(csvEscape).join(",")).join("\n");
  }

  function csvEscape(v) {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }
})();

