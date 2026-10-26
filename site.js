/* Paste Guard site: the only script on the landing page. It does one thing: lets the hero demo be replayed.
 * Without JavaScript the demo simply rests in its finished state. No network, no storage. */
(function () {
  'use strict';
  var stage = document.getElementById('stage');
  var btn = document.getElementById('replay');
  if (!stage || !btn) return;
  btn.hidden = false;
  btn.addEventListener('click', function () {
    stage.classList.add('is-reset');          // animations off for one frame...
    void stage.offsetWidth;                   // ...force a reflow...
    stage.classList.remove('is-reset');       // ...and they start again from the beginning
  });
})();

/* "What it catches": one preview panel shared by all chips. Hover, focus and press all select; the first is selected
 * by default. The panel is hidden without JavaScript and the chips stay a plain list. */
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  var panel = document.getElementById('preview');
  if (!panel) return;
  var body = panel.querySelector('.pv-body');
  var name = panel.querySelector('.pv-name');
  var sample = panel.querySelector('.pv-sample');
  var tag = panel.querySelector('.tag');
  var chips = document.querySelectorAll('.chip');
  panel.hidden = false;
  function select(chip) {
    if (chip.getAttribute('aria-pressed') === 'true') return;
    chips.forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
    name.textContent = chip.dataset.name;
    sample.textContent = chip.dataset.sample;
    sample.title = chip.dataset.sample;
    tag.textContent = chip.dataset.ph;
    body.classList.remove('swap');
    void body.offsetWidth;
    body.classList.add('swap');
  }
  chips.forEach(function (c) {
    c.addEventListener('mouseenter', function () { select(c); });
    c.addEventListener('focus', function () { select(c); });
    c.addEventListener('click', function () { select(c); });
  });
})();
