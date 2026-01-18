console.log("script.js running ✅");

/* ---------- STATE ---------- */
let lastCsvText = "";
let lastFilename = "locallyconvert.csv";

/* ---------- ELEMENTS ---------- */
const fileInput = document.getElementById("fileInput");
const convertButton = document.getElementById("convertButton");
const receiptButton = document.getElementById("receiptButton");
const downloadCsvButton = document.getElementById("downloadCsvButton");
const ocrOut = document.getElementById("ocrOut");
const csvOut = document.getElementById("csvOut");

/* ---------- SAFETY ---------- */
if (!convertButton || !receiptButton || !downloadCsvButton) {
  console.error("Buttons not found");
}

/* ---------- HELPERS ---------- */
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

function splitLine(line) {
  // Split into date / description / amount if possible
  const match = line.match(
    /^(\d{2}-\d{2}-\d{2})?\s*(.*?)\s+(\$?\d+\.\d{2})$/
  );
  if (match) {
    return {
      date: match[1] || "",
      description: match[2],
      amount: match[3]
    };
  }
  return {
    date: "",
    description: line,
    amount: ""
  };
}

/* ---------- OCR ---------- */
async function runOCR(file) {
  if (!window.Tesseract) {
    alertUser("Tesseract not loaded");
    return "";
  }

  const { data } = await Tesseract.recognize(file, "eng", {
    logger: m => {
      if (m.progress && ocrOut) {
        ocrOut.textContent = `OCR ${Math.round(m.progress * 100)}%`;
      }
    }
  });

  return data.text || "";
}

/* ---------- BUTTONS ---------- */

convertButton.onclick = async () => {
  if (!fileInput.files.length) {
    alertUser("Choose an image first");
    return;
  }

  const text = await runOCR(fileInput.files[0]);
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  const rows = lines.map((line, i) => {
    const parsed = splitLine(line);
    return {
      line: i + 1,
      date: parsed.date,
      description: parsed.description,
      amount: parsed.amount
    };
  });

  const headers = ["line", "date", "description", "amount"];
  lastCsvText =
    headers.join(",") +
    "\n" +
    rows
      .map(r =>
        [r.line, r.date, r.description, r.amount]
          .map(v => `"${v}"`)
          .join(",")
      )
      .join("\n");

  lastFilename = "locallyconvert.csv";
  if (csvOut) csvOut.textContent = lastCsvText;
  if (ocrOut) ocrOut.textContent = "OCR complete. Ready to download CSV.";
};

receiptButton.onclick = convertButton.onclick;

downloadCsvButton.onclick = () => {
  if (!lastCsvText) {
    alertUser("Nothing to download yet");
    return;
  }
  downloadCSV(lastCsvText, lastFilename);
};
