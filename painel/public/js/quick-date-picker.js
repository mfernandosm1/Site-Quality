(function (global) {
  'use strict';

  const MODES = {
    operations: [
      ['today', 'Hoje'],
      ['yesterday', 'Ontem'],
      ['separator'],
      ['thisWeek', 'Esta semana'],
      ['separator'],
      ['last7', 'Últimos 7 dias'],
      ['last15', 'Últimos 15 dias'],
      ['last30', 'Últimos 30 dias'],
      ['last3Months', 'Últimos 3 meses'],
      ['separator'],
      ['thisMonth', 'Este mês'],
      ['previousMonth', 'Mês anterior'],
      ['nextMonth', 'Próximo mês'],
      ['separator'],
      ['thisYear', 'Este ano'],
      ['previousYear', 'Ano anterior']
    ],
    financial: [
      ['today', 'Hoje'],
      ['yesterday', 'Ontem'],
      ['tomorrow', 'Amanhã'],
      ['separator'],
      ['thisWeek', 'Esta semana'],
      ['nextWeek', 'Próxima semana'],
      ['separator'],
      ['last7', 'Últimos 7 dias'],
      ['last15', 'Últimos 15 dias'],
      ['last30', 'Últimos 30 dias'],
      ['last3Months', 'Últimos 3 meses'],
      ['separator'],
      ['thisMonth', 'Este mês'],
      ['previousMonth', 'Mês anterior'],
      ['nextMonth', 'Próximo mês'],
      ['separator'],
      ['next30', 'Próximos 30 dias'],
      ['next60', 'Próximos 60 dias'],
      ['next90', 'Próximos 90 dias'],
      ['separator'],
      ['thisYear', 'Este ano'],
      ['previousYear', 'Ano anterior']
    ]
  };

  function cloneDate(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function format(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatBR(date) {
    return new Intl.DateTimeFormat('pt-BR').format(date);
  }

  function startOfWeek(date) {
    const result = cloneDate(date);
    const weekday = result.getDay() || 7;
    result.setDate(result.getDate() - weekday + 1);
    return result;
  }

  function endOfWeek(date) {
    const result = startOfWeek(date);
    result.setDate(result.getDate() + 6);
    return result;
  }

  function resolveRange(period, baseDate) {
    const now = cloneDate(baseDate || new Date());
    let start = cloneDate(now);
    let end = cloneDate(now);

    switch (period) {
      case 'today': break;
      case 'yesterday': start.setDate(start.getDate() - 1); end = cloneDate(start); break;
      case 'tomorrow': start.setDate(start.getDate() + 1); end = cloneDate(start); break;
      case 'thisWeek': start = startOfWeek(now); end = cloneDate(now); break;
      case 'nextWeek': start = startOfWeek(now); start.setDate(start.getDate() + 7); end = endOfWeek(start); break;
      case 'last7': start.setDate(start.getDate() - 6); break;
      case 'last15': start.setDate(start.getDate() - 14); break;
      case 'last30': start.setDate(start.getDate() - 29); break;
      case 'last3Months': start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()); break;
      case 'thisMonth': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case 'previousMonth': start = new Date(now.getFullYear(), now.getMonth() - 1, 1); end = new Date(now.getFullYear(), now.getMonth(), 0); break;
      case 'nextMonth': start = new Date(now.getFullYear(), now.getMonth() + 1, 1); end = new Date(now.getFullYear(), now.getMonth() + 2, 0); break;
      case 'next30': end.setDate(end.getDate() + 29); break;
      case 'next60': end.setDate(end.getDate() + 59); break;
      case 'next90': end.setDate(end.getDate() + 89); break;
      case 'thisYear': start = new Date(now.getFullYear(), 0, 1); break;
      case 'previousYear': start = new Date(now.getFullYear() - 1, 0, 1); end = new Date(now.getFullYear() - 1, 11, 31); break;
      default: return null;
    }
    return { start, end };
  }

  function createMenu(mode) {
    const menu = document.createElement('div');
    menu.className = 'quick-date-menu';
    menu.hidden = true;
    menu.setAttribute('role', 'menu');

    (MODES[mode] || MODES.operations).forEach(item => {
      if (item[0] === 'separator') {
        const separator = document.createElement('div');
        separator.className = 'quick-date-separator';
        menu.appendChild(separator);
        return;
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.period = item[0];
      button.setAttribute('role', 'menuitem');
      const range = resolveRange(item[0], new Date());
      button.innerHTML = `<span>${item[1]}</span><small>${range ? `${formatBR(range.start)} → ${formatBR(range.end)}` : ''}</small>`;
      menu.appendChild(button);
    });

    const separator = document.createElement('div');
    separator.className = 'quick-date-separator';
    menu.appendChild(separator);
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.dataset.period = 'clear';
    clear.setAttribute('role', 'menuitem');
    clear.innerHTML = '<span>Limpar período</span>';
    menu.appendChild(clear);
    return menu;
  }

  function init(options) {
    const from = typeof options.from === 'string' ? document.querySelector(options.from) : options.from;
    const to = typeof options.to === 'string' ? document.querySelector(options.to) : options.to;
    if (!from || !to) return null;

    const mode = options.mode === 'financial' ? 'financial' : 'operations';
    const wrapper = options.wrapper
      ? (typeof options.wrapper === 'string' ? document.querySelector(options.wrapper) : options.wrapper)
      : from.closest('.quick-date-period') || from.parentElement.parentElement;
    if (!wrapper) return null;

    const menu = createMenu(mode);
    wrapper.classList.add('quick-date-period');
    wrapper.appendChild(menu);

    const triggers = Array.from(wrapper.querySelectorAll('[data-quick-date-trigger]'));
    let activeTrigger = null;

    function close() {
      menu.hidden = true;
      activeTrigger = null;
      triggers.forEach(trigger => trigger.setAttribute('aria-expanded', 'false'));
    }

    function positionMenu(trigger) {
      const wrapperRect = wrapper.getBoundingClientRect();
      const triggerRect = trigger.getBoundingClientRect();
      const menuWidth = menu.offsetWidth || 220;
      const preferredLeft = triggerRect.right - wrapperRect.left - menuWidth;
      const maxLeft = Math.max(0, wrapper.clientWidth - menuWidth);

      menu.style.left = `${Math.min(Math.max(0, preferredLeft), maxLeft)}px`;
      menu.style.right = 'auto';
      menu.style.top = `${triggerRect.bottom - wrapperRect.top + 6}px`;
    }

    function open(trigger) {
      activeTrigger = trigger;
      triggers.forEach(item => item.setAttribute('aria-expanded', String(item === trigger)));
      menu.hidden = false;
      menu.dataset.anchor = trigger.dataset.quickDateTrigger || '';
      positionMenu(trigger);
    }

    triggers.forEach(trigger => {
      trigger.setAttribute('aria-haspopup', 'menu');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        if (!menu.hidden && activeTrigger === trigger) close(); else open(trigger);
      });
    });

    menu.addEventListener('click', event => {
      const button = event.target.closest('[data-period]');
      if (!button) return;
      const period = button.dataset.period;
      if (period === 'clear') {
        from.value = '';
        to.value = '';
      } else {
        const range = resolveRange(period, new Date());
        if (!range) return;
        from.value = format(range.start);
        to.value = format(range.end);
      }
      menu.querySelectorAll('[data-period]').forEach(item => item.classList.toggle('is-active', item === button));
      from.dispatchEvent(new Event('change', { bubbles: true }));
      to.dispatchEvent(new Event('change', { bubbles: true }));
      close();
    });

    document.addEventListener('click', event => {
      if (!menu.hidden && !wrapper.contains(event.target)) close();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') close();
    });
    window.addEventListener('resize', () => {
      if (!menu.hidden && activeTrigger) positionMenu(activeTrigger);
    });

    return { close, mode, from, to };
  }

  global.QualityQuickDatePicker = { init, resolveRange, modes: MODES };
})(window);
