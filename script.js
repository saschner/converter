// script.js
console.log("script.js loaded ✅");

document.addEventListener("DOMContentLoaded", () => {
  const convertButton = document.getElementById("convertButton");
  const receiptButton = document.getElementById("receiptButton");
  const downloadCsvButton = document.getElementById("downloadCsvButton");

  if (!convertButton || !receiptButton || !downloadCsvButton) {
    console.error("One or more buttons not found:", {
      convertButton,
      receiptButton,
      downloadCsvButton
    });
    return;
  }

  convertButton.addEventListener("click", () => {
    console.log("Convert button clicked");
    alert("Convert clicked (wiring works)");
  });

  receiptButton.addEventListener("click", () => {
    console.log("Receipt button clicked");
    alert("Receipt clicked (wiring works)");
  });

  downloadCsvButton.addEventListener("click", () => {
    console.log("Download button clicked");
    alert("Download clicked (wiring works)");
  });
});
