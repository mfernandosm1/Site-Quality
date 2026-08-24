(function () {
  'use strict';

  function ready(callback) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', callback, { once: true });
    else callback();
  }

  ready(function () {
    var tree = document.getElementById('erpCatTree');
    var modal = document.getElementById('erpCatModal');
    if (!tree || !modal) return;

    var rows = Array.prototype.slice.call(tree.querySelectorAll('.erp-cat-row'));
    var items = [];
    try {
      items = JSON.parse(document.getElementById('erpCatItemsData').textContent || '[]');
    } catch (error) {
      console.error('Falha ao carregar as categorias ERP.', error);
    }
    var itemsById = new Map(items.map(function (item) { return [String(item.id), item]; }));

    function rowById(id) {
      return rows.find(function (row) { return row.dataset.id === String(id); });
    }

    function directChildren(id) {
      return rows.filter(function (row) { return row.dataset.parent === String(id); });
    }

    function descendants(id) {
      var result = [];
      function walk(parentId) {
        directChildren(parentId).forEach(function (row) {
          result.push(row);
          walk(row.dataset.id);
        });
      }
      walk(id);
      return result;
    }

    function isExpanded(row) {
      var toggle = row.querySelector('[data-category-toggle]');
      return !!toggle && toggle.getAttribute('aria-expanded') === 'true';
    }

    function setExpanded(row, expanded) {
      var toggle = row.querySelector('[data-category-toggle]');
      if (!toggle) return;
      toggle.textContent = expanded ? '▼' : '▶';
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      toggle.setAttribute('aria-label', (expanded ? 'Recolher ' : 'Expandir ') + (row.dataset.name || 'categoria'));

      if (!expanded) {
        descendants(row.dataset.id).forEach(function (child) { child.hidden = true; });
        return;
      }

      directChildren(row.dataset.id).forEach(function (child) { child.hidden = false; });
    }

    tree.addEventListener('click', function (event) {
      var toggle = event.target.closest('[data-category-toggle]');
      if (!toggle) return;
      var row = toggle.closest('.erp-cat-row');
      if (row) setExpanded(row, !isExpanded(row));
    });

    var expandAll = document.getElementById('erpCatExpandAll');
    if (expandAll) expandAll.addEventListener('click', function () {
      rows.forEach(function (row) {
        var toggle = row.querySelector('[data-category-toggle]');
        if (toggle) {
          toggle.textContent = '▼';
          toggle.setAttribute('aria-expanded', 'true');
        }
        row.hidden = false;
      });
    });

    var collapseAll = document.getElementById('erpCatCollapseAll');
    if (collapseAll) collapseAll.addEventListener('click', function () {
      rows.forEach(function (row) {
        var toggle = row.querySelector('[data-category-toggle]');
        if (toggle) {
          toggle.textContent = '▶';
          toggle.setAttribute('aria-expanded', 'false');
        }
        row.hidden = Number(row.dataset.depth || 0) > 0;
      });
    });

    var search = document.getElementById('erpCatSearch');
    if (search) search.addEventListener('input', function () {
      var query = search.value.toLocaleLowerCase('pt-BR').trim();
      if (!query) {
        if (collapseAll) collapseAll.click();
        return;
      }

      rows.forEach(function (row) { row.hidden = true; });
      rows.filter(function (row) { return (row.dataset.name || '').includes(query); }).forEach(function (row) {
        row.hidden = false;
        var parentId = row.dataset.parent;
        while (parentId) {
          var parent = rowById(parentId);
          if (!parent) break;
          parent.hidden = false;
          var parentToggle = parent.querySelector('[data-category-toggle]');
          if (parentToggle) {
            parentToggle.textContent = '▼';
            parentToggle.setAttribute('aria-expanded', 'true');
          }
          parentId = parent.dataset.parent;
        }
      });
    });

    var title = document.getElementById('erpCatModalTitle');
    var idInput = document.getElementById('catId');
    var nameInput = document.getElementById('catName');
    var typeInput = document.getElementById('catType');
    var parentInput = document.getElementById('catParent');
    var activeInput = document.getElementById('catActive');
    var descriptionInput = document.getElementById('catDescription');

    function collectDescendantIds(id) {
      var result = new Set([String(id)]);
      var changed = true;
      while (changed) {
        changed = false;
        items.forEach(function (item) {
          if (item.parentId && result.has(String(item.parentId)) && !result.has(String(item.id))) {
            result.add(String(item.id));
            changed = true;
          }
        });
      }
      return result;
    }

    function openModal(item) {
      item = item || null;
      title.textContent = item ? 'Editar categoria ERP' : 'Nova categoria ERP';
      idInput.value = item ? item.id : '';
      nameInput.value = item ? item.name || '' : '';
      typeInput.value = item ? item.type || 'product' : 'product';
      parentInput.value = item ? item.parentId || '' : '';
      activeInput.value = item && item.active === false ? 'false' : 'true';
      descriptionInput.value = item ? item.description || '' : '';

      var blockedIds = item ? collectDescendantIds(item.id) : new Set();
      Array.prototype.forEach.call(parentInput.options, function (option) {
        option.disabled = !!option.value && blockedIds.has(String(option.value));
      });

      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('erp-cat-modal-open');
      window.setTimeout(function () { nameInput.focus(); }, 0);
    }

    function closeModal() {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('erp-cat-modal-open');
    }

    var newButton = document.getElementById('erpCatNew');
    if (newButton) newButton.addEventListener('click', function () { openModal(null); });

    tree.addEventListener('click', function (event) {
      var editButton = event.target.closest('[data-category-edit]');
      if (!editButton) return;
      var item = itemsById.get(String(editButton.dataset.categoryEdit));
      if (item) openModal(item);
    });

    document.querySelectorAll('[data-category-close]').forEach(function (button) {
      button.addEventListener('click', closeModal);
    });
    modal.addEventListener('click', function (event) { if (event.target === modal) closeModal(); });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && modal.classList.contains('open')) closeModal(); });

    document.querySelectorAll('[data-category-delete-form]').forEach(function (form) {
      form.addEventListener('submit', function (event) {
        if (!window.confirm('Excluir esta categoria ERP? Esta ação não pode ser desfeita.')) event.preventDefault();
      });
    });

    var printButton = document.getElementById('erpCatPrint');
    if (printButton) printButton.addEventListener('click', function () {
      var typeLabels = { product: 'Produto', service: 'Serviço', controlled_product: 'Produto Controlado' };
      var statusById = new Map();
      rows.forEach(function (row) {
        var status = row.querySelector('.erp-cat-status');
        var productsCell = row.children[2];
        var lastUseCell = row.children[4];
        statusById.set(String(row.dataset.id), {
          products: productsCell ? productsCell.textContent.trim() : '0',
          status: status ? status.textContent.trim() : 'Ativa',
          lastUse: lastUseCell ? lastUseCell.textContent.trim() : '—'
        });
      });

      var lines = items.map(function (item) {
        var depth = Number((rowById(item.id) || {}).dataset?.depth || 0);
        var info = statusById.get(String(item.id)) || {};
        return '<tr>' +
          '<td class="name" style="padding-left:' + (12 + depth * 18) + 'px">' + escapeHtml(item.name || '') + '</td>' +
          '<td>' + escapeHtml(typeLabels[item.type] || 'Produto') + '</td>' +
          '<td class="center">' + escapeHtml(info.products || '0') + '</td>' +
          '<td>' + escapeHtml(info.status || 'Ativa') + '</td>' +
          '<td>' + escapeHtml(info.lastUse || '—') + '</td>' +
        '</tr>';
      }).join('');

      var html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Categorias ERP</title><style>' +
        '@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;margin:0;font-size:11px}' +
        'h1{font-size:21px;margin:0 0 4px}p{margin:0 0 16px;color:#555}.meta{display:flex;gap:22px;margin:0 0 14px;padding:10px 12px;border:1px solid #ddd;border-radius:8px}' +
        'table{width:100%;border-collapse:collapse}th,td{padding:8px 7px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}' +
        'th{font-size:9px;text-transform:uppercase;background:#f3f4f6}.name{font-weight:700}.center{text-align:center}.footer{margin-top:12px;color:#666;font-size:9px}' +
        '</style></head><body><h1>Categorias ERP</h1><p>Estrutura interna do ERP, sem vínculo com SEO ou navegação da Loja Virtual.</p>' +
        '<div class="meta"><span><strong>Total:</strong> ' + items.length + '</span><span><strong>Ativas:</strong> ' + items.filter(function(i){return i.active !== false;}).length + '</span></div>' +
        '<table><thead><tr><th>Nome</th><th>Tipo</th><th>Produtos</th><th>Status</th><th>Última utilização</th></tr></thead><tbody>' + lines + '</tbody></table>' +
        '<div class="footer">Gerado em ' + new Date().toLocaleString('pt-BR') + '</div></body></html>';

      var frame = document.getElementById('erpCatPrintFrame');
      if (!frame) {
        frame = document.createElement('iframe');
        frame.id = 'erpCatPrintFrame';
        frame.setAttribute('aria-hidden', 'true');
        frame.style.position = 'fixed';
        frame.style.right = '0';
        frame.style.bottom = '0';
        frame.style.width = '1px';
        frame.style.height = '1px';
        frame.style.border = '0';
        frame.style.opacity = '0';
        document.body.appendChild(frame);
      }
      frame.onload = function () {
        window.setTimeout(function () {
          frame.contentWindow.focus();
          frame.contentWindow.print();
        }, 100);
      };
      frame.srcdoc = html;
    });

    function escapeHtml(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  });
})();
