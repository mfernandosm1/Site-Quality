// painel js

document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('[data-personalizacao-tab]');
  const panels = document.querySelectorAll('[data-personalizacao-panel]');
  const preview = document.getElementById('personalizacaoPreview');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.personalizacaoTab;

      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      document.querySelector(`[data-personalizacao-panel="${target}"]`)?.classList.add('active');
    });
  });

  function applyPreviewFromForm(form){
    if(!preview || !form) return;

    const scope = form.dataset.previewScope;
    const get = name => form.querySelector(`[name="${name}"]`)?.value;

    if(scope === 'site'){
      preview.style.setProperty('--brand', get('primary') || '#c90000');
      preview.style.setProperty('--blue', get('primary') || '#c90000');
      preview.style.setProperty('--text', get('text') || '#111827');
      preview.style.setProperty('--bg', get('bg') || '#ffffff');
      preview.style.setProperty('--card', '#ffffff');
      preview.style.setProperty('--line', '#e5e7eb');
      preview.style.setProperty('--muted', '#6b7280');
      preview.style.borderRadius = `${get('radius') || 14}px`;
      preview.style.fontFamily = get('font') || 'Inter, system-ui, sans-serif';
    }

    if(scope === 'painel'){
      preview.style.setProperty('--brand', get('brand') || '#c90000');
      preview.style.setProperty('--bg', get('bg') || '#f6f8fc');
      preview.style.setProperty('--card', get('card') || '#ffffff');
      preview.style.setProperty('--line', get('line') || '#e5e7eb');
      preview.style.setProperty('--muted', get('muted') || '#6b7280');
      preview.style.setProperty('--text', get('text') || '#111827');
      preview.style.setProperty('--blue', get('button') || '#2563eb');
      preview.style.borderRadius = `${get('radius') || 14}px`;
      preview.style.fontFamily = get('font') || 'Inter, system-ui, sans-serif';

      preview.querySelectorAll('.preview-card').forEach(card => {
        card.style.padding = `${get('cardPadding') || 16}px`;
        card.style.borderRadius = `${get('radius') || 14}px`;
      });

      preview.querySelectorAll('.preview-button').forEach(btn => {
        btn.style.padding = `${get('buttonPaddingY') || 9}px ${get('buttonPaddingX') || 13}px`;
        btn.style.borderRadius = `${Math.max((Number(get('radius')) || 14) - 2, 2)}px`;
      });

      preview.querySelectorAll('.preview-topbar span, .preview-topbar b').forEach(item => {
        item.style.fontSize = `${get('menuSize') || 14}px`;
      });
    }
  }

  document.querySelectorAll('.personalizacao-form').forEach(form => {
    form.querySelectorAll('input, select, textarea').forEach(input => {
      input.addEventListener('input', () => applyPreviewFromForm(form));
      input.addEventListener('change', () => applyPreviewFromForm(form));
    });

    applyPreviewFromForm(form);
  });

  document.querySelectorAll('[data-site-palette], [data-panel-palette]').forEach(button => {
    button.addEventListener('click', () => {
      const data = JSON.parse(button.dataset.sitePalette || button.dataset.panelPalette || '{}');
      const panel = button.closest('[data-personalizacao-panel]');
      const form = panel?.querySelector('form.personalizacao-form');

      Object.entries(data).forEach(([name, value]) => {
        const input = form?.querySelector(`[name="${name}"]`);
        if(input) input.value = value;
      });

      applyPreviewFromForm(form);
    });
  });
});
