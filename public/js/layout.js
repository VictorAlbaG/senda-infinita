async function loadLayout() {
  const headerPlaceholder = document.getElementById('header-placeholder');
  const footerPlaceholder = document.getElementById('footer-placeholder');

  try {
    if (headerPlaceholder) {
      const resHeader = await fetch('header.html');
      const headerHtml = await resHeader.text();
      headerPlaceholder.innerHTML = headerHtml;

      // Avisamos al resto de scripts de que el header ya está en el DOM
      document.dispatchEvent(new Event('header-loaded'));
    }

    if (footerPlaceholder) {
      const resFooter = await fetch('footer.html');
      const footerHtml = await resFooter.text();
      footerPlaceholder.innerHTML = footerHtml;
    }
  } catch (err) {
    console.error('Error cargando header/footer:', err);
  }
}

document.addEventListener('DOMContentLoaded', loadLayout);
