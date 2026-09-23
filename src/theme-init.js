// Runs before the first paint: applies the saved theme and language so the screen never flashes.
// Inlined into index.html at build time; the CSP allows exactly this script by its SHA-256 hash.
(function () {
  var root = document.documentElement;
  try {
    var theme = localStorage.getItem('nern.theme');
    if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;

    var locale = localStorage.getItem('nern.locale');
    if (locale !== 'uk' && locale !== 'en') {
      var langs = navigator.languages || [navigator.language];
      locale = 'en';
      for (var i = 0; i < langs.length; i++) {
        var l = String(langs[i]).toLowerCase();
        if (l.indexOf('uk') === 0) {
          locale = 'uk';
          break;
        }
        if (l.indexOf('en') === 0) {
          locale = 'en';
          break;
        }
      }
    }
    root.lang = locale;
  } catch (e) {
    // Storage can be blocked (private mode). Defaults from index.html stay in place.
  }
})();
