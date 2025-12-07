/**
 * Convierte un texto en un slug URL amigable.
 * Ejemplo: "Ruta al Pico Tres Mares" -> "ruta-al-pico-tres-mares"
 */
function slugify(text) {
  return text
    .toString()
    .normalize('NFD')                 // separar acentos
    .replace(/[\u0300-\u036f]/g, '')  // quitar acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')     // quitar símbolos raros
    .replace(/\s+/g, '-')             // espacios -> guiones
    .replace(/-+/g, '-');             // guiones múltiples -> uno
}

module.exports = slugify;
