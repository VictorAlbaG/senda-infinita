const app = require('./app');

// Puerto desde variable de entorno o 3000 por defecto
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Senda Infinita backend escuchando en http://localhost:${PORT}`);
});
