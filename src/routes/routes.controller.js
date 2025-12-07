const routesService = require('./routes.service');
const orsService = require('./ors.service');

/**
 * GET /api/routes
 * Query params:
 *  - q
 *  - difficulty
 *  - page
 */
async function getRoutes(req, res) {
  try {
    const { q, difficulty, page } = req.query;

    // Validar difficulty si viene
    const allowedDifficulties = ['EASY', 'MODERATE', 'HARD'];
    let difficultyFilter = undefined;

    if (difficulty) {
      if (!allowedDifficulties.includes(difficulty)) {
        return res.status(400).json({
          message: `difficulty debe ser uno de: ${allowedDifficulties.join(', ')}`,
        });
      }
      difficultyFilter = difficulty;
    }

    const result = await routesService.listRoutes({
      q: q || undefined,
      difficulty: difficultyFilter,
      page,
    });

    return res.json(result);
  } catch (error) {
    console.error('Error en getRoutes:', error);
    return res.status(500).json({ message: 'Error al obtener rutas' });
  }
}

/**
 * GET /api/routes/:slug
 */
async function getRouteDetail(req, res) {
  try {
    const { slug } = req.params;

    const route = await routesService.getRouteBySlug(slug);

    if (!route) {
      return res.status(404).json({ message: 'Ruta no encontrada' });
    }

    return res.json(route);
  } catch (error) {
    console.error('Error en getRouteDetail:', error);
    return res.status(500).json({ message: 'Error al obtener detalle de la ruta' });
  }
}

async function importRouteFromORS(req, res) {
  try {
    const {
      title,
      description,
      difficulty,
      startLat,
      startLng,
      endLat,
      endLng,
    } = req.body;

    if (!title || !difficulty || startLat == null || startLng == null || endLat == null || endLng == null) {
      return res.status(400).json({
        message: 'title, difficulty, startLat, startLng, endLat y endLng son obligatorios',
      });
    }

    const allowedDifficulties = ['EASY', 'MODERATE', 'HARD'];
    if (!allowedDifficulties.includes(difficulty)) {
      return res.status(400).json({
        message: `difficulty debe ser uno de: ${allowedDifficulties.join(', ')}`,
      });
    }

    const parsedStartLat = Number(startLat);
    const parsedStartLng = Number(startLng);
    const parsedEndLat = Number(endLat);
    const parsedEndLng = Number(endLng);

    if (
      Number.isNaN(parsedStartLat) ||
      Number.isNaN(parsedStartLng) ||
      Number.isNaN(parsedEndLat) ||
      Number.isNaN(parsedEndLng)
    ) {
      return res.status(400).json({
        message: 'startLat, startLng, endLat y endLng deben ser números',
      });
    }

    const result = await orsService.importRouteFromORS({
      title,
      description: description || null,
      difficulty,
      startLat: parsedStartLat,
      startLng: parsedStartLng,
      endLat: parsedEndLat,
      endLng: parsedEndLng,
    });

    if (!result.created) {
      return res.status(200).json({
        message: 'Ruta ya existía (slug repetido), no se ha creado una nueva',
        route: result.route,
        waypointsCreated: result.waypointsCreated,
      });
    }

    return res.status(201).json({
      message: 'Ruta importada correctamente desde ORS',
      route: result.route,
      waypointsCreated: result.waypointsCreated,
    });
  } catch (error) {
    console.error('Error en importRouteFromORS:', error);

    if (error.details) {
      return res.status(502).json({
        message: 'Error al llamar a OpenRouteService',
        details: error.details,
      });
    }

    return res.status(500).json({ message: 'Error al importar ruta desde ORS' });
  }
}

module.exports = {
  getRoutes,
  getRouteDetail,
  importRouteFromORS,
};