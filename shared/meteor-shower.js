/*!
 * meteor-shower.js — reusable 2D canvas meteor shower overlay.
 * No dependencies. Works on top of any page (Three.js or 2D canvas).
 *
 * ── API ──────────────────────────────────────────────────────────────────────
 *   MeteorShower.trigger(options?)   — start a shower
 *   MeteorShower.stop()              — cancel immediately
 *
 * ── Options ──────────────────────────────────────────────────────────────────
 *   count     {number}   meteors to spawn                   default: 15
 *   duration  {number}   total effect duration in ms        default: 5000
 *   radiantX  {number}   radiant X as 0–1 fraction of W     default: random
 *   radiantY  {number}   radiant Y as 0–1 fraction of H     default: random (above screen)
 *   minSize   {number}   minimum meteor head size in px     default: 0.9
 *   maxSize   {number}   maximum meteor head size in px     default: 2.6
 *   zIndex    {number}   canvas stacking order              default: 650
 *
 * ── Examples ─────────────────────────────────────────────────────────────────
 *   // Default shower from a random upper position
 *   MeteorShower.trigger();
 *
 *   // Lots of big meteors from upper-left, 6 seconds
 *   MeteorShower.trigger({ count: 25, duration: 6000, radiantX: 0.1, radiantY: -0.05 });
 *
 *   // Schedule every 2 minutes, randomly
 *   setInterval(function() { MeteorShower.trigger(); }, 120000);
 */
var MeteorShower = (function () {
  'use strict';

  var _canvas  = null;
  var _ctx     = null;
  var _animId  = null;
  var _W = 0, _H = 0;
  var _meteors   = [];
  var _startTime = 0;
  var _duration  = 5000;

  // Global fade envelope durations (ms)
  var FADE_IN  = 400;
  var FADE_OUT = 1300;

  // ── Helpers ───────────────────────────────────────────────────────────────

  function _rand(a, b) { return a + Math.random() * (b - a); }

  function _ensureCanvas(zIndex) {
    if (!_canvas) {
      _canvas = document.createElement('canvas');
      _canvas.id = 'meteor-shower-canvas';
      _canvas.style.cssText =
        'position:fixed;top:0;left:0;width:100%;height:100%;' +
        'pointer-events:none;display:none;';
      document.body.appendChild(_canvas);
    }
    _canvas.style.zIndex = String(zIndex != null ? zIndex : 650);
    _ctx = _canvas.getContext('2d');
  }

  function _resize() {
    _W = _canvas.width  = window.innerWidth;
    _H = _canvas.height = window.innerHeight;
  }

  // ── Spawn one meteor that radiates away from point (rx, ry) ───────────────
  //
  //   All meteors in a shower share the same radiant — if you extend the trails
  //   backward they all converge there, exactly like a real meteor shower.

  function _spawnMeteor(rx, ry, totalDuration, minSize, maxSize) {
    // Direction: fan out from radiant downward (angle in [~49°, ~131°])
    // 0° = right, 90° = down in screen coordinates (y increases downward).
    // This cone points mostly downward with left/right spread, perfect for a
    // radiant placed near the top of the screen.
    var angle = _rand(Math.PI * 0.27, Math.PI * 0.73);

    // Meteors appear some distance from the radiant (they "ignite" partway along)
    var d1 = _rand(40, 200);
    var sx = rx + Math.cos(angle) * d1;
    var sy = ry + Math.sin(angle) * d1;

    // Each meteor travels proportionally to screen width before fading
    var travel = _rand(_W * 0.20, _W * 0.52);
    var ex = sx + Math.cos(angle) * travel;
    var ey = sy + Math.sin(angle) * travel;

    return {
      sx: sx, sy: sy,
      ex: ex, ey: ey,
      // Stagger entry over the first 68% of total duration so they don't all
      // appear simultaneously — creates the feel of a continuous shower
      delay:    _rand(0, totalDuration * 0.68),
      // Each individual meteor lasts 550–1100 ms
      lifetime: _rand(550, 1100),
      size:     _rand(minSize, maxSize),
      tailLen:  _rand(80, 230),
      // Runtime state
      active:  false,
      startAt: 0,
      done:    false
    };
  }

  // ── Render one meteor at per-meteor progress t ∈ [0,1] ───────────────────

  function _drawMeteor(m, t, gAlpha) {
    // Smoothstep: ease-in/ease-out for the travel
    var ease = t * t * (3 - 2 * t);

    // Head position along travel path
    var hx = m.sx + (m.ex - m.sx) * ease;
    var hy = m.sy + (m.ey - m.sy) * ease;

    // Forward unit vector (head points in this direction)
    var dx = m.ex - m.sx, dy = m.ey - m.sy;
    var dl = Math.sqrt(dx * dx + dy * dy);
    if (dl < 1) return;
    var nx = dx / dl, ny = dy / dl;

    // Tail grows quickly at the start, then holds full length
    var build  = Math.min(t * 2.8, 1.0);
    var tailPx = m.tailLen * build;
    // Tail end is BEHIND the head in the direction opposite to travel
    var tx = hx - nx * tailPx;
    var ty = hy - ny * tailPx;

    // Per-meteor opacity:
    //   • slight brightness peak in first 18% (flash as it ignites)
    //   • full alpha 18%–70%
    //   • fade out over last 30%
    var peakBoost = t < 0.18 ? (1 + 0.35 * (1 - t / 0.18)) : 1.0;
    var mAlpha    = Math.min(1.0, gAlpha * peakBoost) *
                    (t < 0.70 ? 1.0 : (1.0 - t) / 0.30);
    if (mAlpha < 0.005) return;

    var s = m.size;

    // ── 1) Outer halo — broad radial glow at the head ─────────────────────
    var haloR = s * 9;
    var halo  = _ctx.createRadialGradient(hx, hy, 0, hx, hy, haloR);
    halo.addColorStop(0,    'rgba(220,235,255,' + (mAlpha * 0.78) + ')');
    halo.addColorStop(0.28, 'rgba(180,210,255,' + (mAlpha * 0.38) + ')');
    halo.addColorStop(0.65, 'rgba(140,180,255,' + (mAlpha * 0.10) + ')');
    halo.addColorStop(1,    'rgba(100,150,255,0)');
    _ctx.beginPath();
    _ctx.arc(hx, hy, haloR, 0, Math.PI * 2);
    _ctx.fillStyle = halo;
    _ctx.fill();

    // ── 2) Wide soft trail ────────────────────────────────────────────────
    var wg = _ctx.createLinearGradient(hx, hy, tx, ty);
    wg.addColorStop(0,   'rgba(185,210,255,' + (mAlpha * 0.50) + ')');
    wg.addColorStop(0.3, 'rgba(155,192,255,' + (mAlpha * 0.22) + ')');
    wg.addColorStop(1,   'rgba(120,165,255,0)');
    _ctx.beginPath();
    _ctx.moveTo(hx, hy);
    _ctx.lineTo(tx, ty);
    _ctx.strokeStyle = wg;
    _ctx.lineWidth   = s * 4.5;
    _ctx.lineCap     = 'round';
    _ctx.stroke();

    // ── 3) Mid glow trail ─────────────────────────────────────────────────
    var mg = _ctx.createLinearGradient(hx, hy, tx, ty);
    mg.addColorStop(0,    'rgba(235,245,255,' + (mAlpha * 0.82) + ')');
    mg.addColorStop(0.38, 'rgba(210,232,255,' + (mAlpha * 0.38) + ')');
    mg.addColorStop(1,    'rgba(180,215,255,0)');
    _ctx.beginPath();
    _ctx.moveTo(hx, hy);
    _ctx.lineTo(tx, ty);
    _ctx.strokeStyle = mg;
    _ctx.lineWidth   = s * 1.8;
    _ctx.lineCap     = 'round';
    _ctx.stroke();

    // ── 4) Bright white core ──────────────────────────────────────────────
    var cg = _ctx.createLinearGradient(hx, hy, tx, ty);
    cg.addColorStop(0,    'rgba(255,255,255,' + mAlpha + ')');
    cg.addColorStop(0.45, 'rgba(255,255,255,' + (mAlpha * 0.38) + ')');
    cg.addColorStop(1,    'rgba(255,255,255,0)');
    _ctx.beginPath();
    _ctx.moveTo(hx, hy);
    _ctx.lineTo(tx, ty);
    _ctx.strokeStyle = cg;
    _ctx.lineWidth   = s * 0.55;
    _ctx.lineCap     = 'round';
    _ctx.stroke();

    // ── 5) Sparkle flecks near the head (early in lifetime, larger meteors) ─
    if (t < 0.55 && mAlpha > 0.22 && s > 1.4) {
      var nSparks = Math.ceil(s * 1.5);
      for (var k = 0; k < nSparks; k++) {
        var sr  = _rand(0, s * 9);
        var sa  = Math.random() * Math.PI * 2;
        var spA = mAlpha * _rand(0.12, 0.50) * (1 - t / 0.55);
        _ctx.beginPath();
        _ctx.arc(
          hx + Math.cos(sa) * sr,
          hy + Math.sin(sa) * sr,
          _rand(0.3, 0.9),
          0, Math.PI * 2
        );
        _ctx.fillStyle = 'rgba(255,255,255,' + spA + ')';
        _ctx.fill();
      }
    }
  }

  // ── Animation loop ────────────────────────────────────────────────────────

  function _loop() {
    var now     = Date.now();
    var elapsed = now - _startTime;
    var prog    = Math.min(elapsed / _duration, 1.0);

    // Global fade-in → hold → fade-out envelope
    var fi  = FADE_IN  / _duration;
    var fo  = FADE_OUT / _duration;
    var gA  = prog < fi        ? prog / fi
            : prog > (1 - fo)  ? (1 - prog) / fo
            : 1.0;

    _ctx.clearRect(0, 0, _W, _H);

    var anyLive = elapsed < _duration;

    for (var i = 0; i < _meteors.length; i++) {
      var m = _meteors[i];
      if (m.done) continue;

      // Activate once the stagger delay has passed
      if (!m.active) {
        if (elapsed >= m.delay) { m.active = true; m.startAt = now; }
        else { continue; }
      }

      var t = (now - m.startAt) / m.lifetime;
      if (t >= 1.0) { m.done = true; continue; }

      anyLive = true;
      _drawMeteor(m, t, gA);
    }

    if (anyLive) {
      _animId = requestAnimationFrame(_loop);
    } else {
      // All done — hide overlay
      _ctx.clearRect(0, 0, _W, _H);
      _canvas.style.display = 'none';
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Start a meteor shower.
   * Call with no arguments for a random default shower, or pass options to
   * customise count, timing, direction, and size.
   *
   * @param {Object} [opts]
   */
  function trigger(opts) {
    opts = opts || {};

    var count   = opts.count    || 15;
    _duration   = opts.duration || 5000;
    var minSize = opts.minSize  || 0.9;
    var maxSize = opts.maxSize  || 2.6;
    var zIndex  = opts.zIndex   != null ? opts.zIndex : 650;

    _ensureCanvas(zIndex);
    _resize();
    _canvas.style.display = 'block';

    // Radiant: default to a random point just above the screen, in the left-to-centre area.
    // Adjust radiantX / radiantY in opts to pin the shower's origin.
    var rx = opts.radiantX != null
      ? opts.radiantX * _W
      : _rand(_W * 0.08, _W * 0.50);
    var ry = opts.radiantY != null
      ? opts.radiantY * _H
      : _rand(_H * -0.15, _H * 0.05);

    _meteors = [];
    for (var i = 0; i < count; i++) {
      _meteors.push(_spawnMeteor(rx, ry, _duration, minSize, maxSize));
    }

    // Cancel any running shower before starting a new one
    if (_animId) { cancelAnimationFrame(_animId); _animId = null; }
    _startTime = Date.now();
    _loop();
  }

  /**
   * Immediately cancel the shower and hide the canvas.
   */
  function stop() {
    if (_animId) { cancelAnimationFrame(_animId); _animId = null; }
    if (_ctx)    { _ctx.clearRect(0, 0, _W, _H); }
    if (_canvas) { _canvas.style.display = 'none'; }
  }

  return { trigger: trigger, stop: stop };

}());
