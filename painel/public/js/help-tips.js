(() => {
  const selector = '.help-tip[data-tooltip]';
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll(`${selector}.is-open`).forEach(item => item.classList.remove('is-open'));
  });
  document.addEventListener('click', event => {
    const tip = event.target.closest(selector);
    document.querySelectorAll(`${selector}.is-open`).forEach(item => { if (item !== tip) item.classList.remove('is-open'); });
    if (!tip) return;
    event.preventDefault();
    tip.classList.toggle('is-open');
  });
  document.addEventListener('focusin', event => {
    if (!event.target.matches(selector)) return;
    event.target.classList.add('is-open');
  });
  document.addEventListener('focusout', event => {
    if (!event.target.matches(selector)) return;
    event.target.classList.remove('is-open');
  });
  document.querySelectorAll(selector).forEach(tip => {
    tip.setAttribute('role', 'button');
    tip.setAttribute('aria-label', tip.getAttribute('data-tooltip'));
  });
})();
