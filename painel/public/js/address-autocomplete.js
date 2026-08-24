(() => {
  'use strict';

  const timers = new WeakMap();
  const controllers = new WeakMap();
  const localCache = new Map();
  const warmTimers = new WeakMap();
  const warmedContexts = new Set();
  const norm = value => String(value || '').trim();
  const normalizeText = value => norm(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const esc = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  async function lookup(state, city, query, zipCode, signal) {
    const uf = norm(state).toUpperCase();
    const local = norm(city);
    const term = norm(query);
    const zip = norm(zipCode).replace(/\D/g, '');
    if (term.length < 2) return [];
    const key = `v5|${uf}|${local}|${zip}|${term}`.toLowerCase();
    if (localCache.has(key)) return localCache.get(key);

    const params = new URLSearchParams({ q: term });
    if (uf) params.set('uf', uf);
    if (local) params.set('cidade', local);
    if (zip) params.set('cep', zip);
    const response = await fetch(`/erp/endereco/sugestoes?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) throw new Error(payload.message || 'Não foi possível consultar endereços.');
    const rows = Array.isArray(payload.items) ? payload.items : [];
    localCache.set(key, rows);
    if (localCache.size > 120) localCache.delete(localCache.keys().next().value);
    return rows;
  }

  function warmAddressIndex(fields, street) {
    const uf = norm(fields.state?.value).toUpperCase();
    const city = norm(fields.city?.value);
    const zip = norm(fields.zipCode?.value).replace(/\D/g, '');
    if (!city && zip.length !== 8) return;
    const contextKey = `${uf}|${city}|${zip}`.toLowerCase();
    if (warmedContexts.has(contextKey)) return;
    clearTimeout(warmTimers.get(street));
    warmTimers.set(street, setTimeout(() => {
      const params = new URLSearchParams();
      if (uf) params.set('uf', uf);
      if (city) params.set('cidade', city);
      if (zip.length === 8) params.set('cep', zip);
      fetch(`/erp/endereco/aquecer?${params.toString()}`, { headers:{ Accept:'application/json' } })
        .then(() => warmedContexts.add(contextKey))
        .catch(() => {});
    }, 10));
  }

  function getFields(street) {
    const form = street.closest('form') || document;
    return {
      form,
      city: form.querySelector('[name="city"]'),
      state: form.querySelector('[name="state"]'),
      district: form.querySelector('[name="district"]'),
      number: form.querySelector('[name="number"]'),
      zipCode: form.querySelector('[name="zipCode"]')
    };
  }

  function createPanel(street) {
    const panel = document.createElement('div');
    panel.className = 'quality-address-suggestions';
    panel.hidden = true;
    panel.setAttribute('role', 'listbox');
    panel.setAttribute('aria-label', 'Sugestões de endereço');
    document.body.appendChild(panel);

    const position = () => {
      if (panel.hidden || !street.isConnected) return;
      const rect = street.getBoundingClientRect();
      panel.style.left = `${Math.max(8, rect.left)}px`;
      panel.style.top = `${Math.min(window.innerHeight - 12, rect.bottom + 4)}px`;
      panel.style.width = `${Math.max(260, rect.width)}px`;
    };
    window.addEventListener('resize', position, { passive:true });
    window.addEventListener('scroll', position, { passive:true, capture:true });
    return { panel, position };
  }

  function attach(street) {
    if (!street || street.dataset.streetAutocompleteReady === '1') return;
    const fields = getFields(street);
    if (!fields.city || !fields.state) return;

    street.dataset.streetAutocompleteReady = '1';
    street.setAttribute('autocomplete', 'off');
    if (!street.getAttribute('placeholder')) street.setAttribute('placeholder', 'Digite parte do endereço...');
    street.setAttribute('aria-autocomplete', 'list');
    street.title = 'Digite pelo menos 2 letras. O ERP sugere endereços da cidade, mas você pode digitar manualmente.';

    const { panel, position } = createPanel(street);
    let rows = [];
    let activeIndex = -1;
    let selecting = false;

    const close = () => {
      panel.hidden = true;
      panel.innerHTML = '';
      rows = [];
      activeIndex = -1;
      street.removeAttribute('aria-expanded');
    };

    const showMessage = (text, kind = 'neutral') => {
      panel.innerHTML = `<div class="quality-address-suggestions__message ${kind === 'error' ? 'is-error' : ''}">${esc(text)}</div>`;
      panel.hidden = false;
      street.setAttribute('aria-expanded', 'true');
      position();
    };

    const fillDistrict = value => {
      if (!fields.district || !norm(value)) return;
      fields.district.value = value;
      ['input', 'change'].forEach(type => fields.district.dispatchEvent(new Event(type, { bubbles:true })));
    };

    const enrichDistrict = async row => {
      if (!fields.district || norm(fields.district.value) || !norm(row?.street)) return;
      const selectedStreet = norm(row.street);
      try {
        const details = await lookup(
          row.state || fields.state?.value,
          row.city || fields.city?.value,
          selectedStreet,
          row.cep || fields.zipCode?.value,
          undefined
        );
        const exact = details.find(item => normalizeText(item.street) === normalizeText(selectedStreet) && norm(item.district));
        if (exact && normalizeText(street.value) === normalizeText(selectedStreet) && !norm(fields.district.value)) {
          fillDistrict(exact.district);
        }
      } catch (_) {}
    };

    const choose = row => {
      if (!row) return;
      selecting = true;
      clearTimeout(timers.get(street));
      controllers.get(street)?.abort();
      street.value = row.street || street.value;
      if (fields.district && row.district) fillDistrict(row.district);
      if (fields.city && row.city) fields.city.value = row.city;
      if (fields.state && row.state) fields.state.value = row.state;
      if (fields.zipCode && !norm(fields.zipCode.value) && row.cep) fields.zipCode.value = row.cep;
      ['input', 'change'].forEach(type => street.dispatchEvent(new Event(type, { bubbles:true })));
      close();
      enrichDistrict(row);
      setTimeout(() => { selecting = false; close(); fields.number?.focus(); }, 0);
    };

    const render = list => {
      rows = list;
      activeIndex = -1;
      if (!rows.length) {
        const typed = normalizeText(street.value).replace(/[.]/g, '').trim();
        const onlyType = /^(rua|r|avenida|av|travessa|tv|alameda|al|rodovia|rod|estrada|est|linha|viela|largo|praca)$/.test(typed);
        showMessage(onlyType ? 'Digite mais algumas letras do nome do endereço para ampliar a busca.' : 'Nenhum endereço sugerido. Continue digitando manualmente.', 'neutral');
        return;
      }
      panel.innerHTML = rows.map((row, index) => {
        const place = [row.city, row.state].filter(Boolean).join('/');
        const detailParts = [];
        if (row.district) detailParts.push(row.district);
        if (row.cep) detailParts.push(row.cep);
        if (!norm(fields.zipCode?.value) && place) detailParts.push(place);
        const detail = detailParts.join(' · ');
        return `<button type="button" class="quality-address-suggestions__item" data-index="${index}" role="option"><strong>${esc(row.street)}</strong>${detail ? `<small>${esc(detail)}</small>` : ''}</button>`;
      }).join('');
      panel.hidden = false;
      street.setAttribute('aria-expanded', 'true');
      position();
      panel.querySelectorAll('[data-index]').forEach(button => {
        button.addEventListener('pointerdown', event => event.preventDefault());
        button.addEventListener('click', () => choose(rows[Number(button.dataset.index)]));
      });
    };

    const updateActive = nextIndex => {
      const buttons = [...panel.querySelectorAll('[data-index]')];
      if (!buttons.length) return;
      activeIndex = Math.max(0, Math.min(buttons.length - 1, nextIndex));
      buttons.forEach((button, index) => button.classList.toggle('is-active', index === activeIndex));
      buttons[activeIndex]?.scrollIntoView({ block:'nearest' });
    };

    const refresh = async () => {
      const typed = norm(street.value);
      const uf = norm(fields.state.value);
      const city = norm(fields.city.value);
      const zip = norm(fields.zipCode?.value);
      if (typed.length < 2) { close(); return; }

      const previous = controllers.get(street);
      previous?.abort();
      const controller = new AbortController();
      controllers.set(street, controller);
      try {
        const result = await lookup(uf, city, typed, zip, controller.signal);
        if (controller.signal.aborted) return;
        render(result);
      } catch (error) {
        if (error?.name === 'AbortError') return;
        showMessage('Não foi possível consultar agora. Você pode continuar digitando o endereço manualmente.', 'error');
      }
    };

    street.addEventListener('input', () => {
      if (selecting) return;
      warmAddressIndex(fields, street);
      clearTimeout(timers.get(street));
      timers.set(street, setTimeout(refresh, 35));
    });
    street.addEventListener('focus', () => {
      warmAddressIndex(fields, street);
      if (norm(street.value).length >= 2) refresh();
    });
    [fields.zipCode, fields.city, fields.state].filter(Boolean).forEach(field => {
      field.addEventListener('input', () => warmAddressIndex(fields, street));
      field.addEventListener('change', () => warmAddressIndex(fields, street));
    });
    warmAddressIndex(fields, street);
    street.addEventListener('blur', () => setTimeout(close, 160));
    street.addEventListener('keydown', event => {
      if (panel.hidden) return;
      if (event.key === 'ArrowDown') { event.preventDefault(); updateActive(activeIndex + 1); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); updateActive(activeIndex <= 0 ? rows.length - 1 : activeIndex - 1); }
      else if (event.key === 'Enter' && activeIndex >= 0) { event.preventDefault(); choose(rows[activeIndex]); }
      else if (event.key === 'Escape') close();
    });
  }

  function scan(scope = document) {
    scope.querySelectorAll?.('input[name="street"]').forEach(attach);
  }

  document.addEventListener('DOMContentLoaded', () => scan());
  const observer = new MutationObserver(records => {
    for (const record of records) {
      record.addedNodes.forEach(node => {
        if (!(node instanceof Element)) return;
        if (node.matches?.('input[name="street"]')) attach(node);
        scan(node);
      });
    }
  });
  observer.observe(document.documentElement, { childList:true, subtree:true });
})();
