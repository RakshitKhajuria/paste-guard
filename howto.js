/* Chapter buttons jump the tutorial video to a time. The video itself loads only when someone presses play or a chapter. */
(function () {
  'use strict';
  var v = document.getElementById('howVideo');
  if (!v) return;
  document.querySelectorAll('.chap').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = parseFloat(b.getAttribute('data-t'));
      v.preload = 'auto';
      var go = function () { v.currentTime = t; v.play(); };
      if (v.readyState >= 1) go(); else { v.addEventListener('loadedmetadata', go, { once: true }); v.load(); }
      v.scrollIntoView({ block: 'nearest' });
    });
  });
})();
