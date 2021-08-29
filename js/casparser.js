import ConvertToCSV from "./convertToCsv.js";
import { existsSync, writeFile } from "fs";
import loadPdf from "./loadPdf.js";

export default ({
  filepath,
  pass,
  formatCsv = false,
  gainStatement = false,
  callback,
}) => {
  if (!filepath) {
    throw Error(`'filepath' is required`);
  }

  loadPdf(filepath, pass, (pdf) => {
    if (pdf.Success) {
      console.log(
        "Parse Success : Data for " + pdf.Output.length + " funds found."
      );

      const outFile = filepath + (formatCsv ? ".csv" : ".json");
      var outData;

      if (existsSync(outFile)) {
        console.log("Write Failed : File " + outFile + " already exists.");
        callback(false, "Write Failed : File " + outFile + " already exists.");
      } else {
        outData = formatCsv
          ? ConvertToCSV(pdf.Output, gainStatement)
          : JSON.stringify(pdf.Output);

        writeFile(outFile, outData, (err) => {
          if (err) {
            console.log("An error ocurred creating the file " + err.message);
            callback(false, err.message);
          } else {
            console.log("The file has been succesfully saved");
            callback(true);
          }
        });
      }
    } else {
      console.log("Failed : " + pdf.Reason);
      callback(false, pdf.Reason);
    }
  });
};

// exports.casParser({
//   filepath: "cams.pdf",
//   pass: "12345678",
//   formatCsv: true,
//   callback: (status, message) => console.log(status, message),
// });
