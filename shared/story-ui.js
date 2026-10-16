// shared/story-ui.js — Injects the tracking toast notification UI element.
// Must be loaded BEFORE shared/tracking.js so #tracking-toast exists in the DOM
// when the tracking module initialises.
// Compatible with: any story page that uses the shared tracking module.
(function () {
  if (document.getElementById('tracking-toast')) { return; }
  var t = document.createElement('div');
  t.id = 'tracking-toast';
  t.style.cssText = [
    'display:none',
    'position:fixed',
    'bottom:24px',
    'right:16px',
    'max-width:300px',
    'z-index:200',
    'background:rgba(8,4,25,0.96)',
    'border:1px solid rgba(168,85,247,0.4)',
    'border-radius:16px',
    'padding:18px 42px 18px 16px',
    'font-size:14px',
    'line-height:1.65',
    'box-shadow:0 0 40px rgba(168,85,247,0.25)',
    'color:#ddd0ff',
    'transition:opacity 0.4s, transform 0.4s',
    'transform:translateY(20px)'
  ].join(';');
  t.innerHTML =
    '<button onclick="closeTrackingToast()" style="position:absolute;top:10px;right:12px;' +
    'background:none;border:none;color:#777;font-size:18px;cursor:pointer;">\u2715</button>' +
    '<div style="font-size:22px;margin-bottom:6px;" id="toast-icon">\ud83d\udcab</div>' +
    '<span id="toast-message"></span>';
  document.body.appendChild(t);
}());
