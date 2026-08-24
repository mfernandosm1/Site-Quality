(() => {
  'use strict';

  const form = document.querySelector('.company-identity-form');
  const fileInput = form?.querySelector('input[name="logo"]');
  const editor = form?.querySelector('[data-company-logo-editor]');
  const canvas = editor?.querySelector('canvas');
  if (!form || !fileInput || !editor || !canvas) return;

  const ctx = canvas.getContext('2d');
  const zoomInput = editor.querySelector('[data-logo-zoom]');
  const xInput = editor.querySelector('[data-logo-x]');
  const yInput = editor.querySelector('[data-logo-y]');
  const fitButton = editor.querySelector('[data-logo-fit]');
  const fillButton = editor.querySelector('[data-logo-fill]');
  const currentButton = form.querySelector('[data-logo-current]');
  const removeBgInput = editor.querySelector('[data-logo-remove-bg]');
  const status = editor.querySelector('[data-logo-status]');
  const currentLogo = editor.dataset.currentLogo || '';

  const state = {
    image:null,
    zoom:1,
    offsetX:0,
    offsetY:0,
    sourceName:'company-logo.png',
    dirty:false,
    submitting:false,
    drag:null,
    removeLightBackground:false
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function imageLooksLightBacked(image) {
    try {
      const sample = document.createElement('canvas');
      sample.width = 24;
      sample.height = 24;
      const sampleCtx = sample.getContext('2d', { willReadFrequently:true });
      sampleCtx.drawImage(image, 0, 0, 24, 24);
      const data = sampleCtx.getImageData(0, 0, 24, 24).data;
      const points = [[1,1],[22,1],[1,22],[22,22],[12,1],[12,22],[1,12],[22,12]];
      let light = 0;
      for (const [x,y] of points) {
        const i = (y * 24 + x) * 4;
        const a = data[i + 3];
        const min = Math.min(data[i], data[i + 1], data[i + 2]);
        const max = Math.max(data[i], data[i + 1], data[i + 2]);
        if (a > 220 && min >= 238 && max - min <= 18) light += 1;
      }
      return light >= 5;
    } catch (_) {
      return false;
    }
  }

  function removeLightCanvasBackground() {
    if (!state.removeLightBackground) return;
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (!data[i + 3]) continue;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const min = Math.min(r, g, b);
        const max = Math.max(r, g, b);
        const neutral = max - min <= 22;
        if (!neutral || min < 232) continue;
        if (min >= 248) data[i + 3] = 0;
        else {
          const factor = clamp((248 - min) / 16, 0, 1);
          data[i + 3] = Math.round(data[i + 3] * factor);
        }
      }
      ctx.putImageData(imageData, 0, 0);
    } catch (_) {}
  }

  function setStatus(text = '') {
    if (status) status.textContent = text;
  }

  function baseScale(mode = 'contain') {
    if (!state.image) return 1;
    const iw = state.image.naturalWidth || state.image.width || 1;
    const ih = state.image.naturalHeight || state.image.height || 1;
    const contain = Math.min(canvas.width / iw, canvas.height / ih);
    if (mode === 'cover') return Math.max(canvas.width / iw, canvas.height / ih);
    return contain;
  }

  function syncControls() {
    if (zoomInput) zoomInput.value = String(Math.round(state.zoom * 100));
    if (xInput) xInput.value = String(Math.round(state.offsetX));
    if (yInput) yInput.value = String(Math.round(state.offsetY));
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!state.image) return;
    const iw = state.image.naturalWidth || state.image.width || 1;
    const ih = state.image.naturalHeight || state.image.height || 1;
    const scale = baseScale('contain') * state.zoom;
    const dw = iw * scale;
    const dh = ih * scale;
    const maxPanX = Math.max(canvas.width * 0.55, Math.abs(dw - canvas.width) / 2 + canvas.width * 0.12);
    const maxPanY = Math.max(canvas.height * 0.55, Math.abs(dh - canvas.height) / 2 + canvas.height * 0.12);
    const x = (canvas.width - dw) / 2 + (state.offsetX / 100) * maxPanX;
    const y = (canvas.height - dh) / 2 + (state.offsetY / 100) * maxPanY;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(state.image, x, y, dw, dh);
    removeLightCanvasBackground();
  }

  function openEditor() {
    editor.hidden = false;
    requestAnimationFrame(() => editor.scrollIntoView({ block:'nearest', behavior:'smooth' }));
  }

  function loadImage(src, name = 'company-logo.png') {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        state.image = image;
        state.sourceName = name || 'company-logo.png';
        state.zoom = 1;
        state.offsetX = 0;
        state.offsetY = 0;
        state.removeLightBackground = imageLooksLightBacked(image);
        if (removeBgInput) removeBgInput.checked = state.removeLightBackground;
        state.dirty = true;
        syncControls();
        render();
        openEditor();
        setStatus('Ajuste o enquadramento. O quadro abaixo é exatamente a proporção usada no cabeçalho.');
        resolve();
      };
      image.onerror = reject;
      image.src = src;
    });
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) {
      setStatus('Formato não suportado. Use PNG, JPG ou WebP.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => loadImage(String(reader.result || ''), file.name).catch(() => setStatus('Não foi possível abrir esta imagem.'));
    reader.readAsDataURL(file);
  });

  currentButton?.addEventListener('click', () => {
    if (!currentLogo) return;
    loadImage(`${currentLogo}${currentLogo.includes('?') ? '&' : '?'}edit=${Date.now()}`, 'company-logo.png')
      .catch(() => setStatus('Não foi possível carregar a logo atual para reenquadrar.'));
  });

  zoomInput?.addEventListener('input', () => {
    state.zoom = clamp(Number(zoomInput.value || 100) / 100, 0.5, 5);
    state.dirty = true;
    render();
  });
  xInput?.addEventListener('input', () => {
    state.offsetX = clamp(Number(xInput.value || 0), -100, 100);
    state.dirty = true;
    render();
  });
  yInput?.addEventListener('input', () => {
    state.offsetY = clamp(Number(yInput.value || 0), -100, 100);
    state.dirty = true;
    render();
  });

  removeBgInput?.addEventListener('change', () => {
    state.removeLightBackground = Boolean(removeBgInput.checked);
    state.dirty = true;
    render();
  });

  fitButton?.addEventListener('click', () => {
    state.zoom = 1;
    state.offsetX = 0;
    state.offsetY = 0;
    state.dirty = true;
    syncControls();
    render();
  });

  fillButton?.addEventListener('click', () => {
    if (!state.image) return;
    const contain = baseScale('contain');
    const cover = baseScale('cover');
    state.zoom = clamp(cover / Math.max(contain, 0.0001), 0.5, 5);
    state.offsetX = 0;
    state.offsetY = 0;
    state.dirty = true;
    syncControls();
    render();
  });

  canvas.addEventListener('pointerdown', event => {
    if (!state.image) return;
    canvas.setPointerCapture?.(event.pointerId);
    state.drag = { x:event.clientX, y:event.clientY, offsetX:state.offsetX, offsetY:state.offsetY };
    canvas.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', event => {
    if (!state.drag) return;
    const rect = canvas.getBoundingClientRect();
    const dx = (event.clientX - state.drag.x) / Math.max(rect.width, 1) * 170;
    const dy = (event.clientY - state.drag.y) / Math.max(rect.height, 1) * 170;
    state.offsetX = clamp(state.drag.offsetX + dx, -100, 100);
    state.offsetY = clamp(state.drag.offsetY + dy, -100, 100);
    state.dirty = true;
    syncControls();
    render();
  });
  const endDrag = () => { state.drag = null; canvas.classList.remove('is-dragging'); };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  form.addEventListener('submit', event => {
    const removeLogo = form.querySelector('input[name="removeLogo"]')?.checked;
    if (removeLogo || state.submitting || !state.image || !state.dirty) return;
    event.preventDefault();
    setStatus('Preparando logo enquadrada...');
    canvas.toBlob(blob => {
      if (!blob) {
        setStatus('Não foi possível preparar a logo. Tente novamente.');
        return;
      }
      const output = new File([blob], 'company-logo.png', { type:'image/png', lastModified:Date.now() });
      const transfer = new DataTransfer();
      transfer.items.add(output);
      fileInput.files = transfer.files;
      state.submitting = true;
      form.submit();
    }, 'image/png');
  });
})();
