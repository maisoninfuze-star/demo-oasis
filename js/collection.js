/* Collection page — filter + count */
(() => {
  const chips = [...document.querySelectorAll('.chip')];
  const cards = [...document.querySelectorAll('.pcard')];
  const count = document.querySelector('#pcount');
  chips.forEach(chip => chip.addEventListener('click', () => {
    chips.forEach(c => c.classList.remove('is-active'));
    chip.classList.add('is-active');
    const f = chip.dataset.filter;
    let shown = 0;
    cards.forEach(card => {
      const match = f === 'all' || card.dataset.cat === f;
      card.classList.toggle('is-hidden', !match);
      if (match) shown++;
    });
    if (count) count.textContent = shown;
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }));
})();
