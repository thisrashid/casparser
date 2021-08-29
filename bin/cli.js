import casParser from "../js/casparser.js";

if (process.argv.length < 4) {
  console.log("Usage : node casparser.js file password [-csv] [-gain]\n");
} else {
  var filepath;
  var pass;
  var formatCsv = false;
  var gainStatement = false;

  for (const argIdx in process.argv) {
    var arg = process.argv[argIdx];

    // Skup first 2 arguments
    if (argIdx == "0" || argIdx == "1") continue;
    if (!arg.startsWith("-")) {
      if (filepath == undefined) {
        filepath = arg;
      } else if (pass == undefined) {
        pass = arg;
      } else {
        console.log("Unknown argument : " + arg);
        console.log("Usage : node casparser.js file password [-csv] [-gain]\n");
      }
    } else if (arg == "-csv") {
      formatCsv = true;
    } else if (arg == "-gain") {
      gainStatement = true;
    } else {
      console.log("Unknown argument : " + arg);
      console.log("Usage : node casparser.js file password [-csv] [-gain]\n");
    }
  }

  casParser({
    filepath,
    pass,
    formatCsv,
    gainStatement,
    callback: (status, message) => console.log(status, message),
  });
}
