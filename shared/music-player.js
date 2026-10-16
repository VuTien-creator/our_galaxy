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
 *   - Shuffles the array randomly on first play.
 *   - Plays through every song in the shuffled order.
 *   - Re-shuffles and loops when the playlist is exhausted.
 *   - Audio object is only created when playback actually starts (lazy).
 *   - Auto-starts on the first user interaction (click or touchend).
 *   - Returns a controller object with start / stop / setVolume.
 */
function createMusicPlayer(files) {
  if (!files || files.length === 0) return null;

  var shuffled     = [];
  var currentIndex = 0;
  var started      = false;

  // Single Audio element reused across all songs — avoids CORS issues
  // that arise when creating new Audio() from async (non-gesture) events.
  var audio = new Audio();
  audio.volume = 0.45;

  function shuffle(arr) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j   = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function playNext() {
    if (shuffled.length === 0) return;
    if (currentIndex >= shuffled.length) {
      shuffled     = shuffle(files);
      currentIndex = 0;
    }
    var src = shuffled[currentIndex++];
    audio.src = src;   // swap src on the existing element — no new Audio() needed
    audio.load();      // reset the element to load the new source
    audio.play().catch(function () {});
  }

  // Wire events once on the single audio element
  audio.onerror = function () {
    // Skip broken/missing file and try the next one
    if (currentIndex < shuffled.length) { playNext(); }
  };
  audio.onended = function () { playNext(); };

  function start() {
    if (started) return;
    started  = true;
    shuffled = shuffle(files);
    currentIndex = 0;
    playNext();
  }

  document.addEventListener('click',    function () { start(); }, { once: true });
  document.addEventListener('touchend', function () { start(); }, { once: true });

  return {
    start:     start,
    stop:      function () { audio.pause(); },
    setVolume: function (v) { audio.volume = Math.max(0, Math.min(1, v)); }
  };
}
