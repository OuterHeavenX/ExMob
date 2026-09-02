import { el } from '../utils/dom.js';
import { damp } from '../utils/math.js';
import { VERSION } from '../core/Config.js';

/**
 * Shared overlay layers used by every scene: fade-to-black, letterbox, captions, boot message,
 * chapter-complete screen. Scene-specific UI (title, HUD, shop) lives in its own module.
 */
export class UIRoot {
  constructor(root, game) {
    this.root = root;
    this.game = game;
    this.fadeEl = el('div', { class: 'fade' });
    this.letterboxTop = el('div', { class: 'letterbox top' });
    this.letterboxBot = el('div', { class: 'letterbox bottom' });
    this.captionEl = el('div', { class: 'caption' });
    this.chapterEl = el('div', { class: 'panel chapter-complete ui-block', hidden: '' });
    this.root.append(this.fadeEl, this.letterboxTop, this.letterboxBot, this.captionEl, this.chapterEl);
    this.fadeAlpha = 1;
    this.fadeTarget = 1;
    this.fadeSpeed = 1;
    this.fadeEl.style.opacity = '1';
    this.captionT = 0;
    this.boot = document.getElementById('boot-message');
  }

  bootMessage(text) { if (this.boot) { this.boot.hidden = false; document.getElementById('boot-sub').textContent = text; } }
  bootProgress(text) {
    if (!this.boot) return;
    if (!text) { this.boot.classList.add('hide'); setTimeout(() => { this.boot.hidden = true; }, 600); }
    else document.getElementById('boot-sub').textContent = text;
  }

  /** Fade overlay to alpha over seconds. */
  fade(alpha, seconds = 1) {
    this.fadeTarget = alpha;
    this.fadeSpeed = seconds <= 0 ? 1000 : 1 / seconds;
    if (seconds <= 0) { this.fadeAlpha = alpha; this.fadeEl.style.opacity = String(alpha); }
  }

  letterbox(on) { this.letterboxTop.classList.toggle('on', on); this.letterboxBot.classList.toggle('on', on); }

  caption(text, seconds = 3) {
    this.captionEl.textContent = text;
    this.captionEl.classList.add('on');
    this.captionT = seconds;
  }

  /** Modal dialog. kind: 'confirm' | 'prompt' | 'alert'. Returns a promise. */
  dialog(kind, text, { ok = 'OK', cancel = 'CANCEL', value = '' } = {}) {
    return new Promise((resolve) => {
      const panel = el('div', { class: 'panel dialog ui-block' });
      const input = kind === 'prompt' ? el('input', { class: 'select dialog-input', type: 'text', value }) : null;
      const finish = (v) => { panel.remove(); resolve(v); };
      panel.append(
        el('div', { class: 'body', text }),
        input,
        el('div', { class: 'row' }, [
          el('button', { class: 'btn primary', text: ok, onclick: () => finish(kind === 'prompt' ? input.value : true) }),
          kind !== 'alert' ? el('button', { class: 'btn ghost', text: cancel, onclick: () => finish(kind === 'prompt' ? null : false) }) : null,
        ]),
      );
      this.root.appendChild(panel);
      if (input) { input.focus(); input.select(); input.addEventListener('keydown', (e) => { if (e.key === 'Enter') finish(input.value); e.stopPropagation(); }); }
    });
  }

  confirm(text, opts) { return this.dialog('confirm', text, { ok: 'YES', cancel: 'NO', ...opts }); }
  prompt(text, value = '') { return this.dialog('prompt', text, { value }); }
  alert(text) { return this.dialog('alert', text); }

  showChapterComplete() {
    const g = this.game;
    this.chapterEl.innerHTML = '';
    this.chapterEl.append(
      el('div', { class: 'eyebrow', text: 'CHAPTER 1' }),
      el('div', { class: 'big', text: 'CABIN COMPROMISED' }),
      el('div', { class: 'body', text: 'He survived five crews. The county road is full of engines. The cabin is finished; he is not.' }),
      el('div', { class: 'body dim', text: 'This is the end of the v' + VERSION + ' vertical slice. Chapter 2 is not built. See docs/CAMPAIGN_ROADMAP.md.' }),
      el('div', { class: 'row' }, [
        el('button', { class: 'btn', text: 'MAIN MENU', onclick: () => { this.chapterEl.hidden = true; g.goMenu(); } }),
        el('button', { class: 'btn ghost', text: 'PLAY AGAIN', onclick: () => { this.chapterEl.hidden = true; g.restartChapter(); } }),
      ]),
    );
    this.chapterEl.hidden = false;
    this.fade(0.35, 0.5);
  }

  update(dt) {
    if (Math.abs(this.fadeAlpha - this.fadeTarget) > 0.001) {
      const step = this.fadeSpeed * dt;
      this.fadeAlpha += Math.sign(this.fadeTarget - this.fadeAlpha) * Math.min(step, Math.abs(this.fadeTarget - this.fadeAlpha));
      this.fadeEl.style.opacity = String(this.fadeAlpha);
    }
    this.fadeEl.style.pointerEvents = this.fadeAlpha > 0.95 ? 'auto' : 'none';
    if (this.captionT > 0) { this.captionT -= dt; if (this.captionT <= 0) this.captionEl.classList.remove('on'); }
  }
}
