import PDFParser from "pdf2json";
const Verbose = false;

const ParseCurrency = (currency_str) =>
  parseFloat(currency_str.replace(",", ""));

function ParseRawJSON(pdfData) {
  let fundlist = [];
  let pdfpan = "";
  let curfund = null;
  let curtrans = {};
  let stage = 0;
  let widthFactor = pdfData.formImage.Width / (8.5 * 72);

  if (Verbose) console.log("WidthFactor = " + widthFactor);

  for (const pdfPageIdx in pdfData.formImage.Pages) {
    let entryheaders = {};
    let pdfPage = pdfData.formImage.Pages[pdfPageIdx];

    for (const pdfTextIdx in pdfPage.Texts) {
      let pdfText = pdfPage.Texts[pdfTextIdx];

      // Get table positions
      if (Object.keys(entryheaders).length < 5) {
        if (pdfText.R[0].T === "Date") {
          entryheaders[pdfText.R[0].T] = pdfText.x;
        } else if (
          pdfText.R[0].T === "Amount" ||
          pdfText.R[0].T === "Price" ||
          pdfText.R[0].T === "Balance" ||
          pdfText.R[0].T === "Units"
        ) {
          entryheaders[pdfText.R[0].T] = pdfText.x + pdfText.w * widthFactor;
        }
      }
      // Got table positions and entries not started yet
      else if (stage == 0) {
        //  Get folio
        if (pdfText.R[0].T.startsWith("Folio%20No")) {
          let folioNo = decodeURIComponent(pdfText.R[0].T.substr(16));
          let panIdxMin = pdfTextIdx - 30;
          let panIdx = pdfTextIdx - 3;
          let panStr = pdfPage.Texts[panIdx].R[0].T;

          if (panIdxMin < 0) panIdxMin = 0;

          // Since PAN entry may not exist, stop at KYC
          while (
            panIdx > panIdxMin &&
            !panStr.startsWith("PAN") &&
            !panStr.startsWith("KYC")
          ) {
            panIdx--;
            panStr = pdfPage.Texts[panIdx].R[0].T;
          }

          // If PAN exists, it is behind KYC
          if (panStr.startsWith("KYC")) {
            panIdx--;
            panStr = pdfPage.Texts[panIdx].R[0].T;
          }

          let fundNameIdx = panIdx + 2;
          let fundNameStr = "";

          while (
            fundNameIdx < pdfTextIdx &&
            !pdfPage.Texts[fundNameIdx].R[0].T.startsWith("Registrar")
          ) {
            fundNameStr =
              fundNameStr +
              decodeURIComponent(pdfPage.Texts[fundNameIdx].R[0].T);
            fundNameIdx++;
          }

          // Slight cleanup : remove spaces in the code
          let fundNameArr = fundNameStr.split("-");

          fundNameArr[0] = fundNameArr[0].split(" ").join("");
          fundNameStr = fundNameArr.join("-");

          curfund = {
            Name: fundNameStr,
            Labels: { Folio: folioNo },
            Transactions: [],
          };

          if (panStr.startsWith("PAN")) {
            pdfpan = curfund.Labels.PAN = decodeURIComponent(panStr.substr(9));
          } else {
            curfund.Labels.PAN = pdfpan;
          }

          fundlist.push(curfund);
        } else if (pdfText.R[0].T.startsWith("%20Opening")) {
          ++stage;
          curtrans = {};
        }
      }
      // Reading table entries
      else if (stage == 1) {
        if (pdfText.R[0].T.startsWith("NAV")) {
          --stage;
        } else {
          let paramDist = 1;
          let chosen = -1;
          for (let param in entryheaders) {
            let tokenPos = pdfText.x;
            if (param != "Date") {
              tokenPos += pdfText.w * widthFactor;
            }
            if (Math.abs(entryheaders[param] - tokenPos) < paramDist) {
              paramDist = Math.abs(entryheaders[param] - tokenPos);
              chosen = param;
            }
          }
          if (chosen != -1) {
            if (curtrans[chosen] != null) {
              if (Verbose)
                console.log(
                  fundlist.length + " - Incomplete entry " + curtrans.Date
                );
              curtrans = {};
            }
            if (chosen == "Date") {
              curtrans[chosen] = pdfText.R[0].T;
            } else {
              let valueStr = decodeURIComponent(pdfText.R[0].T);

              if (valueStr.includes("("))
                curtrans[chosen] = -ParseCurrency(
                  valueStr.substr(1, valueStr.length - 2)
                );
              else curtrans[chosen] = ParseCurrency(valueStr);
            }
            if (Verbose) console.log(chosen + " : " + pdfText.R[0].T);
          }

          if (Object.keys(curtrans).length == 5) {
            if (Verbose)
              console.log(
                fundlist.length + " - Pushing entry " + curtrans.Date
              );
            curfund.Transactions.push(curtrans);
            curtrans = {};
          }
        }
      }
    }
  }

  return fundlist;
}

export default (filepath, pdf_pass, out_cb) => {
  const filename = filepath.split("\\").pop().split("/").pop();
  console.log(filepath, pdf_pass);
  let pdfParser = new PDFParser(null, false);
  pdfParser.setPassword(pdf_pass);
  var outData = {};

  pdfParser.on("pdfParser_dataError", (errData) => {
    outData["Success"] = false;
    outData["Reason"] = errData.parserError;
    out_cb(outData);
  });
  pdfParser.on("pdfParser_dataReady", (pdfData) => {
    if (outData.Success == undefined) {
      if (Verbose) console.log("Begin parsing structure for " + filename);
      outData["Output"] = ParseRawJSON(pdfData);
      if (outData.Output == undefined) {
        outData["Success"] = false;
        outData["Reason"] =
          "Couldn't parse CAS structure from file, unsupported PDF.";
      }
      outData["Success"] = true;
      out_cb(outData);
    }
  });

  if (Verbose) console.log("Opening PDF file " + filename);
  pdfParser.loadPDF(filepath.toString(), { password: pdf_pass.toString() });
};
