/* State-driven scheduler. No UI, storage, network, or privileged actions. */
(function (root) {
  function hash(text) {
    let n = 2166136261;
    for (const char of String(text)) n = Math.imul(n ^ char.charCodeAt(0), 16777619);
    return n >>> 0;
  }
  class LivingOSEngine {
    constructor({ state, rules, facts, persist, deliver, blocked, changed = () => {}, now = Date.now, debug = false, log = () => {} }) {
      this.now = now;
      this.rules = rules;
      this.facts = facts;
      this.persist = persist;
      this.deliver = deliver;
      this.blocked = blocked;
      this.changed = changed;
      this.debug = debug;
      this.log = debug ? log : () => {};
      this.timer = null;
      this.processing = false;
      const started = now();
      this.state = Object.assign({ fired: [], pending: [], notificationHistory: [], recentlyPlayed: [], events: [], eventIds: [], eventSequence: 0, sessionStartedAt: started, lastMajorAt: 0, seed: String(hash(started)), soriak: {} }, state);
      this.state.soriak = Object.assign({ discovered: false, discoveredAt: 0, relationshipLevel: 0, threadRead: false, unreadCount: 0, sentMessageIds: [], receivedReplies: [] }, this.state.soriak);
      // Versioned, JSON-only progress is owned by the application's existing persistence.
      this.state.version = 1;
      this.persist(this.state);
    }
    delay(rule) {
      const [low, high] = rule.delay;
      const normal = low + hash(this.state.seed + ':' + rule.id) % (high - low + 1);
      return this.debug ? Math.max(1000, Math.round(normal / 30)) : normal;
    }
    spacing() { return this.debug ? 1200 : 30000; }
    context() { return { ...this.facts(), os: this.state }; }
    emit(type, payload = {}, eventId = null) {
      if (eventId && this.state.eventIds.includes(eventId)) return false;
      if (eventId) this.state.eventIds.push(eventId);
      const event = { id: eventId || `${type}:${this.now()}:${++this.state.eventSequence}`, type, at: this.now(), payload };
      this.state.events.push(event);
      this.state.events = this.state.events.slice(-120);
      this.log('event', event);
      this.cancelObsolete();
      for (const rule of this.rules) {
        if (![].concat(rule.event).includes(type)) continue;
        if (rule.when(this.context(), payload)) this.schedule(rule.id, payload);
      }
      this.persist(this.state);
      this.changed();
      return true;
    }
    schedule(ruleId, payload = {}) {
      const rule = this.rules.find(r => r.id === ruleId);
      if (!rule || (rule.once !== false && this.state.fired.includes(ruleId)) || this.state.pending.some(e => e.ruleId === ruleId)) return null;
      if (!rule.when(this.context(), payload)) return null;
      const createdAt = this.now();
      const gate = rule.minAge ? this.state.sessionStartedAt + (this.debug ? 2000 : rule.minAge) : createdAt;
      const effect = { id: `${ruleId}:${this.state.seed}`, ruleId, createdAt, dueAt: Math.max(createdAt, gate) + this.delay(rule), payload: { ...payload }, once: rule.once !== false };
      this.state.pending.push(effect);
      this.persist(this.state);
      this.log('effect scheduled', effect);
      return effect.id;
    }
    cancel(effectId) {
      const effect = this.state.pending.find(e => e.id === effectId);
      if (!effect) return false;
      this.state.pending = this.state.pending.filter(e => e.id !== effectId);
      this.persist(this.state);
      this.log('effect cancelled', effect);
      return true;
    }
    cancelObsolete() {
      for (const effect of [...this.state.pending]) {
        const rule = this.rules.find(r => r.id === effect.ruleId);
        if (!rule || (effect.once && this.state.fired.includes(effect.ruleId)) || rule.obsolete?.(this.context(), effect.payload)) this.cancel(effect.id);
      }
    }
    process() {
      if (this.processing) return;
      this.processing = true;
      try {
        this.cancelObsolete();
        if (this.blocked()) return;
        const pending = [...this.state.pending].sort((a, b) => (this.rules.find(r => r.id === b.ruleId)?.priority || 0) - (this.rules.find(r => r.id === a.ruleId)?.priority || 0) || a.dueAt - b.dueAt);
        for (const effect of pending) {
          if (effect.dueAt > this.now() || this.now() - this.state.lastMajorAt < this.spacing()) continue;
          const rule = this.rules.find(r => r.id === effect.ruleId);
          if (!rule || !rule.when(this.context(), effect.payload)) continue;
          // Delivery is synchronous: accepted UI + progress commit in the same JS task.
          if (!this.deliver(rule.effect, effect)) continue;
          this.state.pending = this.state.pending.filter(e => e.id !== effect.id);
          if (effect.once && !this.state.fired.includes(rule.id)) this.state.fired.push(rule.id);
          this.state.lastMajorAt = this.now();
          this.persist(this.state);
          this.log('effect fired', effect);
          this.emit('os_effect_delivered', { ruleId: rule.id });
          break; // One major narrative surface per processing cycle.
        }
      } finally { this.processing = false; }
    }
    start() {
      if (this.timer !== null) return;
      const tick = () => {
        this.process();
        this.changed();
        this.timer = setTimeout(tick, 1000);
      };
      this.timer = setTimeout(tick, 1000);
    }
    stop() { clearTimeout(this.timer); this.timer = null; }
  }
  root.LivingOSEngine = LivingOSEngine;
})(globalThis);
