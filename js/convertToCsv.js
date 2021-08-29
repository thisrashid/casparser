function GetFinYear(dateStr) {
  let tDate = new Date(dateStr);
  if (tDate.getMonth() >= 3) {
    return "" + (1 + tDate.getFullYear());
  } else {
    return "" + tDate.getFullYear();
  }
}

function PrepareGainsCSV(fundList) {
  let csvOutput =
    '"PAN","Fund","Units","Sell Date","Sell Price","Sell Amount","Buy Date","Buy Price","Cost Amount","Gain/Loss","Duration (Years)","FY",\n';

  for (let fIdx in fundList) {
    let fund = fundList[fIdx];
    let unitCount = [];

    // fund realized gain/loss
    for (let tIdx in fund.Transactions) {
      let trans = fund.Transactions[tIdx];

      if (trans.Units > 0) {
        // It's a buy
        unitCount.push({
          Price: trans.Price,
          Units: trans.Units,
          Date: trans.Date,
        });
      } else {
        let redeemUnits = -trans.Units;

        while (redeemUnits > 0 && unitCount.length > 0) {
          let sellDate = trans.Date;
          let sellPrice = trans.Price;
          let buyDate = unitCount[0].Date;
          let buyPrice = unitCount[0].Price;
          let durationInYears =
            (new Date(sellDate).getTime() - new Date(buyDate).getTime()) /
            (1000 * 3600 * 24 * 365);
          let gainUnits = 0;
          let gainAmount = 0;

          if (unitCount[0].Units > redeemUnits) {
            gainUnits = redeemUnits;
            gainAmount = (trans.Price - unitCount[0].Price) * gainUnits;
            unitCount[0].Units -= redeemUnits;
            redeemUnits = 0;
          } else {
            gainUnits = unitCount[0].Units;
            gainAmount = (trans.Price - unitCount[0].Price) * gainUnits;
            redeemUnits -= unitCount[0].Units;
            unitCount.shift();
          }

          let fYear = GetFinYear(sellDate);

          csvOutput +=
            '"' +
            fund.Labels.PAN +
            '",' +
            '"' +
            fund.Name +
            '",' +
            '"' +
            gainUnits +
            '",' +
            '"' +
            sellDate +
            '",' +
            '"' +
            sellPrice +
            '",' +
            '"' +
            sellPrice * gainUnits +
            '",' +
            '"' +
            buyDate +
            '",' +
            '"' +
            buyPrice +
            '",' +
            '"' +
            buyPrice * gainUnits +
            '",' +
            '"' +
            gainAmount +
            '",' +
            '"' +
            durationInYears +
            '",' +
            '"' +
            fYear +
            '",\n';
        }
      }
    }
  }

  return csvOutput;
}

function PrepareTransactionCSV(fundList) {
  let csvOutput =
    '"PAN","Folio","Fund","Date","Units","Amount","Price","Balance",\n';

  for (let fIdx in fundList) {
    let fund = fundList[fIdx];

    for (let tIdx in fund.Transactions) {
      let trans = fund.Transactions[tIdx];

      csvOutput +=
        '"' +
        fund.Labels.PAN +
        '",' +
        '"' +
        fund.Labels.Folio +
        '",' +
        '"' +
        fund.Name +
        '",' +
        '"' +
        trans.Date +
        '",' +
        '"' +
        trans.Units +
        '",' +
        '"' +
        trans.Amount +
        '",' +
        '"' +
        trans.Price +
        '",' +
        '"' +
        trans.Balance +
        '",\n';
    }
  }

  return csvOutput;
}

export default (fundList, computeGains = false) =>
  computeGains ? PrepareGainsCSV(fundList) : PrepareTransactionCSV(fundList);
