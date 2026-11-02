// Lectura del encabezado de un CSV de importación de récords (KAN-390).
// El back detecta el delimitador con la misma regla: ';' si aparece más que ','.

export type CsvDelimiter = ',' | ';';

function firstLine(text: string): string {
  const lineBreak = text.search(/\r?\n/);
  return lineBreak === -1 ? text : text.slice(0, lineBreak);
}

export function detectCsvDelimiter(text: string): CsvDelimiter {
  const line = firstLine(text.replace(/^\uFEFF/, ''));
  const commas = line.split(',').length - 1;
  const semicolons = line.split(';').length - 1;
  return semicolons > commas ? ';' : ',';
}

function splitCsvLine(line: string, delimiter: CsvDelimiter): string[] {
  const fields: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      fields.push(field);
      field = '';
    } else {
      field += char;
    }
  }

  fields.push(field);
  return fields;
}

// Devuelve las columnas del encabezado, sin vacías y sin BOM.
export function parseCsvHeader(text: string): string[] {
  const content = text.replace(/^\uFEFF/, '');
  const headerLine = firstLine(content).trim();
  if (!headerLine) {
    throw new Error('El archivo CSV está vacío.');
  }

  const headers = splitCsvLine(headerLine, detectCsvDelimiter(content))
    .map((header) => header.trim())
    .filter((header) => header.length > 0);

  if (headers.length === 0) {
    throw new Error('El archivo CSV está vacío.');
  }

  return headers;
}

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Busca la columna que mejor coincide con los alias del campo.
// Primero prueba coincidencia exacta y después por contenido ("Nombre del atleta").
export function matchColumn(headers: string[], aliases: string[]): string {
  const normalizedAliases = aliases.map(normalizeHeader);
  const normalizedHeaders = headers.map(normalizeHeader);

  const exactIndex = normalizedHeaders.findIndex((header) => normalizedAliases.includes(header));
  if (exactIndex !== -1) {
    return headers[exactIndex];
  }

  const partialIndex = normalizedHeaders.findIndex((header) =>
    normalizedAliases.some((alias) => header.includes(alias)),
  );
  return partialIndex === -1 ? '' : headers[partialIndex];
}
