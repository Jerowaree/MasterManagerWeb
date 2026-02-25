import * as XLSX from 'xlsx';

/**
 * Exports a JSON array to an Excel file.
 * @param data Array of objects to export
 * @param filename Name of the file (without extension)
 * @param sheetName Name of the worksheet
 */
export const exportToExcel = (data: any[], filename: string, sheetName: string = 'Datos') => {
  // Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // Convert JSON to worksheet
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Append worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Generate and download Excel file
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
};
