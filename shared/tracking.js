/**
 * shared/tracking.js — viewer tracking & notification module
 * Include AFTER STORY_CONFIG is defined (needs STORY_CONFIG.id).
 * Works on GitHub Pages (HTTPS) and local file:// without any build step.
 */
// TRACKING & NOTIFICATIONS MODULE
var TRACKING_CFG = { MILESTONE_STORIES_EVERY: 1, MILESTONE_STORY_MINUTES: 3, MILESTONE_TOTAL_MINUTES: 15, TOAST_DURATION_MS: 9000 };
var LS_KEYS = { storiesViewed: 'og_stories_viewed', totalSeconds: 'og_total_seconds', viewedIds: 'og_viewed_ids', milestones: 'og_milestones' };
function lsGet(key, def) { try { var v = localStorage.getItem(key); return v === null ? def : JSON.parse(v); } catch(e) { return def; } }
function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {} }
var NOTIF_POOLS = {
  storyCount: [
    { icon: '🌟', msg: 'Bạn đã ghé thăm {count} câu chuyện của tụi mình rồi đó! Cảm ơn bạn đã ở lại trong vũ trụ này. Chúc bạn cũng sẽ có một câu chuyện tình yêu đẹp như tụi mình. Còn nếu là vợ anh thì nãy giờ coi luôn à? 😏' },
    { icon: '💫', msg: 'Wow, {count} story rồi nè! Tụi mình vui lắm khi bạn quan tâm. Hy vọng bạn cũng sẽ có những kỷ niệm tuyệt vời như thế này với người mình yêu. Còn nếu là vợ anh thì hôm nay học được gì chưa? 🤭' },
    { icon: '✨', msg: 'Cảm ơn bạn đã dành thời gian xem {count} câu chuyện của tụi mình. Chúc bạn luôn hạnh phúc và cũng sẽ tìm được người để cùng viết nên câu chuyện của riêng mình. Còn nếu là vợ anh thì anh yêu em 💕' },
    { icon: '🌙', msg: '{count} câu chuyện rồi — bạn đang dần hiểu thêm về tụi mình rồi đấy! Chúc bạn cũng sẽ có người để kể những câu chuyện tương tự. Còn nếu là vợ anh thì anh cảm ơn em đã luôn ở đây 🥹' },
    { icon: '🪐', msg: 'Bạn đã khám phá {count} kỷ niệm của tụi mình — tụi mình trân trọng điều đó lắm! Vũ trụ của tụi mình có thêm một người bạn đồng hành rồi. Còn nếu là vợ anh thì đừng coi nhiều quá rồi khóc đó nha 😄' },
    { icon: '🌸', msg: 'Tụi mình vui lắm khi biết bạn đã xem {count} câu chuyện! Mỗi câu chuyện đều là một mảnh ghép của tụi mình. Còn nếu là vợ anh thì mảnh ghép quan trọng nhất chính là em đó 💗' },
    { icon: '🎇', msg: '{count} câu chuyện rồi đó bạn ơi! Cảm ơn bạn đã đồng hành cùng tụi mình. Chúc bạn cũng sẽ có những trang chuyện đẹp để viết cùng người thương. Còn nếu là vợ anh thì trang đẹp nhất vẫn đang được viết tiếp 💕' },
    { icon: '💌', msg: 'Bạn đã xem {count} câu chuyện! Điều đó có nghĩa là bạn đã dành thời gian quý báu cho tụi mình. Còn nếu là vợ anh thì anh yêu em nhiều hơn {count} câu chuyện đó nhiều lắm 💞' }
  ],
  storyTime: [
    { icon: '⏱️', msg: 'Bạn đã coi story này {minutes} phút rồi đó! Cảm ơn bạn đã theo dõi câu chuyện của tụi mình. Bạn cũng sẽ tìm được một người cùng xây dựng những kỷ niệm đẹp như thế này. Còn nếu là vợ anh thì nãy giờ coi gì lâu dữ vậy? 🤍' },
    { icon: '🌙', msg: 'Đã {minutes} phút rồi — bạn đang đọc kỹ lắm đó! Tụi mình xúc động vì bạn trân trọng từng khoảnh khắc. Ước gì bạn cũng sẽ có những câu chuyện như thế này để kể. Còn nếu là vợ anh thì nhớ xong phải đi ngủ nha 😄' },
    { icon: '💜', msg: '{minutes} phút cùng câu chuyện của tụi mình. Cảm ơn bạn đã ở lại. Bạn xứng đáng có một tình yêu đẹp như vậy. Còn nếu là vợ anh... anh yêu em hơn {minutes} phút đó nhiều lắm 💕' },
    { icon: '☕', msg: '{minutes} phút trôi qua rồi — bạn có muốn lấy nước hay gì không? 😄 Tụi mình vui lắm khi bạn ở lại lâu. Chúc bạn có những khoảnh khắc bình yên bên người thương. Còn nếu là vợ anh thì anh đang cạnh bên mà 🥰' },
    { icon: '🌅', msg: 'Bạn đọc {minutes} phút rồi đó — câu chuyện của tụi mình và bạn đang là một phần của nó rồi. Còn nếu là vợ anh thì cảm ơn em đã luôn là phần quan trọng nhất trong câu chuyện của anh 💖' },
    { icon: '🎵', msg: '{minutes} phút — hy vọng nhạc nền cũng đang hòa cùng tâm trạng của bạn! Tụi mình chọn từng bài nhạc rất kỹ. Còn nếu là vợ anh thì nhớ bài nhạc này là bài của tụi mình nha em 🎶' },
    { icon: '✨', msg: 'Bạn đã ở lại {minutes} phút cùng tụi mình — điều đó thật sự ý nghĩa. Hy vọng câu chuyện này làm trái tim bạn ấm áp hơn một chút. Còn nếu là vợ anh thì trái tim anh luôn ấm nhất khi có em 🤍' },
    { icon: '🌌', msg: '{minutes} phút trong vũ trụ của tụi mình — bạn đã đi được khá xa rồi đó! Cảm ơn bạn đã kiên nhẫn. Chúc bạn tìm được tình yêu đẹp như các vì sao trong vũ trụ này. Còn nếu là vợ anh thì đây chính là lý do anh xây vũ trụ này 💫' }
  ],
  totalTime: [
    { icon: '🌌', msg: 'Bạn đã dành tổng cộng {total} phút trong vũ trụ của tụi mình! Điều đó thật sự ý nghĩa. Chúc bạn sẽ có câu chuyện tình yêu của riêng mình, đẹp như những vì sao đêm nay. Còn nếu là vợ anh thì anh biết em đang nhớ anh rồi 💫' },
    { icon: '🚀', msg: '{total} phút rồi — không ngờ câu chuyện của tụi mình lại được yêu thương đến vậy! Cảm ơn bạn. Chúc bạn luôn hạnh phúc. Còn nếu là vợ anh thì thôi nè, gặp anh rồi kể chuyện tiếp đi 🥰' },
    { icon: '🌠', msg: 'Tổng cộng {total} phút — bạn đã đồng hành cùng tụi mình một khoảng thời gian dài! Tụi mình hy vọng những kỷ niệm này đã chạm đến trái tim bạn. Còn nếu là vợ anh thì anh muốn dành thêm {total} năm bên em nữa 💞' },
    { icon: '🌙', msg: '{total} phút trong vũ trụ này — có lẽ bạn đã thấy nhiều thứ tụi mình muốn kể. Cảm ơn bạn đã lắng nghe. Chúc bạn cũng sẽ có vũ trụ riêng của mình. Còn nếu là vợ anh thì em chính là vũ trụ của anh 🌙' },
    { icon: '💫', msg: 'Wow, {total} phút! Bạn thật sự là người bạn đồng hành tuyệt vời của tụi mình. Tụi mình gửi tặng bạn những điều tốt đẹp nhất. Còn nếu là vợ anh thì điều tốt đẹp nhất anh có chính là em 💕' },
    { icon: '🎆', msg: '{total} phút — bạn đã đi qua nhiều câu chuyện và kỷ niệm cùng tụi mình rồi đấy! Hy vọng bạn cũng đang viết những trang kỷ niệm đẹp của riêng mình. Còn nếu là vợ anh thì trang đẹp nhất là trang có cả hai ta 🌸' },
    { icon: '🌏', msg: 'Bạn đã dành {total} phút trong vũ trụ của tụi mình — điều đó làm tụi mình hạnh phúc lắm! Đây là điều anh xây dựng để nhắc nhở rằng mỗi khoảnh khắc đều đáng trân trọng. Còn nếu là vợ anh thì em có biết không? 🥹' },
    { icon: '🔭', msg: '{total} phút khám phá — cảm ơn bạn đã tò mò và kiên nhẫn đồng hành cùng tụi mình! Hy vọng một ngày nào đó bạn cũng sẽ xây vũ trụ của riêng mình để kể những câu chuyện của hai người. Còn nếu là vợ anh thì vũ trụ này là của hai ta mà 🌟' }
  ]
};
function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function fmtMsg(tpl, d) { return tpl.replace(/\{count\}/g, d.count || '').replace(/\{minutes\}/g, d.minutes || '').replace(/\{total\}/g, d.total || ''); }
var _toastTimer = null;
function showTrackingNotification(type, data) {
  var pool = NOTIF_POOLS[type]; if (!pool || !pool.length) return;
  var n = pickRandom(pool);
  var toast = document.getElementById('tracking-toast');
  var iconEl = document.getElementById('toast-icon');
  var msgEl = document.getElementById('toast-message');
  if (!toast || !iconEl || !msgEl) return;
  iconEl.textContent = n.icon; msgEl.textContent = fmtMsg(n.msg, data);
  toast.style.display = 'block'; toast.style.opacity = '0'; toast.style.transform = 'translateY(20px)';
  setTimeout(function() { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; }, 30);
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(closeTrackingToast, TRACKING_CFG.TOAST_DURATION_MS);
}
function closeTrackingToast() {
  var toast = document.getElementById('tracking-toast'); if (!toast) return;
  toast.style.opacity = '0'; toast.style.transform = 'translateY(20px)';
  setTimeout(function() { toast.style.display = 'none'; }, 420);
}
function milestoneShown(key) { return !!(lsGet(LS_KEYS.milestones, {})[key]); }
function markMilestone(key) { var m = lsGet(LS_KEYS.milestones, {}); m[key] = 1; lsSet(LS_KEYS.milestones, m); }
var _storyId = (typeof STORY_CONFIG !== 'undefined' && STORY_CONFIG.id) ? STORY_CONFIG.id : 'unknown';
var _storyStart = Date.now();
var _storyMinsDone = 0;
(function() {
  var viewed = lsGet(LS_KEYS.viewedIds, []);
  var count = lsGet(LS_KEYS.storiesViewed, 0);
  if (viewed.indexOf(_storyId) === -1) { viewed.push(_storyId); count += 1; lsSet(LS_KEYS.viewedIds, viewed); lsSet(LS_KEYS.storiesViewed, count); }
  var every = TRACKING_CFG.MILESTONE_STORIES_EVERY;
  if (count > 0 && count % every === 0) {
    var key = 'cnt_' + count;
    if (!milestoneShown(key)) { markMilestone(key); setTimeout(function() { showTrackingNotification('storyCount', { count: count }); }, 2500); }
  }
})();
setInterval(function() {
  var elapsed = (Date.now() - _storyStart) / 1000;
  var mins = Math.floor(elapsed / 60);
  var prev = lsGet(LS_KEYS.totalSeconds, 0);
  lsSet(LS_KEYS.totalSeconds, prev + 30);
  var totalMins = Math.floor((prev + 30) / 60);
  var stEvery = TRACKING_CFG.MILESTONE_STORY_MINUTES;
  if (mins > 0 && mins !== _storyMinsDone && mins % stEvery === 0) {
    _storyMinsDone = mins;
    var stKey = 'st_' + _storyId + '_' + mins;
    if (!milestoneShown(stKey)) { markMilestone(stKey); showTrackingNotification('storyTime', { minutes: mins }); }
  }
  var totEvery = TRACKING_CFG.MILESTONE_TOTAL_MINUTES;
  if (totalMins > 0 && totalMins % totEvery === 0) {
    var totKey = 'tot_' + totalMins;
    if (!milestoneShown(totKey)) { markMilestone(totKey); showTrackingNotification('totalTime', { total: totalMins }); }
  }
}, 30000);
// END TRACKING MODULE
