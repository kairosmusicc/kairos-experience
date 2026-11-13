const test=require('node:test'),assert=require('node:assert/strict'),Sound=require('../soriak-sound');
test('single element, gesture priming, one audible attempt per receipt, no overlap',async()=>{
 let elements=0,playing=false,audible=0,paused=0;
 const audio={muted:false,load(){},pause(){playing=false;paused++;},play(){if(!this.muted){assert.equal(playing,false);audible++;}playing=true;return Promise.resolve();}};
 const sound=new Sound({createAudio:()=>{elements++;return audio;}});
 assert.equal(sound.playFor('before-interaction'),false);
 sound.unlock();sound.unlock();await Promise.resolve();
 assert.equal(elements,1);assert.equal(audio.preload,'auto');assert.ok(audio.src.endsWith('soriak-notification.mp3'));
 assert.equal(sound.playFor('one'),true);assert.equal(sound.playFor('one'),false);assert.equal(sound.playFor('two'),true);
 assert.equal(audible,2);assert.ok(paused>=3);
});
test('missing audio and autoplay denial do not throw or stop message handling',async()=>{
 const audio={load(){},pause(){},play(){return Promise.reject(new Error('blocked'));}};
 const sound=new Sound({createAudio:()=>audio});sound.unlock();await new Promise(resolve=>setImmediate(resolve));
 assert.doesNotThrow(()=>sound.playFor('one'));audio.onerror();assert.equal(sound.playFor('two'),false);
 const absent=new Sound({createAudio:()=>{throw Error('unavailable')}});assert.doesNotThrow(()=>absent.unlock());assert.equal(absent.playFor('id'),false);
});
