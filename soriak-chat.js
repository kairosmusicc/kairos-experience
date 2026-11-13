/* Interactive transport and persisted thread. Proactive timing belongs to Living OS. */
(function (root) {
  class SoriakChat {
    constructor({ state, legacy, context, persist, changed, received, debug = false }) {
      Object.assign(this,{state,context,persist,changed,received,debug});
      this.busy=false;
      this.migrate(legacy);
    }
    migrate(legacy) {
      const s=this.state;
      if (!Array.isArray(s.thread)) {
        s.thread=legacy.map(m=>({...m})).sort((a,b)=>a.at-b.at);
        if (!s.thread.length) s.thread.push({id:'soriak-initial',role:'soriak',text:'Tu cherches quoi ?',at:Date.now(),source:'initial'});
      }
      s.thread=s.thread.filter(m=>m && ['user','soriak'].includes(m.role) && typeof m.text==='string').slice(-60);
      s.threadVersion=2;
      s.discovered=true; // Backward-compatible fact; never a visibility gate.
      s.aiRequests=Number.isFinite(s.aiRequests) ? Math.max(0,s.aiRequests) : 0;
      s.sequence=Number.isFinite(s.sequence) ? s.sequence : 0;
      this.persist();
    }
    log(event) {if(this.debug)console.debug('[SORIAK]',event);}
    start() {
      if (this.state.pendingRequest) {
        const pending=this.state.pendingRequest;
        // A document refresh cancels its fetch. Recover exactly once, with no paid retry.
        this.finish(pending,SoriakPolicy.fallback(pending.message,this.context()),true);
      }
    }
    append(message) {
      if (this.state.thread.some(m=>m.id===message.id)) return;
      this.state.thread.push(message);
      this.state.thread=this.state.thread.slice(-60);
      this.persist();
    }
    finish(pending,text,fallback) {
      const reply={id:'reply:'+pending.id,role:'soriak',text:SoriakPolicy.reply(text,this.context(),pending.message),at:Date.now(),source:'interactive'};
      if (text==='On a assez parlé.') reply.text=text;
      const duplicate=this.state.thread.some(m=>m.id===reply.id);
      this.state.pendingRequest=null;
      this.busy=false;
      if(!duplicate) {this.append(reply);this.received(reply,{fallback});}
      this.persist();this.changed();
    }
    async send(value) {
      if(this.busy || typeof value!=='string')return false;
      const message=value.trim();
      if(!message || message.length>SoriakPolicy.maxMessage)return false;
      const pending={id:`user:${Date.now()}:${++this.state.sequence}`,message,at:Date.now()};
      const history=this.state.thread.slice(-SoriakPolicy.maxHistory).map(m=>({role:m.role,text:SoriakPolicy.redact(m.text)}));
      this.busy=true;
      this.state.pendingRequest=pending;
      this.append({id:pending.id,role:'user',text:message,at:pending.at,source:'interactive'});
      this.changed();
      const started=performance.now();
      let text,usedFallback=false,timer;
      try {
        if(this.state.aiRequests>=SoriakPolicy.maxReplies) {text='On a assez parlé.';usedFallback=true;}
        else {
          this.state.aiRequests++;this.persist();
          const controller=new AbortController();
          this.log('request sent');
          const operation=(async()=>{
            const response=await fetch('/api/soriak',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',signal:controller.signal,
              body:JSON.stringify({message:SoriakPolicy.redact(message),history,context:this.context()})});
            if(!response.ok)throw new Error('unavailable');
            const result=await response.json();
            if(typeof result.reply!=='string' || !result.reply.trim())throw new Error('invalid reply');
            return result.reply;
          })();
          text=await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();this.log('timeout');reject(new Error('timeout'));},9000);})]);
          this.log('response received');
        }
      } catch {text=SoriakPolicy.fallback(message,this.context());usedFallback=true;this.log('fallback used');}
      finally {clearTimeout(timer);}
      const remaining=450-(performance.now()-started);
      if(remaining>0)await new Promise(resolve=>setTimeout(resolve,remaining));
      this.finish(pending,text,usedFallback);
      return true;
    }
  }
  root.SoriakChat=SoriakChat;
})(globalThis);
