const ExcelJS = require("exceljs");
async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile("D:/DESKTOP/Pakdee/public/Pakdee_Database_Schema_Dictionary.xlsx");
  console.log("Total Worksheets:", wb.worksheets.length);
  wb.worksheets.forEach((ws, idx) => {
    console.log(`${idx + 1}. ${ws.name} (Rows: ${ws.rowCount})`);
  });
}
main();
