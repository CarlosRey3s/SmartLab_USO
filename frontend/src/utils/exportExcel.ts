import * as xlsx from 'xlsx';

/**
 * Exporta un arreglo de objetos a un archivo Excel.
 * @param data Arreglo de datos a exportar.
 * @param filename Nombre del archivo sin la extensión .xlsx.
 */
export const exportToExcel = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    console.warn("No hay datos para exportar.");
    return;
  }

  // Crear una nueva hoja de cálculo a partir de los datos (JSON)
  const worksheet = xlsx.utils.json_to_sheet(data);

  // Crear un nuevo libro de trabajo
  const workbook = xlsx.utils.book_new();

  // Añadir la hoja al libro
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Reporte');

  // Descargar el archivo
  xlsx.writeFile(workbook, `${filename}.xlsx`);
};
