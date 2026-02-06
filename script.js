// script.js — LocallyConvert (locked + visible CSV + downloads)

(() => {
  const fileInput = document.getElementById("fileInput");
  const ocrOut = document.getElementById("ocrOut");
  const csvOut = document.getElementById("csvOut");

  // Download UI (added in index.html)
  const downloadArea = document.getElementById("downloadArea");
  const downloadCsvBtn = document.getElementById("downloadCsvBtn");
  const downloadXlsxBtn = document.getElementById("downloadXlsxBtn");
  const downloadHint = document.getElementById("downloadHint");

  if (!fileInput || !ocrOut || !csvOut) {
    console.error("Required elements not found");
    return;
  }

  // ---- Download helpers ----
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
    // If the UI isn’t present (someone removed it), just no-op gracefully.
    if (!downloadArea || !downloadCsvBtn || !downloadXlsxBtn || !downloadHint) return;

    // Clear previous URLs so you don’t leak memory
    cleanupDownloadUrls();

    // --- CSV ---
    if (typeof csvText === "string" && csvText.trim().length) {
      const csvBlob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
      downloadUrls.csv = URL.createObjectURL(csvBlob);
      downloadCsvBtn.href = downloadUrls.csv;
      downloadCsvBtn.download = `${baseName}.csv`;
      downloadCsvBtn.style.pointerEvents = "auto";
      downloadCsvBtn.style.opacity = "1";
    } else {
      downloadCsvBtn.href = "#";
      downloadCsvBtn.download = `${baseName}.csv`;
      downloadCsvBtn.style.pointerEvents = "none";
      downloadCsvBtn.style.opacity = ".5";
    }

    // --- XLSX (requires SheetJS / XLSX global) ---
    // We generate a sheet from array-of-arrays (AOA), which is what your parser naturally creates.
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
    } else {
      downloadXlsxBtn.href = "#";
      downloadXlsxBtn.download = `${baseName}.xlsx`;
      downloadXlsxBtn.style.pointerEvents = "none";
      downloadXlsxBtn.style.opacity = ".5";
    }

    downloadHint.textContent = "Downloads are created locally in your browser.";
    downloadArea.style.display = "block";
  }

  // Optional: cleanup blob URLs when navigating away
  window.addEventListener("beforeunload", cleanupDownloadUrls);

  // ---- Main flow ----
  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // Reset UI state for a new run
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

      // Only show downloads if we have something real
      if (csvText && csvText.trim().length) {
        showDownloads({
          csvText,
          rowsAoa,
          baseName: "locallyconvert-output",
        });
      }
    } catch (err) {
      console.error(err);
      ocrOut.value = "OCR error:\n" + (err?.message || String(err));
      csvOut.value = "";
      cleanupDownloadUrls();
      hideDownloads();
    } finally {
      // allow re-selecting the same file
      fileInput.value = "";
    }
  });

  function textToCsvAndRows(text) {
    if (!text) return { csvText: "", rowsAoa: [] };

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    // Array-of-arrays (AOA): each line becomes a row, split into tokens
    const rowsAoa = lines.map((line) => line.split(/\s+/).map(String));

    // CSV string (escaped)
    const csvText = rowsAoa
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");

    return { csvText, rowsAoa };
  }

  function csvEscape(v) {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }
})();


