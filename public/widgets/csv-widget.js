(function () {
  'use strict';

  /* ── CSS ─────────────────────────────────────────────── */
  var STYLE = document.createElement('style');
  STYLE.textContent = [
    /* Floating trigger button */
    '.cw-trigger{',
    '  position:fixed;bottom:28px;right:28px;z-index:9998;',
    '  display:flex;align-items:center;gap:7px;',
    '  background:linear-gradient(135deg,#0B1F3B,#123A63);',
    '  color:#fff;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;',
    '  font-size:13px;font-weight:600;letter-spacing:-0.1px;',
    '  padding:11px 20px;border:none;border-radius:40px;',
    '  cursor:pointer;box-shadow:0 6px 24px rgba(11,31,59,0.3);',
    '  transition:all .25s cubic-bezier(.4,0,.2,1);',
    '}',
    '.cw-trigger:hover{transform:translateY(-2px);box-shadow:0 10px 32px rgba(11,31,59,0.4);}',
    '.cw-trigger svg{width:15px;height:15px;flex-shrink:0;}',
    '.cw-trigger.cw-open{opacity:0;pointer-events:none;transform:scale(.9);}',

    /* Overlay (mobile backdrop) */
    '.cw-overlay{',
    '  position:fixed;inset:0;z-index:9999;background:rgba(11,31,59,0.25);',
    '  opacity:0;pointer-events:none;transition:opacity .25s ease;',
    '}',
    '.cw-overlay.cw-vis{opacity:1;pointer-events:auto;}',

    /* Panel */
    '.cw-panel{',
    '  position:fixed;bottom:28px;right:28px;z-index:10000;',
    '  width:380px;max-height:calc(100vh - 56px);',
    '  background:#fff;border:1px solid #E3E8EF;border-radius:16px;',
    '  box-shadow:0 20px 60px rgba(11,31,59,0.18);',
    '  display:flex;flex-direction:column;overflow:hidden;',
    '  transform:translateY(20px) scale(.96);opacity:0;pointer-events:none;',
    '  transition:all .3s cubic-bezier(.34,1.56,.64,1);',
    '}',
    '.cw-panel.cw-vis{transform:translateY(0) scale(1);opacity:1;pointer-events:auto;}',
    '@media(max-width:440px){.cw-panel{right:12px;left:12px;width:auto;bottom:12px;max-height:calc(100vh - 24px);}}',

    /* Panel header */
    '.cw-hdr{',
    '  display:flex;align-items:center;justify-content:space-between;',
    '  padding:18px 20px;border-bottom:1px solid #E3E8EF;flex-shrink:0;',
    '}',
    '.cw-hdr h3{font-size:15px;font-weight:700;color:#0B1F3B;letter-spacing:-0.2px;margin:0;}',
    '.cw-close{',
    '  width:28px;height:28px;border-radius:7px;border:none;',
    '  background:#F6F8FB;color:#7A8BA3;cursor:pointer;',
    '  display:flex;align-items:center;justify-content:center;font-size:16px;',
    '  transition:all .2s ease;',
    '}',
    '.cw-close:hover{background:#E3E8EF;color:#0B1F3B;}',

    /* Body */
    '.cw-body{padding:18px 20px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:14px;}',
    '.cw-helper{font-size:12.5px;color:#7A8BA3;line-height:1.55;margin:0;}',

    /* Input */
    '.cw-ta{',
    '  width:100%;min-height:72px;border:1px solid #E3E8EF;border-radius:10px;',
    '  padding:12px 14px;font-family:Inter,sans-serif;font-size:13.5px;color:#0B1F3B;',
    '  background:#F6F8FB;resize:vertical;line-height:1.6;',
    '  transition:border-color .2s,box-shadow .2s;',
    '}',
    '.cw-ta::placeholder{color:#A0AEC0;}',
    '.cw-ta:focus{outline:none;border-color:#123A63;box-shadow:0 0 0 3px rgba(18,58,99,.08);background:#fff;}',

    /* Generate button */
    '.cw-btn{',
    '  display:flex;align-items:center;justify-content:center;gap:7px;width:100%;',
    '  font-family:Inter,sans-serif;font-size:13.5px;font-weight:700;color:#fff;',
    '  background:linear-gradient(135deg,#0B1F3B,#123A63);border:none;border-radius:10px;',
    '  padding:11px 0;cursor:pointer;transition:all .25s cubic-bezier(.4,0,.2,1);',
    '}',
    '.cw-btn:hover{box-shadow:0 4px 16px rgba(11,31,59,.25);transform:translateY(-1px);}',
    '.cw-btn:disabled{opacity:.55;cursor:not-allowed;transform:none;box-shadow:none;}',
    '.cw-btn svg{width:15px;height:15px;animation:cw-spin 1s linear infinite;}',
    '@keyframes cw-spin{to{transform:rotate(360deg);}}',

    /* Result area */
    '.cw-result{display:none;flex-direction:column;gap:10px;}',
    '.cw-result.cw-vis{display:flex;}',
    '.cw-result-lbl{font-size:10px;font-weight:600;color:#7A8BA3;text-transform:uppercase;letter-spacing:.5px;}',
    '.cw-code{',
    '  background:#0B1F3B;color:#E2E8F0;font-family:"SF Mono","Fira Code",Consolas,monospace;',
    '  font-size:12.5px;line-height:1.7;padding:14px;border-radius:10px;',
    '  white-space:pre;overflow-x:auto;min-height:48px;max-height:140px;overflow-y:auto;',
    '}',
    '.cw-actions{display:flex;gap:8px;}',
    '.cw-act{',
    '  display:inline-flex;align-items:center;gap:5px;flex:1;justify-content:center;',
    '  font-family:Inter,sans-serif;font-size:12px;font-weight:600;',
    '  color:#0B1F3B;background:#F6F8FB;border:1px solid #E3E8EF;border-radius:8px;',
    '  padding:8px 0;cursor:pointer;transition:all .2s ease;',
    '}',
    '.cw-act:hover{background:#E3E8EF;}',
    '.cw-act svg{width:13px;height:13px;stroke:#7A8BA3;flex-shrink:0;}',

    /* Warnings */
    '.cw-warn{',
    '  background:#EFF3F9;border:1px solid #123A63;border-radius:8px;',
    '  padding:10px 14px;font-size:12px;color:#0B1F3B;line-height:1.5;',
    '}',
    '.cw-warn strong{font-weight:700;}',
    '.cw-warn ul{margin:4px 0 0 16px;padding:0;}',
    '.cw-warn li{margin-bottom:2px;}',

    /* Error */
    '.cw-err{font-size:12.5px;font-weight:500;color:#DC2626;display:none;}',
    '.cw-err.cw-vis{display:block;}',
  ].join('\n');
  document.head.appendChild(STYLE);

  /* ── Detect page context ────────────────────────────── */
  var uploadTextarea = document.getElementById('portfolio-input');
  var isUploadPage = !!uploadTextarea;

  /* ── Build DOM ──────────────────────────────────────── */

  // Trigger button
  var trigger = document.createElement('button');
  trigger.className = 'cw-trigger';
  trigger.setAttribute('aria-label', 'Build CSV');
  trigger.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>' +
    '<polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>' +
    '<line x1="16" y1="17" x2="8" y2="17"/></svg>' +
    'Build CSV';

  // Overlay
  var overlay = document.createElement('div');
  overlay.className = 'cw-overlay';

  // Panel
  var panel = document.createElement('div');
  panel.className = 'cw-panel';

  var insertBtnHtml = isUploadPage
    ? '<button class="cw-act" id="cw-insert">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 5v14"/><path d="M5 12h14"/></svg>' +
      'Insert into portfolio</button>'
    : '';

  panel.innerHTML =
    '<div class="cw-hdr">' +
    '  <h3>Build your portfolio CSV</h3>' +
    '  <button class="cw-close" id="cw-close" aria-label="Close">\u2715</button>' +
    '</div>' +
    '<div class="cw-body">' +
    '  <p class="cw-helper">Describe holdings in plain English.<br>' +
    '  Example: \u201c40% Apple, 30% Microsoft, 30% Nvidia\u201d or \u201c60% tech, 40% bonds\u201d</p>' +
    '  <textarea class="cw-ta" id="cw-input" placeholder="I want 50% US equities and 50% bonds\u2026" spellcheck="false"></textarea>' +
    '  <button class="cw-btn" id="cw-gen">Generate CSV</button>' +
    '  <div class="cw-err" id="cw-err"></div>' +
    '  <div class="cw-warn" id="cw-warn" style="display:none"></div>' +
    '  <div class="cw-result" id="cw-result">' +
    '    <span class="cw-result-lbl">Generated CSV</span>' +
    '    <div class="cw-code" id="cw-code"></div>' +
    '    <div class="cw-actions">' +
    '      <button class="cw-act" id="cw-copy">' +
    '        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>' +
    '        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
    '        <span id="cw-copy-lbl">Copy CSV</span></button>' +
    insertBtnHtml +
    '    </div>' +
    '  </div>' +
    '</div>';

  document.body.appendChild(trigger);
  document.body.appendChild(overlay);
  document.body.appendChild(panel);

  /* ── References ─────────────────────────────────────── */
  var inputEl = document.getElementById('cw-input');
  var genBtn = document.getElementById('cw-gen');
  var errEl = document.getElementById('cw-err');
  var warnEl = document.getElementById('cw-warn');
  var resultEl = document.getElementById('cw-result');
  var codeEl = document.getElementById('cw-code');
  var copyBtn = document.getElementById('cw-copy');
  var copyLbl = document.getElementById('cw-copy-lbl');
  var insertBtn = isUploadPage ? document.getElementById('cw-insert') : null;
  var closeBtn = document.getElementById('cw-close');

  var currentCsv = '';

  /* ── Open / Close ───────────────────────────────────── */
  function openPanel() {
    trigger.classList.add('cw-open');
    panel.classList.add('cw-vis');
    overlay.classList.add('cw-vis');
    inputEl.focus();
  }

  function closePanel() {
    trigger.classList.remove('cw-open');
    panel.classList.remove('cw-vis');
    overlay.classList.remove('cw-vis');
  }

  trigger.addEventListener('click', openPanel);
  closeBtn.addEventListener('click', closePanel);
  overlay.addEventListener('click', closePanel);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('cw-vis')) closePanel();
  });

  /* ── Generate ───────────────────────────────────────── */
  genBtn.addEventListener('click', async function () {
    var text = inputEl.value.trim();
    if (!text) return;

    genBtn.disabled = true;
    genBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
      '<circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,.25)"/>' +
      '<path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" stroke-linecap="round"/></svg>' +
      'Generating\u2026';
    errEl.classList.remove('cw-vis');
    errEl.textContent = '';
    warnEl.style.display = 'none';
    resultEl.classList.remove('cw-vis');
    currentCsv = '';

    try {
      var res = await fetch('/api/generate-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text })
      });
      var data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      currentCsv = data.csvRows;
      codeEl.textContent = currentCsv;
      resultEl.classList.add('cw-vis');
      copyLbl.textContent = 'Copy CSV';

      if (data.warnings && data.warnings.length > 0) {
        var html = '<strong>Note:</strong><ul>';
        data.warnings.forEach(function (w) { html += '<li>' + w + '</li>'; });
        html += '</ul>';
        warnEl.innerHTML = html;
        warnEl.style.display = 'block';
      }
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.add('cw-vis');
    } finally {
      genBtn.disabled = false;
      genBtn.textContent = 'Generate CSV';
    }
  });

  /* ── Copy ────────────────────────────────────────────── */
  copyBtn.addEventListener('click', function () {
    if (!currentCsv) return;
    navigator.clipboard.writeText(currentCsv).then(function () {
      copyLbl.textContent = 'Copied!';
      setTimeout(function () { copyLbl.textContent = 'Copy CSV'; }, 2000);
    });
  });

  /* ── Insert (upload page only) ──────────────────────── */
  if (insertBtn && uploadTextarea) {
    insertBtn.addEventListener('click', function () {
      if (!currentCsv) return;
      var converted = currentCsv.split('\n').map(function (line) {
        var parts = line.split(',');
        if (parts.length < 2) return line;
        var pct = (parseFloat(parts[1]) * 100).toFixed(0);
        return parts[0] + ', ' + pct + '%';
      }).join('\n');

      uploadTextarea.value = converted;
      uploadTextarea.dispatchEvent(new Event('input', { bubbles: true }));

      insertBtn.querySelector('svg').style.display = 'none';
      var span = insertBtn.querySelector('span') || insertBtn;
      var origText = insertBtn.textContent.trim();
      insertBtn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px">' +
        '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
        ' Inserted!';
      setTimeout(function () {
        insertBtn.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px">' +
          '<path d="M12 5v14"/><path d="M5 12h14"/></svg>' +
          ' Insert into portfolio';
      }, 2000);
    });
  }
})();
