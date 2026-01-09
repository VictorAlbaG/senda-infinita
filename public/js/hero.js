function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

document.addEventListener('DOMContentLoaded', () => {
  const scene = document.getElementById('hero-scene');
  if (!scene) return;

  const heroImage = document.getElementById('hero-image');
  const heroImageParallax = document.getElementById('hero-image-parallax');

  const trees = document.querySelectorAll('.tree-shadow');
  const clouds = document.querySelectorAll('.cloud-parallax');

  const title = document.getElementById('hero-title');
  const subtitle = document.getElementById('hero-subtitle');

  // --- Sendero (dentro del hero) ---
  const trailLayer = document.getElementById('trail-layer');
  const trailEdge = document.getElementById('trail-edge');
  const trailPath = document.getElementById('trail-path');
  let trailLen = 0;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setupTrail() {
    if (!trailPath || !trailEdge) return;

    // Longitud del path real
    trailLen = trailPath.getTotalLength();

    // Preparar dibujo (scrub con scroll)
    trailPath.style.strokeDasharray = `${trailLen}`;
    trailEdge.style.strokeDasharray = `${trailLen}`;

    trailPath.style.strokeDashoffset = `${trailLen}`;
    trailEdge.style.strokeDashoffset = `${trailLen}`;

    if (trailLayer) trailLayer.style.opacity = '0';
  }

  function setTrailProgress(p) {
    if (!trailPath || !trailEdge || trailLen <= 0) return;

    p = clamp(p, 0, 1);
    const offset = trailLen * (1 - p);

    trailPath.style.strokeDashoffset = `${offset}`;
    trailEdge.style.strokeDashoffset = `${offset}`;

    // Fade-in suave del layer cuando empieza
    if (trailLayer) {
      const op = clamp((p - 0.02) / 0.10, 0, 1);
      trailLayer.style.opacity = String(op);
    }
  }

  function updateScene() {
    const sceneTop = scene.offsetTop;
    const maxScroll = scene.offsetHeight - window.innerHeight;
    if (maxScroll <= 0) return;

    const progress = clamp((window.scrollY - sceneTop) / maxScroll, 0, 1);

    const move = 50 * progress;
    const moveClouds = 7 * progress;

    const fade = clamp(1 - progress * 1.2, 0, 1);
    const heroFade = clamp(1 - progress * 1.1, 0, 1);

    // Árboles
    if (trees && trees.length) {
      trees.forEach((tree) => {
        const side = tree.dataset.side === 'right' ? 1 : -1;
        const baseOffset = parseFloat(tree.dataset.offset || '0');
        const rise = parseFloat(tree.dataset.rise || '0');
        const x = side * (baseOffset + move);

        tree.style.setProperty('--tree-x', `${x}vw`);
        tree.style.setProperty('--tree-y', `${rise}vh`);
        tree.style.opacity = String(fade);
      });
    }

    // Nubes
    if (clouds && clouds.length) {
      clouds.forEach((cloud) => {
        const side = cloud.dataset.side === "right" ? 1 : -1;
        const baseOffset = parseFloat(cloud.dataset.offset || "0");
        const rise = parseFloat(cloud.dataset.rise || '0');
        const x = side * (baseOffset - moveClouds);

        cloud.style.setProperty("--cloud-x", `${x}vw`);
        cloud.style.setProperty("--cloud-y", `${rise}vh`);
        cloud.style.opacity = String(fade);
      });
    }

    // Fondos hero
    if (heroImage) heroImage.style.opacity = String(heroFade);
    if (heroImageParallax) heroImageParallax.style.opacity = String(heroFade);

    // Texto
    if (title) title.style.opacity = String(clamp(1 - progress * 0.9, 0, 1));
    if (subtitle) subtitle.style.opacity = String(clamp(1 - progress * 1.1, 0, 1));

    // Header visible
    if (progress > 0.65) {
      document.body.classList.add('header-visible');
    } else {
      document.body.classList.remove('header-visible');
    }

    // --- Sendero (scrub con scroll: baja dibuja, sube borra) ---
    if (!reduceMotion && trailLen > 0) {
      const start = 0.22;   // empieza a dibujarse
      const end   = 1.02;   // termina
      const pTrail = clamp((progress - start) / (end - start), 0, 1);
      setTrailProgress(pTrail);
    }
  }

  setupTrail();
  updateScene();

  // Scroll con rAF para no saturar
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateScene();
      ticking = false;
    });
  }, { passive: true });

  window.addEventListener('resize', () => {
    setupTrail();
    updateScene();
  });
});
