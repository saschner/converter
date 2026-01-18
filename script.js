console.log("script.js loaded ✅");

let lastCsvText = "";
let lastFilename = "locallyconvert.csv";

const fileInput = document.getElementById("fileInput");
const convertButton = document.getElementById("convertButton");
const receiptButton = document.getElementById("receiptButton");
const downloadCsvButton = document.getElementById("downloadCsvButton");
const ocrOut = document.getElementById("ocrOut");
const csvOut = document.getElementById("csvOut");

if (!convertButton || !receiptButton || !downloadCsvButton) {
  console.error("Buttons not found");
}

downloadCsvButton.disabled = true;

function alertUser(msg) {
  alert(msg);
}

function downloadCSV(text, filename) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Process text into CSV - words get dashes, everything else stays as-is
function processLineToCSV(line) {
  const tokens = line.trim().split(/\s+/); // Split by whitespace
  const fields = [];
  
  for (let token of tokens) {
    // Check if token contains numbers or symbols
    if (/[0-9$.,!@#%^&*()_+=\-\[\]{};:'",.<>?/\\|`~]/.test(token)) {
      // Has numbers/symbols - keep as-is
      fields.push(token);
    } else {
      // Pure words - will be joined with dashes
      fields.push(token);
    }
  }
  
  // Join fields with commas, escape any fields containing commas
  return fields.map(f => {
    if (f.includes(',')) {
      return `"${f}"`;
    }
    return f;
  }).join(',');
}

async function runOCR(file) {
  if (!window.Tesseract) {
    alertUser("Tesseract not loaded");
    return "";
  }

  if (ocrOut) ocrOut.textContent = "Starting OCR...";

  const { data } = await Tesseract.recognize(file, "eng", {
    logger: m => {
      if (m.progress && ocrOut) {
        ocrOut.textContent = `OCR ${Math.round(m.progress * 100)}%`;
      }
    }
  });

  return data.text || "";
}

convertButton.onclick = async () => {
  if (!fileInput.files.length) {
    alertUser("Choose an image first");
    return;
  }

  const text = await runOCR(fileInput.files[0]);
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  // Convert each line to CSV format
  const csvLines = lines.map(line => processLineToCSV(line));
  lastCsvText = csvLines.join("\n");

  lastFilename = "locallyconvert.csv";
  if (csvOut) csvOut.textContent = lastCsvText;
  if (ocrOut) ocrOut.textContent = "✅ OCR complete. Ready to download CSV.";
  downloadCsvButton.disabled = false;
};

receiptButton.onclick = convertButton.onclick;

downloadCsvButton.onclick = () => {
  if (!lastCsvText) {
    alertUser("Nothing to download yet");
    return;
  }
  downloadCSV(lastCsvText, lastFilename);
};
