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
  var audio        = null;
  var started      = false;

  // Fisher-Yates shuffle (returns a new array, doesn't mutate original)
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

  // Load and play the next song in the shuffled playlist
  function playNext() {
    if (shuffled.length === 0) return;

    // Re-shuffle when the whole playlist has been played
    if (currentIndex >= shuffled.length) {
      shuffled      = shuffle(files);
      currentIndex  = 0;
    }

    var src = shuffled[currentIndex];
    currentIndex++;

    // Lazy: create a fresh Audio object for each song
    if (audio) {
      audio.pause();
      audio.src = '';
    }
    audio          = new Audio(src);
    audio.volume   = 0.45;
    audio.onerror  = function () { playNext(); };  // skip broken files
    audio.onended  = function () { playNext(); };  // advance playlist
    audio.play().catch(function () {});
  }

  function start() {
    if (started) return;
    started  = true;
    shuffled = shuffle(files);
    currentIndex = 0;
    playNext();
  }

  // Auto-start on first user interaction (browser requires gesture for audio)
  document.addEventListener('click',    function () { start(); }, { once: true });
  document.addEventListener('touchend', function () { start(); }, { once: true });

  return {
    start:     start,
    stop:      function () { if (audio) { audio.pause(); audio.src = ''; } },
    setVolume: function (v) { if (audio) audio.volume = Math.max(0, Math.min(1, v)); }
  };
}
