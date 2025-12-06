const routesService = require('./routes.service');

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

module.exports = {
  getRoutes,
  getRouteDetail,
};
