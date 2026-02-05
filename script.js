// script.js — LocallyConvert (locked + visible CSV)

(() => {
  const fileInput = document.getElementById("fileInput");
  const ocrOut = document.getElementById("ocrOut");
  const csvOut = document.getElementById("csvOut");

  if (!fileInput || !ocrOut || !csvOut) {
    console.error("Required elements not found");
    return;
  }

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    ocrOut.value = "Reading image…";
    csvOut.value = "";

    try {
      const { data } = await Tesseract.recognize(file, "eng");
      const text = (data?.text || "").trim();

      ocrOut.value = text || "(No text detected)";
      csvOut.value = textToCsv(text) || "(Nothing to parse)";
    } catch (err) {
      console.error(err);
      ocrOut.value = "OCR error:\n" + (err?.message || String(err));
      csvOut.value = "";
    } finally {
      // allow re-selecting the same file
      fileInput.value = "";
    }
  });

  function textToCsv(text) {
    if (!text) return "";

    const lines = text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);

    const rows = lines.map(line =>
      line.split(/\s+/).map(csvEscape)
    );

    return rows.map(r => r.join(",")).join("\n");
  }

  function csvEscape(v) {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }
})();

