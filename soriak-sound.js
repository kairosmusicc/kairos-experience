/* One optional audio element. Missing/blocked audio never affects message delivery. */
(function(root){
 class SoriakNotificationSound {
  constructor({src='assets/audio/soriak-notification.mp3',createAudio=()=>new Audio()}={}){
   this.src=src;this.createAudio=createAudio;this.audio=null;this.unlocked=false;this.available=true;this.seen=new Set();this.generation=0;
  }
  unlock(){
   if(this.unlocked)return;
   this.unlocked=true;
   try{
    const audio=this.audio=this.createAudio();audio.preload='auto';audio.src=this.src;audio.muted=true;
    audio.onerror=()=>{this.available=false;audio.pause();};
    audio.load();const generation=++this.generation;
    Promise.resolve(audio.play()).then(()=>{if(this.generation===generation){audio.pause();audio.currentTime=0;audio.muted=false;}}).catch(()=>{audio.muted=false;});
   }catch{this.available=false;}
  }
  playFor(id){
   if(this.seen.has(id))return false;
   this.seen.add(id);if(this.seen.size>64)this.seen.delete(this.seen.values().next().value);
   if(!this.unlocked || !this.audio || !this.available)return false;
   try{
    ++this.generation;this.audio.pause();this.audio.currentTime=0;this.audio.muted=false;
    Promise.resolve(this.audio.play()).catch(()=>{});return true;
   }catch{return false;}
  }
 }
 if(typeof module!=='undefined'&&module.exports)module.exports=SoriakNotificationSound;else root.SoriakNotificationSound=SoriakNotificationSound;
})(globalThis);
