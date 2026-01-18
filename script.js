/* script.js — LocallyConvert (working baseline)
   Expects these elements (IDs):
   - fileInput (type="file")  [optional but recommended]
   - convertButton
   - receiptButton
   - downloadCsvButton
   Optional output areas:
   - ocrOut (pre/div/textarea)
   - csvOut (pre/div/textarea)
*/

console.log("script.js loaded ✅");

let lastCsvText = "";
let lastFilename = "locallyconvert.csv";
let lastMode = ""; // "generic" | "receipt"

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
      convertButton,
      receiptButton,
      downloadCsvButton,
    });
    return;
  }

  // Start with download disabled until we have data
