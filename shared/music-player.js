/**
 * shared/music-player.js — Shared music player
 *
 * Usage:
 *   <script src="../../shared/music-player.js"></script>
 *   <script>
 *     var MUSIC_FILES = ['./musics/song1.mp3', './musics/song2.mp3'];
 *     createMusicPlayer(MUSIC_FILES);
 *   </script>
 *
 * Behaviour:
 *   - On first play: picks a completely random song from the array.
 *   - When a song ends: picks another random song (never immediately repeating
 *     the same one when the playlist has more than one track).
 *   - Audio object is created once and reused — avoids CORS issues that arise
 *     when creating new Audio() from async (non-gesture) events.
 *   - Auto-starts on the first user interaction (click or touchend).
 *   - Returns a controller object with start / stop / setVolume.
 */
function createMusicPlayer(files) {
  if (!files || files.length === 0) return null;

  var currentIndex = -1;   // -1 = nothing played yet
  var started      = false;

  // Single Audio element reused across all songs
  var audio = new Audio();
  audio.volume = 0.45;

  // Pick a random track from `files`, avoiding immediate repetition when
  // possible (i.e. when there is more than one track to choose from).
  function _pickRandom() {
    if (files.length === 1) return 0;
    var next;
    do {
      next = Math.floor(Math.random() * files.length);
    } while (next === currentIndex);
    return next;
  }

  function playRandom() {
    if (files.length === 0) return;
    currentIndex = _pickRandom();
    audio.src    = files[currentIndex];
    audio.load();                          // reset element to new source
    audio.play().catch(function () {});
  }

  // Skip broken / missing files silently
  audio.onerror = function () { playRandom(); };

  // Auto-advance to a new random song when the current one finishes
  audio.onended = function () { playRandom(); };

  function start() {
    if (started) return;
    started = true;
    playRandom();
  }

  document.addEventListener('click',    function () { start(); }, { once: true });
  document.addEventListener('touchend', function () { start(); }, { once: true });

  return {
    start:     start,
    stop:      function ()  { audio.pause(); },
    setVolume: function (v) { audio.volume = Math.max(0, Math.min(1, v)); }
  };
}
