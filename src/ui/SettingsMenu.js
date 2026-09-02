import { el } from '../utils/dom.js';
import { QUALITY_ORDER, QUALITY_PRESETS } from '../data/quality.js';
import { DIFFICULTY } from '../data/difficulty/difficultyRegistry.js';

/** Settings panel shared by the title screen and the pause menu. Persists via SaveManager. */
export class SettingsMenu {
  constructor(ctx) {
    this.ctx = ctx;
    this.el = el('div', { class: 'panel settings ui-block', hidden: '' });
    this.onClose = null;
  }

  _row(label, control) { return el('div', { class: 'row setting' }, [el('span', { class: 'lbl', text: label }), control]); }

  _select(value, options, onChange) {
    const s = el('select', { class: 'select' });
    for (const [v, l] of options) { const o = el('option', { value: v, text: l }); if (v === value) o.selected = true; s.appendChild(o); }
    s.addEventListener('change', () => onChange(s.value));
    return s;
  }

  _slider(value, onChange, min = 0, max = 1, step = 0.05) {
    const s = el('input', { type: 'range', min, max, step, value, class: 'slider' });
    s.addEventListener('input', () => onChange(parseFloat(s.value)));
    return s;
  }

  open() {
    const ctx = this.ctx, s = ctx.settings;
    const apply = async () => { await ctx.save.saveSettings(); };
    this.el.innerHTML = '';
    this.el.append(
      el('div', { class: 'big', text: 'SETTINGS' }),
      this._row('QUALITY', this._select(s.quality, [['auto', 'AUTO'], ...QUALITY_ORDER.map((q) => [q, QUALITY_PRESETS[q].label])], (v) => { s.quality = v; ctx.quality.set(v); apply(); })),
      this._row('MASTER VOLUME', this._slider(s.masterVolume, (v) => { s.masterVolume = v; apply(); })),
      this._row('MUSIC VOLUME', this._slider(s.musicVolume, (v) => { s.musicVolume = v; apply(); })),
      this._row('SFX VOLUME', this._slider(s.sfxVolume, (v) => { s.sfxVolume = v; apply(); })),
      this._row('SCREEN SHAKE', this._slider(s.screenShake, (v) => { s.screenShake = v; apply(); }, 0, 1.5)),
      this._row('TOUCH CONTROL SIZE', this._slider(s.touchScale, (v) => { s.touchScale = v; apply(); }, 0.7, 1.5)),
      this._row('INPUT', this._select(s.inputMode, [['auto', 'AUTO'], ['desktop', 'KEYBOARD + MOUSE'], ['touch', 'TOUCH']], (v) => { s.inputMode = v; apply(); })),
      this._row('DIFFICULTY', this._select(s.difficulty, Object.values(DIFFICULTY).map((d) => [d.id, d.label + (d.balanced ? '' : ' (UNBALANCED)')]), (v) => { s.difficulty = v; apply(); })),
      el('div', { class: 'row' }, [
        el('button', { class: 'btn ghost small', text: 'EXPORT SAVE', onclick: () => this._export() }),
        el('button', { class: 'btn ghost small', text: 'IMPORT SAVE', onclick: () => this._import() }),
        el('button', { class: 'btn ghost small danger', text: 'RESET SAVE', onclick: () => this._reset() }),
      ]),
      el('div', { class: 'body dim', text: `Quality now: ${ctx.quality.label}. GPU: ${ctx.quality.gpuString || 'unknown'}` }),
      el('button', { class: 'btn', text: 'BACK', onclick: () => this.close() }),
    );
    this.el.hidden = false;
  }

  close() { this.el.hidden = true; if (this.onClose) this.onClose(); }

  _export() {
    const text = this.ctx.save.exportJSON();
    const ta = el('textarea', { class: 'export-area', readonly: '' });
    ta.value = text;
    const panel = el('div', { class: 'panel ui-block export-panel' }, [
      el('div', { class: 'big', text: 'EXPORT SAVE' }),
      el('div', { class: 'body dim', text: 'Copy this text somewhere safe. Paste it into IMPORT SAVE to restore.' }),
      ta,
      el('button', { class: 'btn', text: 'CLOSE', onclick: () => panel.remove() }),
    ]);
    this.ctx.ui.root.appendChild(panel);
    ta.select();
  }

  async _import() {
    const text = await this.ctx.ui.prompt('Paste the exported EXMOB save JSON:');
    if (!text) return;
    try { await this.ctx.save.importJSON(text); await this.ctx.ui.alert('Save imported.'); }
    catch (e) { await this.ctx.ui.alert('Import failed: ' + e.message); }
  }

  async _reset() {
    if (!(await this.ctx.ui.confirm('Delete your save? This cannot be undone.'))) return;
    await this.ctx.save.reset();
    await this.ctx.ui.alert('Save deleted.');
  }
}
