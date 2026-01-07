function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

document.addEventListener('DOMContentLoaded', () => {
  const scene = document.getElementById('hero-scene');
  const heroImage = document.getElementById('hero-image');
  const trees = document.querySelectorAll('.tree-shadow');
  const title = document.getElementById('hero-title');
  const subtitle = document.getElementById('hero-subtitle');
  const clouds = document.querySelectorAll(".cloud-parallax");
  const heroImageParallax = document.getElementById('hero-image-parallax');

  if (!scene || !heroImage || trees.length === 0) return;

  function updateScene() {
    const sceneTop = scene.offsetTop;
    const maxScroll = scene.offsetHeight - window.innerHeight;
    if (maxScroll <= 0) return;

    const progress = clamp((window.scrollY - sceneTop) / maxScroll, 0, 1);

    const move = 50 * progress;
    const moveClouds = 7 * progress
    const fade = clamp(1 - progress * 1.2, 0, 1);
    const heroFade = clamp(1 - progress * 1.1, 0, 1);

    trees.forEach((tree) => {
      const side = tree.dataset.side === 'right' ? 1 : -1;
      const baseOffset = parseFloat(tree.dataset.offset || '0');
      const rise = parseFloat(tree.dataset.rise || '0');
      const x = side * (baseOffset + move);

      tree.style.setProperty('--tree-x', `${x}vw`);
      tree.style.setProperty('--tree-y', `${rise}vh`);
      tree.style.opacity = String(fade);
          });
// Nubes (uno a la izq, otro a la der)
    clouds.forEach((cloud) => {
      const side = cloud.dataset.side === "right" ? 1 : -1;
      const baseOffset = parseFloat(cloud.dataset.offset || "0");
      const rise = parseFloat(cloud.dataset.rise || "0");
      const x = side * (baseOffset - moveClouds);

      cloud.style.setProperty("--cloud-x", `${x}vw`);
      cloud.style.setProperty("--cloud-y", `${rise}vh`);
      cloud.style.opacity = String(fade);
    });
    
    heroImage.style.opacity = String(heroFade);
    heroImageParallax.style.opacity = String(heroFade);

    if (title) title.style.opacity = String(clamp(1 - progress * 0.9, 0, 1));
    if (subtitle) subtitle.style.opacity = String(clamp(1 - progress * 1.1, 0, 1));

    if (progress > 0.65) {
      document.body.classList.add('header-visible');
    } else {
      document.body.classList.remove('header-visible');
    }
  }

  updateScene();
  window.addEventListener('scroll', updateScene, { passive: true });
  window.addEventListener('resize', updateScene);
});
