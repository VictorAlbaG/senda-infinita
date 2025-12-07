const prisma = require('../config/prisma');
const slugify = require('../utils/slugify');

const ORS_API_KEY = process.env.ORS_API_KEY;

if (!ORS_API_KEY) {
  console.warn('⚠️ ORS_API_KEY no está definida en .env. El import de rutas no funcionará.');
}

/**
 * Llama a OpenRouteService para generar una ruta entre dos puntos,
 * y guarda Route + Waypoint[] en la DB.
 *
 * Parámetros:
 *  - title, description, difficulty
 *  - startLat, startLng, endLat, endLng
 */
async function importRouteFromORS({
  title,
  description,
  difficulty,
  startLat,
  startLng,
  endLat,
  endLng,
}) {
  const slug = slugify(title);

  // Si existe una ruta con el mismo slug, no la creamos de nuevo
  const existing = await prisma.route.findUnique({
    where: { slug },
  });

  if (existing) {
    return {
      created: false,
      route: existing,
      waypointsCreated: 0,
    };
  }

  // Construir petición a ORS Directions
  const body = {
    coordinates: [
      [startLng, startLat], // ORS espera [lon, lat]
      [endLng, endLat],
    ],
    elevation: true, // para intentar obtener ascent
  };

  const response = await fetch(
  'https://api.openrouteservice.org/v2/directions/foot-hiking/geojson',
    {
      method: 'POST',
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/geo+json', // <- cambio importante
      },
      body: JSON.stringify(body),
    }
  );


  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const error = new Error(`Error al llamar a ORS: ${response.status} ${response.statusText}`);
    error.details = text;
    throw error;
  }

  const data = await response.json();

  if (!data.features || !data.features[0]) {
    throw new Error('Respuesta inesperada de ORS: no hay features en el resultado');
  }

  const feature = data.features[0];
  const summary = feature.properties && feature.properties.summary
    ? feature.properties.summary
    : null;

  const distanceMeters = summary?.distance ?? null;
  const ascentMeters = summary?.ascent ?? null;

  const coords = feature.geometry && feature.geometry.coordinates
    ? feature.geometry.coordinates
    : [];

  if (!coords.length) {
    throw new Error('Respuesta inesperada de ORS: no hay coordenadas en la geometría');
  }

  // Crear Route + Waypoints en una transacción
  const result = await prisma.$transaction(async (tx) => {
    const route = await tx.route.create({
      data: {
        title,
        slug,
        description,
        difficulty,
        source: 'ORS',
        distanceKm: distanceMeters != null ? distanceMeters / 1000 : null,
        ascentM: ascentMeters != null ? Math.round(ascentMeters) : null,
        startLat: coords[0][1],
        startLng: coords[0][0],
        endLat: coords[coords.length - 1][1],
        endLng: coords[coords.length - 1][0],
      },
    });

    const waypointsData = coords.map((c, index) => ({
      routeId: route.id,
      order: index,
      lat: c[1],
      lng: c[0],
      elevation: c[2] != null ? Math.round(c[2]) : null,
    }));

    if (waypointsData.length > 0) {
      await tx.waypoint.createMany({
        data: waypointsData,
      });
    }

    return {
      route,
      waypointsCreated: waypointsData.length,
    };
  });

  return {
    created: true,
    route: result.route,
    waypointsCreated: result.waypointsCreated,
  };
}

module.exports = {
  importRouteFromORS,
};
