import { SUPABASE_KEY as SB_KEY, SUPABASE_URL as SB_URL, supabase as sb } from './supabase';

// ── Token ──────────────────────────────────────────────────
const getToken=()=>localStorage.getItem('discogs_token')||'';
const saveToken=t=>localStorage.setItem('discogs_token',t.trim());

// ── Gamification ───────────────────────────────────────────
const LEVELS=[
  {level:1,  min:0,     max:20,       title:'First Seed',      tagline:'One record. One tree. The wax is still warm.'},
  {level:2,  min:21,    max:60,       title:'Seedling',        tagline:'A few pressings taking root. Keep digging.'},
  {level:3,  min:61,    max:120,      title:'Patch',           tagline:'A small patch of wax, all yours.'},
  {level:4,  min:121,   max:200,      title:'Smallholder',     tagline:'Your own corner of the underground.'},
  {level:5,  min:201,   max:350,      title:'Grove Tender',    tagline:'A proper grove. You know every groove by feel.'},
  {level:6,  min:351,   max:500,      title:'Orchard Builder', tagline:'Rows of records stretching further than your crates.'},
  {level:7,  min:501,   max:750,      title:'Woodland Keeper', tagline:'This is where the deep cuts start.'},
  {level:8,  min:751,   max:1000,     title:'Forester',        tagline:'A forest of wax. Dense, layered, alive.'},
  {level:9,  min:1001,  max:1500,     title:'Grove Lord',      tagline:'Your collection has become a territory. Others get lost in it.'},
  {level:10, min:1501,  max:2000,     title:'Canopy Walker',   tagline:'You move between labels like branches. The dancefloor is far below.'},
  {level:11, min:2001,  max:3000,     title:'Deep Forest',     tagline:'Rare pressings only. Few diggers reach this far.'},
  {level:12, min:3001,  max:4500,     title:'Wilderness',      tagline:'No Discogs page covers all of this. You built it yourself.'},
  {level:13, min:4501,  max:6500,     title:'Old Growth',      tagline:'Your forest has its own sound system now.'},
  {level:14, min:6501,  max:10000,    title:'The Uncharted',   tagline:'Beyond any known catalogue. Pure instinct.'},
  {level:15, min:10001, max:Infinity, title:'The Root',        tagline:'You didn\'t dig. You became the ground.'},
  // level 16 reserved — referral-based, not rendered
  {level:16, min:Infinity, max:Infinity, title:'The Mycelium', tagline:''},
];
function getLevelFromCount(count){
  let result=LEVELS[0];
  for(const l of LEVELS){if(l.level>15)break;if(count>=l.min)result=l;}
  return result;
}
function getProgressToNext(count){
  const cur=getLevelFromCount(count);
  if(cur.level===15)return 100;
  const range=cur.max-cur.min;
  return Math.min(Math.round(((count-cur.min)/range)*100),100);
}
let toastTimer=null;
function showLevelUpToast(lvl){
  st.levelToast=lvl;
  rr();
  if(toastTimer)clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{st.levelToast=null;rr();},4000);
}
// Raw search-bar-use counter — kept for the admin dashboard's own
// "Searches" column (api/admin-users.js), not for gamification anymore.
// The level itself is now driven by total nodes across every branch (see
// addNode's own comment) since that's what a digger's actual progress
// looks like; a search query alone doesn't move it.
function incrementSearch(){
  st.searchCount++;
  sb.auth.updateUser({data:{search_count:st.searchCount}});
}

// ── Local Library ──────────────────────────────────────────
const AUDIO_EXT=['.mp3','.flac','.aiff','.aif','.aifc','.wav','.m4a','.aac','.ogg','.opus','.wma'];
const BATCH_SIZE=50;

function normalizeStr(str){
  return (str||'').toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^\p{L}\p{N}\s]/gu,'')
    .replace(/\b(original mix|remix|edit|remaster|remastered|ep|lp|feat|ft)\b/g,'')
    .replace(/\s+/g,' ')
    .trim();
}

// Keep the raw tag string ONLY when it carries information normalizeStr()
// destroys and matching later needs back: separators in multi-artist
// credits ("A & B", "A feat. C" — normalization strips "&" and "feat"
// leaving the names fused with no way to split them apart again), and
// parenthesized mix descriptors in titles. Selective on purpose — storing
// raw strings for every one of ~7000 tracks would add real weight to the
// wt-owned localStorage blob for no benefit in the common case where
// raw ≈ normalized anyway.
const keepRawArtist=a=>/[,&\/]|\b(?:feat|ft|featuring|vs|presents|pres|b2b|meets|versus)\b/i.test(a||'')?a.trim():undefined;
const keepRawTitle=t=>/[()\[\]]/.test(t||'')?t.trim():undefined;

// Separator requires a space OR underscore on both sides of the dash — not
// just a space, DJ-pool filenames are as often "Artist_-_Title.mp3" as
// "Artist - Title.mp3" — while still refusing to split a bare mid-word
// hyphen with no surrounding whitespace/underscore ("Drum-n-Bass Anthem",
// a single title with no artist), which would silently mis-split instead.
const FILENAME_SEP=/(?:\s|_)[-–—](?:\s|_)/;
function parseFilename(filename){
  let name=filename.replace(/\.[^/.]+$/,'');
  name=name.replace(/^[\dA-Da-d]{1,2}[.\-\s]+/,'');
  const parts=name.split(FILENAME_SEP);
  if(parts.length>=2)return{titleNorm:normalizeStr(parts[parts.length-1]),artistNorm:normalizeStr(parts[0]),filename,dur:null,titleRaw:keepRawTitle(parts[parts.length-1]),artistRaw:keepRawArtist(parts[0]),source:'filename'};
  const trimmed=name.trim();
  if(trimmed)return{titleNorm:normalizeStr(trimmed),artistNorm:'',filename,dur:null,source:'filename'};
  return null;
}

async function extractMetadata(file,mm){
  if(mm){
    try{
      const meta=await mm.parseBlob(file,{skipCovers:true,duration:true});
      const title=meta.common.title?.trim();
      const artist=meta.common.artist?.trim();
      const dur=meta.format.duration?Math.round(meta.format.duration):null;
      if(title)return{titleNorm:normalizeStr(title),artistNorm:normalizeStr(artist||''),filename:file.name,dur,titleRaw:keepRawTitle(title),artistRaw:keepRawArtist(artist),source:'id3'};
    }catch{}
  }
  return parseFilename(file.name);
}

// Phase 1: pick a folder via webkitdirectory input. Unlike showDirectoryPicker,
// this enumerates the raw filesystem and does NOT silently skip folders whose
// names Chromium deems "unsafe" (trailing spaces/dots) — which made entire
// genre folders invisible to the previous File System Access API walker.
function pickMusicFolder(){
  return new Promise(resolve=>{
    const inp=document.createElement('input');
    inp.type='file';
    inp.setAttribute('webkitdirectory','');inp.setAttribute('directory','');
    inp.style.display='none';document.body.appendChild(inp);
    inp.addEventListener('change',()=>{resolve([...inp.files]);inp.remove();});
    inp.addEventListener('cancel',()=>{resolve(null);inp.remove();});
    inp.click();
  });
}

// Phase 2: read metadata in parallel batches of BATCH_SIZE
async function extractAllMetadata(handles,onProgress){
  const results=[];
  // How each track's artist/title actually got determined — matchLibraryWithDiscogs()
  // can only ever search for a track it has an artist for, so "how many files have
  // no artist at all" directly caps how much of the library is even attempted. This
  // used to be invisible; see the report linkLibrary() logs with it.
  const idStats={mmLoaded:false,id3:0,id3NoArtist:0,filenameParsed:0,filenameNoArtist:0,unparsable:0};
  let mm=null;
  try{mm=await import('https://esm.sh/music-metadata-browser@2.5.10');idStats.mmLoaded=true;}catch{}
  for(let i=0;i<handles.length;i+=BATCH_SIZE){
    const batch=handles.slice(i,i+BATCH_SIZE);
    const batchOut=await Promise.all(batch.map(async h=>{
      try{const f=typeof h.getFile==='function'?await h.getFile():h;return await extractMetadata(f,mm)||parseFilename(h.name);}
      catch{return parseFilename(h.name);}
    }));
    for(const t of batchOut){
      if(t?.titleNorm){
        results.push(t);
        if(t.source==='id3')idStats[t.artistNorm?'id3':'id3NoArtist']++;
        else idStats[t.artistNorm?'filenameParsed':'filenameNoArtist']++;
      }else if(t?.filename){
        // Normalization emptied the title (e.g. all-symbol name) — index raw filename so the track is never lost
        const raw=t.filename.replace(/\.[^/.]+$/,'').toLowerCase().replace(/\s+/g,' ').trim();
        if(raw){results.push({titleNorm:raw,artistNorm:'',filename:t.filename,dur:t.dur||null});idStats.unparsable++;}
      }
    }
    onProgress?.(Math.min(i+BATCH_SIZE,handles.length),handles.length);
  }
  return{results,idStats};
}

// track.altIds carries the ids of any other release-variant rows that got
// folded into this one by mergeReleaseVariantTracks() (e.g. a coloured
// vinyl pressing merged into the plain digital listing of the same EP) —
// checked too, so owning ANY variant still surfaces the badge, not just
// whichever variant happened to be kept as the display row.
function inDiscogsCollection(track){
  if(!st.discogsCollReleaseIds.length&&!st.discogsCollMasterIds.length)return false;
  return[track.id,...(track.altIds||[])].some(id=>{
    const raw=id?.split('-')[0];if(!raw)return false;
    if(raw.startsWith('m'))return st.discogsCollMasterIds.includes(parseInt(raw.slice(1)));
    return st.discogsCollReleaseIds.includes(parseInt(raw));
  });
}
function inDiscogsWantlist(track){
  if(!st.discogsWantReleaseIds.length&&!st.discogsWantMasterIds.length)return false;
  return[track.id,...(track.altIds||[])].some(id=>{
    const raw=id?.split('-')[0];if(!raw)return false;
    if(raw.startsWith('m'))return st.discogsWantMasterIds.includes(parseInt(raw.slice(1)));
    return st.discogsWantReleaseIds.includes(parseInt(raw));
  });
}
async function edgeFn(body){
  const res=await fetch('/api/discogs-oauth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const json=await res.json().catch(()=>({}));
  if(!res.ok||json.error)throw new Error(json.error||'API error '+res.status);
  return json;
}
async function dOAuthProxy(path,params={}){
  let retries=0;
  while(true){
    const data=await edgeFn({action:'proxy',path,params:JSON.stringify(params),access_token:st.discogsOAuthToken,token_secret:st.discogsOAuthSecret});
    if(data?.error==='rate_limited'){if(retries++<2){await new Promise(r=>setTimeout(r,65000));continue;}throw new Error('Rate limited — try again in a minute');}
    return data;
  }
}
// Shared by both the collection and wantlist loops below — Discogs' two
// endpoints return the same basic_information shape per item.
function buildDiscogsCollEntry(bi){
  const formatNames=(bi.formats||[]).map(f=>f.name);
  return{
    id:bi.id,
    title:bi.title||'',
    artist:(bi.artists||[]).map(a=>stripDiscogsSuffix(a.name)).join(', '),
    year:bi.year||null,
    thumb:bi.thumb||bi.cover_image||null,
    isVinyl:formatNames.includes('Vinyl'),
    isDigital:formatNames.includes('File'),
    discogsUrl:`https://www.discogs.com/release/${bi.id}`,
    artistExploreId:bi.artists?.[0]?.id||null,
    artistExploreName:bi.artists?.[0]?stripDiscogsSuffix(bi.artists[0].name):null,
    labelExploreId:bi.labels?.[0]?.id||null,
    labelExploreName:bi.labels?.[0]?.name||null,
    genres:(bi.styles?.length?bi.styles:bi.genres||[]).slice(0,4),
  };
}

// ── Digging heroes ─────────────────────────────────────────
const isVariousCredit=name=>/^various(\s+artists)?$/i.test((name||'').trim());

// A release credited to "Various" isn't an artist — it's Discogs' own
// placeholder for compilations. Fetching the release's actual tracklist and
// crediting each real per-track artist instead is the only way these
// releases contribute anything meaningful to the ranking. Progressive: the
// caller re-renders (rr()) once this resolves, and computeDiggingHeroes()
// picks the cached breakdown up on its next call.
const vaResolveInFlight=new Set();
function resolveVariousArtists(releaseId){
  const ck='va:'+releaseId;
  const cached=lsGet(ck);
  if(cached!==null)return cached;
  if(!vaResolveInFlight.has(releaseId)){
    vaResolveInFlight.add(releaseId);
    (async()=>{
      let result=[];
      try{
        const rd=await dReq('/releases/'+releaseId);
        const seen=new Map();
        (rd.tracklist||[]).forEach(t=>{
          const a=t.artists?.[0];
          if(!a?.id||seen.has(a.id))return;
          seen.set(a.id,{id:a.id,name:stripDiscogsSuffix(a.name)});
        });
        result=[...seen.values()];
      }catch(e){
        console.warn('WaxTree: Various-artist breakdown failed for release',releaseId,e);
        vaResolveInFlight.delete(releaseId);
        return; // don't cache a failed attempt — retry on a later call
      }
      lsSet(ck,result);
      vaResolveInFlight.delete(releaseId);
      rr();
    })();
  }
  return null;
}

// A local-library artist name (from the folder scan, already normalized —
// see normalizeStr()/parseFilename(), untouched here) has no Discogs id of
// its own. Resolve the most frequent ones against real Discogs artists the
// same way remix credits are verified (getResolvedRemixArtist) — only a
// confirmed exact-name match ever counts, same reasoning as there: a wrong
// guess is worse than no guess.
const heroArtistResolveInFlight=new Set();
function resolveHeroArtistName(artistNorm){
  const ck='heroArtist:'+artistNorm;
  const cached=lsGet(ck);
  if(cached!==null)return cached; // false (confirmed no match) or {id,name}
  if(!heroArtistResolveInFlight.has(artistNorm)){
    heroArtistResolveInFlight.add(artistNorm);
    (async()=>{
      let result;
      try{
        const results=await searchDiscogsArtist(artistNorm);
        const hit=results.find(r=>normalizeStr(stripDiscogsSuffix(r.title))===artistNorm);
        result=hit?{id:hit.id,name:hit.title}:null;
      }catch(e){
        console.warn('WaxTree: hero artist resolve failed for',artistNorm,e);
        result=undefined; // network hiccup — don't cache, retry on a later call
      }
      heroArtistResolveInFlight.delete(artistNorm);
      if(result===undefined)return;
      lsSet(ck,result===null?false:result);
      rr();
    })();
  }
  return undefined;
}

// The collection/wantlist entries only carry a release cover (whichever
// release happened to trip the detection) — not the artist's/label's own
// Discogs profile photo. Fetched separately, lightweight (just the
// artist/label record itself, not fetchArtistData()'s whole discography
// pull) since this only ever runs for the small final hero list, not every
// candidate considered along the way.
const heroImageResolveInFlight=new Set();
function resolveHeroProfileImage(type,discogsId){
  const ck=(type==='label'?'lblimg:':'artimg:')+discogsId;
  const cached=lsGet(ck);
  if(cached!==null)return cached||null; // '' -> null (no photo on file), or a URL
  if(!heroImageResolveInFlight.has(ck)){
    heroImageResolveInFlight.add(ck);
    (async()=>{
      let url;
      try{
        const data=await dReq(type==='label'?'/labels/'+discogsId:'/artists/'+discogsId);
        url=data.images?.find(i=>i.type==='primary')?.uri||data.images?.[0]?.uri||'';
      }catch(e){
        console.warn('WaxTree: hero profile image fetch failed for',type,discogsId,e);
        heroImageResolveInFlight.delete(ck);
        return; // don't cache — retry on a later call
      }
      heroImageResolveInFlight.delete(ck);
      lsSet(ck,url);
      rr();
    })();
  }
  return undefined;
}

// No top-N cap here — every artist with at least LOCAL_HERO_MIN_TRACKS
// tracks in the library is a legitimate candidate (10 tracks by the same
// artist is already a clear "you like this" signal on its own). What's
// bounded instead is how many brand-new ones get resolved against Discogs
// per computeDiggingHeroes() call, below.
const LOCAL_HERO_MIN_TRACKS=10;
function computeLocalArtistFrequency(){
  const counts=new Map();
  st.ownedTracks.forEach(t=>{
    if(!t.artistNorm)return;
    counts.set(t.artistNorm,(counts.get(t.artistNorm)||0)+1);
  });
  return[...counts.entries()].filter(([,count])=>count>=LOCAL_HERO_MIN_TRACKS).sort((a,b)=>b[1]-a[1]);
}

// allowBackgroundWork=false gives a read-only snapshot of whatever's
// already resolved/cached (used just to decide whether to show the "Follow
// Your Heroes" button) without kicking off new Discogs lookups — those are
// only worth doing while the actual heroes modal is open and visible.
function computeDiggingHeroes(allowBackgroundWork){
  const pool=[...st.discogsCollection,...st.discogsWantlist];
  const artists=new Map(),labels=new Map();
  let vaKickoffsLeft=allowBackgroundWork?15:0;
  const bumpArtist=(id,name,thumb,collInc)=>{
    const cur=artists.get(id)||{id,name,collectionCount:0,libraryCount:0,thumb:null};
    cur.collectionCount+=collInc;if(!cur.thumb&&thumb)cur.thumb=thumb;if(name&&!cur.name)cur.name=name;
    artists.set(id,cur);
  };
  pool.forEach(e=>{
    if(e.artistExploreId&&!isVariousCredit(e.artistExploreName)){
      bumpArtist(e.artistExploreId,e.artistExploreName,e.thumb,1);
    }else if(e.artistExploreId&&isVariousCredit(e.artistExploreName)){
      const breakdown=lsGet('va:'+e.id);
      if(breakdown)breakdown.forEach(a=>bumpArtist(a.id,a.name,e.thumb,1));
      else if(vaKickoffsLeft>0&&!vaResolveInFlight.has(e.id)){vaKickoffsLeft--;resolveVariousArtists(e.id);}
    }
    if(e.labelExploreId){
      const cur=labels.get(e.labelExploreId)||{id:e.labelExploreId,name:e.labelExploreName,collectionCount:0,libraryCount:0,thumb:null};
      cur.collectionCount++;if(!cur.thumb&&e.thumb)cur.thumb=e.thumb;
      labels.set(e.labelExploreId,cur);
    }
  });
  if(st.ownedTracks.length){
    // The candidate pool itself isn't capped (see computeLocalArtistFrequency)
    // — a library with many qualifying artists just takes a few extra
    // renders to work all the way through, resolveHeroArtistName's own
    // cache means nothing gets re-searched once it's been checked once.
    let localKickoffsLeft=allowBackgroundWork?20:0;
    computeLocalArtistFrequency().forEach(([artistNorm,count])=>{
      const cached=lsGet('heroArtist:'+artistNorm);
      let resolved=cached;
      if(cached===null&&allowBackgroundWork&&localKickoffsLeft>0){
        localKickoffsLeft--;
        resolved=resolveHeroArtistName(artistNorm);
      }
      if(resolved){
        const cur=artists.get(resolved.id)||{id:resolved.id,name:resolved.name,collectionCount:0,libraryCount:0,thumb:null};
        cur.libraryCount+=count;
        artists.set(resolved.id,cur);
      }
    });
  }
  const total=x=>x.collectionCount+x.libraryCount;
  const byCount=(a,b)=>total(b)-total(a);
  const topArtists=[...artists.values()].filter(a=>total(a)>=2).sort(byCount).slice(0,30);
  const topLabels=[...labels.values()].filter(l=>l.collectionCount>=2).sort(byCount).slice(0,30);
  // Only ever resolved for the small final list actually shown, not every
  // candidate considered above — a release cover stays the fallback until
  // (if ever) a real profile photo comes back.
  if(allowBackgroundWork){
    topArtists.forEach(a=>{const img=resolveHeroProfileImage('artist',a.id);if(img)a.thumb=img;});
    topLabels.forEach(l=>{const img=resolveHeroProfileImage('label',l.id);if(img)l.thumb=img;});
  }
  return{artists:topArtists,labels:topLabels};
}

async function syncDiscogsAccount(){
  const username=st.discogsUser;
  if(!username)throw new Error('No Discogs account linked');
  const useOAuth=!!(st.discogsOAuthToken&&st.discogsOAuthSecret);
  const fetchPage=(path,p)=>useOAuth?dOAuthProxy(path,p):dReq(path,p);
  st.discogsSyncing=true;rr();
  try{
    let page=1,collRIds=[],collMIds=[],collEntries=[];
    while(true){
      const d=await fetchPage(`/users/${username}/collection/folders/0/releases`,{per_page:'100',page:String(page),sort:'added',sort_order:'desc'});
      d.releases.forEach(r=>{
        const bi=r.basic_information;
        collRIds.push(bi.id);if(bi.master_id)collMIds.push(bi.master_id);
        collEntries.push(buildDiscogsCollEntry(bi));
      });
      if(page>=d.pagination.pages)break;page++;
    }
    let wp=1,wantRIds=[],wantMIds=[],wantEntries=[];
    while(true){
      const d=await fetchPage(`/users/${username}/wants`,{per_page:'100',page:String(wp)});
      d.wants.forEach(r=>{
        const bi=r.basic_information;
        wantRIds.push(bi.id);if(bi.master_id)wantMIds.push(bi.master_id);
        wantEntries.push(buildDiscogsCollEntry(bi));
      });
      if(wp>=d.pagination.pages)break;wp++;
    }
    st.discogsCollReleaseIds=collRIds;st.discogsCollMasterIds=collMIds;
    st.discogsCollection=collEntries;
    st.discogsWantReleaseIds=wantRIds;st.discogsWantMasterIds=wantMIds;
    st.discogsWantlist=wantEntries;
    st.discogsCollSyncedAt=new Date().toISOString();saveSt();
    // First sync ever for this account: surface the most-frequent artists/
    // labels once, rather than re-popping it on every later "Sync now".
    // Various-artist breakdown and local-library resolution both need a
    // moment to run in the background (see computeDiggingHeroes()), so
    // this opens on there simply being enough raw material to work with —
    // not on a synchronous result being ready the instant the sync ends.
    if(!st.discogsHeroesSeen&&(collEntries.length+wantEntries.length>=5||st.ownedTracks.length>=20)){
      st.heroesModal=true;st.discogsHeroesSeen=true;saveSt();
    }
  }catch(e){st.discogsSyncing=false;rr();throw e;}
  st.discogsSyncing=false;rr();
}
async function handleDiscogsCallback(){
  const params=new URLSearchParams(location.search);
  const oauthToken=params.get('oauth_token');
  const oauthVerifier=params.get('oauth_verifier');
  if(!oauthToken||!oauthVerifier)return;
  history.replaceState(null,'',location.pathname);
  const pendingSecret=sessionStorage.getItem('discogs_oauth_secret');
  sessionStorage.removeItem('discogs_oauth_secret');
  if(!pendingSecret){alert('Discogs login session expired. Please try again.');return;}
  st.librariesModal=true;st.librariesTab='sync';st.discogsSyncing=true;rr();
  try{
    const data=await edgeFn({action:'access_token',oauth_token:oauthToken,oauth_token_secret:pendingSecret,oauth_verifier:oauthVerifier});
    st.discogsOAuthToken=data.access_token;st.discogsOAuthSecret=data.token_secret;st.discogsUser=data.username;
    saveSt();rr();
    await syncDiscogsAccount();
  }catch(e){st.discogsSyncing=false;rr();alert('Discogs connection failed: '+e.message);}
}

// Same tiered title match pickTrackMatch() already uses for the library-scan
// search (exact / mix-descriptor-only / duration-confirmed prefix), plus an
// artist cross-check that's no longer optional. The old version returned a
// match on title alone whenever EITHER side's artist was blank — and a local
// scan leaves artistNorm blank constantly (any file whose name doesn't
// parse as "Artist - Title" and has no ID3 artist tag, e.g. most DJ-pool
// downloads) — so a short/generic title like "Feel It" was silently
// matching any owned file with a similar title and no artist tag at all,
// badging tracks the user never actually had. Confirmed live 2026-08-12
// (Andrew Macari's "Feel It" badged from an unrelated same-named file).
// Substring/prefix title matching (tiers 1-2) now requires the artist to
// actually corroborate the match. With no artist to check on either side, an
// exact title match alone still isn't enough — "Feel It" is exactly the kind
// of short/generic title two unrelated tracks share — so that case falls
// back to duration as the sole corroborating signal instead (tight
// tolerance, since nothing else is confirming it). No artist AND no
// duration on either side means no way to tell two same-named tracks apart,
// so that's a no-match rather than a guess.
function isOwned(trackTitle,trackArtist,trackDuration){
  if(!st.ownedTracks.length)return false;
  const tN=normalizeStr(trackTitle);
  const aN=normalizeStr(trackArtist||'');
  if(!tN)return false;
  const trackDur=parseDur(trackDuration||'');
  const tKey=mixTitleKey(tN);
  return st.ownedTracks.some(o=>{
    if(!o.titleNorm)return false;
    let tier;
    if(o.titleNorm===tN)tier=0;
    else{
      const oKey=mixTitleKey(o.titleNorm);
      if(oKey===tKey)tier=1;
      else if(oKey.startsWith(tKey+' ')||tKey.startsWith(oKey+' '))tier=2;
      else return false;
    }
    if(tier===2&&!(o.dur&&trackDur&&Math.abs(o.dur-trackDur)<=20))return false;
    if(aN&&o.artistNorm)return o.artistNorm===aN||artistTokensOverlap(o.artistNorm,[trackArtist])||artistTokensOverlap(aN,[o.artistRaw||o.artistNorm]);
    return tier===0&&!!(o.dur&&trackDur&&Math.abs(o.dur-trackDur)<=5);
  });
}

// Digital library entries for the "My Libraries" modal: the local folder
// scan (st.ownedTracks) only has normalized title/artist strings — no
// thumbnails, no release info — so a real "release" view can only be built
// from tracks already loaded into the tree (st.nodes), cross-checked against
// the scan via isOwned(). This can't discover artists never explored in
// WaxTree; it's the same matching isOwned() already does for the "In your
// digital library" badge, just aggregated across every explored node.
function getDigitalLibraryEntries(){
  const seen=new Set();
  const out=[];
  st.nodes.forEach(n=>{
    const tracks=n.data?.tracks;
    if(!tracks)return;
    const isLabelNode=n.type==='label';
    tracks.forEach(t=>{
      const artistDisplay=isLabelNode?t.label:n.name;
      if(!isOwned(t.title,artistDisplay,t.duration))return;
      const key=t.discogsUrl||String(t.id);
      if(seen.has(key))return;
      seen.add(key);
      out.push({
        title:t.album||t.title,
        artist:artistDisplay,
        year:t.year,
        thumb:t.thumbUrl,
        discogsUrl:t.discogsUrl,
        artistExploreId:isLabelNode?t.exploreId:n.discogsId,
        artistExploreName:isLabelNode?t.exploreName:n.name,
        artistExploreType:isLabelNode?(t.exploreType||'artist'):'artist',
        labelExploreId:isLabelNode?n.discogsId:t.labelId,
        labelExploreName:isLabelNode?n.name:t.label,
        genres:t.genre?t.genre.split(' · '):[],
      });
    });
  });
  // Add anything matchLibraryWithDiscogs() found for artists/releases not
  // already reachable through an explored node
  Object.values(loadDigitalMatches()).forEach(m=>{
    const key=m.discogsUrl||(m.title+'|'+m.artist);
    if(seen.has(key))return;
    seen.add(key);
    out.push({
      title:m.title,artist:m.artist,year:m.year,thumb:m.thumb,discogsUrl:m.discogsUrl,
      artistExploreId:m.artistExploreId,artistExploreName:m.artistExploreName,artistExploreType:'artist',
      labelExploreId:m.labelExploreId,labelExploreName:m.labelExploreName,
      genres:m.genre?m.genre.split(' · '):[],
    });
  });
  return out;
}

function saveOwnedTracks(list){
  try{localStorage.setItem('wt-owned',JSON.stringify(list));return true;}
  catch(e){console.warn('WaxTree: could not persist library index:',e);return false;}
}
function loadOwnedTracks(){
  try{const r=localStorage.getItem('wt-owned');if(r)return JSON.parse(r);}catch{}
  return null;
}

// ── Match local library against Discogs ─────────────────────
// Keyed by "titleNorm|artistNorm" → matched release info. Kept out of
// saveSt()/cloud backup (same reasoning as discogsCollection: cheap to
// rebuild, not worth the payload weight for a large library).
function loadDigitalMatches(){
  try{const r=localStorage.getItem('wt-digital-matches');if(r)return JSON.parse(r);}catch{}
  return {};
}
function saveDigitalMatches(m){
  try{localStorage.setItem('wt-digital-matches',JSON.stringify(m));}catch(e){console.warn('WaxTree: could not persist digital matches:',e);}
}
// Which artistNorm keys have already been searched (match found or not) —
// without this, every "Match again" click re-searched the entire library
// from the top, so a 5000-track collection with hundreds of unique artists
// never got past the first few dozen before the tab was closed. Now a run
// always continues from where the last one left off.
function loadCheckedArtists(){
  try{const r=localStorage.getItem('wt-digital-matches-checked');if(r)return new Set(JSON.parse(r));}catch{}
  return new Set();
}
function saveCheckedArtists(set){
  try{localStorage.setItem('wt-digital-matches-checked',JSON.stringify([...set]));}
  catch(e){console.warn('WaxTree: could not persist checked-artists list:',e);}
}
// Discogs search results mix releases/masters/artists/labels by text
// relevance — for a library of underground/niche producer names the actual
// artist profile often didn't make the top 25 at all. Filtering server-side
// with type=artist means we only ever get artist profiles back.
async function searchDiscogsArtist(q){
  const ck='sa:'+q;
  const c=lsGet(ck);if(c)return c;
  const data=await dReq('/database/search',{q,type:'artist',per_page:'25'});
  const r=(data.results||[]).map(x=>({id:x.id,title:x.title,thumb:x.thumb,uri:x.uri}));
  lsSet(ck,r);return r;
}
// ── Matching helpers ────────────────────────────────────────
// Fallback title key: normalizeStr() already strips "original mix/remix/
// edit/remaster", but Beatport/Bandcamp-style files carry many more mix
// descriptors ("Extended Mix", "Club Mix", "Instrumental"...) that Discogs
// tracklists usually omit — exact equality fails on essentially every such
// purchase. Deliberately NOT stripping genre-ish words that appear in real
// track names ("dub", "deep", "dark"): a fallback key that merges
// "Damascus Dub" with "Damascus" would trade a real title for a guess.
// Exact-normalized comparison is always tried first; this key is only the
// second tier.
function mixTitleKey(normTitle){
  const k=normTitle.replace(/\b(?:extended|club|radio|vocal|instrumental|inst|version|rework|remake|bootleg|vip|rmx|remixed|mix|mixes)\b/g,'').replace(/\s+/g,' ').trim();
  return k||normTitle;
}
// Tiered track match against a Discogs tracklist:
//   tier 0 — exact normalized-title equality
//   tier 1 — mixTitleKey equality (mix-descriptor differences only)
//   tier 2 — one key is a word-prefix of the other, ONLY when both sides
//            have durations to confirm (title evidence alone is too weak)
// Duration is a disqualifier only when BOTH sides actually have one
// (±20s — printed vinyl durations are approximate; the old rule rejected
// any match where Discogs simply didn't list durations, which silently
// killed matching against most vinyl-era tracklists). Among candidates in
// the same tier, closest duration wins — that's what keeps "Track" and
// "Track (Extended Mix)" from being confused once mix words are stripped.
function pickTrackMatch(t,discogsTracks){
  const tKey=mixTitleKey(t.titleNorm);
  let best=null,bestTier=9,bestDiff=Infinity;
  for(const dt of discogsTracks||[]){
    const dNorm=normalizeStr(dt.title);
    if(!dNorm)continue;
    let tier;
    if(dNorm===t.titleNorm)tier=0;
    else{
      const dKey=mixTitleKey(dNorm);
      if(dKey===tKey)tier=1;
      else if(dKey.startsWith(tKey+' ')||tKey.startsWith(dKey+' '))tier=2;
      else continue;
    }
    const dd=parseDur(dt.duration||'');
    const bothDur=!!(t.dur&&dd);
    if(bothDur&&Math.abs(dd-t.dur)>20)continue;
    if(tier===2&&!bothDur)continue;
    const diff=bothDur?Math.abs(dd-t.dur):Infinity;
    if(tier<bestTier||(tier===bestTier&&diff<bestDiff)){best=dt;bestTier=tier;bestDiff=diff;}
  }
  return best;
}
// Artist-profile candidate: strict equality was the only rule before, so
// "The Prodigy" vs "Prodigy" or a local "Above and Beyond" tag vs Discogs
// "Above & Beyond" (normalizeStr drops "&" but keeps the word "and", so
// the two sides normalize DIFFERENTLY) never matched. Folding a leading
// "the" and the word "and" out of both sides keeps the comparison exact
// in spirit — no fuzzy scoring — while surviving those two spelling
// families.
function pickArtistCandidate(results,artistNorm){
  const cmp=x=>x.replace(/^the\s+/,'').replace(/\band\b/g,' ').replace(/\s+/g,' ').trim();
  const want=cmp(artistNorm);
  if(!want)return null;
  const exact=(results||[]).find(r=>cmp(normalizeStr(stripDiscogsSuffix(r.title)))===want);
  if(exact)return exact;
  // No exact profile-name match — real spelling/formatting drift between a
  // local tag and Discogs' own preferred name (an extra middle name, a
  // mononym vs full name, "&" spelled out differently than cmp() folds)
  // used to lose the whole artist's catalog here with no second chance.
  // A loosely-picked candidate is safe to try: fetchArtistData()'s tracks
  // still have to clear pickTrackMatch()'s own strict title tiers per
  // track right after this, which is what actually gates a false match,
  // not this pick — same reasoning as the per-track fallback search below.
  return (results||[]).find(r=>artistTokensOverlap(want,[stripDiscogsSuffix(r.title)]))||null;
}
// Multi-artist tags ("A & B", "A feat. C") can never equal a single
// Discogs artist profile. With the raw tag available (new scans keep it —
// see keepRawArtist), split on the real separators; for older scans only
// the normalized string exists, where "&"/"feat" are already gone and only
// word separators survive. Components get tried as artist searches of
// their own — the release is usually filed under one of the credited
// artists individually.
function splitArtistComponents(artistNorm,artistRaw){
  const out=[];
  if(artistRaw){
    artistRaw.split(/\s*(?:,|&|\/|\bfeat\.?\b|\bft\.?\b|\bfeaturing\b|\bvs\.?\b|\bpres(?:ents)?\.?\b|\bb2b\b|\bmeets\b|\bwith\b|\bx\b|\bversus\b|\band\b)\s*/i).forEach(p=>{const n=normalizeStr(p);if(n)out.push(n);});
  }else{
    artistNorm.split(/\s+(?:and|x|vs|b2b|with|pres|presents|meets|versus)\s+/).forEach(n=>{if(n.trim())out.push(n.trim());});
  }
  return [...new Set(out)].filter(n=>n.length>=3&&n!==artistNorm).slice(0,3);
}
// Confirmation guard for the per-track release search below: the found
// release must actually credit someone recognizably named in the local
// artist tag, or a title-coincidence on a same-named track by a stranger
// would slip through. Token-based so "Stojche feat. X" still overlaps the
// release artist "Stojche".
function artistTokensOverlap(localArtistNorm,candidateNames){
  const lt=new Set(localArtistNorm.split(' ').filter(w=>w.length>=3));
  const names=(candidateNames||[]).map(n=>normalizeStr(n||'')).filter(Boolean);
  if(!lt.size)return names.some(n=>n.includes(localArtistNorm)||localArtistNorm.includes(n));
  return names.some(n=>n.split(' ').some(w=>w.length>=3&&lt.has(w)));
}
// The cheap step (searchDiscogsArtist) is what dominates throughput on a
// library this size — most local artist names won't have a Discogs match
// at all, so most batches never even reach the heavier fetchArtistData()
// step. dReq()'s own rate limiter (45 req/60s) queues everything correctly
// regardless of how many searches get submitted at once, so a bigger batch
// here just means more useful work queued per round trip, not a risk of
// actually exceeding the real limit.
const DIGITAL_MATCH_BATCH=15;
// Sync Libraries used to be its own modal (st.discogsModal); it's the
// "Sync" tab inside Libraries now — this is what its progress-rendering
// guards check instead.
function isSyncTabOpen(){return st.librariesModal&&st.librariesTab==='sync';}
async function matchLibraryWithDiscogs(){
  if(st.libraryMatchRunning)return;
  if(!st.ownedTracks.length)return;
  const byArtist=new Map();
  st.ownedTracks.forEach(t=>{
    if(!t.artistNorm||!t.titleNorm)return; // can't search without an artist name
    if(!byArtist.has(t.artistNorm))byArtist.set(t.artistNorm,[]);
    byArtist.get(t.artistNorm).push(t);
  });
  const allArtists=[...byArtist.keys()];
  let checked=loadCheckedArtists();
  let remaining=allArtists.filter(a=>!checked.has(a));
  // Nothing left from previous runs — a click here means starting a full
  // fresh pass in case Discogs data changed since.
  if(!remaining.length){checked=new Set();remaining=allArtists;}
  console.log('WaxTree library match: starting run',{
    distinctArtists:allArtists.length,artistsRemaining:remaining.length,
    tracksSkippedNoArtist:st.ownedTracks.length-st.ownedTracks.filter(t=>t.artistNorm&&t.titleNorm).length,
  });

  st.libraryMatchRunning=true;
  st.libraryMatchProgress={done:0,total:remaining.length,found:0};
  if(isSyncTabOpen())rr();
  const matches=loadDigitalMatches();
  // Batches with few/no Discogs hits can finish in well under a second —
  // without a floor, a full app re-render on every single one (while the
  // modal watching progress is open) fires far more often than a human
  // reading a counter needs, which is exactly what made the background
  // content behind the modal visibly jump/scroll on every tick.
  let lastProgressRr=0;

  for(let i=0;i<remaining.length;i+=DIGITAL_MATCH_BATCH){
    if(!st.libraryMatchRunning)break; // cancelled mid-run
    const batch=remaining.slice(i,i+DIGITAL_MATCH_BATCH);
    // Cheap artist-name searches run concurrently; the heavier
    // fetchArtistData() (which itself fans out into a batch of release
    // fetches) stays sequential per batch so total in-flight requests
    // don't spike beyond what the shared Discogs rate limiter expects.
    const searchResults=await Promise.all(batch.map(async artistNorm=>{
      try{
        // The raw tag (when a scan kept it) makes a better search query
        // than the normalized string — punctuation intact, and it's what
        // component splitting needs.
        const raw=byArtist.get(artistNorm).find(t=>t.artistRaw)?.artistRaw;
        const results=await searchDiscogsArtist(raw||artistNorm);
        const cand=pickArtistCandidate(results,artistNorm);
        if(cand)return{artistNorm,cands:[cand]};
        // No profile under the full tag — try each credited artist alone.
        const cands=[];
        for(const comp of splitArtistComponents(artistNorm,raw)){
          try{
            const cc=pickArtistCandidate(await searchDiscogsArtist(comp),comp);
            if(cc)cands.push(cc);
          }catch{}
        }
        return{artistNorm,cands};
      }catch(e){console.warn('WaxTree: artist search failed for',artistNorm,e);return{artistNorm,cands:[],failed:true};}
    }));
    for(const{artistNorm,cands,failed}of searchResults){
      if(!st.libraryMatchRunning)break;
      const groupTracks=byArtist.get(artistNorm);
      const unmatched=()=>groupTracks.filter(t=>!matches[t.titleNorm+'|'+t.artistNorm]);
      let canonicalName=null;
      // A genuine failure (rate-limited, network) has to NOT mark this
      // artist checked below — it used to, indistinguishable from a real
      // "searched Discogs, found nothing" answer, so an artist caught in a
      // 429 storm was silently written off forever instead of retried on
      // the next run. Confirmed live 2026-08-12: 7 back-to-back 429s from
      // the shared no-personal-token proxy during a library-match run
      // (same contention class that caused a real outage 2026-07-16),
      // right when this was very likely quietly killing hundreds of
      // artists' worth of matching in one run.
      let hadFailure=failed;
      for(const cand of cands){
        if(!unmatched().length)break;
        try{
          const data=await fetchArtistData(cand.id,undefined,true);
          if(!canonicalName)canonicalName=data.name;
          unmatched().forEach(t=>{
            const found=pickTrackMatch(t,data.tracks);
            if(found){
              matches[t.titleNorm+'|'+t.artistNorm]={
                title:found.album||found.title,artist:data.name,year:found.year,thumb:found.thumbUrl,
                discogsUrl:found.discogsUrl,
                artistExploreId:data.id,artistExploreName:data.name,
                labelExploreId:found.labelId,labelExploreName:found.label,
                genre:found.genre||null,
              };
              st.libraryMatchProgress.found++;
            }
          });
        }catch(e){console.warn('WaxTree: fetching artist data failed for',artistNorm,e);hadFailure=true;}
      }
      // Second pass: whatever the artist-catalog window missed — deep
      // catalog beyond fetchArtistData()'s 200-track/newest-first cap, or
      // no artist profile matched at all — gets one targeted release
      // search per track (verified live 2026-07-18: /database/search with
      // artist+track params pinpoints the right release in one request).
      // The hit-or-miss verdict is cached per track so a re-run never
      // repeats the network work; a confirmed match still has to clear the
      // exact same pickTrackMatch gates PLUS credit someone actually named
      // in the local artist tag.
      for(const t of unmatched()){
        if(!st.libraryMatchRunning)break;
        const key=t.titleNorm+'|'+t.artistNorm;
        const vKey='tv1:'+key;
        const cached=lsGet(vKey);
        if(cached){
          if(cached.match&&!matches[key]){matches[key]=cached.match;st.libraryMatchProgress.found++;}
          continue;
        }
        try{
          const sd=await dReq('/database/search',{artist:canonicalName||t.artistRaw||t.artistNorm,track:t.titleRaw||t.titleNorm,type:'release',per_page:'3'});
          let verdict={none:true};
          for(const rel of(sd.results||[]).slice(0,2)){
            const rd=await dReq('/releases/'+rel.id);
            const entries=buildTrackEntries(rd,'disc-'+rel.id,`https://www.discogs.com/release/${rel.id}`,rel.year,null,rel.thumb||'');
            const relArtists=(rd.artists||[]).map(a=>stripDiscogsSuffix(a.name));
            const found=pickTrackMatch(t,entries);
            if(found&&artistTokensOverlap(t.artistNorm,[...relArtists,found.trackArtistName||''])){
              verdict={match:{
                title:found.album||found.title,artist:found.trackArtistName||relArtists.join(', '),
                year:found.year,thumb:found.thumbUrl,discogsUrl:found.discogsUrl,
                artistExploreId:found.trackArtistId||rd.artists?.[0]?.id||null,
                artistExploreName:found.trackArtistName||relArtists[0]||'',
                labelExploreId:found.labelId,labelExploreName:found.label,
                genre:found.genre||null,
              }};
              break;
            }
          }
          lsSet(vKey,verdict);
          if(verdict.match){matches[key]=verdict.match;st.libraryMatchProgress.found++;}
        }catch(e){console.warn('WaxTree: track search failed for',t.titleNorm,e);hadFailure=true;}
      }
      // Only a genuinely completed pass (search succeeded even if it found
      // nothing) retires this artist — a failed one goes back into
      // "remaining" on the next run instead of being lost for good.
      if(!hadFailure)checked.add(artistNorm);
    }
    st.libraryMatchProgress.done=Math.min(remaining.length,i+batch.length);
    saveDigitalMatches(matches);
    saveCheckedArtists(checked);
    // Only worth a full app re-render while the Sync tab (the only place
    // this progress is shown, now inside Libraries) is actually open —
    // otherwise this fires every batch for the whole run and visibly
    // disrupts scroll on whatever the user has navigated to elsewhere in
    // the meantime. Even then, at most once a second — plenty for a
    // progress counter.
    if(isSyncTabOpen()&&Date.now()-lastProgressRr>=1000){lastProgressRr=Date.now();rr();}
  }
  console.log('WaxTree library match: run finished',{
    artistsCheckedThisRun:st.libraryMatchProgress.done,tracksFoundThisRun:st.libraryMatchProgress.found,
    artistsCheckedTotal:checked.size,artistsTotal:allArtists.length,tracksMatchedTotal:Object.keys(matches).length,
  });
  st.libraryMatchRunning=false;
  if(isSyncTabOpen())rr();
}
async function linkLibrary(onProgress=()=>{}){
  if(!('webkitdirectory' in document.createElement('input')))
    throw new Error('Folder scanning requires a desktop browser (Chrome, Edge, Safari or Firefox).');
  const files=await pickMusicFolder();
  if(files===null)return null;
  if(!files.length)throw new Error('The selected folder appears to be empty.');
  onProgress?.(0,0); // signal: collection phase
  const stats={skippedDirs:0,dirs:0,otherFiles:0,junkFiles:0,extCounts:{},folders:[]};
  const dirMap={};
  const dirOf=rel=>{const i=rel.lastIndexOf('/');return i===-1?'':rel.slice(0,i);};
  const getDir=p=>{
    if(!dirMap[p]){
      dirMap[p]={path:p,audio:0,junk:0,other:0,subdirs:0};
      if(p){getDir(dirOf(p)).subdirs++;}
    }
    return dirMap[p];
  };
  const audioFiles=[];
  for(const f of files){
    const rel=f.webkitRelativePath||f.name;
    const dir=getDir(dirOf(rel));
    if(f.name.startsWith('._')||f.name==='.DS_Store'){stats.junkFiles++;dir.junk++;continue;} // macOS junk on external drives
    const lower=f.name.toLowerCase();
    if(AUDIO_EXT.some(ext=>lower.endsWith(ext))){
      audioFiles.push(f);dir.audio++;
      if(audioFiles.length%200===0)onProgress?.(audioFiles.length,0);
    }else{
      stats.otherFiles++;dir.other++;
      const m=lower.match(/\.([a-z0-9]{1,5})$/);
      const ext=m?'.'+m[1]:'(no ext)';
      stats.extCounts[ext]=(stats.extCounts[ext]||0)+1;
    }
  }
  stats.folders=Object.values(dirMap).filter(f=>f.path!=='');
  stats.dirs=stats.folders.length;
  console.log('WaxTree scan report:',{audioFiles:audioFiles.length,totalFilesSeen:files.length,foldersScanned:stats.dirs,nonAudioFiles:stats.otherFiles,hiddenJunkFiles:stats.junkFiles,byExtension:stats.extCounts});
  console.table(stats.folders);
  const{results:owned,idStats}=await extractAllMetadata(audioFiles,onProgress);
  const scannedAt=new Date().toISOString();
  st.ownedTracks=owned;
  // How many tracks even HAVE an artist WaxTree can search Discogs with —
  // directly answers "why did only a fraction of my library match": a
  // track with no artist detected (no ID3 artist tag AND a filename that
  // doesn't parse as "Artist - Title") never gets attempted by
  // matchLibraryWithDiscogs() at all, no matter how good the matching
  // logic is. distinctArtists is what that function actually iterates.
  const withArtist=owned.filter(o=>o.artistNorm).length;
  console.log('WaxTree library metadata report:',{
    totalTracks:owned.length,
    withArtist,noArtist:owned.length-withArtist,
    distinctArtists:new Set(owned.map(o=>o.artistNorm).filter(Boolean)).size,
    id3TagsUsed:idStats.mmLoaded,
    fromId3Tags:idStats.id3,fromId3NoArtist:idStats.id3NoArtist,
    fromFilename:idStats.filenameParsed,fromFilenameNoArtist:idStats.filenameNoArtist,
    unparsableFilenames:idStats.unparsable,
  });
  // Persist locally — matching data lives in localStorage (drop filename to keep it small).
  // artistRaw/titleRaw ARE kept now (they weren't before): matchLibraryWithDiscogs()
  // prefers them for search queries and multi-artist splitting over the normalized
  // string, but a big library's match run spans many sessions via the auto-resume
  // in the boot sequence below — every one of those resumed runs was reloading
  // st.ownedTracks from exactly this payload, so dropping raw tags here meant only
  // the very first, same-session batch ever got to use them; everything matched
  // after any reload was already working with degraded data. keepRawArtist/
  // keepRawTitle already only set these for tracks where they carry real
  // information, so this is a small, bounded addition, not the full filename.
  // Supabase user_metadata only gets the count: the full list bloats the JWT and the update
  // fails silently on big libraries, which is what kept resurrecting stale partial scans.
  const persisted=saveOwnedTracks(owned.map(o=>({titleNorm:o.titleNorm,artistNorm:o.artistNorm,dur:o.dur||null,artistRaw:o.artistRaw,titleRaw:o.titleRaw})));
  try{await sb.auth.updateUser({data:{owned_tracks:null,library_scanned_at:scannedAt,library_track_count:owned.length}});}
  catch(e){console.warn('WaxTree: could not update library metadata:',e);}
  return{count:owned.length,scannedAt,filesFound:audioFiles.length,persisted,stats,idStats};
}

// ── Auth ───────────────────────────────────────────────────

let wtSession=null;

// Supabase's own session-persistence layer writes its token to localStorage
// synchronously as part of signing in, well before sb.auth.getSession()'s
// own promise resolves — reading it straight back out here gives a reliable
// "who's actually signed in right now" answer without waiting on that
// async check, which matters for the account-switch guard below (it has to
// run and clear stale data BEFORE anything gets rendered with it, not after
// an awaited call resolves).
function currentSessionUserId(){
  try{
    const raw=localStorage.getItem('sb-'+new URL(SB_URL).hostname.split('.')[0]+'-auth-token');
    if(!raw)return null;
    return JSON.parse(raw)?.user?.id||null;
  }catch{return null;}
}

// supabase-js's default autoRefreshToken relies on a plain setTimeout to
// wake up shortly before the access token expires — browsers heavily
// throttle timers in backgrounded/inactive tabs (this is standard browser
// power-saving behavior, not a bug), so a tab left open-but-unfocused for
// a while can miss its scheduled refresh entirely and silently sit on an
// expired token with no error logged anywhere. The user then returns,
// interacts (or hard-refreshes), and gets bounced to login with a "lost
// everything since last save" experience and zero console evidence — this
// matches the recurring spontaneous-sign-out reports exactly. This is
// Supabase's own documented fix: explicitly pause the refresh loop while
// hidden and force an immediate refresh check the instant the tab becomes
// visible again, instead of trusting a background timer that may never
// fire in time. https://supabase.com/docs/reference/javascript/auth-startautorefresh
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible')sb.auth.startAutoRefresh();
  else sb.auth.stopAutoRefresh();
});

// ── Digging events (Phase 0 of the taste engine) ───────────
// Append-only behavioral log (see supabase/digging_events.sql). The
// exploration edges — which artist/label a digger jumped to and from
// where — are the one dataset no other platform records; logging starts
// now so the future recommendation engine has real history to learn
// from instead of starting cold. Fire-and-forget by design: a dropped
// batch is acceptable, blocking or retry loops in the UI path are not.
let dgQueue=[];
let dgFlushTimer=null;
function logEvent(event,payload){
  if(!wtSession)return;
  dgQueue.push({user_id:wtSession.user.id,event,payload});
  if(dgQueue.length>=10){flushEvents();return;}
  if(!dgFlushTimer)dgFlushTimer=setTimeout(flushEvents,5000);
}
async function flushEvents(){
  if(dgFlushTimer){clearTimeout(dgFlushTimer);dgFlushTimer=null;}
  if(!dgQueue.length||!wtSession)return;
  const batch=dgQueue;dgQueue=[];
  try{
    const{error}=await sb.from('digging_events').insert(batch);
    if(error)throw error;
  }catch(e){
    console.warn('WaxTree: digging-event batch dropped:',e?.message||e);
  }
}
// supabase-js inserts don't survive tab close — use a keepalive fetch
// straight to the REST endpoint for the final flush instead.
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState!=='hidden'||!dgQueue.length||!wtSession)return;
  const batch=dgQueue;dgQueue=[];
  try{
    fetch(SB_URL+'/rest/v1/digging_events',{
      method:'POST',keepalive:true,
      headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+wtSession.access_token,Prefer:'return=minimal'},
      body:JSON.stringify(batch),
    });
  }catch{}
});

// ── Demo data ──────────────────────────────────────────────
const FREE_WOOD_LIMIT=3;
const FREE_NODE_LIMIT=15;
// Bump whenever buildTrackEntries/fetchArtistData/fetchLabelData's
// per-track output shape changes — already-added artist/label nodes carry
// their old node.data forever otherwise (the a7/l8-style API-response
// cache bump alone doesn't reach nodes a user already added; selectNode()
// and the boot sweep below re-fetch them once each).
const TRACK_DATA_VERSION=10; // bumped: buildTrackEntries now carries master_id as an altId (see its own comment) — a shared/local cache entry from before this fix never had that field, so ownership badges silently kept missing color/pressing variants no matter how many times a user cleared their own local cache, since the shared cross-user cache (getSharedNodeCache) was still serving the pre-fix shape
const DEMO_BRANCHES=[{id:'b1',name:'Branch 1'}];
const DEMO_NODES=[{
  id:'d1',branchId:'b1',type:'artist',discogsId:148,name:'Larry Heard',
  parentId:null,pinned:false,tags:[],loaded:true,loading:false,error:null,
  data:{
    id:148,name:'Larry Heard',imageUrl:null,
    bio:"Larry Heard, legendary as Mr. Fingers, is the father of Chicago deep house. With just three Roland TR-707, Juno-106 and Korg BX-3 he created in 1986 the cornerstones of the genre — Can You Feel It, Washing Machine, Mystery Of Love — tracks that still define the emotional aesthetic of house music. His output spans over three decades and numerous aliases.",
    aliases:[{id:16820,name:'Mr. Fingers',type:'artist'},{id:107745,name:'Fingers Inc.',type:'artist'},{id:422185,name:'Wash',type:'artist'}],
    highlights:{yearRange:'1986–2022',names:['Trax Records','Alleviated Records'],curiosity:'Recorded his first tracks with just 3 analog synths in his bedroom in Chicago.'},
    tracks:[
      {id:'t1',title:'Can You Feel It',  duration:'5:47',year:1986,label:'Trax Records',   genre:'Deep House',labelId:95, thumbUrl:null,digital:false,discogsUrl:'https://www.discogs.com/release/887987', videoId:null,exploreId:16820, exploreName:'Mr. Fingers', exploreType:'artist',exploreLabel:'Explore alias'},
      {id:'t2',title:'Washing Machine',  duration:'4:12',year:1986,label:'Trax Records',   genre:'Deep House',labelId:95, thumbUrl:null,digital:false,discogsUrl:'https://www.discogs.com/release/887987', videoId:null,exploreId:16820, exploreName:'Mr. Fingers', exploreType:'artist',exploreLabel:'Explore alias'},
      {id:'t3',title:'Mystery Of Love',  duration:'6:03',year:1986,label:'Trax Records',   genre:'Deep House',labelId:95, thumbUrl:null,digital:false,discogsUrl:'https://www.discogs.com/release/887987', videoId:null,exploreId:16820, exploreName:'Mr. Fingers', exploreType:'artist',exploreLabel:'Explore alias'},
      {id:'t4',title:'Closer',           duration:'7:22',year:1992,label:'Republic Records',genre:'Deep House',labelId:null,thumbUrl:null,digital:true, discogsUrl:'https://www.discogs.com/release/1234001',videoId:null,exploreId:107745,exploreName:'Fingers Inc.',exploreType:'artist',exploreLabel:'Explore alias'},
      {id:'t5',title:'Missing You',      duration:'6:55',year:1992,label:'Republic Records',genre:'Deep House',labelId:null,thumbUrl:null,digital:true, discogsUrl:'https://www.discogs.com/release/1234001',videoId:null,exploreId:107745,exploreName:'Fingers Inc.',exploreType:'artist',exploreLabel:'Explore alias'},
    ],trackCount:47,
  }
}];

// ── State ──────────────────────────────────────────────────
const SK='ct-v5';
const AVATAR_KEY='wt-avatar';
function loadSt(){try{const r=localStorage.getItem(SK);return r?JSON.parse(r):null;}catch{return null;}}
function loadDiscogsCollection(){try{const r=localStorage.getItem('wt-discogs-collection');return r?JSON.parse(r):[];}catch{return[];}}
function loadDiscogsWantlist(){try{const r=localStorage.getItem('wt-discogs-wantlist');return r?JSON.parse(r):[];}catch{return[];}}
function saveSt(){
  // Node.data (bio, images, full tracklists) used to be written to
  // localStorage in full, uncapped — for a long-time user with a large
  // explored tree, this blob can grow past the browser's localStorage quota
  // (typically 5-10MB/origin). Once ANY write to that origin starts failing,
  // it's not just our own data at risk: Supabase's client also persists its
  // session/refresh token to localStorage, and a failed write there can look
  // like an invalid session and trigger a spontaneous sign-out — matching
  // reports of random logout + login being stuck until the user manually
  // clears site data (which resets the quota). Stripping the same way
  // pushStateToCloud() already does keeps this local write small; nodes
  // reload their .data on demand via ensureNodeLoaded(), same mechanism
  // already used after a cloud restore.
  const lightNodes=st.nodes.map(n=>({id:n.id,branchId:n.branchId,parentId:n.parentId,type:n.type,discogsId:n.discogsId,name:n.name,pinned:n.pinned,tags:n.tags}));
  // discogsCollection/discogsWantlist (the full release lists, hundreds of
  // entries for an active collector) live in their own keys so a quota
  // issue there can never block saving the core app state below.
  try{localStorage.setItem('wt-discogs-collection',JSON.stringify(st.discogsCollection));}
  catch(e){
    if(e.name==='QuotaExceededError'&&purgeExpiredCache())
      try{localStorage.setItem('wt-discogs-collection',JSON.stringify(st.discogsCollection));}catch{}
  }
  try{localStorage.setItem('wt-discogs-wantlist',JSON.stringify(st.discogsWantlist));}
  catch(e){
    if(e.name==='QuotaExceededError'&&purgeExpiredCache())
      try{localStorage.setItem('wt-discogs-wantlist',JSON.stringify(st.discogsWantlist));}catch{}
  }
  // ownerId tags this blob with whoever's actually signed in when it's
  // saved — guardAccountSwitch() (near st's own definition) reads it back
  // on the next boot to tell "my own data" apart from "a different
  // account's leftovers on this same browser". See its own comment.
  const corePayload=JSON.stringify({ownerId:currentSessionUserId(),branches:st.branches,nodes:lightNodes,selectedId:st.selectedId,activeBranchId:st.activeBranchId,chips:st.chips,likes:st.likes,likedTracks:st.likedTracks,listens:st.listens,theme:st.theme,sbPinFirst:st.sbPinFirst,dasAscoltare:st.dasAscoltare,playlists:st.playlists,history:st.history,follows:st.follows,followScanKnownIds:st.followScanKnownIds,supaIdMap:st.supaIdMap,discogsUser:st.discogsUser,discogsOAuthToken:st.discogsOAuthToken,discogsOAuthSecret:st.discogsOAuthSecret,discogsCollReleaseIds:st.discogsCollReleaseIds,discogsCollMasterIds:st.discogsCollMasterIds,discogsWantReleaseIds:st.discogsWantReleaseIds,discogsWantMasterIds:st.discogsWantMasterIds,discogsCollSyncedAt:st.discogsCollSyncedAt,discogsHeroesSeen:st.discogsHeroesSeen,alreadyListened:st.alreadyListened});
  try{
    localStorage.setItem(SK,corePayload);
    localStorage.setItem(SK+':ts',String(Date.now()));
  }catch(e){
    if(e.name==='QuotaExceededError'){
      const freed=purgeExpiredCache();
      enforceCacheBudget(); // TTL purge alone can free nothing if everything's still fresh
      console.warn('WaxTree: localStorage quota hit on core save — purged',freed,'expired cache entries, retrying');
      try{
        localStorage.setItem(SK,corePayload);
        localStorage.setItem(SK+':ts',String(Date.now()));
      }catch(e2){
        console.warn('WaxTree: core save still failing after purge:',e2);
        window.Sentry?.captureException instanceof Function&&Sentry.captureException(e2,{tags:{area:'local-save-after-purge'}});
      }
    }else{
      console.warn('WaxTree: local save failed:',e);
      window.Sentry?.captureException instanceof Function&&Sentry.captureException(e,{tags:{area:'local-save'}});
    }
  }
  scheduleCloudSync();
}
// ── Cloud backup ───────────────────────────────────────────
// localStorage alone is one "clear site data" click away from wiping every
// wood, node, playlist and like a user has. Mirror the same payload to a
// Supabase table (RLS-scoped to the user) so it survives that.
//
// 1000ms, not the original 4000ms — confirmed live 2026-08-04: a sign-out
// (same underlying recurring bug) landing inside that debounce window
// meant whatever the user did in roughly the last 4 seconds beforehand
// had never actually reached the cloud yet, so it wasn't there to restore
// even though the LOCAL save itself (saveSt(), called synchronously on
// every single rr()) was already correct. Shortened rather than removed —
// still coalesces genuinely rapid changes (e.g. typing in a search box)
// into one write instead of one per keystroke.
let stateSyncTimer=null;
function scheduleCloudSync(){
  if(!wtSession)return;
  if(stateSyncTimer)clearTimeout(stateSyncTimer);
  stateSyncTimer=setTimeout(pushStateToCloud,1000);
}
// Best-effort last line of defense for the tiny window scheduleCloudSync's
// own debounce still leaves — if the tab is about to close, refresh, or
// navigate away with a sync still pending, fire it immediately instead of
// letting it evaporate unsent. Not a guarantee (a fetch started here can
// still be cut off if the browser tears the page down before it
// completes), but Chrome/Firefox generally give an in-flight request
// launched from a visibilitychange/pagehide handler a real chance to
// finish, unlike one merely scheduled for later. pagehide (fires
// reliably, including on mobile Safari, unlike beforeunload) and
// visibilitychange (covers switching tabs/apps, not just closing) are
// both wired for the same reason: no single one of these events is
// consistently supported everywhere.
function flushPendingCloudSync(){
  if(!stateSyncTimer)return;
  clearTimeout(stateSyncTimer);stateSyncTimer=null;
  pushStateToCloud();
}
window.addEventListener('pagehide',flushPendingCloudSync);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushPendingCloudSync();});
// Snapshots into user_state_history (see supabase/user_state_history.sql)
// are append-only from the client — no update/delete policy at all — so
// nothing a future bug does can ever destroy a past one, unlike
// user_state's own single mutable row. Throttled to roughly once an hour
// (persisted so the throttle survives a reload) rather than on every save,
// since this is insurance, not the primary save path. Confirmed live
// 2026-08-02: this table didn't exist yet when a wiped local state got
// auto-synced over a real backup with no way back.
// Checking node count alone wasn't enough — confirmed live twice now
// (2026-08-02, 2026-08-03) the same underlying quota/sign-out bug can wipe
// follows, likes, playlists, or the Discogs sync specifically while
// leaving the explored tree untouched (or vice versa), since these are
// independent fields that can each individually fail to survive a bad
// local reset. `a` is the state about to REPLACE something ('candidate');
// `b` is the state it would be replacing ('existing'/reference) — returns
// true when `a` looks like an unexplained catastrophic wipe of something
// `b` clearly had. Shared by pushStateToCloud (candidate=new local state,
// reference=what's currently in the cloud) and hydrateFromCloud
// (candidate=current local state, reference=the cloud backup) — same
// shape check, just compared in opposite directions.
function looksLikeDataWipe(a,b){
  const aNodes=a.nodes?.length||0,bNodes=b.nodes?.length||0;
  const aFollows=a.follows?.length||0,bFollows=b.follows?.length||0;
  const aLikes=Object.keys(a.likes||{}).length,bLikes=Object.keys(b.likes||{}).length;
  const aPlTracks=(a.playlists||[]).reduce((n,p)=>n+(p.tracks?.length||0),0);
  const bPlTracks=(b.playlists||[]).reduce((n,p)=>n+(p.tracks?.length||0),0);
  const aColl=a.discogsCollReleaseIds?.length||0,bColl=b.discogsCollReleaseIds?.length||0;
  return(aNodes<3&&bNodes>=5)
    ||(aFollows===0&&bFollows>=3)
    ||(aLikes===0&&bLikes>=3)
    ||(aPlTracks===0&&bPlTracks>=3)
    ||(aColl===0&&bColl>=10)
    ||(!a.discogsOAuthToken&&!!b.discogsOAuthToken);
}
const USER_STATE_SNAPSHOT_INTERVAL_MS=60*60*1000;
function maybeSnapshotHistory(payload){
  if(!wtSession)return;
  const K='wt-history-snapshot-ts';
  const last=Number(localStorage.getItem(K)||0);
  if(Date.now()-last<USER_STATE_SNAPSHOT_INTERVAL_MS)return;
  try{localStorage.setItem(K,String(Date.now()));}catch{}
  sb.from('user_state_history').insert({user_id:wtSession.user.id,data:payload}).then(({error})=>{
    if(error){console.warn('WaxTree: history snapshot failed:',error);return;}
    sb.rpc('prune_user_state_history').then(({error:pe})=>{if(pe)console.warn('WaxTree: history prune failed:',pe);});
  });
}
async function pushStateToCloud(){
  if(!wtSession)return;
  // Strip the heavy cached Discogs payload (bio, images, full tracklists) —
  // it's cheaply re-fetched on selectNode; only the tree structure itself
  // (which artist/label, which branch, pin/tag state) is irreplaceable.
  const lightNodes=st.nodes.map(n=>({id:n.id,branchId:n.branchId,parentId:n.parentId,type:n.type,discogsId:n.discogsId,name:n.name,pinned:n.pinned,tags:n.tags}));
  const payload={branches:st.branches,nodes:lightNodes,selectedId:st.selectedId,activeBranchId:st.activeBranchId,chips:st.chips,likes:st.likes,likedTracks:st.likedTracks,listens:st.listens,theme:st.theme,sbPinFirst:st.sbPinFirst,dasAscoltare:st.dasAscoltare,playlists:st.playlists,history:st.history,follows:st.follows,followScanKnownIds:st.followScanKnownIds,supaIdMap:st.supaIdMap,discogsUser:st.discogsUser,discogsOAuthToken:st.discogsOAuthToken,discogsOAuthSecret:st.discogsOAuthSecret,discogsCollReleaseIds:st.discogsCollReleaseIds,discogsCollMasterIds:st.discogsCollMasterIds,discogsWantReleaseIds:st.discogsWantReleaseIds,discogsWantMasterIds:st.discogsWantMasterIds,discogsCollSyncedAt:st.discogsCollSyncedAt,discogsHeroesSeen:st.discogsHeroesSeen,alreadyListened:st.alreadyListened,avatarDataUrl:getAvatarUrl()};
  try{
    // Refuse to silently overwrite a real backup with what looks like a
    // wiped local state — confirmed live TWICE now (2026-08-02, 2026-08-03)
    // a localStorage-quota incident can empty a user's local state, and the
    // very next auto-save (this function) overwrites their real cloud
    // backup with it, permanently destroying it (user_state is a single
    // mutable row — see user_state_history.sql, added after the first
    // time this happened). The second incident specifically showed nodes
    // surviving while follows/Discogs sync did NOT, so this now checks
    // every field a user would consider unacceptable to lose (see
    // looksLikeDataWipe), not just the node count — this does mean an
    // extra read before every sync instead of only when nodes looked
    // sparse, but sb.from() calls go straight to Supabase, not through our
    // own Vercel functions, so this doesn't add to the Edge Request
    // budget that prompted capping the related-tracks retry loop.
    const{data:existing}=await sb.from('user_state').select('data').eq('user_id',wtSession.user.id).maybeSingle();
    if(existing?.data&&looksLikeDataWipe(payload,existing.data)){
      console.warn('WaxTree: refusing to sync — new state looks like an unexplained wipe compared to the existing cloud backup.');
      window.Sentry?.captureMessage instanceof Function&&Sentry.captureMessage('Blocked a suspicious cloud-state wipe',{tags:{area:'cloud-backup-guard'}});
      return; // nothing safe to push right now — also skip the history snapshot and syncNewSchema below
    }
    const{error}=await sb.from('user_state').upsert({user_id:wtSession.user.id,data:payload});
    if(error)throw error;
    maybeSnapshotHistory(payload);
  }catch(e){
    console.warn('WaxTree: cloud backup failed (will retry on next change):',e);
    window.Sentry?.captureException instanceof Function&&Sentry.captureException(e,{tags:{area:'cloud-backup-push'}});
  }
  // Groundwork for the future profiles/sessions/trees/nodes schema (see
  // supabase/schema_v2_profiles_sessions_trees_nodes.sql) — deliberately
  // AFTER and independent of the user_state write above: this is a
  // dual-write, not a replacement. user_state remains the only thing the
  // app actually reads from/renders; if this fails or has bugs, nothing
  // about the live app changes. Rides the same 4s debounce as the
  // user_state push (see scheduleCloudSync()) rather than its own timer.
  syncNewSchema();
}
// client-id (branch.id / node.id / a synthetic 'tree:'+rootId key) ->
// Supabase uuid. Client ids are short strings ('b'+Date.now(), 'n'+...),
// not real uuids, and changing that now would ripple through a lot of
// code that treats them as opaque keys (tracksPageMap, selectedId,
// parentId references...) — minting a stable uuid per client id here
// instead is far less invasive, and st.supaIdMap being cloud-synced
// keeps the mapping identical across devices instead of each one minting
// its own and creating duplicate rows for the same entity.
function supaId(clientId){
  if(!st.supaIdMap[clientId])st.supaIdMap[clientId]=crypto.randomUUID();
  return st.supaIdMap[clientId];
}
// Full recompute on every call, not incremental patches per mutation —
// deliberately. removeNode() REPARENTS a removed node's children to root
// (see its own comment) rather than cascading their removal, which is a
// structural change a naive "delete this one row" hook would get wrong
// (the DB's own on delete cascade WOULD remove the whole subtree, which
// is not what actually happened client-side). Recomputing sessions/
// trees/nodes fresh from st.branches/st.nodes every time sidesteps that
// entirely — whatever the current shape is, that's what gets upserted,
// and stale rows for anything no longer present get pruned explicitly
// below rather than relying on cascade semantics matching the client.
async function syncNewSchema(){
  if(!wtSession)return;
  try{
    // profiles.tier kept loosely in sync with the premium flag the app
    // already tracks via auth user_metadata — not authoritative here,
    // just mirrored so the new schema isn't missing it entirely.
    await sb.from('profiles').update({tier:st.isPremium?'premium':'free'}).eq('id',wtSession.user.id);

    const sessionRows=st.branches.map(b=>({id:supaId(b.id),user_id:wtSession.user.id,title:b.name,is_saved:true}));
    if(sessionRows.length){
      const{error}=await sb.from('sessions').upsert(sessionRows);
      if(error)throw error;
    }

    // A branch can hold several independent explorations at once (more
    // than one top-level search with nothing connecting them) — each
    // root node is the start of its own tree, all under the same session.
    // trees.root_node_id and nodes.tree_id reference each other (see the
    // schema file's own comment on this), so a tree can't be written with
    // its root_node_id already set — the node doesn't exist yet and the FK
    // would reject it (confirmed live: this made every first-ever sync
    // fail with a 409 on trees and silently skip the nodes upsert entirely,
    // since the whole function aborts on the first thrown error). Write
    // trees with root_node_id null first, then nodes, then go back and set
    // root_node_id now that the row it points to actually exists.
    const roots=st.nodes.filter(n=>!n.parentId);
    const treeRows=roots.map(root=>({id:supaId('tree:'+root.id),session_id:supaId(root.branchId),root_node_id:null}));
    if(treeRows.length){
      const{error}=await sb.from('trees').upsert(treeRows);
      if(error)throw error;
    }

    // ancestry() (already used for breadcrumbs) walks root-to-node — its
    // first entry is the root, its length-1 is exactly the depth.
    const nodeRows=st.nodes.map(n=>{
      const chain=ancestry(n.id);
      const root=chain[0]||n;
      return{
        id:supaId(n.id),
        tree_id:supaId('tree:'+root.id),
        parent_node_id:n.parentId?supaId(n.parentId):null,
        node_type:n.type,
        depth_level:Math.max(0,chain.length-1),
        external_id:String(n.discogsId),
        external_source:'discogs',
        data:{name:n.name,pinned:!!n.pinned,tags:n.tags||[]},
      };
    });
    if(nodeRows.length){
      const{error}=await sb.from('nodes').upsert(nodeRows);
      if(error)throw error;
    }

    if(treeRows.length){
      const rootUpdates=roots.map(root=>({id:supaId('tree:'+root.id),session_id:supaId(root.branchId),root_node_id:supaId(root.id)}));
      const{error}=await sb.from('trees').upsert(rootUpdates);
      if(error)throw error;
    }

    // Prune stale rows layered outermost-in (session, then tree, then
    // node) — deleting a stale session/tree cascades its children too,
    // so this also covers "a whole branch/exploration was removed", not
    // just individual nodes. Each step computed as an explicit id list
    // (never a NOT-IN filter against a possibly-empty set) so there's no
    // ambiguity that could delete more than intended.
    const keepSessionIds=new Set(sessionRows.map(r=>r.id));
    const{data:remoteSessions}=await sb.from('sessions').select('id').eq('user_id',wtSession.user.id);
    const staleSessionIds=(remoteSessions||[]).map(r=>r.id).filter(id=>!keepSessionIds.has(id));
    if(staleSessionIds.length)await sb.from('sessions').delete().in('id',staleSessionIds);

    const keepTreeIds=new Set(treeRows.map(r=>r.id));
    const{data:remoteTrees}=await sb.from('trees').select('id,session_id').in('session_id',[...keepSessionIds]);
    const staleTreeIds=(remoteTrees||[]).map(r=>r.id).filter(id=>!keepTreeIds.has(id));
    if(staleTreeIds.length)await sb.from('trees').delete().in('id',staleTreeIds);

    const keepNodeIds=new Set(nodeRows.map(r=>r.id));
    const{data:remoteNodes}=await sb.from('nodes').select('id,tree_id').in('tree_id',[...keepTreeIds]);
    const staleNodeIds=(remoteNodes||[]).map(r=>r.id).filter(id=>!keepNodeIds.has(id));
    if(staleNodeIds.length)await sb.from('nodes').delete().in('id',staleNodeIds);
  }catch(e){
    console.warn('WaxTree: new-schema sync failed (non-fatal — user_state remains the source of truth):',e);
  }
}
function ensureNodeLoaded(id){
  const n=getNode(id);
  if(n&&!n.loaded&&!n.loading&&!n.error)retryNode(id);
}
async function hydrateFromCloud(){
  try{
    const{data,error}=await sb.from('user_state').select('data,updated_at').eq('user_id',wtSession.user.id).maybeSingle();
    if(error){
      console.warn('WaxTree: cloud restore query failed:',error);
      window.Sentry?.captureException instanceof Function&&Sentry.captureException(new Error('hydrateFromCloud query failed: '+error.message),{tags:{area:'cloud-backup-pull'}});
      return;
    }
    if(!data){console.info('WaxTree: no cloud backup found yet for this account.');return;}
    const cloudTs=new Date(data.updated_at).getTime();
    const localTs=Number(localStorage.getItem(SK+':ts')||0);
    const c=data.data||{};
    // Timestamp alone isn't reliable — confirmed live twice now
    // (2026-08-02, 2026-08-03): a wiped local copy (localStorage quota
    // exhaustion, or a manually cleared cache) can still carry a "newer"
    // save timestamp than a real cloud backup from hours earlier, since
    // the timestamp only says WHEN something was saved, not whether what
    // was saved was actually complete. Checked across every field
    // (nodes, follows, likes, playlists, Discogs sync — see
    // looksLikeDataWipe), not just node count: the second incident showed
    // nodes surviving locally while follows/Discogs sync did not, which a
    // nodes-only check would have missed entirely. If local looks
    // suspiciously wiped next to a cloud copy that clearly has real
    // content, restore from cloud regardless of which timestamp is newer.
    //
    // TIMESTAMP_GRACE_MS: localTs is recorded client-side the instant an
    // action happens; cloudTs (updated_at) is set server-side once that
    // same save's network round trip actually lands — always somewhat
    // LATER in wall-clock time even when it's syncing the exact same
    // action, purely from latency. Without slack here, a cloud save that
    // finished syncing moments before a sign-out could look "newer" than
    // local by a couple hundred ms even though there's nothing new in it
    // — confirmed live 2026-08-04 as recent local activity (new nodes,
    // played tracks) getting quietly overwritten by a cloud copy that
    // wasn't actually more complete, just timestamped later purely from
    // network timing. Cloud has to be newer by more than ordinary sync
    // latency to count as a real reason to prefer it over local.
    const TIMESTAMP_GRACE_MS=5000;
    const looksWiped=looksLikeDataWipe(st,c);
    if(cloudTs<=localTs+TIMESTAMP_GRACE_MS&&!looksWiped)return; // local copy is at least as current (within normal sync latency) and not suspiciously wiped — nothing to recover
    if(looksWiped)console.warn('WaxTree: local state looks wiped next to a real cloud backup — restoring from cloud despite the local timestamp.');
    if(c.branches?.length)st.branches=c.branches;
    if(c.nodes)st.nodes=c.nodes.map(n=>({...n,pinned:!!n.pinned,tags:n.tags||[],loaded:false,loading:false,error:null,data:null}));
    if(c.selectedId!==undefined)st.selectedId=c.selectedId;
    if(c.activeBranchId)st.activeBranchId=c.activeBranchId;
    if(c.chips)st.chips=c.chips;
    if(c.likes)st.likes=c.likes;
    if(c.likedTracks)st.likedTracks=c.likedTracks;
    if(c.listens)st.listens=c.listens;
    if(c.dasAscoltare)st.dasAscoltare=c.dasAscoltare;
    if(c.playlists)st.playlists=c.playlists;
    if(c.history)st.history=c.history;
    if(c.follows)st.follows=c.follows;
    if(c.followScanKnownIds)st.followScanKnownIds=c.followScanKnownIds;
    if(c.supaIdMap)st.supaIdMap={...c.supaIdMap,...st.supaIdMap}; // merge, don't clobber — this device may have minted mappings the cloud copy predates
    if(c.discogsUser)st.discogsUser=c.discogsUser;
    if(c.discogsOAuthToken)st.discogsOAuthToken=c.discogsOAuthToken;
    if(c.discogsOAuthSecret)st.discogsOAuthSecret=c.discogsOAuthSecret;
    if(c.discogsCollReleaseIds)st.discogsCollReleaseIds=c.discogsCollReleaseIds;
    if(c.discogsCollMasterIds)st.discogsCollMasterIds=c.discogsCollMasterIds;
    if(c.discogsWantReleaseIds)st.discogsWantReleaseIds=c.discogsWantReleaseIds;
    if(c.discogsWantMasterIds)st.discogsWantMasterIds=c.discogsWantMasterIds;
    if(c.discogsCollSyncedAt)st.discogsCollSyncedAt=c.discogsCollSyncedAt;
    if(c.discogsHeroesSeen)st.discogsHeroesSeen=c.discogsHeroesSeen;
    if(c.alreadyListened)st.alreadyListened=c.alreadyListened;
    if(c.avatarDataUrl){try{localStorage.setItem(AVATAR_KEY,c.avatarDataUrl);}catch{}}
    saveSt();
    ensureNodeLoaded(st.selectedId);
    rr();
  }catch(e){
    console.warn('WaxTree: cloud restore failed:',e);
    window.Sentry?.captureException instanceof Function&&Sentry.captureException(e,{tags:{area:'cloud-backup-pull'}});
  }
}

// Confirmed live 2026-08-04: signing out and signing into a DIFFERENT
// account on the SAME browser showed the previous account's nodes,
// playlists, and profile photo under the new account's name/session — only
// the username itself was actually different. localStorage is scoped to
// the browser origin, not to which Supabase user is currently signed in,
// so the previous user's blob just sits there and gets loaded into st
// below regardless of who's actually logged in now. Worse, for a brand
// new account the cloud row is genuinely empty (nothing to restore yet),
// and hydrateFromCloud()'s own looksLikeDataWipe guard (added earlier this
// session to stop a real same-user data-loss bug) can't tell "my data was
// wiped" apart from "this is someone else's leftover data" — it would
// actively defend the wrong user's stale local blob against being
// replaced by the new account's correct, empty one.
// Every key here is genuinely user-identity-scoped data (collection,
// library match state, profile photo, the core app-state blob itself);
// ct2:/wt-yt-*/wt-cosine-* etc. are deliberately excluded — those are
// shared, disposable, non-identifying caches (Discogs catalog data, video-
// match lookups), safe and useful to keep across an account switch.
// 'wt-avatar' is AVATAR_KEY's value — that const is declared much further
// down the file (temporal dead zone), so it's inlined here rather than
// referenced, since this whole block has to run before st (and everything
// after it) exists.
const USER_SCOPED_KEYS=[SK,SK+':ts','wt-discogs-collection','wt-discogs-wantlist','wt-owned','wt-digital-matches','wt-digital-matches-checked','wt-avatar','wt-player-pos','discogs_token'];
(function guardAccountSwitch(){
  const sessionUid=currentSessionUserId();
  if(!sessionUid)return; // nothing to compare against yet
  let savedOwner=null;
  try{savedOwner=JSON.parse(localStorage.getItem(SK)||'null')?.ownerId||null;}catch{}
  if(savedOwner&&savedOwner!==sessionUid){
    console.warn('[WaxTree] Different account signed in on this browser — clearing previous account\'s local data to prevent a cross-account leak');
    USER_SCOPED_KEYS.forEach(k=>{try{localStorage.removeItem(k);}catch{}});
  }
})();

const saved=loadSt();
const st={
  theme:saved?.theme||'light',
  branches:(saved?.branches?.length)?saved.branches:DEMO_BRANCHES,
  nodes:(saved?.nodes?.length)?saved.nodes:DEMO_NODES,
  selectedId:saved?.selectedId||'d1',
  activeBranchId:saved?.activeBranchId||'b1',
  chips:saved?.chips?.length?saved.chips:['Larry Heard','Trax Records'],
  likes:saved?.likes||{},listens:saved?.listens||{},
  // A snapshot of each liked track (title/artist/genre/year/label/video),
  // taken at the moment it's liked — not just the id. st.likes alone can't
  // tell you what a track WAS if its node hasn't loaded yet (or never
  // reloads), which is exactly why My Likes used to show only whatever
  // happened to already be resolved in memory.
  likedTracks:saved?.likedTracks||{},
  q:'',results:[],loading:false,err:'',
  // Explore-by-genre/year — a second search mode alongside the default
  // artist/label/track text search, toggled from the same "Explore"
  // control (see Search.jsx). Transient/session-only, same treatment as
  // the plain text search's own q/results/loading/err above.
  exploreMode:'search', // 'search' | 'genreYear' — which input the search bar itself shows
  exploreStyles:[],exploreYears:[],
  bioOpen:{},renameId:null,renameVal:'',tagNodeId:null,tagVal:'',
  filterOpen:false,filterTitle:'',filterFormat:'all',filterSort:'default',filterGenres:[],
  sbPinFirst:saved?.sbPinFirst||false,sbFilterTag:'',
  nowPlaying:null,
  dasAscoltare:saved?.dasAscoltare||[],
  playlists:saved?.playlists||[],
  playlistDropId:null,playlistsModal:false,plRenameId:null,plRenameVal:'',
  exploreDropKey:null,
  // Transient, not persisted — which track's "no video yet" helper menu
  // (Mark as Played / Help us with the link) is open, same treatment as
  // playlistDropId/exploreDropKey above.
  trackHelpDropId:null,
  profileOpen:false,
  likesModal:false,historyModal:false,settingsModal:false,profileModal:false,followsModal:false,discogsSyncing:false,
  likesGenreOpen:new Set(), // which genre sections are expanded in My Likes — transient, not persisted
  follows:saved?.follows||[],
  // type+':'+discogs_id -> array of release ids already seen for that
  // followed artist/label, so scanFollowsForNewReleases() only ever
  // flags a release the FIRST time it's ever seen, on any device.
  followScanKnownIds:saved?.followScanKnownIds||{},
  newReleasesModal:false,newReleasesFound:[],
  // client-id (branch.id / node.id / a synthetic 'tree:'+rootId key) ->
  // Supabase uuid, for syncNewSchema() below. Cloud-synced (not just
  // local) so a second device maps the SAME client entity to the SAME
  // row instead of minting a fresh uuid and creating a duplicate.
  supaIdMap:saved?.supaIdMap||{},
  // Set by resolveReleaseAndOpen() when a search result was a specific
  // release (not an artist/label) — tells the tracks section which node
  // and which release to jump straight to once that node's data loads,
  // instead of opening the artist/label and leaving the user to scroll
  // and find it themselves. Consumed (set back to null) the moment the
  // matching card is found and scrolled to, so it only ever fires once.
  scrollToRelease:null,
  discogsUser:saved?.discogsUser||'',
  discogsOAuthToken:saved?.discogsOAuthToken||'',
  discogsOAuthSecret:saved?.discogsOAuthSecret||'',
  discogsCollReleaseIds:saved?.discogsCollReleaseIds||[],
  discogsCollMasterIds:saved?.discogsCollMasterIds||[],
  discogsCollection:loadDiscogsCollection(),
  librariesModal:false,librariesTab:'vinyl',librariesSearch:'',
  // Set at boot (see sb.auth.getSession() below) when the user has never
  // synced a local folder or a Discogs collection — shows a one-time
  // welcome blurb above the Sync tab. Not persisted: recomputed from
  // scratch on every login, so it keeps reappearing until an actual sync
  // happens, then stops for good once one has.
  welcomeSyncIntro:false,
  libraryMatchRunning:false,libraryMatchProgress:{done:0,total:0,found:0},
  discogsWantReleaseIds:saved?.discogsWantReleaseIds||[],
  discogsWantMasterIds:saved?.discogsWantMasterIds||[],
  discogsWantlist:loadDiscogsWantlist(),
  discogsCollSyncedAt:saved?.discogsCollSyncedAt||null,
  discogsHeroesSeen:saved?.discogsHeroesSeen||false,heroesModal:false,
  searchCount:0,ownedTracks:[],isPremium:false,premiumModal:false,
  history:saved?.history||[],
  levelToast:null,
  // Release group keys (see groupTracksByRelease) the user manually moved
  // to the "Already Listened" section — opt-in, not automatic just because
  // every track happens to be marked played (see releaseCard's own button).
  alreadyListened:saved?.alreadyListened||[],
};
document.documentElement.setAttribute('data-theme',st.theme);
// Tailwind's dark: variant and every shadcn color token key off a `.dark`
// ancestor class, not data-theme — set alongside it here (and in setTheme
// below) so the very first paint and every later in-app toggle land in
// sync, rather than relying solely on WaxTreeApp's own React effect to
// catch up a render later.
document.documentElement.classList.toggle('dark',st.theme==='dark');

// ── UI transient state (not persisted) ─────────────────────
let tracksPageMap={};  // nodeId → page index (0-based)
let bcCacheMap={};     // nodeId → {tracks,loading,err}

// ── Render ─────────────────────────────────────────────────
let pending=false,storeVersion=0,engineReady=false;
const reactListeners=new Set();
function notifyReact(){storeVersion++;reactListeners.forEach(listener=>listener());}
function rr(){saveSt();if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;notifyReact();});}
// Text inputs that get torn down and rebuilt on every paint() like
// everything else — without this, typing into one loses focus after each
// character, since the freshly-rebuilt element is a different DOM node than
// the one that was focused a moment ago. Add a class here for any future
// live-filtering input that needs to survive its own onInput-triggered rr().
const RESTORE_FOCUS_CLASSES=['s-input','lib-search-input'];
function paint(){
  notifyReact();
}

function getPlaylistTracks(){
  const node=getNode(st.selectedId);
  // A genreYear node's own data.tracks doesn't exist — data.results is
  // release SUMMARIES, not tracks, so prev/next has to look elsewhere:
  // the currently-playing track's OWN release, already sitting in
  // genreYearReleaseCache from rendering its card. Confirmed live: without
  // this, prev/next silently did nothing for anything played from a
  // genre/year results page, since the lookup below always came up empty.
  if(node?.type==='genreYear'){
    const trackId=st.nowPlaying?.trackId;
    if(!trackId)return[];
    for(const releaseId in genreYearReleaseCache){
      const tracks=genreYearReleaseCache[releaseId]?.tracks;
      if(tracks?.some(t=>t.id===trackId))return tracks;
    }
    return[];
  }
  if(!node?.data?.tracks?.length)return[];
  return applyFilters(node.data.tracks);
}
function playAdjacentTrack(dir){
  if(!st.nowPlaying)return;
  const tracks=getPlaylistTracks();
  if(!tracks.length)return;
  const idx=tracks.findIndex(t=>t.id===st.nowPlaying.trackId);
  if(idx===-1)return;
  const next=tracks[idx+dir];
  if(!next)return;
  const node=getNode(st.selectedId);
  const artist=node?.type==='label'?next.artistName||'':node?.name||'';
  doPlay(next.id,next.videoId,next.title,artist);
}

// ── Related Tracks: multi-factor taste model + live ranking ─────────────
// Design history, each step from real user feedback: mining the open tree
// only surfaced names already on screen; a whole-account style profile
// picked styles disconnected from the track playing; style+year search
// alone matched genre but ignored everything the user's behavior says.
// Current design separates two concerns:
//   1. CANDIDATE GATHERING (refreshRelatedTracks) — Discogs searches
//      seeded from the now-playing track's own styles, cached per track.
//   2. RANKING (renderRelatedTracks) — re-scored at render time against a
//      taste model rebuilt from live behavior, so every new like, queue,
//      library sync or listen immediately re-orders what's suggested.
//      That's the "learns as you feed it" property: not a trained network
//      (true collaborative ML needs the multi-user digging_events data,
//      accumulating server-side since Phase 0), but an online model whose
//      weights are recomputed from the user's own accumulated signals.
let relatedCache=null,relatedLoading=false;

// The taste model. Factors, in rough order of intent strength:
// - style COMBINATIONS from liked/owned tracks ("Techno + Dub Techno"
//   together is a much more specific fingerprint than either tag alone —
//   scored above single styles for exactly that reason)
// - single-style weights from likes > collection > wantlist > queue
// - label affinity from the same sources
// - plays-vs-likes per artist: lots of badged listens with zero likes
//   means "explored, didn't love it" — a negative signal the exploration
//   graph alone can't express (explored-out-of-curiosity looks identical
//   to explored-and-loved until likes are held against plays).
let tasteModelCache=null;
function buildTasteModel(){
  const styleW={},comboW={},labelW={},engagement={};
  const norm=x=>(x||'').trim().toLowerCase();
  const addStyles=(genreStr,w)=>{
    const gs=[...new Set((genreStr||'').split(' · ').map(norm).filter(Boolean))];
    gs.forEach(g=>{styleW[g]=(styleW[g]||0)+w;});
    for(let i=0;i<gs.length;i++)for(let j=i+1;j<gs.length;j++){
      const key=[gs[i],gs[j]].sort().join('+');
      comboW[key]=(comboW[key]||0)+w*1.5;
    }
  };
  const addLabel=(l,w)=>{const k=norm(l);if(k)labelW[k]=(labelW[k]||0)+w;};
  st.discogsCollection.forEach(e=>{addStyles((e.genres||[]).join(' · '),3);addLabel(e.labelExploreName,2.5);});
  Object.values(st.likedTracks).forEach(t=>{addStyles(t.genre,2.5);addLabel(t.label,2);});
  st.discogsWantlist.forEach(e=>{addStyles((e.genres||[]).join(' · '),1.5);addLabel(e.labelExploreName,1);});
  [...st.dasAscoltare,...st.playlists.flatMap(p=>p.tracks)].forEach(t=>{addStyles(t.genre,1.2);addLabel(t.label,0.8);});
  const played={};
  st.history.forEach(h=>{const k=norm(h.artistName);if(k)played[k]=(played[k]||0)+1;});
  const likedBy={};
  Object.values(st.likedTracks).forEach(t=>{const k=norm(t.artistName);if(k)likedBy[k]=(likedBy[k]||0)+1;});
  Object.keys(played).forEach(k=>{engagement[k]={plays:played[k],likes:likedBy[k]||0};});
  return{styleW,comboW,labelW,engagement};
}
// paint() runs on nearly every state change — rebuilding the model each
// time would be wasteful, but it MUST rebuild the moment its inputs
// change (that immediacy is the whole point). A cheap signature over the
// input collection sizes covers both.
function getTasteModel(){
  const sig=[Object.keys(st.likedTracks).length,st.discogsCollection.length,st.discogsWantlist.length,st.history.length,st.dasAscoltare.length,st.playlists.reduce((n,p)=>n+p.tracks.length,0)].join(':');
  if(tasteModelCache?.sig===sig)return tasteModelCache.model;
  tasteModelCache={sig,model:buildTasteModel()};
  return tasteModelCache.model;
}
function scoreRelatedCandidate(t,nowTrack,model){
  const norm=x=>(x||'').trim().toLowerCase();
  const gs=[...new Set((t.genre||'').split(' · ').map(norm).filter(Boolean))];
  const nowSet=new Set((nowTrack.genre||'').split(' · ').map(norm).filter(Boolean));
  let sc=0;
  // 1. Direct style overlap with what's playing — a matched COMBINATION
  //    (2+ shared tags) beats the sum of its parts.
  const shared=gs.filter(g=>nowSet.has(g)).length;
  sc+=shared*10;
  if(shared>=2)sc+=8;
  // 2. Learned taste affinity — combos weighted above single styles.
  gs.forEach(g=>{sc+=(model.styleW[g]||0)*0.6;});
  for(let i=0;i<gs.length;i++)for(let j=i+1;j<gs.length;j++){
    sc+=(model.comboW[[gs[i],gs[j]].sort().join('+')]||0)*0.9;
  }
  // 3. Label affinity.
  sc+=(model.labelW[norm(t.label)]||0)*0.7;
  // 3b. Literally the same label as what's playing right now — labels
  // curate a consistent sound, so this is a strong direct correlation
  // signal that doesn't depend on how coarse the style tagging is (a
  // release tagged with only one broad style, e.g. plain "Techno", can
  // still be reliably close in sound to another release on the same
  // imprint even when style-tag overlap alone can't tell them apart).
  if(t.label&&nowTrack.label&&norm(t.label)===norm(nowTrack.label))sc+=12;
  // 4. Year proximity — a soft preference now, capped so it can nudge
  //    but never veto (a perfect style-combo match from another era
  //    should still surface; similarity isn't bound to release year).
  if(t.year&&nowTrack.year)sc-=Math.min(Math.abs(t.year-nowTrack.year)*0.3,6);
  // 5. Plays-vs-likes: heard this artist plenty, never liked anything —
  //    stop resurfacing them. A liked artist gets a mild boost instead
  //    (candidates are meant to be NEW artists, but a stray like from a
  //    previous suggestion round shouldn't count against them).
  const eng=model.engagement[norm(t.artistName)];
  if(eng){
    // Scales with play count: 5 unliked plays is a much stronger "not my
    // taste" signal than 3.
    if(eng.plays>=3&&eng.likes===0)sc-=Math.min(eng.plays*4,20);
    else if(eng.likes>0)sc+=Math.min(eng.likes*2,6);
  }
  return sc;
}
// Genre+year alone still surfaced artists the user already owns a pile of
// (e.g. Basic Channel — a dub techno giant, so genre/year match easily,
// but useless as a "discovery" if the collection already has most of
// their catalog). Cross-reference the synced libraries — Discogs
// collection/wantlist and the local file-library scan — and exclude any
// artist/label already well represented there, not just ones already
// open as a node.
function buildKnownFromLibrary(){
  const artists=new Set(),labels=new Set();
  const addA=n=>{const k=normalizeStr(n);if(k)artists.add(k);};
  const addL=n=>{const k=normalizeStr(n);if(k)labels.add(k);};
  st.discogsCollection.forEach(e=>{addA(e.artistExploreName);addL(e.labelExploreName);});
  st.discogsWantlist.forEach(e=>{addA(e.artistExploreName);addL(e.labelExploreName);});
  st.ownedTracks.forEach(t=>{if(t.artistNorm)artists.add(t.artistNorm);});
  return{artists,labels};
}
// Bump whenever the search/ranking logic changes meaningfully — the
// related: cache has no other invalidation (it's not gated by
// TRACK_DATA_VERSION, which is about track *data shape*, not this
// algorithm). Without this, a fix like "stop sorting by have" doesn't
// actually take effect for any track played before the fix shipped: the
// old, stale pool (Madonna and friends) just keeps getting served back
// out of localStorage. Confirmed this was exactly what happened after the
// crossover-mainstream fix — replaying a track cached before it still
// showed the old picks. Bumped to 4 for the releaseId field added below —
// older cached pools don't carry it, which would silently defeat the
// per-release diversity cap in renderRelatedTracks() for anything cached
// before this change. Bumped again to 5 for the seed rework (dropped the
// year lock, added a same-label seed, fixed a seed-order bug that could
// silently crowd every result into one release year) — old pools reflect
// the buggy search, not this one. Bumped to 6 for the taste-model-driven
// third seed and the wider 24-release budget — old pools are thinner and
// missing that seed's candidates entirely.
const RELATED_CACHE_V=6;
// Gathers the candidate POOL only — no ranking here. The pool is cached
// per now-playing track (so switching tracks always re-searches), while
// ranking happens fresh at render time against the live taste model, so
// a like landed a second ago already reorders the list.
async function refreshRelatedTracks(nowTrack,seen,known){
  if(relatedLoading)return;
  relatedLoading=true;
  const trackKey=nowTrack.id;
  // Confirmed via live console output (2026-07-17): the "doesn't change
  // per track" report was a real, unstable network connection — a storm
  // of ERR_CONNECTION_CLOSED/ERR_HTTP2_PROTOCOL_ERROR hit several
  // unrelated Supabase endpoints (auth, edge functions, REST) at the same
  // time, and the same instability was very likely stalling dReq()'s own
  // internal retry backoff here too — each of up to ~30 release-detail
  // fetches can individually retry for many seconds, which adds up. The
  // per-seed/per-release try/catch blocks below already stop ONE bad
  // request from sinking the whole batch, but nothing capped the OVERALL
  // attempt, so relatedLoading could stay stuck true (blocking any retry)
  // for minutes on a bad connection, well past what looks "stuck" to a
  // user watching in real time. Race the whole thing against a hard
  // ceiling so a bad connection degrades gracefully instead of wedging
  // this open — the retry (on rr() from a subsequent render, or a real
  // track change) already handles picking back up once the network does.
  const TIMEOUT_MS=25000;
  try{
    await Promise.race([
      (async()=>{
        const styles=nowTrack.genre?nowTrack.genre.split(' · ').filter(Boolean):[];
        if(!styles.length){relatedCache={trackKey,items:[]};return;}
        // The FULL style signature, comma-joined — confirmed against live
        // Discogs search (2026-07-18) that style="Techno,Dub Techno" is a
        // genuine AND-filter server-side (every result actually carries
        // BOTH tags, still tens of thousands of matches even 3 tags deep).
        // But plenty of real releases (confirmed live, 2026-07-18: Stojche
        // "Heritage" on Dolly) carry only ONE broad style tag on Discogs —
        // for those the combo buys nothing, it's just a generic search, and
        // Discogs' own tag alone can't tell genuinely close material apart
        // from merely-same-broad-genre material. A shared LABEL is a
        // second, tag-independent correlation signal for exactly that case
        // (labels curate a consistent sound) — confirmed live against
        // Dolly's own catalog (Steffi, Doc Sleep, Juri Heidemann...), a
        // noticeably tighter match to a Detroit/dub-inflected techno track
        // than the broad style search alone returns.
        const comboStyle=styles.join(',');
        console.info('[WaxTree Debug] refreshRelatedTracks: fresh search — trackKey=',trackKey,'comboStyle=',comboStyle,'labelId=',nowTrack.labelId,'title=',nowTrack.title);
        // A year-locked seed used to run alongside the year-free one, and
        // Array.push order put it first — since it alone could return up to
        // 25 results, it could (and did — confirmed live, 2026-07-18) fill
        // the ENTIRE release budget by itself once both lists got dumped
        // into one and truncated, silently crowding out every other seed
        // and making every suggestion the same release year even though
        // year was never meant to be a hard filter. Dropped the year lock
        // entirely per explicit request (similarity isn't bound to release
        // year at all now) and — see the round-robin merge below — no
        // single seed can crowd out the others like that again regardless.
        // Third seed (alongside style-combo and same-label below): driven
        // by the user's OWN learned taste (collection,
        // likes, wantlist — see buildTasteModel()), not just this one
        // release's own tagging. Pick the strongest style-COMBO the model
        // has learned that still shares at least one tag with what's
        // playing now, so it stays contextually anchored rather than
        // wandering off into the user's taste at large. This is what
        // actually puts the local library to work for *finding* new
        // candidates — beforehand it only ever reranked whatever the
        // release-level searches happened to turn up.
        const model0=getTasteModel();
        const nowSetL=new Set(styles.map(x=>x.trim().toLowerCase()));
        let bestCombo=null,bestW=0;
        Object.entries(model0.comboW).forEach(([key,w])=>{
          const parts=key.split('+');
          if(w>bestW&&parts.some(p=>nowSetL.has(p)))
          {bestW=w;bestCombo=parts;}
        });
        // All three independent of each other — run concurrently rather
        // than one after another, same reasoning as the release-detail
        // batching below.
        const seedGroups=(await Promise.all([
          dReq('/database/search',{type:'release',per_page:'25',style:comboStyle}).then(sd=>sd.results||[]).catch(()=>[]),
          nowTrack.labelId?dReq('/labels/'+nowTrack.labelId+'/releases',{per_page:'25',sort:'year',sort_order:'desc'}).then(ld=>ld.releases||[]).catch(()=>[]):Promise.resolve([]),
          bestCombo?dReq('/database/search',{type:'release',per_page:'25',style:bestCombo.join(',')}).then(sd=>sd.results||[]).catch(()=>[]):Promise.resolve([]),
        ]));
        // Round-robin across seed groups instead of concat-then-slice, so
        // no single seed can starve the others just by returning more (or
        // returning first) — each gets a fair turn until the budget fills.
        // Raised from 18 to 24 releases: a user who's already dug deep into
        // one label/scene (confirmed live, 2026-07-18 — a real report where
        // most of a niche label's own catalog was already explored/known)
        // needs a wider raw pool for enough NEW candidates to survive the
        // already-explored/already-known filtering below.
        const RELEASE_CAP=24;
        const seenRel=new Set(),rels=[];
        for(let i=0;rels.length<RELEASE_CAP&&seedGroups.some(g=>i<g.length);i++){
          for(const g of seedGroups){
            if(rels.length>=RELEASE_CAP)break;
            const rel=g[i];
            if(rel&&!seenRel.has(rel.id)){seenRel.add(rel.id);rels.push(rel);}
          }
        }
        // Release-detail fetches used to run one at a time (a plain
        // for-await loop) — with up to 30 sequential awaits, that's the
        // main reason this took visibly long after pressing play. Batched
        // in parallel instead (same idea as FETCH_BATCH=6 elsewhere, wider
        // here) — dReq()'s own 45 req/60s throttle still applies per-
        // request regardless of how they're dispatched, so this doesn't
        // spend any more quota, just stops waiting for each one to finish
        // before starting the next. Capped at RELEASE_CAP releases (see
        // above — raised 18→24 to survive heavier filtering) rather than
        // fetching everything the seeds return, to keep wait time bounded;
        // measured live (2026-07-18) at ~2.8 playable candidates per
        // release on average, so even after already-known/already-explored
        // filtering this still comfortably clears the 14 ever shown for a
        // typical user, with the 3-seed/24-release version taking ~10-11s.
        const pool=[];
        const relBatch=rels.slice(0,RELEASE_CAP);
        for(let i=0;i<relBatch.length;i+=9){
          const batch=relBatch.slice(i,i+9);
          const results=await Promise.all(batch.map(async rel=>{
            try{return{rel,rd:await dReq('/releases/'+rel.id)};}catch{return null;}
          }));
          results.forEach(r=>{
            if(!r)return;
            const{rel,rd}=r;
            const releaseArtist=rd.artists?.[0]?{id:rd.artists[0].id,name:stripDiscogsSuffix(rd.artists[0].name)}:null;
            const entries=buildTrackEntries(rd,'disc-'+rel.id,`https://www.discogs.com/release/${rel.id}`,rel.year,null,rel.thumb);
            entries.forEach(t=>{
              if(!t.videoId)return; // must actually be playable, same rule as before
              // A normal (non-various-artist) release has no per-track artist
              // credit — trackArtistId is only set for compilations — so fall
              // back to the release's own artist and store it back on the
              // candidate itself, not just in these local variables, or every
              // single-artist release would silently lose its artist identity.
              const artistId=t.trackArtistId||releaseArtist?.id||null;
              const artistName=t.trackArtistName||releaseArtist?.name||'';
              if(artistId&&seen.has('artist:'+artistId))return;
              if(t.labelId&&seen.has('label:'+t.labelId))return;
              if(known.artists.has(normalizeStr(artistName)))return; // already own/want plenty of this artist
              if(t.label&&known.labels.has(normalizeStr(t.label)))return;
              // Only what's actually used downstream (render, scoring, doPlay,
              // Like/queue/Explore in the mini-player) — buildTrackEntries()
              // returns several fields (duration, bpm, catno, discogsUrl...)
              // nothing here reads, and this pool is persisted to localStorage
              // per track played, so keeping it lean matters.
              pool.push({id:t.id,title:t.title,artistName,year:t.year,label:t.label,labelId:t.labelId,trackArtistId:artistId,genre:t.genre,thumbUrl:t.thumbUrl,videoId:t.videoId,releaseId:rel.id});
            });
          });
        }
        pool.forEach(t=>{discoveredTracks[t.id]=t;});
        lsSet('related:v'+RELATED_CACHE_V+':'+trackKey,pool);
        relatedCache={trackKey,items:pool};
      })(),
      new Promise((_,rej)=>setTimeout(()=>rej(new Error('related-tracks search timed out after '+(TIMEOUT_MS/1000)+'s')),TIMEOUT_MS)),
    ]);
  }catch(e){
    console.warn('WaxTree: related-tracks refresh failed:',e?.message||e);
    // Mark this track as "done" for the session even on failure —
    // otherwise every render (paint() runs on nearly every state change)
    // would retry immediately, since nothing else marks it resolved.
    relatedCache={trackKey,items:[]};
  }
  finally{relatedLoading=false;rr();}
}
function hashStr(s){let h=0;for(let i=0;i<s.length;i++){h=(h*31+s.charCodeAt(i))|0;}return Math.abs(h);}
// The Discogs-metadata correlation pipeline below (refreshRelatedTracks(),
// scoreRelatedCandidate(), buildTasteModel()) was paused at the user's
// explicit request (2026-07-21) — quality still wasn't good enough after
// several rounds of real, verified fixes (see
// [[project_waxtree_related_tracks_stalemate]] in memory). Deliberately
// NOT deleted, just never called from here. "Related Tracks" then tried
// YouTube's own auto-generated Mix playlist next (fetchYoutubeMix,
// verifyYtCandidate, and the rest of that pipeline — removed 2026-08-04,
// not just paused this time). Several real rounds of fixes (genre tags too
// broad, verification too strict, then a richer multi-strategy name parser
// and discography pagination) still left verification sitting on
// "Verifying…" indefinitely for most tracks — the per-candidate Discogs
// identity check was fundamentally too expensive to ever feel responsive
// against the shared, unauthenticated proxy every user's lookups go
// through. Cosine.club (a purpose-built similarity API, not something
// reverse-engineered out of a consumer product) is now the sole source —
// same call as the earlier Discogs-correlation pause (see
// [[project_waxtree_related_tracks_stalemate]]).
// ── Related by Cosine.club ────────────────────────────────
// Cosine already knows the real Discogs release behind each pick
// (external_link) and the matching YouTube video (video_id) — no name
// guessing or discography search needed, just a straight release-id fetch
// to pull out the real artist for Explore. Far cheaper and more reliable
// than the YouTube Mix path above, which had to guess an artist name from
// a video title/channel and then search for it.
async function cosineFetch(action,params){
  const url=new URL('/api/cosine-search',location.origin);
  url.searchParams.set('action',action);
  Object.entries(params).forEach(([k,v])=>{if(v!=null)url.searchParams.set(k,v);});
  const res=await fetch(url);
  const json=await res.json().catch(()=>({}));
  if(!res.ok||json.error){
    // status rides along so callers can tell a definitive "not found" (404)
    // apart from a transient failure worth retrying — see resolveCosineTrackId.
    const err=new Error(json.error||'Cosine.club request failed ('+res.status+')');
    err.status=res.status;
    throw err;
  }
  return json;
}
// Confirmed lookup (and confirmed no-match) never expires, same treatment
// as wt-yt-matches — plain non-expiring localStorage, not the ct2: budget
// cache, and a dedicated false-sentinel map since lsGet/lsSet's own
// cache-hit check (`if(c)return c`) can't distinguish a falsy real value
// from a miss.
//
// Only a genuine, successful "Cosine has no match for this URL" response
// gets written here as `false`. A THROWN request (network blip, Cosine
// rate limit, a burst of concurrent lookups from switching tracks quickly
// — confirmed live 2026-08-01 this happens) must NOT be cached as a
// no-match — that would permanently poison a track that has real Cosine
// data, exactly the "No related tracks found" bug reported live even
// though the same track returns results on cosine.club directly. On a
// throw, resolveCosineTrackId returns undefined and writes nothing, so
// the next render's lookup gets a genuine retry instead of a cached lie.
// wt-cosine-ids-v2: bumped from wt-cosine-ids (v1) because the text-search
// fallback that v1 could contain resolved ids through (cosineIdViaSearch,
// removed below) turned out to sometimes match the wrong track entirely —
// confirmed live 2026-08-01: a track with no exact-URL match in Cosine's
// index got matched via fuzzy title/artist search to something unrelated,
// and its "related tracks" were consequently real Cosine data but for the
// wrong seed. A v1 entry could be silently wrong in a way no purge of just
// the false ones would catch, so this starts every id fresh under the
// URL-only logic below rather than trusting any old resolved id.
function loadCosineIdMap(){try{const r=localStorage.getItem('wt-cosine-ids-v2');return r?JSON.parse(r):{};}catch{return{};}}
// Capped, not left to grow forever — a heavy listening session across many
// tracks/nodes has no natural ceiling otherwise, and unlike the ct2:
// cache this plain key isn't covered by enforceCacheBudget()'s own 6MB
// eviction. Contributing to localStorage quota pressure is exactly the
// class of bug (confirmed live 2026-08-02) that can spontaneously sign a
// user out and, worse, sync a wiped local state over their real cloud
// backup — see pushStateToCloud's own new guard against that. Plain
// objects preserve string-key insertion order, so dropping the first N
// keys reliably drops the oldest entries.
const COSINE_ID_MAP_CAP=1000;
function saveCosineIdMap(m){
  const keys=Object.keys(m);
  if(keys.length>COSINE_ID_MAP_CAP){
    keys.slice(0,keys.length-COSINE_ID_MAP_CAP).forEach(k=>delete m[k]);
  }
  try{localStorage.setItem('wt-cosine-ids-v2',JSON.stringify(m));}catch(e){console.warn('WaxTree: could not persist Cosine track ids:',e);}
}
let cosineIdMap=loadCosineIdMap();
// Same remediation for the resolved-cards cache — a failed resolution pass
// used to get persisted as a permanent empty array under ct2:cosinecards:*
// (30-day TTL, so it wouldn't even self-heal soon). Sweeps every ct2: key
// under that prefix and drops any entry holding an empty array.
(function purgeStaleCosineEmptyCards(){
  const PURGE_KEY='wt-cosine-cards-purge-v1';
  if(localStorage.getItem(PURGE_KEY))return;
  const toRemove=[];
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(!k||!k.startsWith('ct2:cosinecards:'))continue;
    try{
      const{d}=JSON.parse(localStorage.getItem(k));
      if(Array.isArray(d)&&!d.length)toRemove.push(k);
    }catch{}
  }
  toRemove.forEach(k=>localStorage.removeItem(k));
  try{localStorage.setItem(PURGE_KEY,'1');}catch{}
})();
// Spacing out retries after a failure, not a permanent cache — same
// concurrent-request burst (or just the shared, always-on Discogs proxy
// being under load from every other WaxTree user at once — see dReq(),
// which never actually uses a personal per-user token) that can trip a
// transient failure would also immediately retrigger it on the very next
// render if nothing paced that out. Shared by every Related Tracks source
// (Cosine's id/card resolution, YouTube Mix's own verification below) —
// same retry-worthy-failure-vs-genuine-no-match problem in both.
const RELATED_RETRY_COOLDOWN_MS=15000;
// Bounds the worst case — a persistent (not transient) failure retrying
// every 15s for as long as a track keeps playing, across every user's
// session, turned out to be a real, meaningful contributor to Vercel's
// edge-request usage (confirmed live 2026-08-03, an unrelated-looking
// usage-alert email was the actual first sign of this). After this many
// attempts for the same key, stop scheduling further retries automatically
// — see relatedGaveUp below, checked at every call site before starting a
// new attempt.
const RELATED_MAX_RETRIES=5;
let relatedRetryFailedAt={};
let relatedRetryCounts={};
function relatedOnCooldown(key){const t=relatedRetryFailedAt[key];return!!t&&Date.now()-t<RELATED_RETRY_COOLDOWN_MS;}
function relatedGaveUp(key){return(relatedRetryCounts[key]||0)>=RELATED_MAX_RETRIES;}
// A genuine success (or a definitive, correctly-cached negative) should
// let a later attempt start with a clean slate rather than staying
// permanently given-up from an earlier unrelated failure streak.
function relatedResetRetries(key){delete relatedRetryCounts[key];delete relatedRetryFailedAt[key];}
// Marking a failure also has to actually WAKE the panel up to retry —
// during idle playback nothing else calls rr() (the seek bar updates via
// its own lightweight DOM write, not a full re-render — see
// updateCustomSeekUI), so without this a cooldown's expiry would never
// itself trigger another attempt and the panel would sit on "Looking up
// track…"/"Finding related tracks…"/"Verifying…" forever. Confirmed live
// 2026-08-01. renderRelatedTracks() directly, NOT rr() — this only ever
// needs to update #related-tracks (in the persistent #right-panel, outside
// #root), and rr()/paint() tearing down and rebuilding the ENTIRE app
// (including the center tracks column) every 15s just for that was making
// the center column's own scroll position visibly jump/reset while
// browsing — confirmed live 2026-08-01.
function relatedMarkFailed(key){
  relatedRetryFailedAt[key]=Date.now();
  relatedRetryCounts[key]=(relatedRetryCounts[key]||0)+1;
  if(relatedRetryCounts[key]<RELATED_MAX_RETRIES)setTimeout(renderRelatedTracks,RELATED_RETRY_COOLDOWN_MS+200);
}
async function resolveCosineTrackId(np){
  // Fast path: this track is itself a previously-fetched Cosine pick (see
  // buildRelatedCard's extra above) — its Cosine id is already known, no
  // network round trip needed to find it again.
  const known=discoveredTracks[np.trackId]?.cosineId;
  if(known){cosineIdMap[np.trackId]=known;saveCosineIdMap(cosineIdMap);return known;}
  const discogsUrl=findTrackAndNode(np.trackId)?.track?.discogsUrl||discoveredTracks[np.trackId]?.discogsUrl||null;
  const youtubeUrl=np.videoId?'https://www.youtube.com/watch?v='+np.videoId:null;
  // Try the YouTube link AND the Discogs release link, not just one —
  // Cosine may have indexed this recording under a different Discogs
  // pressing/reissue than the exact release WaxTree's own tree points at,
  // but the YouTube video actually playing is an exact match either way.
  // Confirmed live: a track's own YouTube link returned real Cosine
  // results when its Discogs release URL alone came back empty.
  const candidates=[youtubeUrl,discogsUrl].filter(Boolean);
  if(!candidates.length){cosineIdMap[np.trackId]=false;saveCosineIdMap(cosineIdMap);return false;}
  let anyFailed=false;
  for(const url of candidates){
    let json;
    try{json=await cosineFetch('lookup',{url});}
    catch(e){
      // A 404 here is Cosine's own, real "no match for this exact URL" —
      // NOT a failure worth retrying, just try the next candidate.
      // Anything else (network blip, 5xx, rate limit) IS worth retrying.
      if(e.status===404)continue;
      console.warn('WaxTree: Cosine track lookup failed (will retry):',e?.message||e);anyFailed=true;continue;
    }
    const id=json.data?.[0]?.id;
    if(id){cosineIdMap[np.trackId]=id;saveCosineIdMap(cosineIdMap);return id;}
  }
  if(anyFailed)return undefined; // at least one attempt errored — don't cache a negative, retry later
  // Every direct URL lookup came back a clean 404 — genuinely no match.
  // Deliberately NOT falling back to a fuzzy text search here: tried that
  // (cosineIdViaSearch) and confirmed live it can match the wrong track
  // entirely (real Cosine "related tracks" data, but for an unrelated
  // song), which is worse than no results — matches this project's own
  // standing rule that an unverifiable suggestion shouldn't be shown at
  // all rather than shown as a guess. Cosine's own exact-URL lookup is a
  // much narrower index than its search, but every result through it is
  // provably the right track.
  cosineIdMap[np.trackId]=false;saveCosineIdMap(cosineIdMap);
  return false;
}
async function fetchCosineSimilar(cosineId){
  const ck='cosinesim:'+cosineId;
  const c=lsGet(ck);if(c)return c;
  const json=await cosineFetch('similar',{id:cosineId,limit:20});
  const results=json.data?.similar_tracks||[];
  lsSet(ck,results);
  return results;
}
// Same artist already lives in the center column as its own node, so it's
// filtered out here rather than shown as a duplicate "related" pick.
// Anything missing the fields a card actually needs (a playable video, a
// real Discogs release to Explore to) is dropped before spending a Discogs
// call resolving it.
//
// COSINE_MIN_SCORE: Cosine's own similarity score (0-1) on each result was
// never actually checked before — confirmed live 2026-08-03 via their
// OpenAPI spec that this field exists and is meant to be used as a real
// confidence signal, not just metadata. A weak match (unrelated genre/vibe
// slipping through, e.g. the Brazilian-jazz-under-a-techno-track case
// reported live) is exactly the kind of thing a low score should catch
// before it ever reaches Discogs verification, let alone the user.
const COSINE_MIN_SCORE=0.75;
function filterCosineItems(items,np){
  const sourceArtistNorm=normalizeStr(np?.artistName||'');
  return items.filter(it=>{
    if(!it.video_id||!it.external_link)return false;
    if(typeof it.score==='number'&&it.score<COSINE_MIN_SCORE)return false;
    if(!sourceArtistNorm)return true;
    return normalizeStr(it.artist||'')!==sourceArtistNorm;
  });
}
const COSINE_RESOLVE_BATCH=4;
// Stop once there are enough good results, rather than resolving every
// candidate Cosine returned (up to 20) — each one costs a real Discogs
// call (see resolveCosineCard), and dReq's own per-call retry/backoff on a
// rate limit or shared-proxy contention (no personal Discogs token
// connected — see getToken()) can be 15-45s BY ITSELF. Confirmed live
// 2026-08-01: "Finding related tracks…" sitting for minutes traced back to
// exactly this — up to 20 sequential Discogs calls, some individually
// stuck retrying. Most releases resolve successfully on the first try, so
// stopping at a good-enough count typically needs far fewer than all 20.
const COSINE_TARGET_CARDS=8;
// external_link is Cosine's own claimed Discogs release for this pick —
// fetching that release directly gives its REAL artist credit, no name
// matching or discography search involved (that's what made the removed
// YouTube Mix path both expensive and error-prone). A Various Artists
// release still needs the per-track credit though, same as
// buildTrackEntries does for the tree itself.
// Lets a genuine dReq failure (network blip, the shared Discogs throttle
// queue, a burst of concurrent lookups from switching tracks quickly)
// THROW rather than swallowing it into the same "null" a genuinely
// un-attributable VA track returns — resolveCosineCards below needs to
// tell those two cases apart, since only the second one is safe to cache
// as a permanent zero.
async function resolveCosineCard(item){
  const m=(item.external_link||'').match(/\/release\/(\d+)/);
  if(!m)return null;
  const rd=await dReq('/releases/'+m[1]);
  const artists=rd.artists||[];
  const isVA=artists.some(a=>/^various$/i.test(a.name||''));
  if(!isVA&&artists[0]){
    return{...item,resolved:{type:'artist',discogsId:artists[0].id,discogsName:stripDiscogsSuffix(artists[0].name)}};
  }
  const trackNorm=normalizeStr(item.track||item.name||'');
  const tl=(rd.tracklist||[]).find(t=>t.title&&trackNorm&&normalizeStr(t.title)===trackNorm);
  const pt=tl?.artists?.[0];
  if(pt)return{...item,resolved:{type:'artist',discogsId:pt.id,discogsName:stripDiscogsSuffix(pt.name)}};
  return null; // can't confidently attribute this VA track — don't show it rather than guess
}
// Returns {cards,complete}. complete:false means at least one item hit a
// real error (not just "couldn't attribute") — the caller must NOT persist
// that result as the final answer, or a transient failure permanently
// poisons this track's related tracks as empty (confirmed live 2026-08-01:
// this was the actual bug behind "No related tracks found" showing for a
// track that cosine.club's own site returns real results for).
async function resolveCosineCards(items){
  const out=[];
  let complete=true;
  for(let i=0;i<items.length&&out.length<COSINE_TARGET_CARDS;i+=COSINE_RESOLVE_BATCH){
    const batch=items.slice(i,i+COSINE_RESOLVE_BATCH);
    const settled=await Promise.allSettled(batch.map(resolveCosineCard));
    settled.forEach(r=>{
      if(r.status==='fulfilled'){if(r.value)out.push(r.value);}
      else{complete=false;console.warn('WaxTree: Cosine card resolution failed (will retry):',r.reason?.message||r.reason);}
    });
  }
  return{cards:out,complete};
}
let cosineIdLoading=new Set();
let cosineResolveLoading=new Set();
// Kicks off Cosine.club's own two-stage pipeline (track-id lookup, then
// similar-tracks resolve) for the given now-playing track if it isn't
// already cached, in flight, or on cooldown.
function ensureCosineRelatedLoading(np){
  const cachedId=cosineIdMap[np.trackId];
  if(cachedId===undefined){
    if(relatedGaveUp('id:'+np.trackId))return;
    if(!cosineIdLoading.has(np.trackId)&&!relatedOnCooldown('id:'+np.trackId)){
      cosineIdLoading.add(np.trackId);
      resolveCosineTrackId(np)
        .then(id=>{if(id===undefined)relatedMarkFailed('id:'+np.trackId);else relatedResetRetries('id:'+np.trackId);})
        .catch(()=>{relatedMarkFailed('id:'+np.trackId);})
        .then(()=>{cosineIdLoading.delete(np.trackId);renderRelatedTracks();});
    }
    return;
  }
  if(cachedId===false)return; // confirmed: no Cosine entry for this track
  const cosineId=cachedId;
  const cardsKey='cosinecards:'+cosineId;
  if(lsGet(cardsKey))return;
  if(relatedGaveUp('cards:'+cosineId))return;
  if(!cosineResolveLoading.has(cosineId)&&!relatedOnCooldown('cards:'+cosineId)){
    cosineResolveLoading.add(cosineId);
    fetchCosineSimilar(cosineId)
      .then(items=>resolveCosineCards(filterCosineItems(items,np)))
      .then(({cards,complete})=>{
        if(complete){lsSet(cardsKey,cards);relatedResetRetries('cards:'+cosineId);}
        else relatedMarkFailed('cards:'+cosineId);
      })
      .catch(e=>{console.warn('WaxTree: Related by Cosine.club failed (will retry):',e?.message||e);relatedMarkFailed('cards:'+cosineId);})
      .then(()=>{cosineResolveLoading.delete(cosineId);renderRelatedTracks();});
  }
}
function renderRelatedTracks(){
  notifyReact();
}

function getRelatedView(){
  if(!st.nowPlaying)return{status:'Play something to see picks',cards:[]};
  ensureCosineRelatedLoading(st.nowPlaying);
  const np=st.nowPlaying;
  const cachedId=cosineIdMap[np.trackId];
  if(cachedId===undefined)return{status:relatedGaveUp('id:'+np.trackId)?'Couldn\'t load related tracks — try again later':'Looking up track…',cards:[]};
  if(cachedId===false)return{status:'No related tracks found',cards:[]};
  const cards=lsGet('cosinecards:'+cachedId);
  if(cards)return{status:cards.length?'':'No related tracks found',cards:cards.map(item=>({
    playId:'cosine:'+item.video_id,videoId:item.video_id,title:item.track||item.name,artist:item.artist,
    thumbUrl:'https://i.ytimg.com/vi/'+item.video_id+'/mqdefault.jpg',resolved:item.resolved,
    discogsUrl:item.external_link,cosineId:item.id,
  }))};
  return{status:relatedGaveUp('cards:'+cachedId)?'Couldn\'t load related tracks — try again later':'Finding related tracks…',cards:[]};
}

// ── YouTube ────────────────────────────────────────────────
let ytPlayer=null,ytTid=null,ytTitle='',ytArtist='';
// discoveredTracks holds tracks surfaced by Related Tracks (see below) —
// they don't belong to any open node, so the tree scan above can't see
// them. Without this fallback, playing a suggested track would make it
// unresolvable to itself on the very next render (breaks metadata, the
// custom transport bar, and Related Tracks' own refresh-on-track-change).
let discoveredTracks={};
function findTrack(id){for(const n of st.nodes){const t=n.data?.tracks?.find(t=>t.id===id);if(t)return t;}return discoveredTracks[id]||null;}
// Badged the instant playback starts — no accumulated-seconds or skip
// threshold anymore (there used to be one; removed per explicit request
// 2026-08-11, "appena parte la traccia appaia il badge Listened").
function tryBadge(){
  if(ytTid&&!st.listens[ytTid]?.badged){
    st.listens[ytTid]={badged:true};
    const found=findTrackAndNode(ytTid);
    const tr=found?.track||findTrack(ytTid);
    st.history.unshift({id:ytTid,title:ytTitle,artistName:ytArtist,ts:Date.now(),
      thumbUrl:tr?.thumbUrl||null,videoId:st.nowPlaying?.videoId||null,
      exploreId:tr?.exploreId||null,exploreType:tr?.exploreType||'artist',exploreName:tr?.exploreName||ytArtist});
    if(st.history.length>300)st.history.length=300; // unbounded otherwise — this is per-play, not per-search
    // node_discogs_id links this play back to the exact node it happened
    // under (see 'explore' events) so a later "plays vs likes per node"
    // ratio can be computed by ID, not by fuzzy-matching artist/label text.
    logEvent('play',{track_id:ytTid,title:ytTitle,artist:ytArtist,label:tr?.label||null,genre:tr?.genre||null,year:tr?.year||null,
      node_type:found?.node?.type||null,node_discogs_id:found?.node?.discogsId||null,node_name:found?.node?.name||null});
    rr();
  }
}
const invalidYtIds=new Set();  // truly gone: player fired error 100/2/5
const noEmbedIds=new Set();    // exists on YT but embedding disabled (101/150)

function getYtId(uri){if(!uri)return null;const m=uri.match(/[?&]v=([a-zA-Z0-9_-]{11})/);return m?m[1]:null;}

// ── YouTube auto-match (only ever runs when Discogs itself has no video) ──
// A text-only search-and-guess version of this was tried and reverted
// before for picking wrong videos. The decisive extra signal this time is
// the uploader: YouTube auto-generates an "Artist - Topic" channel from
// official Content ID/YouTube Music ingestion, and even a manual upload
// from the artist's or label's own channel is named after them — so
// requiring the channel name to contain the artist or label name (on top
// of a title match and, when known, a duration match within 8s — the same
// tolerance already used for library-Discogs matching) is a much stronger
// bar than text search alone. No match on all three = no auto-embed, same
// "No video in Discogs data" fallback as before.
async function searchYouTubeApi(q){
  const ck='yts:'+q;
  const c=lsGet(ck);if(c)return c;
  const res=await fetch('/api/yt-search?q='+encodeURIComponent(q));
  const json=await res.json().catch(()=>({}));
  if(res.status===429){pauseYtQuota(6);throw new Error(json.error||'YouTube quota exceeded');}
  if(!res.ok||json.error)throw new Error(json.error||'YouTube search failed ('+res.status+')');
  const results=json.results||[];
  lsSet(ck,results);
  return results;
}
// Costs ~3 units total (channels.list + playlistItems.list + a batched
// videos.list), regardless of how many tracks get checked against the
// result — versus 100+ units for every single search.list call. Once
// ytChannelMap below has an artist's/label's channel on file, every later
// track by them can be checked here first instead of paying for a search.
// Same lsGet/lsSet local cache pattern as searchYouTubeApi above.
async function fetchChannelUploads(channelId){
  const ck='ytch:'+channelId;
  const c=lsGet(ck);if(c)return c;
  const res=await fetch('/api/yt-search?channelId='+encodeURIComponent(channelId));
  const json=await res.json().catch(()=>({}));
  if(res.status===429){pauseYtQuota(6);throw new Error(json.error||'YouTube quota exceeded');}
  if(!res.ok||json.error)throw new Error(json.error||'YouTube channel lookup failed ('+res.status+')');
  const results=json.results||[];
  lsSet(ck,results);
  return results;
}
// Confirmed matches (and confirmed non-matches) never expire — a video, once
// found, doesn't need re-verifying, and re-searching something already
// checked is pure waste against a quota this tight. Plain non-expiring
// localStorage, same treatment as wt-digital-matches/wt-owned elsewhere.
function loadYtMatches(){try{const r=localStorage.getItem('wt-yt-matches');return r?JSON.parse(r):{};}catch{return{};}}
// Capped, not left to grow forever — this has no ceiling otherwise: one
// entry per track ID EVER encountered across every node opened, in every
// session, indefinitely (unlike the ct2: cache, which enforceCacheBudget()
// already keeps under a hard byte budget). For a heavy long-term user this
// is a real, unbounded contributor to overall localStorage pressure —
// exactly the class of thing that can leave no room for Supabase's own
// session-token write and trigger a spontaneous sign-out. Same treatment
// as wt-cosine-ids-v2 got for the same reason.
const YT_MATCHES_CAP=4000;
function saveYtMatches(m){
  const keys=Object.keys(m);
  if(keys.length>YT_MATCHES_CAP){
    keys.slice(0,keys.length-YT_MATCHES_CAP).forEach(k=>delete m[k]);
  }
  try{localStorage.setItem('wt-yt-matches',JSON.stringify(m));}catch(e){console.warn('WaxTree: could not persist YouTube matches:',e);}
}
let ytMatches=loadYtMatches();
// One-time remediation, bumped each time something that affects a "no
// match" verdict changes (budget-exhaustion bug, then matching-criteria
// changes — see the artist/label-in-title fallback added 2026-07-20,
// confirmed live against Per Hammar "Teleferico" on Sushitech Records: no
// Discogs duration + an unrelated repost channel used to always reject,
// now doesn't). false here doesn't reliably mean "we searched and found
// nothing" across a criteria change — strip every false entry once per
// version bump so affected tracks get a genuine attempt under the current
// logic; real videoId matches are untouched, a positive match is never
// invalidated by a criteria getting MORE permissive.
(function purgeStaleYtNoMatches(){
  const PURGE_KEY='wt-yt-false-purge-v2';
  if(localStorage.getItem(PURGE_KEY))return;
  let purged=0;
  Object.keys(ytMatches).forEach(k=>{if(ytMatches[k]===false){delete ytMatches[k];purged++;}});
  if(purged)saveYtMatches(ytMatches);
  try{localStorage.setItem(PURGE_KEY,'1');}catch{}
})();
// artistNorm/labelNorm -> their confirmed YouTube channel id, so the next
// track by the same artist/label can skip straight to fetchChannelUploads().
function loadYtChannelMap(){try{const r=localStorage.getItem('wt-yt-channels');return r?JSON.parse(r):{};}catch{return{};}}
function saveYtChannelMap(m){try{localStorage.setItem('wt-yt-channels',JSON.stringify(m));}catch(e){console.warn('WaxTree: could not persist YouTube channel map:',e);}}
let ytChannelMap=loadYtChannelMap();
function findTrackAndNode(trackId){
  for(const node of st.nodes){
    const idx=node.data?.tracks?.findIndex(t=>t.id===trackId)??-1;
    if(idx>=0)return{node,track:node.data.tracks[idx]};
  }
  return null;
}
const ytAutoMatchInFlight=new Set();
// Corrected against the actual Google Cloud Console quota page
// (2026-07-19 — the "cost unit" model below turned out to be wrong).
// There are TWO independent daily quotas, not one shared unit pool:
//   - "Search Queries per day": 100 — a hard cap on the NUMBER of
//     search.list CALLS specifically, regardless of anything else.
//   - "Queries per day": 10,000 — a general cap on total API calls of
//     ANY kind (search.list, channels.list, playlistItems.list,
//     videos.list all draw from this one, one call = one unit here, not
//     the old 100-units-per-search cost model YouTube's docs used to
//     describe). In real usage this is barely touched (48/10,000 on a
//     day where the search-specific quota was already 26/100) — it's a
//     backstop, not the actual constraint.
// The channel-shortcut path (fetchChannelUploads: channels.list +
// playlistItems.list + videos.list) never calls search.list at all, so
// it ONLY draws against the generous 10,000/day pool — effectively
// unconstrained in practice. Budgeting search.list separately, tightly,
// is what actually matters; the general pool just needs a sane backstop.
const YT_SEARCH_CALLS_DAILY_LIMIT=80; // real cap is 100 — leaves headroom for manual testing/other margin
const YT_GENERAL_CALLS_DAILY_LIMIT=9000; // real cap is 10,000 — rarely the binding constraint
const YT_DAILY_BUDGET_KEY='wt-yt-daily-budget';
function pacificDayKey(){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}
// kind: 'search' (1 search.list + 1 videos.list = 2 general calls, 1 of
// which counts against the tight search-specific quota) or 'channel' (3
// general calls: channels.list + playlistItems.list + videos.list, none
// of which touch the search-specific quota at all).
// Separate burst windows per kind, calibrated against the real per-minute
// quotas (also visible on the Cloud Console Quotas page): "Search Queries
// per minute" is 100 — 12 per 10s (72/min) stays safely under that with
// margin. Confirmed live (2026-07-20): the OLD flat "2 per 10s regardless
// of kind" throttle was the actual bottleneck on a freshly reset day —
// daily usage was only 7/100 search calls, nowhere near exhausted, but a
// 50-track page could still take 4+ minutes to finish resolving at 2
// attempts/10s. The channel-shortcut path's own per-minute ceiling
// (general "Queries per minute": 1,800,000) isn't a real external
// constraint at all — its burst cap just avoids a self-inflicted stampede
// against the Vercel function, not an actual YouTube limit.
const YT_SEARCH_BURST_MAX=12;
const YT_CHANNEL_BURST_MAX=20;
let ytSearchBurst={count:0,start:0};
let ytChannelBurst={count:0,start:0};
// Returns 'ok' (spent), 'burst' (blocked only by the ~10s rolling window —
// worth a scheduled retry once it resets, see resolveTrackVideoId), or
// 'daily' (the real daily cap is hit — retrying before Google's own reset,
// midnight Pacific, can't possibly succeed).
function trySpendYtCalls(kind){
  const now=Date.now();
  const burst=kind==='search'?ytSearchBurst:ytChannelBurst;
  const burstMax=kind==='search'?YT_SEARCH_BURST_MAX:YT_CHANNEL_BURST_MAX;
  if(now-burst.start>10000){burst.count=0;burst.start=now;}
  if(burst.count>=burstMax)return 'burst'; // still avoid firing an actual instant stampede
  let daily;
  try{daily=JSON.parse(localStorage.getItem(YT_DAILY_BUDGET_KEY)||'null');}catch{daily=null;}
  const today=pacificDayKey();
  // typeof guard catches older shapes from before this was split into two
  // counters — without it, a stale field reads as undefined and
  // undefined+cost>LIMIT is always false, silently disabling the check.
  if(!daily||daily.day!==today||typeof daily.searchCalls!=='number'||typeof daily.generalCalls!=='number')
    daily={day:today,searchCalls:0,generalCalls:0};
  const searchCost=kind==='search'?1:0;
  const generalCost=kind==='search'?2:3;
  if(daily.searchCalls+searchCost>YT_SEARCH_CALLS_DAILY_LIMIT)return 'daily';
  if(daily.generalCalls+generalCost>YT_GENERAL_CALLS_DAILY_LIMIT)return 'daily';
  daily.searchCalls+=searchCost;daily.generalCalls+=generalCost;
  try{localStorage.setItem(YT_DAILY_BUDGET_KEY,JSON.stringify(daily));}catch{}
  burst.count++;
  return 'ok';
}
// Circuit breaker: once the API confirms the daily quota is out, stop
// attempting anything further for a while instead of hitting 429 on every
// track — both wasteful and noisy, and won't succeed again until Google's
// quota resets (midnight Pacific Time).
const YT_QUOTA_PAUSE_KEY='wt-yt-quota-paused-until';
function isYtQuotaPaused(){
  try{return Date.now()<parseInt(localStorage.getItem(YT_QUOTA_PAUSE_KEY)||'0',10);}catch{return false;}
}
function pauseYtQuota(hours){
  try{localStorage.setItem(YT_QUOTA_PAUSE_KEY,String(Date.now()+hours*3600000));}catch{}
}
// ── Shared cross-user YouTube match cache (Supabase) ─────────
// track_id (Discogs release id + tracklist position) and normalized
// artist/label names are globally stable, not per-user — see
// supabase/yt_video_cache.sql. A video resolved by ANY WaxTree user is
// exactly as valid for the next person who reaches the same track, and
// costs them zero YouTube quota to reuse. Read-through before ever
// spending real quota; write-through the moment a local resolution
// confirms a result, so it's there for the next person too.
// Two separate sets, deliberately not one: ytSharedBatchDispatched marks a
// track the instant its batch fetch is DISPATCHED (dedupes re-triggering
// the same batch on every render tick while it's still in flight).
// ytSharedChecked only marks a track once its shared-cache verdict is
// actually SETTLED (batch response back, or the per-track fallback below
// resolved) — that's the one resolveTrackVideoId consults to decide
// whether it's safe to skip its own redundant check. Collapsing these into
// one flag set-at-dispatch-time would have a real race: the batch trigger
// and the per-track render loop both run synchronously in the same tick
// (see buildContent()), so every track in a freshly dispatched batch would
// already read as "checked" before the batch's actual network response
// exists — meaning resolveTrackVideoId would skip its own check and race
// straight into spending real YouTube quota on a track the batch was about
// to resolve for free moments later.
const ytSharedBatchDispatched=new Set();
const ytSharedChecked=new Set();
// Coalesces the re-render each individually-resolving track would
// otherwise trigger on its own — resolveTrackVideoId() below calls this
// on completion, and up to a page's worth of tracks (PAGE=50) can resolve
// within a few seconds of each other, especially anything past the very
// first page of a big discography (earlier pages are far more likely to
// already have been resolved by someone at some point; later ones are
// often brand new). Each one calling rr() directly meant the center
// column could fully tear down and rebuild many times in quick
// succession — confirmed live 2026-08-04 as the "regenerates and slides
// back up" symptom while scrolling, specifically worse on page 2+.
// Grouping completions into one re-render per ~400ms window instead fixes
// that without losing responsiveness in any way a user would notice.
let ytResolveRerenderTimer=null;
function scheduleYtResolveRerender(){
  if(ytResolveRerenderTimer)return;
  ytResolveRerenderTimer=setTimeout(()=>{ytResolveRerenderTimer=null;rr();},400);
}
async function fetchSharedYtMatches(trackIds){
  if(!trackIds.length)return;
  try{
    const{data,error}=await sb.from('yt_video_matches').select('track_id,video_id').in('track_id',trackIds);
    trackIds.forEach(id=>ytSharedChecked.add(id)); // verdict settled for the whole batch now, hit or miss
    if(error||!data)return;
    let changed=false;
    data.forEach(row=>{
      if(!(row.track_id in ytMatches)){ytMatches[row.track_id]=row.video_id||false;changed=true;}
    });
    if(changed){saveYtMatches(ytMatches);scheduleYtResolveRerender();}
  }catch(e){console.warn('WaxTree: shared YouTube cache lookup failed:',e);}
}
function pushSharedYtMatch(trackId,videoId){
  sb.from('yt_video_matches').upsert({track_id:trackId,video_id:videoId||null},{onConflict:'track_id',ignoreDuplicates:true})
    .then(({error})=>{if(error)console.warn('WaxTree: could not publish shared YouTube match:',error);});
}
// A human pasting a real link is strictly better information than an
// automated verdict, including a previous confirmed no-match — unlike
// pushSharedYtMatch's own ignoreDuplicates:true (there to let the FIRST of
// two racing auto-match attempts win, not to protect a stale no-match from
// ever being corrected), this one is a plain upsert so it actually
// overwrites whatever's there.
function pushUserSubmittedYtMatch(trackId,videoId){
  sb.from('yt_video_matches').upsert({track_id:trackId,video_id:videoId},{onConflict:'track_id'})
    .then(({error})=>{if(error)console.warn('WaxTree: could not publish user-submitted YouTube match:',error);});
}
// More permissive than getYtId() (which only handles the exact ?v= form
// Discogs' own embedded video URIs use) — a manually pasted link is just
// as likely to be a youtu.be/ share link, a /shorts/ link, or the bare id.
function parseYoutubeUrlInput(input){
  const s=(input||'').trim();
  let m=s.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if(m)return m[1];
  m=s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if(m)return m[1];
  m=s.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
  if(m)return m[1];
  if(/^[a-zA-Z0-9_-]{11}$/.test(s))return s;
  return null;
}
async function fetchSharedYtChannel(nameNorm){
  if(!nameNorm)return null;
  try{
    const{data,error}=await sb.from('yt_channel_matches').select('channel_id').eq('name_norm',nameNorm).maybeSingle();
    if(error||!data)return null;
    return data.channel_id;
  }catch{return null;}
}
function pushSharedYtChannel(nameNorm,channelId){
  if(!nameNorm)return;
  sb.from('yt_channel_matches').upsert({name_norm:nameNorm,channel_id:channelId},{onConflict:'name_norm',ignoreDuplicates:true})
    .then(({error})=>{if(error)console.warn('WaxTree: could not publish shared YouTube channel:',error);});
}
function resolveTrackVideoId(trackId,title,artistName,duration,labelName){
  if(trackId in ytMatches)return ytMatches[trackId]; // false (confirmed no match) or a videoId string — permanent
  if(ytAutoMatchInFlight.has(trackId))return undefined;
  ytAutoMatchInFlight.add(trackId);
  (async()=>{
    let result;
    let publishToShared=true; // suppressed once a shared-cache hit already covers it below
    let retryBurst=false; // set true if the ONLY thing blocking a real attempt was the ~10s rolling window, not the daily cap or a missing channel — worth a scheduled retry
    try{
      // Shared cache first — the batched page-level check (see buildContent())
      // covers most tracks before this even runs, but this single-row lookup
      // is the safety net for whatever reaches resolveTrackVideoId some other
      // way (e.g. a mini-player Explore pick). Costs zero YouTube quota and
      // isn't affected by isYtQuotaPaused() below — someone else's confirmed
      // result is exactly as usable during a local pause as any other time.
      if(!ytSharedChecked.has(trackId)){
        ytSharedChecked.add(trackId);
        try{
          const{data}=await sb.from('yt_video_matches').select('video_id').eq('track_id',trackId).maybeSingle();
          if(data){result=data.video_id||null;publishToShared=false;}
        }catch{}
      }

      if(result===undefined){
        if(isYtQuotaPaused())return; // known exhausted — don't even try real quota-costing paths

        const titleN=normalizeStr(title);
        const artistN=normalizeStr(artistName||'');
        const labelN=normalizeStr(labelName||'');
        const expectedSec=duration?parseDur(duration):0;

        // Cheap path first: if a previous track (locally, or by ANY WaxTree
        // user via the shared cache) already confirmed this artist's or
        // label's channel, check their own uploads (~3 units, no
        // search.list quota spent) before ever paying for a search.
        let knownChannelId=ytChannelMap[artistN]||ytChannelMap[labelN];
        if(!knownChannelId){
          const sc=await fetchSharedYtChannel(artistN);
          if(sc){knownChannelId=sc;ytChannelMap[artistN]=sc;}
          else if(labelN){
            const sc2=await fetchSharedYtChannel(labelN);
            if(sc2){knownChannelId=sc2;ytChannelMap[labelN]=sc2;}
          }
          if(knownChannelId)saveYtChannelMap(ytChannelMap);
        }
        let hit=null,attempted=false;
        if(knownChannelId){
          const spend=trySpendYtCalls('channel');
          if(spend==='ok'){
            attempted=true;
            try{
              const uploads=await fetchChannelUploads(knownChannelId);
              hit=uploads.find(r=>normalizeStr(r.title||'').includes(titleN)&&(!expectedSec||!r.durationSec||Math.abs(r.durationSec-expectedSec)<=8))||null;
            }catch(e){
              console.warn('WaxTree: channel-uploads lookup failed, falling back to search for',title,e);
            }
          }else if(spend==='burst')retryBurst=true;
        }

        let searchSpend='ok';
        if(!hit)searchSpend=trySpendYtCalls('search');
        if(!hit&&searchSpend==='ok'){
          attempted=true;
          // Quoted phrases, not a loose bag of words: YouTube's search API
          // (unlike the consumer website) ranks loose queries by loose semantic
          // relevance, not exact terms — an artist whose name doubles as a
          // common word (e.g. "Vedik" vs. "Vedic") gets swamped by unrelated
          // results otherwise, even though the right video is on YouTube.
          const q=`"${artistName||''}" "${title}"`;
          const results=await searchYouTubeApi(q);
          hit=results.find(r=>{
            const rTitleN=normalizeStr(r.title||'');
            if(!rTitleN.includes(titleN))return false;
            const channelN=normalizeStr(r.channelTitle||'');
            const channelMatches=(artistN&&channelN.includes(artistN))||(labelN&&channelN.includes(labelN));
            if(channelMatches){
              // Uploader confirmed as the artist/label (or their YouTube-generated
              // "Topic" channel) — a looser duration tolerance is fine here.
              if(expectedSec&&r.durationSec&&Math.abs(r.durationSec-expectedSec)>8)return false;
              return true;
            }
            // Uploader isn't recognizably the artist/label — a third-party
            // repost, common for smaller labels (verified live 2026-07-20:
            // Sushitech Records' "Generation Drive" has no durations listed
            // on Discogs at all for ANY track, and its videos are commonly
            // reposted by unrelated channels — e.g. "Per Hammar - Teleferico
            // [SUSH74]" uploaded by a channel called "Rayzeh"). A tight
            // duration match used to be the only fallback here, but that's
            // unusable when Discogs never had a duration to compare against
            // in the first place. The video's own TITLE naming the artist or
            // label too (not just the track title) is a second, independent
            // text match — promo/repost uploads very commonly title videos
            // "Artist - Track [CATNO]" even from an unrelated channel, and a
            // coincidental match on two specific strings together (not just
            // a generic track title alone) is strong enough evidence on its
            // own. Length-gated the same way matchVideo() already guards
            // short strings elsewhere, so a short/generic artist initials
            // string can't swing this on a loose substring hit.
            if((artistN.length>=4&&rTitleN.includes(artistN))||(labelN.length>=4&&rTitleN.includes(labelN)))return true;
            // Otherwise, only trust a tight duration agreement: a matching
            // title AND a near-exact duration match is too specific a
            // coincidence for unrelated content, but a loose title match
            // alone is not enough (that's exactly what got the earlier
            // attempt reverted).
            if(!expectedSec||!r.durationSec)return false;
            return Math.abs(r.durationSec-expectedSec)<=3;
          })||null;
          if(hit?.channelId){
            const channelN=normalizeStr(hit.channelTitle||'');
            // Only remember the channel for the identity it actually matched —
            // a third-party upload's channel isn't the artist's, so nothing to
            // shortcut next time.
            let learned=null;
            if(artistN&&channelN.includes(artistN)){ytChannelMap[artistN]=hit.channelId;learned=artistN;}
            else if(labelN&&channelN.includes(labelN)){ytChannelMap[labelN]=hit.channelId;learned=labelN;}
            if(learned){saveYtChannelMap(ytChannelMap);pushSharedYtChannel(learned,hit.channelId);}
          }
        }else if(!hit&&searchSpend==='burst')retryBurst=true;
        // Real bug, shipped for about a day (2026-07-19→20): this used to
        // run unconditionally, so a track where NEITHER path above could
        // even be attempted (both blocked by trySpendYtCalls — budget
        // exhausted) still fell through to hit?hit.id:null, i.e. null,
        // which then got PERMANENTLY cached as "confirmed no match" below
        // even though no search was ever actually performed. Confirmed
        // live (2026-07-20): tracks left over from a budget-exhausted
        // session stayed stuck on "no video" the next day even with the
        // daily quota fully reset, because the very first line of this
        // function (`if(trackId in ytMatches)`) short-circuited on the
        // wrongly-cached false before ever reaching a budget check again.
        // Only cache a verdict when a real attempt actually happened —
        // otherwise leave result undefined, same as the isYtQuotaPaused()
        // and network-error paths already do, so it's retried later
        // instead of poisoned forever.
        result=attempted?(hit?hit.id:null):undefined;
      }
    }catch(e){
      console.warn('WaxTree: YouTube auto-match failed for',title,e);
      result=undefined; // network/config issue — don't cache, retry on a later attempt
    }
    ytAutoMatchInFlight.delete(trackId);
    if(result===undefined){
      // Confirmed live (2026-07-20): a track blocked only by the ~10s
      // burst window (not the daily cap, not a genuine "no channel yet")
      // used to just give up silently — nothing ever re-triggered
      // resolveTrackVideoId for it again until some UNRELATED state
      // change happened to cause a re-render. On a page with more
      // unresolved tracks than one burst window allows (very normal —
      // e.g. an 11-track release with no artist channel confirmed yet,
      // sharing the same page-wide budget as everything else on screen),
      // most of them could sit stuck indefinitely even with the daily
      // quota barely touched. Schedule one retry shortly after the burst
      // window resets so a whole page's backlog keeps draining on its
      // own in waves, instead of needing incidental renders to progress.
      if(retryBurst)setTimeout(()=>resolveTrackVideoId(trackId,title,artistName,duration,labelName),10500);
      return;
    }
    ytMatches[trackId]=result===null?false:result;
    saveYtMatches(ytMatches);
    if(publishToShared)pushSharedYtMatch(trackId,result); // share with every other WaxTree user
    if(result){
      // Persist onto the actual track object (same pattern resolveCoversInBackground
      // uses) so it survives being re-rendered elsewhere — play button state,
      // release cards, etc. — not just this one mini-player session.
      const found=findTrackAndNode(trackId);
      if(found){
        found.track.videoId=result;
        lsSet((found.node.type==='label'?'l8:':'a7:')+found.node.discogsId,found.node.data);
      }
      if(st.nowPlaying?.trackId===trackId){
        // The user is actively watching THIS one resolve (it's what's
        // currently playing) — worth an immediate render rather than
        // waiting out the debounce window everything else uses below.
        st.nowPlaying.videoId=result;rr();return;
      }
    }
    scheduleYtResolveRerender();
  })();
  return undefined;
}

function loadYtApi(){
  if(document.getElementById('yt-api-s'))return;
  const s=document.createElement('script');s.id='yt-api-s';
  s.src='https://www.youtube.com/iframe_api';document.head.appendChild(s);
}
window.onYouTubeIframeAPIReady=function(){
  if(st.nowPlaying?.videoId&&document.getElementById('yt-iframe-host'))createYtPlayer();
};
function createYtPlayer(){
  if(!window.YT?.Player||ytPlayer)return;
  const host=document.getElementById('yt-iframe-host');if(!host)return;
  ytTid=st.nowPlaying.trackId;ytTitle=st.nowPlaying.title||'';ytArtist=st.nowPlaying.artistName||'';
  // Discogs-confirmed videos get our own transport bar (controls:0 hides
  // YouTube's native one, an officially supported player param — the video
  // itself stays visible, satisfying the API terms). Auto-matched videos
  // keep the native YouTube controls, same split as before the React
  // migration, just re-ported (see YtCustomControls.jsx for the UI).
  const custom=!!st.nowPlaying.fromDiscogs;
  ytPlayer=new YT.Player('yt-iframe-host',{
    host:'https://www.youtube-nocookie.com',
    height:'191',width:'340',videoId:st.nowPlaying.videoId,
    playerVars:{autoplay:1,modestbranding:1,rel:0,fs:0,...(custom?{controls:0,disablekb:1,iv_load_policy:3}:{})},
    events:{
      onReady(){},
      onStateChange(e){
        if(e.data===YT.PlayerState.PLAYING)tryBadge();
      },
      onError(e){
        const vid=st.nowPlaying?.videoId;
        if(ytPlayer){ytPlayer.destroy();ytPlayer=null;}
        if(e.data===101||e.data===150){
          // Embedding disabled — video exists on YouTube, owner blocked embeds
          if(vid)noEmbedIds.add(vid);
          showYtFallback('Embedding disabled by owner',st.nowPlaying);
        } else {
          // Genuinely unavailable (100=not found/private, 2=bad ID, 5=HTML5 error)
          if(vid&&(e.data===100||e.data===2||e.data===5)){invalidYtIds.add(vid);rr();}
          showYtFallback('Video unavailable',st.nowPlaying);
        }
      }
    }
  });
}
function showYtFallback(msg,np){
  const q=encodeURIComponent((np?.artistName||'')+' '+(np?.title||''));
  const vid=np?.videoId;
  const isNoEmbed=vid&&noEmbedIds.has(vid);
  const url=isNoEmbed?`https://www.youtube.com/watch?v=${vid}`:`https://www.youtube.com/results?search_query=${q}`;
  st.ytError={message:msg,url,linkText:isNoEmbed?'Watch on YouTube ↗':'Search on YouTube ↗'};
  rr();
}
function killYt(){if(ytPlayer){ytPlayer.destroy();ytPlayer=null;}}
// Imperative, read-on-demand player access for the custom transport bar
// (YtCustomControls.jsx) — deliberately NOT routed through st/rr(). That
// component polls this every 500ms on its own; funnelling position updates
// through the shared store would mean a full app re-render twice a second
// for the entire time something is playing, same reasoning preview.html's
// updateCustomSeekUI had for writing straight to the DOM instead of state.
function ytGetSnapshot(){
  if(!ytPlayer||typeof ytPlayer.getCurrentTime!=='function')return null;
  return{cur:ytPlayer.getCurrentTime()||0,dur:ytPlayer.getDuration()||0,playing:ytPlayer.getPlayerState?.()===window.YT?.PlayerState?.PLAYING};
}
function ytSeekFraction(fraction){
  if(!ytPlayer?.seekTo)return;
  const dur=ytPlayer.getDuration?.()||0;
  if(dur>0)ytPlayer.seekTo(fraction*dur,true);
}
function ytTogglePlayPause(){
  if(!ytPlayer?.getPlayerState)return;
  if(ytPlayer.getPlayerState()===YT.PlayerState.PLAYING)ytPlayer.pauseVideo();else ytPlayer.playVideo();
}
function doPlay(trackId,videoId,title,artistName){
  killYt();
  // Only a video Discogs itself already had gets the custom transport bar —
  // ytMatches only ever contains entries the auto-match feature resolved
  // (see resolveTrackVideoId()), so a track already in there is auto-matched
  // even if its videoId has since been persisted onto the track too.
  const fromDiscogs=!!videoId&&!(trackId in ytMatches);
  st.ytError=null;
  st.nowPlaying={trackId,videoId,title,artistName,fromDiscogs};rr();
  if(!videoId){
    const found=findTrackAndNode(trackId);
    const labelName=found?(found.node.type==='label'?found.node.name:found.track.label):null;
    const resolved=resolveTrackVideoId(trackId,title,artistName,found?.track?.duration,labelName);
    if(resolved)st.nowPlaying.videoId=resolved; // already resolved/cached from an earlier attempt — still auto-matched, not fromDiscogs
  }
}
function stopPlay(){
  killYt();
  st.ytError=null;
  st.nowPlaying=null;rr();
}
function syncYtPlayer(){
  if(!st.nowPlaying){killYt();return;}
  const np=st.nowPlaying;
  if(np.videoId&&!noEmbedIds.has(np.videoId)&&!invalidYtIds.has(np.videoId)){
    loadYtApi();setTimeout(()=>{if(window.YT?.Player)createYtPlayer();},120);
  }
}

// ── Track deduplication ────────────────────────────────────
function parseDur(d){if(!d)return 0;const p=d.split(':').map(Number);return p.length===2?p[0]*60+p[1]:p.length===3?p[0]*3600+p[1]*60+p[2]:0;}
function normalTitle(t){
  return t.toLowerCase()
    .replace(/\s*[\(\[](limited|special|collector'?s?|deluxe|colour?e?d?|promo|numbered|reissue|re-?press|remaster(?:ed)?|anniversary|hand[\s-]?stamp(?:ed)?|picture\s*disc|clear|splatter|vinyl)[\s\w,]*[\)\]]/gi,'')
    .replace(/\s*[\(\[](original(?:\s+mix)?|album(?:\s+version)?|lp(?:\s+version)?|extended(?:\s+version)?|single(?:\s+version)?|full(?:\s+version)?|radio\s*(?:edit|version)?|main(?:\s+version)?)[\)\]]/gi,'')
    .trim().replace(/\s+/g,' ');
}
function dedup(tracks){
  const seen=new Set();
  return tracks.filter(t=>{const dur=parseDur(t.duration);const b=dur>0?Math.floor(dur/30):-1;const k=`${normalTitle(t.title)}||${b}`;if(seen.has(k))return false;seen.add(k);return true;});
}

// ── Remix-artist detection ────────────────────────────────
// Parenthetical text that names a version/edit rather than a remixer —
// same non-remix vocabulary as normalTitle() above, kept in sync.
const REMIX_GENERIC_RE=/^(original(?:\s+mix)?|album(?:\s+version)?|lp(?:\s+version)?|extended(?:\s+version)?|single(?:\s+version)?|full(?:\s+version)?|radio\s*(?:edit|version)?|main(?:\s+version)?|instrumental|acapella|a\s*cappella|clean|dirty|explicit|bonus(?:\s+track)?|intro|outro|interlude|continuous\s*mix|unmixed|demo|live)$/i;
// Packaging descriptors (same vocabulary normalTitle() strips) — never a
// remixer either, e.g. "(Limited Edition)" next to a plain sibling track.
const REMIX_PACKAGING_RE=/^(limited|special|collector'?s?|deluxe|colour?e?d?|promo|numbered|reissue|re-?press|remaster(?:ed)?|anniversary|hand[\s-]?stamp(?:ed)?|picture\s*disc|clear|splatter|vinyl)\b/i;
// Generic mix/edit TYPE words — never the remixer's own name, even when
// they're the first word left after stripping a trailing keyword (e.g.
// "(Extended Mix)" -> "Extended" must NOT be read as an artist).
const REMIX_TYPE_WORD_RE=/^(original|album|lp|extended|single|full|radio|main|club|vocal|instrumental|acapella|dub|vip|clean|dirty|explicit|bonus|intro|outro|interlude|continuous|unmixed|demo|live|alternate|alternative|special|reprise|unreleased)$/i;
const REMIX_SUFFIX_RE=/^(.+?)\s+(?:remix|rmx|rework|refix|flip|bootleg|vip|edit|dub(?:\s*mix)?|mix|version)$/i;
function baseTitleKey(title){return title.replace(/\s*[\(\[][^\)\]]*[\)\]]/g,'').trim().toLowerCase().replace(/\s+/g,' ');}
// hasSibling: another track in the same release shares this track's base
// title (e.g. a plain "Alpha Decay" next to "Alpha Decay (Reshape)") — only
// then do we trust a bare, keyword-less parenthetical as a remixer's name.
// Returns the raw candidate PHRASE before the trailing type keyword (e.g.
// "Chevel Deconstructed", "Andrey Pushkarev") — whether the real alias is
// the whole phrase or just its first word is ambiguous from text alone
// ("Andrey Pushkarev Remix" is a two-word name; "Chevel Deconstructed Mix"
// is a one-word name plus a style descriptor) and gets resolved against
// real Discogs artist data by resolveRemixArtistCandidates() below.
function extractRemixCandidate(title,hasSibling){
  const groups=[...title.matchAll(/[\(\[]([^\)\]]+)[\)\]]/g)].map(m=>m[1].trim());
  for(const g of groups){
    if(!g||REMIX_GENERIC_RE.test(g)||REMIX_PACKAGING_RE.test(g))continue;
    const m=g.match(REMIX_SUFFIX_RE);
    const remainder=m?m[1].trim():(hasSibling?g:null);
    if(!remainder)continue;
    const firstWord=remainder.split(/\s+/)[0].replace(/['’]s$/i,'');
    if(firstWord&&!REMIX_TYPE_WORD_RE.test(firstWord)&&!REMIX_GENERIC_RE.test(firstWord))return remainder;
  }
  return null;
}

// ── API ────────────────────────────────────────────────────
// Every explored artist/label's full response (bio, images, up to 200
// tracks) gets cached under ct2:*. The 24h TTL only stops lsGet() from
// RETURNING a stale entry — it never actually deletes it, so for anyone
// with a large explored tree this cache grows forever and was found to be
// the dominant cause of localStorage quota exhaustion (which in turn broke
// Supabase's own session-token persistence, causing spontaneous sign-outs
// and a login that stayed broken even after clearing site data once).
// Root cause found (2026-07-17), via real console diagnostics: the
// reload-after-login report chased across three prior "fix" rounds
// (budget size, protectKey, retryNode's cache-hit flash) turned out to be
// none of those — the actual boot-time log showed "0.00 MB across 0
// entries" in ct2:, i.e. nothing left to evict or hit in the first place.
// The real cause is this TTL: it was 24h, and this conversation (and the
// user's own testing) routinely spans more than a day, so anything
// explored "yesterday" is legitimately expired by the time of a same-week
// re-test — purgeExpiredCache() was doing exactly its job. Discogs
// metadata for an established artist/label doesn't meaningfully change on
// an hourly or even daily basis, so 24h was far too aggressive for what
// this cache is actually for. Bumped to 30 days; TRACK_DATA_VERSION still
// handles the "shape changed" case independent of age.
const CT2_TTL_MS=30*24*60*60*1000;
function purgeExpiredCache(){
  const now=Date.now();
  let freed=0;
  for(let i=localStorage.length-1;i>=0;i--){
    const k=localStorage.key(i);
    if(!k||!k.startsWith('ct2:'))continue;
    try{
      const{t}=JSON.parse(localStorage.getItem(k));
      if(now-t>=CT2_TTL_MS){localStorage.removeItem(k);freed++;}
    }catch{localStorage.removeItem(k);freed++;} // corrupted entry — drop it too
  }
  return freed;
}
// purgeExpiredCache() only helps once entries actually age past 24h — a
// user who explores a lot inside a single day (or right after a
// TRACK_DATA_VERSION bump forces every open node to re-cache at once) can
// still sit on several MB of live, unexpired ct2: entries and tip
// localStorage over quota before anything is old enough to purge. That's
// the same failure mode already diagnosed above for Supabase's own
// session-token write (a confirmed real report: spontaneous logout, then
// stuck in a login loop until the user manually clears site data). Enforce
// a hard byte budget too, evicting oldest-first, regardless of age.
// First shipped at 3MB — confirmed via screen recording (2026-07-17) that
// was too conservative for an active user's real tree (one single artist
// with 111 Discogs releases already approaches that on its own): it was
// evicting entries that didn't need to go, just to be safe, which produced
// the exact "reload right after login" symptom this exists to prevent, for
// a different reason than the original bug. Raised to a flat 6MB on the
// assumption Chrome's real per-origin quota is commonly 10MB+ — WRONG,
// confirmed live 2026-08-03: a user's real browser threw QuotaExceededError
// on a plain 10KB write with total origin usage sitting at only 5.00MB, and
// that failure silently ate their Supabase session-token write, producing
// an unrecoverable sign-in → bounced-to-login loop. A flat guess can't be
// safe for every browser/profile/disk-space combination, so this is now
// dynamic: ct2:'s budget is whatever's left of ORIGIN_SAFE_TOTAL_BYTES
// after accounting for everything else already on this origin (Discogs
// mirrors, YT match cache, avatar, Supabase's own session key). Still
// floors at a minimum so one oversized "other" key can't zero out the
// tree cache entirely.
const ORIGIN_SAFE_TOTAL_BYTES=4*1024*1024; // stay under the confirmed ~5MB real-world failure point
const CT2_BUDGET_MIN_BYTES=1*1024*1024;
const CT2_BUDGET_MAX_BYTES=6*1024*1024;
function enforceCacheBudget(protectKey){
  const entries=[];
  let total=0,otherBytes=0;
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(!k)continue;
    const v=localStorage.getItem(k)||'';
    const size=k.length+v.length;
    if(!k.startsWith('ct2:')){otherBytes+=size;continue;}
    total+=size;
    let t=0;try{t=JSON.parse(v).t||0;}catch{}
    entries.push({k,size,t});
  }
  const ct2Budget=Math.max(CT2_BUDGET_MIN_BYTES,Math.min(CT2_BUDGET_MAX_BYTES,ORIGIN_SAFE_TOTAL_BYTES-otherBytes));
  if(total<=ct2Budget)return;
  entries.sort((a,b)=>a.t-b.t); // oldest first
  for(const e of entries){
    if(total<=ct2Budget)break;
    // Evicting the node the user is about to land on defeats the point —
    // they'd hit the exact "reload right after login" churn this exists
    // to prevent, just for a different reason (budget instead of quota).
    if(protectKey&&e.k==='ct2:'+protectKey)continue;
    localStorage.removeItem(e.k);
    total-=e.size;
  }
}
function lsGet(k){try{const r=localStorage.getItem('ct2:'+k);if(!r)return null;const{d,t}=JSON.parse(r);if(Date.now()-t<CT2_TTL_MS)return d;}catch{}return null;}
function lsSet(k,d){
  try{localStorage.setItem('ct2:'+k,JSON.stringify({d,t:Date.now()}));}
  catch(e){
    if(e.name!=='QuotaExceededError')return;
    const freed=purgeExpiredCache();
    enforceCacheBudget(); // TTL purge alone can free nothing if everything's still fresh
    try{localStorage.setItem('ct2:'+k,JSON.stringify({d,t:Date.now()}));}catch{}
  }
}
function stripBio(t){return t.replace(/\[a\d*=([^\]]+)\]/g,'$1').replace(/\[l=([^\]]+)\]/g,'$1').replace(/\[url=[^\]]*\]([^[]*)\[\/url\]/g,'$1').replace(/\[[^\]]*\]/g,'').trim();}

// Cross-user companion to the local ct2: cache — same pattern and reasoning
// as getSharedNodeCache/pushSharedNodeCache below (which cache a fully-
// assembled artist/label node), just for the raw Discogs request underneath
// every dReq() call, search included. matchLibraryWithDiscogs() alone fires
// thousands of these — one search per distinct local artist tag, most of
// which turn up no Discogs match at all — and every WaxTree user with any
// overlap in their local library (a shared artist, a shared "nobody has
// this name") was redoing that exact search from scratch. See
// supabase/discogs_search_cache.sql. Non-fatal on any failure, same as the
// node cache: worst case is exactly what happened before this existed.
function discogsCacheKey(path,params){
  const sorted=Object.keys(params||{}).sort().map(k=>`${k}=${params[k]}`).join('&');
  return path+(sorted?'?'+sorted:'');
}
// A slow/hanging Supabase call here must never hold up the actual search —
// this is a nice-to-have optimization, not something worth a stuck
// "Searching…" over. Confirmed live 2026-08-13: a search that should be
// instant sat for a long time before finally resolving, right after this
// cache shipped — a missing/misconfigured discogs_search_cache table
// (see supabase/discogs_search_cache.sql — has to be created manually, may
// not have been yet) or ordinary network slowness both turn into an
// unbounded wait here otherwise, since dReq() awaits this before doing
// anything else. 2.5s is generous for a same-region Supabase read; losing
// a cache hit occasionally because it was a bit slow costs nothing (falls
// through to the normal fetch, exactly like a cache miss).
async function getSharedSearchCache(cacheKey){
  try{
    const query=sb.from('discogs_search_cache').select('data,cached_at').eq('cache_key',cacheKey).maybeSingle();
    const timeout=new Promise(resolve=>setTimeout(()=>resolve(null),2500));
    const result=await Promise.race([query,timeout]);
    if(!result)return null;
    const{data,error}=result;
    if(error||!data)return null;
    if(Date.now()-new Date(data.cached_at).getTime()>=CT2_TTL_MS)return null;
    return data.data;
  }catch{return null;}
}
function pushSharedSearchCache(cacheKey,data){
  sb.from('discogs_search_cache').upsert({cache_key:cacheKey,data,cached_at:new Date().toISOString()})
    .then(({error})=>{if(error)console.warn('WaxTree: shared search cache push failed (non-fatal):',error);});
}

let rqN=0,rqW=Date.now();
// Separate, more conservative pacing for the no-token path below: it goes
// through the app's own shared Discogs consumer key (api/discogs-oauth.js's
// 'search' action) — the SAME quota every user without a personal token
// draws from at once, not this browser's own, and was entirely unthrottled
// client-side before this. A big batch (library match fires
// DIGITAL_MATCH_BATCH concurrent searches) could — and did — hammer it hard
// enough to trip repeated 429s: confirmed live 2026-08-12, 7 back-to-back
// 429s mid library-match run, same contention class that caused a real
// outage on 2026-07-16 (see memory). Lower ceiling than the personal-token
// path below: it's shared across every such user at once, and Discogs' own
// unauthenticated/consumer-key-only limit is tighter than a per-user token's.
let rqSharedN=0,rqSharedW=Date.now();
// This used to be one pre-emptive local budget shared by EVERY no-token
// call, sized to stay under Discogs' own real limit (see the 2026-08-12
// library-match 429 storm this was built for). Splitting it in two
// (2026-08-18, 10/10 then rebalanced 6/14) still didn't hold up: a real
// human testing session — a dozen-plus searches typed one after another —
// kept tripping straight back into "Search timed out", even though a
// direct same-moment check against Discogs itself came back in well under
// a second with plenty of headroom. That's the tell: a real human typing
// searches at human speed, one at a time, was never the actual burst risk
// this throttle exists for. The actual risk is CODE that fires many
// requests back-to-back with no human pacing them at all — a batch
// library match, or resolveRemixArtistCandidates() walking several
// candidate substrings per remix-titled track, both of which also hit
// this same '/database/search' path.
//
// So: the search bar itself (doSearch/liveSearchTick — opts.background
// unset) now gets NO pre-emptive local wait at all. If it's ever wrong
// about there being headroom, the existing retry-on-429 below (and
// searchDiscogs()'s own 7s hard ceiling) still catches it — that's a real
// signal from Discogs, not a local guess. Only genuinely automatic,
// unpaced traffic — node exploration AND remix resolution, marked via
// opts.background — still goes through the pre-emptive counter, since
// that's the traffic that can actually fire faster than any human could.
//
// opts.foreground is the same escape hatch for a non-search path that's
// STILL a bounded, human-triggered action rather than open-ended
// automated traffic — e.g. fetchGenreYearReleaseDetails fetching one page
// (max 15) of release detail right after the user opened or paged
// through search results. Without it every non-search path defaults to
// paced (right for fetchArtistData/fetchLabelData's own much larger,
// automated per-release fetches), which meant just opening the results
// page could queue for up to 62s behind unrelated exploration traffic —
// confirmed live as "a long time before any card shows up" despite each
// individual Discogs call taking well under a second on its own.
async function dReqRaw(path,p={},_retry=0,opts={}){
  const tok=getToken();
  if(!tok){
    const isPaced=opts.foreground?false:(path!=='/database/search'||opts.background);
    if(isPaced){
      const now=Date.now();
      if(now-rqSharedW>60000){rqSharedN=0;rqSharedW=now;}
      if(rqSharedN>=15){await new Promise(r=>setTimeout(r,62000-(Date.now()-rqSharedW)));rqSharedN=0;rqSharedW=Date.now();}rqSharedN++;
    }
    try{return await edgeFn({action:'search',path,params:JSON.stringify(p)});}
    catch(e){
      // Was 15s*(1+retry) up to 3 retries — up to 90s of backoff alone, on
      // top of the throttle wait above, stacking into multi-minute hangs on
      // a live search (confirmed 2026-08-13). A human waiting on the search
      // bar can't be kept patient the way a background bulk job can — see
      // searchDiscogs()'s own hard ceiling for the other half of this fix.
      if(_retry<2&&(e.message==='rate_limited'||e.message.includes('rate_limit'))){
        await new Promise(r=>setTimeout(r,2000*(1+_retry)));
        return dReqRaw(path,p,_retry+1,opts);
      }
      throw e;
    }
  }
  const now=Date.now();if(now-rqW>60000){rqN=0;rqW=now;}
  if(rqN>=45){await new Promise(r=>setTimeout(r,62000-(Date.now()-rqW)));rqN=0;rqW=Date.now();}rqN++;
  const url=new URL('https://api.discogs.com'+path);
  Object.entries(p).forEach(([k,v])=>url.searchParams.set(k,String(v)));
  let res;
  try{res=await fetch(url,{headers:{Authorization:`Discogs token=${tok}`}});}
  catch(e){
    if(_retry<2){await new Promise(r=>setTimeout(r,2000*(1+_retry)));return dReqRaw(path,p,_retry+1,opts);}
    throw e;
  }
  if(res.status===429){
    if(_retry<2){await new Promise(r=>setTimeout(r,3000*(1+_retry)));return dReqRaw(path,p,_retry+1,opts);}
    throw new Error('Rate limit — try again in a moment');
  }
  if(!res.ok)throw new Error(`Discogs ${res.status}`);return res.json();
}
async function dReq(path,p={},opts={}){
  const cacheKey=discogsCacheKey(path,p);
  const cached=await getSharedSearchCache(cacheKey);
  if(cached)return cached;
  const data=await dReqRaw(path,p,0,opts);
  pushSharedSearchCache(cacheKey,data);
  return data;
}
// Releases included alongside artist/label, matching how a plain search on
// discogs.com itself behaves (confirmed live 2026-08-01: searching "Strings
// of Life Derrick May" surfaces the actual release, and Discogs' own
// relevance ranking still puts an exact artist-name match first even amid
// a flood of releases for a query like "Derrick May" alone) — the point
// being to let someone find the right artist/label by a track they
// remember, not just by a name they already know. Release title is kept
// as Discogs' own combined "Artist - Title" string (not split — see
// pickResult()/resolveReleaseAndOpen(), which resolves the real artist via
// the release's own structured data instead of parsing this string, since
// it breaks down for various-artist/multi-credit releases like
// "A / B - Track1 / Track2 / Track3", confirmed live).
async function searchDiscogs(q,{background=false}={}){
  const c=lsGet('s:'+q);if(c)return c;
  // Hard ceiling — this is what backs the search bar (doSearch/
  // liveSearchTick), a live call a human is actively staring at "Searching…"
  // for, not a background bulk job that can afford to patiently retry.
  // dReq()'s own throttle/backoff (see dReqRaw) is deliberately more patient
  // than this for everything else, and could previously chain into several
  // minutes of real wait on a single search (confirmed live 2026-08-13).
  // This must never happen — Promise.race abandons the slow chain (it can
  // still finish and populate the shared cache for the next person; it just
  // stops making this particular search wait on it) and always gives the
  // search bar a definitive answer within a few seconds.
  // background:true (resolveRemixArtistCandidates only) routes through
  // dReqRaw's paced/throttled counter instead of the search bar's own
  // unthrottled path — see dReqRaw's own comment for why those two need
  // different treatment despite hitting the same Discogs endpoint.
  const data=await Promise.race([
    dReq('/database/search',{q,per_page:'25'},{background}),
    new Promise((_resolve,reject)=>setTimeout(()=>reject(new Error('Search timed out — try again')),7000)),
  ]);
  const r=data.results.filter(r=>r.type==='artist'||r.type==='label'||r.type==='release').map(r=>
    r.type==='release'
      ?{id:r.id,type:'release',title:r.title,thumb:r.thumb,year:r.year||null,label:(r.label||[])[0]||null}
      :{id:r.id,type:r.type,title:r.title,thumb:r.thumb,uri:r.uri}
  );
  lsSet('s:'+q,r);return r;
}

// ── Explore by genre/year ──────────────────────────────────
// Scoped to Electronic's own sub-genres (Discogs "style") for now — that's
// the digging focus here, not a general-purpose genre browser. Genre
// itself is fixed to 'Electronic' rather than user-selectable; styles are
// its well-known Discogs facet values.
const EXPLORE_STYLES=['Acid','Acid House','Acid Techno','Ambient','Bassline','Big Beat','Breakbeat','Breakcore','Breaks','Chiptune','Deep House','Disco','Downtempo','Drone','Drum n Bass','Dub','Dub Techno','Dubstep','EBM','Electro','Electro House','Electroclash','Euro House','Eurodance','Footwork','Future Jazz','Gabber','Garage House','Ghetto House','Goa Trance','Grime','Hard House','Hard Techno','Hard Trance','Hardcore','Hardstyle','Hi NRG','House','IDM','Industrial','Italo-Disco','Italo House','Jungle','Leftfield','Minimal','Minimal Techno','New Beat','New Wave','Noise','Nu-Disco','Power Electronics','Progressive House','Progressive Trance','Psy-Trance','Speed Garage','Synth-pop','Tech House','Tech Trance','Techno','Trance','Tribal','Trip Hop','UK Garage','Vaporwave'];
// Discogs' search API accepts a comma-joined `style` value as a real
// server-side AND, not just one style per request — confirmed live: item
// counts of 4900 for "Deep House" alone, 2486 for "Dub" alone, and only
// 163 for "Deep House,Dub" combined can only be an intersection, not a
// union (a first attempt queried once per style and intersected the
// results client-side against each response's top 50 — statistically
// unreliable, since a release tagged with BOTH styles has no guarantee of
// landing in either style's own top 50 out of thousands of matches, and
// in practice usually didn't — confirmed live as "no results" for
// combinations that genuinely exist). Styles no longer multiply the
// request count at all now — one request per YEAR selected (years stay
// OR: a release only ever has one, so AND across years would always be
// empty), still awaited sequentially (real wall-clock pacing between
// requests) and deliberately NOT routed through dReqRaw's
// background-traffic counter, for the same reason the plain text search
// bar isn't: a human-submitted search shouldn't queue behind unrelated
// exploration traffic and risk blowing the local 7s-per-request ceiling.
const GENRE_YEAR_MAX_COMBOS=9; // caps years selected, not styles×years — styles are free
function toggleExploreStyle(style){
  st.exploreStyles=st.exploreStyles.includes(style)?st.exploreStyles.filter(s=>s!==style):[...st.exploreStyles,style];
  rr();
}
function addExploreYear(year){
  const y=parseInt(year,10);
  if(!y||y<1900||y>new Date().getFullYear()+1||st.exploreYears.includes(y))return;
  if(st.exploreYears.length>=GENRE_YEAR_MAX_COMBOS)return;
  st.exploreYears=[...st.exploreYears,y];rr();
}
function removeExploreYear(year){st.exploreYears=st.exploreYears.filter(y=>y!==year);rr();}
// A genre/year search becomes a node, same as any other exploration —
// persists in the tree (pin/tag/drag/reorder/move-to-branch all already
// work generically on any node, no special-casing needed), and can be
// revisited later without re-querying. Mirrors addNode's own shape/flow
// (foreground, immediately selected, loading state while it fetches).
function addGenreYearNode(styles,years){
  const bid=st.activeBranchId;
  if(!st.isPremium&&st.nodes.filter(n=>n.branchId===bid).length>=FREE_NODE_LIMIT){st.premiumModal=true;rr();return;}
  const name=[styles.length?styles.join(', '):'Electronic',years.length?years.slice().sort((a,b)=>a-b).join('/'):null].filter(Boolean).join(', ');
  const id='n'+Date.now();
  // params kept on the node itself (not just inside .data) so a failed
  // fetch can still be retried — .data only gets populated on success.
  const node={id,branchId:bid,type:'genreYear',discogsId:null,name,parentId:null,pinned:false,tags:[],loaded:false,loading:true,error:null,data:null,params:{styles,years}};
  st.nodes=[node,...st.nodes]; // newest at the top — see addNode's own comment on the same change
  st.selectedId=id;st.activeBranchId=bid;
  if(!st.chips.includes(name))st.chips=[name,...st.chips.slice(0,11)];
  rr();
  fetchGenreYearResults(id,styles,years);
}
function retryGenreYearNode(nodeId){
  const n=getNode(nodeId);if(!n||n.type!=='genreYear')return;
  n.error=null;n.loading=true;rr();
  fetchGenreYearResults(nodeId,n.params?.styles||[],n.params?.years||[]);
}
// Up to 3 pages of 100 per year (Discogs' own per_page ceiling) — 300
// releases per selected year instead of the original 50 total. Stops
// early once Discogs' own pagination.pages says there's nothing further
// for that year, so a narrow combination doesn't waste requests paging
// past its real result count.
const GENRE_YEAR_PAGES_PER_YEAR=3;
const GENRE_YEAR_RESULTS_CAP=300;
async function fetchGenreYearResults(nodeId,styles,years){
  const yearsList=years.length?years:[null];
  const seen=new Map();
  let anySucceeded=false;
  yearLoop: for(const year of yearsList.slice(0,GENRE_YEAR_MAX_COMBOS)){
    for(let page=1;page<=GENRE_YEAR_PAGES_PER_YEAR;page++){
      const params={type:'release',per_page:'100',page:String(page),genre:'Electronic'};
      if(styles.length)params.style=styles.join(',');
      if(year)params.year=String(year);
      try{
        const data=await Promise.race([
          dReq('/database/search',params),
          new Promise((_resolve,reject)=>setTimeout(()=>reject(new Error('timeout')),7000)),
        ]);
        anySucceeded=true;
        (data.results||[]).forEach(r=>{
          if(seen.has(r.id))return;
          const releaseStyles=r.style||[];
          seen.set(r.id,{id:r.id,type:'release',title:r.title,thumb:r.thumb,year:r.year||null,label:(r.label||[])[0]||null,genre:releaseStyles[0]||(r.genre||[])[0]||null,styles:releaseStyles,country:r.country||null,format:(r.format||[]).join(', ')});
        });
        if(seen.size>=GENRE_YEAR_RESULTS_CAP)break yearLoop;
        if(page>=(data.pagination?.pages||1))break; // this year has no more pages — move to the next year
      }catch{break;/* this year failed — move to the next rather than retrying pages of a dead request */}
    }
  }
  const n=getNode(nodeId);if(!n)return;
  n.loading=false;
  if(!anySucceeded)n.error='Search failed — try again';
  else{n.data={styles,years,results:[...seen.values()].sort((a,b)=>(b.year||0)-(a.year||0))};n.loaded=true;}
  rr();
}

// ── Remix-artist resolution ────────────────────────────────
// A candidate phrase like "Andrey Pushkarev" or "Chevel Deconstructed" is
// checked against real Discogs artist search results, longest word-count
// first — e.g. for "Chevel Deconstructed" it tries "Chevel Deconstructed"
// (no such artist), then "Chevel" (real artist, confirmed) — so the merged
// Explore dropdown only ever offers an option Discogs actually recognizes.
async function resolveRemixArtistCandidates(remainder){
  const words=remainder.split(/\s+/);
  let anySucceeded=false;
  for(let n=words.length;n>=1;n--){
    const candidate=words.slice(0,n).join(' ').replace(/['’]s$/i,'').trim();
    if(!candidate||REMIX_TYPE_WORD_RE.test(candidate)||REMIX_GENERIC_RE.test(candidate))continue;
    try{
      const results=await searchDiscogs(candidate,{background:true});
      anySucceeded=true;
      const hit=results.find(r=>r.type==='artist'&&r.title.replace(/\s*\(\d+\)$/,'').toLowerCase()===candidate.toLowerCase());
      if(hit)return{name:hit.title,id:hit.id};
    }catch{/* try a shorter candidate */}
  }
  return anySucceeded?null:undefined; // null = confirmed no artist found; undefined = couldn't check (network) — retry later
}
const remixResolveInFlight=new Set();
// Synchronous cache lookup for use inside releaseCard()'s render — kicks
// off background resolution on first sight of a candidate and returns
// undefined (still resolving, show nothing yet) until resolveRemixArtistCandidates()
// settles and triggers a re-render via rr().
function getResolvedRemixArtist(remainder){
  const ck='remix:'+remainder.toLowerCase();
  const cached=lsGet(ck);
  if(cached!==null)return cached; // false (confirmed no match) or {name,id}
  if(!remixResolveInFlight.has(ck)){
    remixResolveInFlight.add(ck);
    resolveRemixArtistCandidates(remainder).then(result=>{
      remixResolveInFlight.delete(ck);
      if(result===undefined)return;
      lsSet(ck,result===null?false:result);
      rr();
    }).catch(()=>{remixResolveInFlight.delete(ck);});
  }
  return undefined;
}
// MusicBrainz: 1 req/sec limit enforced server-side
let mbLast=0;
async function mbFetch(url,_retry=0){
  const gap=Date.now()-mbLast;
  if(gap<1100)await new Promise(r=>setTimeout(r,1100-gap));
  mbLast=Date.now();
  let res;
  try{res=await fetch(url,{headers:{'User-Agent':'WaxTree/1.0 (luca.doots@gmail.com)'}});}
  catch(e){
    if(_retry<2){mbLast=0;await new Promise(r=>setTimeout(r,3000*(1+_retry)));return mbFetch(url,_retry+1);}
    throw e;
  }
  if(res.status===429||res.status===503){
    if(_retry<2){mbLast=0;await new Promise(r=>setTimeout(r,8000*(1+_retry)));return mbFetch(url,_retry+1);}
    throw new Error(`MusicBrainz ${res.status}`);
  }
  return res;
}
async function fetchMbCoverUrl(artist,title,year){
  const ck='mb:'+(artist+':'+title).toLowerCase().replace(/\s+/g,'');
  const cv=lsGet(ck);if(cv!==null)return cv||null;
  try{
    const q=encodeURIComponent(`release:"${title.replace(/"/g,'')}" AND artist:"${artist.replace(/"/g,'')}"${year?` AND date:${year}`:''}`);
    const res=await mbFetch(`https://musicbrainz.org/ws/2/release/?query=${q}&limit=5&fmt=json`);
    if(!res.ok){lsSet(ck,'');return null;}
    const{releases=[]}=await res.json();
    const hit=releases.find(r=>r['cover-art-archive']?.front&&(!year||r.date?.startsWith(String(year))))
      ||releases.find(r=>r['cover-art-archive']?.front);
    if(!hit?.id||!hit['cover-art-archive']?.front){lsSet(ck,'');return null;}
    const url=`https://coverartarchive.org/release/${hit.id}/front-250`;
    lsSet(ck,url);return url;
  }catch{lsSet(ck,'');return null;}
}

async function fetchWikipediaData(name,_retry=0){
  try{
    const res=await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`);
    if(!res.ok)return null;
    const d=await res.json();
    if(d.type==='disambiguation'||!d.extract||d.extract.length<80)return null;
    return{bio:d.extract,imageUrl:d.thumbnail?.source||null};
  }catch(e){
    if(_retry<1){await new Promise(r=>setTimeout(r,2000));return fetchWikipediaData(name,_retry+1);}
    return null;
  }
}

const GENRE_COLORS={'House':'#E8834A','Deep House':'#4AB8E8','Techno':'#9B59B6','Minimal Techno':'#A878C8','Minimal':'#8888BB','Acid':'#C8D840','Acid House':'#C8D840','Drum n Bass':'#E84A4A','DnB':'#E84A4A','Jungle':'#50C878','Ambient':'#4A88E8','Detroit Techno':'#6A4AE8','Chicago House':'#E8944A','Disco':'#E8C84A','Funk':'#E86A4A','Soul':'#C44AE8','Electronic':'#4AE8D4','Experimental':'#8878AA','Industrial':'#8A3A3A','EBM':'#5A3A8B','Electronic Body Music':'#5A3A8B','Electro':'#4A9EE8','Hip Hop':'#B8934A','Jazz':'#4A6AE8','Classical':'#2A4A8B','Pop':'#E84A9E','Dub':'#4AE8A4','Reggae':'#4AC850','New Wave':'#E84A6A','Post-Punk':'#8B4A6A','Punk':'#E83A3A','IDM':'#4AE8C4','Synth-pop':'#E84A8B','Breaks':'#E8674A','Breakbeat':'#E8674A','UK Garage':'#8A4AE8','Garage House':'#D04AE8','Progressive House':'#4AE8B4','Tech House':'#6AE84A','Trance':'#4A8AFF','Progressive Trance':'#4A6AFF','Tribal House':'#C84A4A','Tribal':'#B84A4A','Italo-Disco':'#E8D04A','Nu-Disco':'#E8A04A','Leftfield':'#4AE88A','Abstract':'#7A4AE8','Free Jazz':'#4A8AE8','Neo Soul':'#D44AE8','R&B':'#D44AE8','Gospel':'#E8B44A','Blues':'#4A4AE8','Country':'#B8884A','Folk':'#8B7A4A','Noise':'#6A4A4A','Drone':'#6A6A8B','Space':'#4A4AC8','Darkwave':'#4A2A6A','New Age':'#9AE8B4','Krautrock':'#8B6A4A','Dance':'#E84A8A','Club':'#8A4AE8','World':'#8BC44A','Latin':'#E8744A','Synth':'#4ACCE8','Experimental Techno':'#7A4AB6','Hard Techno':'#6A2AB6'};
function genreColor(g){
  if(GENRE_COLORS[g])return GENRE_COLORS[g];
  let h=5381;for(let i=0;i<g.length;i++)h=((h<<5)+h+g.charCodeAt(i))&0x7FFFFFFF;
  return['#E8834A','#4AB8E8','#9B59B6','#C8D840','#E84A4A','#4AE8A4','#E84A9E','#4A9EE8','#E8C84A','#8B4AE8','#4AE8C4','#E86A4A'][h%12];
}

// Discogs suffixes an artist name with " (N)" to disambiguate same-named
// artists (e.g. "Artist Name (2)") — strip it for display everywhere.
const stripDiscogsSuffix=n=>(n||'').replace(/\s\(\d+\)$/,'');
function buildTrackEntries(rd,fetchId,releaseUrl,relYear,relLabelHint,relThumb='',vinylTitles=null){
  const tracklist=(rd.tracklist||[]).filter(t=>t.type_!=='heading'&&t.title);
  if(!tracklist.length)return[];
  // A vinyl-with-download-code release is very common and Discogs represents
  // it as ONE "Vinyl" format entry whose descriptions mention the download,
  // not a separate "File" entry — miss that wording and a release that's
  // genuinely both ends up mislabeled "Only Vinyl".
  const isDigital=(rd.formats||[]).some(f=>/^file$/i.test(f.name)||(f.descriptions||[]).some(d=>/mp3|flac|wav|aac|digital|lossless|download/i.test(d)));
  // Discogs is treated as the authoritative, ~complete database for vinyl
  // specifically — a vinyl pressing and its digital-only counterpart are
  // often two separate release listings, so also check for a sibling entry
  // (same catalog, matching title) that IS vinyl before concluding there's
  // no vinyl pressing at all.
  const hasVinyl=(rd.formats||[]).some(f=>/vinyl/i.test(f.name))||!!vinylTitles?.has(normalizeStr(rd.title||''));
  // Discogs groups every pressing of the same release (different vinyl
  // colors, a digital reissue, etc.) under one master_id — confirmed live
  // 2026-08-04: a user owned the "Limited Edition Blue" vinyl of an EP, but
  // the artist page happened to surface a DIFFERENT release id for the
  // same EP, so inDiscogsCollection()'s plain release-id check never
  // matched even though it's genuinely the same record. Only present on a
  // real per-release fetch (rd.master_id references a DIFFERENT id); a
  // master object fetched directly via fetchId='m'+id has no such field on
  // itself, so this naturally does nothing extra in that case.
  const masterAltId=rd.master_id?'m'+rd.master_id:null;
  const labelId=rd.labels?.[0]?.id||null;
  const labelName=rd.labels?.[0]?.name||relLabelHint||'';
  // Discogs lists a release's artists in billing order — the first entry
  // is the release's real primary artist even when someone else is ALSO
  // credited purely for guesting on one track (a "featuring" credit here
  // is very often only embedded in that one track's title text, e.g.
  // "Ensoniq Ft. Steve O'Sullivan", with no structured per-track artist
  // data at all — confirmed live 2026-08-01 via the Discogs API directly).
  // This is the middle fallback for a track's real artist: weaker than a
  // genuine per-track override (trackArtistName below, when Discogs does
  // provide one) but far more specific than defaulting to whichever
  // artist's own page the track happened to be opened from.
  const releaseArtistName=rd.artists?.[0]?stripDiscogsSuffix(rd.artists[0].name):null;
  const releaseArtistId=rd.artists?.[0]?.id||null;
  const year=rd.year||relYear;
  const videos=rd.videos||[];
  const normV=s=>s.toLowerCase().replace(/\b0+([1-9])/g,'$1').replace(/[^a-z0-9]/g,'');
  const tl=tracklist;
  const allTN=tl.map(t=>normV(t.title));
  function matchVideo(idx){
    const tn=allTN[idx];if(!videos.length||tn.length<4)return null;
    for(const v of videos){
      const vn=normV(v.title||'');
      if(!(vn.includes(tn)||tn.includes(vn)))continue;
      // Only assign if no OTHER track also matches this video
      const ambiguous=allTN.some((ot,j)=>j!==idx&&ot.length>=4&&(vn.includes(ot)||ot.includes(vn)));
      if(!ambiguous)return getYtId(v.uri);
    }
    return null;
  }
  const img=rd.images?.find(i=>i.type==='primary')||rd.images?.[0];
  const thumbUrl=img?.uri150||img?.uri||relThumb||null;
  // Keep up to 4 styles, not just the first 2 — a release genuinely tagged
  // "House, Techno, Minimal Techno, Tech House" loses real identifying
  // detail (and Related Tracks' style-overlap matching loses precision)
  // if only the first two survive. Still capped, since some releases carry
  // 8-9 tags and showing all of them stops being useful.
  const styleList=(rd.styles||[]).slice(0,4);
  const genre=styleList.length?styleList.join(' · '):(rd.genres?.[0]||null);
  // BPM: try release notes, then per-track notes
  const relNotes=(rd.notes||'');
  const relBpmM=relNotes.match(/\b(\d{2,3})\s*bpm\b/i)||relNotes.match(/bpm[:\s]+(\d{2,3})/i);
  const relBpm=relBpmM?parseInt(relBpmM[1]):null;
  return tl.map((t,i)=>{
    const tn=t.notes||'';const tbm=tn.match(/\b(\d{2,3})\s*bpm\b/i)||tn.match(/bpm[:\s]+(\d{2,3})/i);
    const bpm=tbm?parseInt(tbm[1]):relBpm;
    // Various Artists releases credit each track to its own artist(s) —
    // Discogs exposes this on the tracklist entry itself, distinct from the
    // single "Various" artist at the release level.
    const perTrack=(t.artists&&t.artists.length)?t.artists:null;
    const trackArtistName=perTrack?perTrack.map(a=>stripDiscogsSuffix(a.name)).join(', '):null;
    const trackArtistId=perTrack?perTrack[0].id:null;
    // Full per-credit id+name list, not just the first artist — a track
    // like "Encontro" on an otherwise-solo album can credit two people
    // (["Sciahri","Temudo"]); trackArtistId alone can only ever point an
    // Explore click at the first of them.
    const trackArtists=perTrack?perTrack.map(a=>({id:a.id,name:stripDiscogsSuffix(a.name)})):null;
    return{
    id:`${fetchId}-${t.position||i}`,title:t.title,duration:t.duration||'',
    year,label:labelName,labelId,genre,thumbUrl,bpm,album:rd.title||'',
    digital:isDigital,hasVinyl,discogsUrl:releaseUrl,videoId:matchVideo(i),catno:'',
    fromLabel:false,trackArtistName,trackArtistId,trackArtists,releaseArtistName,releaseArtistId,
    altIds:masterAltId?[masterAltId]:[],
    exploreId:null,exploreName:null,exploreType:null,exploreLabel:null
  };});
}

// Release-detail fetches were happening one at a time in a for-await loop —
// with a discography of 30+ releases that's 30+ sequential HTTP round trips
// before anything appears. Fetch in small parallel batches instead. Also pull
// the MusicBrainz cover fallback (server-mandated 1 req/sec) and the
// correlated-artists lookup out of the blocking path entirely: both patch
// into the already-returned `nd` object in the background and trigger a
// re-render (rr()) once ready, instead of making the whole discography wait
// on them.
const FETCH_BATCH=6;
async function fetchReleaseBatches(relList,capTracks,isCancelled,fetchOne){
  const rawTracks=[];
  const needsCover=[];
  for(let i=0;i<relList.length&&rawTracks.length<capTracks;i+=FETCH_BATCH){
    if(isCancelled())break;
    const batch=relList.slice(i,i+FETCH_BATCH);
    const results=await Promise.all(batch.map(async rel=>{
      try{return await fetchOne(rel);}catch{return null;}
    }));
    if(isCancelled())break;
    for(const r of results){
      if(!r)continue;
      rawTracks.push(...r.entries);
      if(r.needsCover)needsCover.push(r.needsCover);
    }
  }
  return{rawTracks,needsCover};
}
function resolveCoversInBackground(needsCover,cacheKey,isCancelled,nd){
  if(!needsCover.length)return;
  (async()=>{
    let patched=false;
    for(const item of needsCover){
      if(isCancelled())break;
      try{
        const mbUrl=await fetchMbCoverUrl(item.artistName,item.releaseTitle,item.year);
        if(mbUrl){item.entries.forEach(e=>e.thumbUrl=mbUrl);patched=true;rr();}
      }catch{}
    }
    if(patched){
      lsSet(cacheKey,nd); // persist the same (mutated) object so covers survive a reload
      pushSharedNodeCache(cacheKey.startsWith('l8:')?'label':'artist',cacheKey.slice(3),nd);
    }
  })();
}

// Shared with retryNode() below so it can apply a cache hit synchronously
// instead of always flashing the loading state for a frame first, even
// when the data was sitting right there in localStorage.
function getCachedNodeData(type,discogsId){
  const key=(type==='label'?'l8:':'a7:')+discogsId;
  const c=lsGet(key);
  if(!c)return null;
  if(c._v!==TRACK_DATA_VERSION)return null;
  if(type==='artist'&&!c.tracks?.length)return null;
  return c;
}

// Cross-user companion to the local ct2: cache above — the first person to
// open a given artist/label pays for the Discogs round-trips, everyone
// after that (any device, any account, no time limit but the same 30-day
// staleness window as the local cache) gets it back instantly. See
// supabase/discogs_node_cache.sql. Failures here are always non-fatal —
// worst case is exactly what happened before this existed: a normal
// Discogs fetch.
async function getSharedNodeCache(type,discogsId){
  try{
    // Same unbounded-wait guard as getSharedSearchCache above, and for the
    // same reason: a stuck Supabase read here must never turn into a stuck
    // "Loading…" on an artist/label node.
    const query=sb.from('discogs_node_cache').select('data,cached_at').eq('id',type+':'+discogsId).maybeSingle();
    const timeout=new Promise(resolve=>setTimeout(()=>resolve(null),2500));
    const result=await Promise.race([query,timeout]);
    if(!result)return null;
    const{data,error}=result;
    if(error||!data)return null;
    if(Date.now()-new Date(data.cached_at).getTime()>=CT2_TTL_MS)return null;
    if(data.data?._v!==TRACK_DATA_VERSION)return null;
    if(type==='artist'&&!data.data?.tracks?.length)return null;
    return data.data;
  }catch{return null;}
}
// Fire-and-forget on purpose — never worth blocking the UI on a cache
// write succeeding. Same row gets upserted again as background enrichment
// (correlated artists, missing cover art) settles, so it converges on the
// complete version within a couple seconds even though the very first
// write can be missing those.
function pushSharedNodeCache(type,discogsId,data){
  sb.from('discogs_node_cache').upsert({id:type+':'+discogsId,type,discogs_id:String(discogsId),data,cached_at:new Date().toISOString()})
    .then(({error})=>{if(error)console.warn('WaxTree: shared node cache push failed (non-fatal):',error);});
}
async function fetchArtistData(discogsId,isCancelled=()=>false,skipEnrichment=false){
  const c=getCachedNodeData('artist',discogsId);if(c)return c;
  const shared=await getSharedNodeCache('artist',discogsId);
  if(shared&&!isCancelled()){lsSet('a7:'+discogsId,shared);return shared;}
  // Newest-first: fetchReleaseBatches below stops once it hits the 200-track
  // cap, so for a discography bigger than that, whichever end we start from
  // is the only end that ever gets fetched. Oldest-first meant a prolific
  // artist's most recent releases (often the ones actually worth digging
  // for) could be excluded entirely if their back catalog alone exceeded
  // the cap.
  const[artData,relData]=await Promise.all([
    dReq('/artists/'+discogsId),
    dReq('/artists/'+discogsId+'/releases',{per_page:'100',sort:'year',sort_order:'desc'})
  ]);
  const rawBio=artData.profile?stripBio(artData.profile):null;
  const imageUrl=artData.images?.find(i=>i.type==='primary')?.uri||artData.images?.[0]?.uri||null;
  const wikiP=(!rawBio||rawBio.length<60||!imageUrl)?fetchWikipediaData(artData.name):Promise.resolve(null);

  const mainRels=relData.releases.filter(r=>r.role==='Main');
  const relList=mainRels.length>0?mainRels:relData.releases;
  // Built from the same release list already in hand — no extra requests.
  // A vinyl pressing and its digital-only counterpart are frequently two
  // separate Discogs listings; this catches the vinyl one by title even
  // when the specific entry fetched below turns out to be the digital one.
  const vinylTitles=new Set(relData.releases.filter(r=>/vinyl/i.test(r.format||'')).map(r=>normalizeStr(r.title||'')));
  const{rawTracks,needsCover}=await fetchReleaseBatches(relList,200,isCancelled,async rel=>{
    let fetchId,releaseUrl,rd;
    if(rel.type==='master'){
      releaseUrl=`https://www.discogs.com/master/${rel.id}`;
      if(rel.main_release){fetchId=rel.main_release;rd=await dReq('/releases/'+fetchId);}
      else{fetchId='m'+rel.id;rd=await dReq('/masters/'+rel.id);}
    }else{
      fetchId=rel.id;releaseUrl=`https://www.discogs.com/release/${rel.id}`;
      rd=await dReq('/releases/'+fetchId);
    }
    const entries=buildTrackEntries(rd,fetchId,releaseUrl,rel.year,rel.label,rel.thumb||'',vinylTitles);
    const needsCoverItem=(entries.length&&!entries[0].thumbUrl)
      ?{entries,artistName:artData.name,releaseTitle:rd.title||rel.title||'',year:rd.year||rel.year}
      :null;
    return{entries,needsCover:needsCoverItem};
  });
  const tracks=dedup(rawTracks);
  const years=rawTracks.map(t=>t.year).filter(Boolean);
  const labels=[...new Set(rawTracks.map(t=>t.label).filter(Boolean))].slice(0,6);
  const minY=years.length?Math.min(...years):null,maxY=years.length?Math.max(...years):null;
  const wikiData=await wikiP;
  const bio=(rawBio&&rawBio.length>=60)?rawBio:(wikiData?.bio||rawBio||null);
  const lblCounts={};rawTracks.forEach(t=>{if(t.labelId)lblCounts[t.labelId]=(lblCounts[t.labelId]||0)+1;});
  const topLabelId=Object.entries(lblCounts).sort((a,b)=>b[1]-a[1])[0]?.[0];
  const nd={
    id:artData.id,name:artData.name,bio,
    imageUrl:imageUrl||wikiData?.imageUrl||null,
    aliases:(artData.aliases||[]).map(a=>({id:a.id,name:a.name,type:'artist'})),
    highlights:{yearRange:minY?(minY===maxY?String(minY):`${minY}–${maxY}`):null,names:labels,labelStr:labels.length?`Released on: ${labels.join(', ')}`:null},
    correlatedArtists:[],
    tracks,trackCount:relData.pagination.items,
    _v:TRACK_DATA_VERSION
  };
  lsSet('a7:'+discogsId,nd);
  pushSharedNodeCache('artist',discogsId,nd);

  // Background: correlated artists (secondary sidebar data) and missing cover art —
  // neither blocks the track list from appearing. Skipped when the caller
  // only needs .tracks (the library-Discogs matcher) — that data is never
  // displayed there, and each of these fires its own rr() (full app
  // re-render) whenever it resolves, which for a matcher checking dozens of
  // artists in a row meant the whole app kept re-rendering — and visibly
  // fighting the current scroll position — long after any given match
  // "finished", no matter what the user was actually looking at.
  if(!skipEnrichment){
    if(topLabelId){
      (async()=>{
        try{
          const lRel=await dReq('/labels/'+topLabelId+'/releases',{per_page:'30',sort:'year'});
          const seen=new Set([artData.name.toLowerCase().replace(/\s+/g,'')]);
          nd.correlatedArtists=lRel.releases
            .map(r=>r.artist||'').filter(n=>n&&!/^various$/i.test(n.trim()))
            .map(n=>({name:n,k:n.toLowerCase().replace(/\s+/g,'')}))
            .filter(a=>{if(seen.has(a.k))return false;seen.add(a.k);return true;})
            .slice(0,10).map(a=>a.name);
          lsSet('a7:'+discogsId,nd);rr();
          pushSharedNodeCache('artist',discogsId,nd);
        }catch{}
      })();
    }
    resolveCoversInBackground(needsCover,'a7:'+discogsId,isCancelled,nd);
  }

  return nd;
}

async function fetchLabelData(discogsId,isCancelled=()=>false){
  const c=getCachedNodeData('label',discogsId);if(c)return c;
  const shared=await getSharedNodeCache('label',discogsId);
  if(shared&&!isCancelled()){lsSet('l8:'+discogsId,shared);return shared;}
  // Newest-first — see fetchArtistData()'s comment above the same change.
  // A label with a big back catalog was showing releases up to ~2020 and
  // no newer, digital-only ones included, purely because the 200-track cap
  // was being spent walking oldest-to-newest and never got there.
  const[labData,relData]=await Promise.all([
    dReq('/labels/'+discogsId),
    dReq('/labels/'+discogsId+'/releases',{per_page:'100',sort:'year',sort_order:'desc'})
  ]);
  const rawBio=labData.profile?stripBio(labData.profile):null;
  const labImgUrl=labData.images?.find(i=>i.type==='primary')?.uri||labData.images?.[0]?.uri||null;
  const wikiP=(!rawBio||rawBio.length<60||!labImgUrl)?fetchWikipediaData(labData.name):Promise.resolve(null);

  // Built from the same release list already in hand — no extra requests.
  // A vinyl pressing and its digital-only counterpart are frequently two
  // separate Discogs listings; this catches the vinyl one by title even
  // when the specific entry fetched below turns out to be the digital one.
  const vinylTitles=new Set(relData.releases.filter(r=>/vinyl/i.test(r.format||'')).map(r=>normalizeStr(r.title||'')));
  const{rawTracks,needsCover}=await fetchReleaseBatches(relData.releases,200,isCancelled,async rel=>{
    const rd=await dReq('/releases/'+rel.id);
    const artistId=rd.artists?.[0]?.id||null;
    const artistName=stripDiscogsSuffix(rd.artists?.[0]?.name||rel.artist||'');
    const entries=buildTrackEntries(rd,rel.id,`https://www.discogs.com/release/${rel.id}`,rel.year,artistName,rel.thumb||'',vinylTitles);
    entries.forEach(e=>{
      // Various Artists release: use the per-track credit instead of the
      // release-level "Various" placeholder, for both the displayed
      // artist name and the "Explore artist" button's target.
      const realName=e.trackArtistName||artistName;
      const realId=e.trackArtistId||artistId;
      // trueLabelId preserves buildTrackEntries()'s original (constant
      // per release) labelId before it's overwritten below for display —
      // groupTracksByRelease() needs a stable identifier for "same
      // release" that doesn't vary per track the way the artist credit
      // legitimately does on a various-artists release. Without this, a
      // various-artists release split into one card per credited artist
      // (Cirkle, Red Rooms, Border One... each its own "release") instead
      // of one release with per-track credits, exactly like it should be.
      e.trueLabelId=e.labelId;
      e.label=realName;e.labelId=null;e.fromLabel=true;
      e.exploreId=realId;e.exploreName=realId?realName:null;e.exploreType='artist';e.exploreLabel='Explore artist';
      e.catno=rd.labels?.[0]?.catno||rel.catno||'';
    });
    const needsCoverItem=(entries.length&&!entries[0].thumbUrl)
      ?{entries,artistName,releaseTitle:rd.title||rel.title||'',year:rd.year||rel.year}
      :null;
    return{entries,needsCover:needsCoverItem};
  });
  const tracks=dedup(rawTracks);
  const years=rawTracks.map(t=>t.year).filter(Boolean);
  const artists=[...new Set(rawTracks.map(t=>t.label).filter(Boolean))].slice(0,8);
  const minY=years.length?Math.min(...years):null,maxY=years.length?Math.max(...years):null;
  const wikiData=await wikiP;
  const bio=(rawBio&&rawBio.length>=60)?rawBio:(wikiData?.bio||rawBio||null);
  const nd={
    id:labData.id,name:labData.name,bio,
    imageUrl:labImgUrl||wikiData?.imageUrl||null,
    sublabels:(labData.sublabels||[]).map(s=>({id:s.id,name:s.name,type:'label'})),
    parentLabel:labData.parent_label?{id:labData.parent_label.id,name:labData.parent_label.name,type:'label'}:null,
    country:labData.country||null,
    highlights:{yearRange:minY?(minY===maxY?String(minY):`${minY}–${maxY}`):null,names:artists,artistStr:artists.length?`Artists include: ${artists.slice(0,5).join(', ')}`:null},
    tracks,trackCount:relData.pagination.items,
    _v:TRACK_DATA_VERSION
  };
  lsSet('l8:'+discogsId,nd);
  pushSharedNodeCache('label',discogsId,nd);
  resolveCoversInBackground(needsCover,'l8:'+discogsId,isCancelled,nd);
  return nd;
}

// ── Actions ────────────────────────────────────────────────
function getNode(id){return st.nodes.find(n=>n.id===id);}
function getBranch(id){return st.branches.find(b=>b.id===id);}
function ancestry(nodeId){const c=[];let id=nodeId;while(id){const n=getNode(id);if(!n)break;c.unshift(n);id=n.parentId;}return c;}

async function fetchBandcamp(nodeId,artistName){
  if(bcCacheMap[nodeId])return;
  bcCacheMap[nodeId]={tracks:[],loading:true,err:null};
  rr();
  try{
    const{data,error}=await sb.functions.invoke('bc-search',{body:{artist:artistName}});
    if(error)throw new Error(error.message);
    bcCacheMap[nodeId]={tracks:data?.tracks||[],loading:false,err:null};
  }catch(e){
    bcCacheMap[nodeId]={tracks:[],loading:false,err:e.message};
  }
  rr();
}

// Per-node load generation — each node cancels only its OWN previous
// in-flight fetch (e.g. a fast double retry), never another node's.
// A single shared counter here previously meant clicking Explore on
// node B silently cancelled node A's still-loading fetch, leaving A
// stuck at loading:true forever once its (discarded) response arrived.
const nodeLoadGen={};
function startNodeLoad(nodeId){
  const myGen=(nodeLoadGen[nodeId]=(nodeLoadGen[nodeId]||0)+1);
  return ()=>nodeLoadGen[nodeId]!==myGen;
}
function addNode(type,discogsId,name,parentId,branchId,opts={}){
  const bid=branchId||st.activeBranchId;
  const existing=st.nodes.find(n=>n.discogsId===discogsId&&n.branchId===bid);
  if(existing){
    // Re-exploring something already in the tree is still "I'm interested
    // in this right now" — promote it to the top of its sibling group too,
    // same as a brand-new node, instead of leaving it wherever it was first
    // added (which is what made re-opening an already-explored child look
    // like the top-insertion fix wasn't applying to nested nodes at all).
    st.nodes=[existing,...st.nodes.filter(n=>n.id!==existing.id)];
    selectNode(existing.id);
    return;
  }
  if(!st.isPremium&&st.nodes.filter(n=>n.branchId===bid).length>=FREE_NODE_LIMIT){st.premiumModal=true;rr();return;}
  // The exploration edge — where the digger jumped from is as much the
  // signal as where they landed. No parent = entered via search.
  const parent=parentId?getNode(parentId):null;
  logEvent('explore',{type,discogs_id:discogsId,name,
    parent_type:parent?.type||null,parent_discogs_id:parent?.discogsId||null,parent_name:parent?.name||null});
  const id='n'+Date.now();
  // background: Explore clicked while browsing another node's results —
  // land the new node in the sidebar and start its load, but don't yank
  // the digger away from what they're currently reading. justAdded drives
  // a brief sidebar highlight so it's obvious something landed.
  const background=!!opts.background;
  const node={id,branchId:bid,type,discogsId,name,parentId:parentId||null,pinned:false,tags:[],loaded:false,loading:true,error:null,data:null,justAdded:background};
  // Gamification level is driven by total nodes across every branch, not
  // search-bar use (see incrementSearch's own comment) — confirmed live
  // 2026-08-09: a user whose tree was mostly built by clicking through
  // Explore/related-artist/alias links (never re-typing a search) stayed
  // stuck near the bottom despite having far outgrown it. Checked here,
  // right where a genuinely NEW node lands (the existing-node early
  // return above never reaches this), so revisiting an already-added
  // node never double-counts.
  const prevLvl=getLevelFromCount(st.nodes.length);
  // Prepended, not appended — newest node lands at the top of its sibling
  // group (root-level or nested, same array-order-drives-render-order
  // mechanism Sidebar.jsx's children() already relies on), oldest sinks
  // toward the bottom. Was append-only before; see the .at(-1)→[0] fallback-
  // selection changes in removeNode/removeBranch for the other half of
  // this — those used to mean "the most recently added node in this
  // branch", which only still holds true if changed to match.
  st.nodes=[node,...st.nodes];
  if(background){
    setTimeout(()=>{const n=getNode(id);if(n){n.justAdded=false;rr();}},1400);
  }else{
    st.selectedId=id;st.activeBranchId=bid;
    st.filterOpen=false;st.filterTitle='';st.filterFormat='all';st.filterSort='default';st.filterGenres=[];
  }
  const newLvl=getLevelFromCount(st.nodes.length);
  if(newLvl.level>prevLvl.level)showLevelUpToast(newLvl);
  if(!st.chips.includes(name))st.chips=[name,...st.chips.slice(0,11)];
  rr();
  const cancelled=startNodeLoad(id);
  const fn=type==='label'?fetchLabelData:fetchArtistData;
  fn(discogsId,cancelled).then(d=>{
    if(cancelled())return;
    const n=getNode(id);if(n){n.data=d;n.loaded=true;n.loading=false;}rr();
    fetchBandcamp(id,d?.name||name);
  }).catch(e=>{
    if(cancelled())return;
    const n=getNode(id);if(n){n.error=e.message;n.loading=false;}rr();
  });
}
function retryNode(nodeId){
  const node=getNode(nodeId);if(!node)return;
  node.error=null;
  // A cache hit applies instantly, no loading flash at all — previously
  // this always set loading=true first and let fetchArtistData/
  // fetchLabelData's own cache check resolve on the next microtask, which
  // still painted a "Loading…" frame even when the data was sitting right
  // there in localStorage. That one-frame flash was real, and repeatedly
  // reported as "everything reloads again" after every sign-in.
  const cached=getCachedNodeData(node.type,node.discogsId);
  if(cached){
    startNodeLoad(nodeId); // still bump the generation, cancels any stale in-flight load for this node
    node.data=cached;node.loaded=true;node.loading=false;rr();
    fetchBandcamp(nodeId,cached?.name||node.name);
    return;
  }
  node.loading=true;rr();
  const cancelled=startNodeLoad(nodeId);
  const fn=node.type==='label'?fetchLabelData:fetchArtistData;
  fn(node.discogsId,cancelled).then(d=>{
    if(cancelled())return;
    const n=getNode(nodeId);if(n){n.data=d;n.loaded=true;n.loading=false;}rr();
    fetchBandcamp(nodeId,d?.name||node.name);
  }).catch(e=>{
    if(cancelled())return;
    const n=getNode(nodeId);if(n){n.error=e.message;n.loading=false;}rr();
  });
}
function removeNode(nodeId){
  st.nodes.forEach(n=>{if(n.parentId===nodeId)n.parentId=null;});
  st.nodes=st.nodes.filter(n=>n.id!==nodeId);
  // [0], not .at(-1) — nodes are prepended now (newest first), so the
  // most-recently-added node left in this branch is the first match, not
  // the last.
  if(st.selectedId===nodeId)st.selectedId=st.nodes.filter(n=>n.branchId===st.activeBranchId)[0]?.id||null;
  rr();
}
function moveNodeToBranch(nodeId,targetBranchId){
  const node=getNode(nodeId);if(!node||node.branchId===targetBranchId)return;
  function moveSubtree(id){
    const n=getNode(id);if(!n)return;
    n.branchId=targetBranchId;
    st.nodes.filter(c=>c.parentId===id).forEach(c=>moveSubtree(c.id));
  }
  moveSubtree(nodeId);
  node.parentId=null;
  st.activeBranchId=targetBranchId;st.selectedId=nodeId;rr();
}
// Is nodeId target itself, or nested anywhere under it? Walks UP from
// target via parentId — cheaper than walking down, and this is the exact
// shape repositionNode needs to reject (a drop that would make a node its
// own ancestor).
function isNodeOrDescendant(nodeId,ancestorId){
  let cursor=getNode(nodeId);
  while(cursor){
    if(cursor.id===ancestorId)return true;
    cursor=cursor.parentId?getNode(cursor.parentId):null;
  }
  return false;
}
// Sidebar rendering derives sibling order straight from st.nodes' own array
// order (see Sidebar.jsx's children()), so 'before'/'after' is just moving
// the dragged node to its new array position — no separate `order` field
// to keep in sync. mode:
//   'before'/'after' — becomes a sibling of target (adopts target's OWN
//     parentId, even if that differs from the dragged node's current
//     parent — this is what lets a nested node get dragged back out to
//     root level, or across to a different branch of the tree, just by
//     dropping it next to a node that already lives where it should go).
//   'inside' — becomes a child of target (dropped ON target itself,
//     not its top/bottom edge — see SidebarNode's drop-zone split).
// Both reject a drop that would nest a node under its own descendant
// (or under itself) — that's a cycle, not a valid tree position.
function repositionNode(draggedId,targetId,mode){
  if(draggedId===targetId)return;
  const dragged=getNode(draggedId),target=getNode(targetId);
  if(!dragged||!target||dragged.branchId!==target.branchId)return;
  if(isNodeOrDescendant(targetId,draggedId))return;
  if(mode==='inside'){dragged.parentId=target.id;rr();return;}
  dragged.parentId=target.parentId;
  const without=st.nodes.filter(n=>n.id!==draggedId);
  const targetIndex=without.findIndex(n=>n.id===targetId);
  without.splice(mode==='after'?targetIndex+1:targetIndex,0,dragged);
  st.nodes=without;
  rr();
}
function reorderBranch(draggedId,targetId,position){
  if(draggedId===targetId)return;
  const dragged=getBranch(draggedId),target=getBranch(targetId);
  if(!dragged||!target)return;
  const without=st.branches.filter(b=>b.id!==draggedId);
  const targetIndex=without.findIndex(b=>b.id===targetId);
  without.splice(position==='after'?targetIndex+1:targetIndex,0,dragged);
  st.branches=without;
  rr();
}
function selectNode(id){
  st.selectedId=id;const n=getNode(id);if(n)st.activeBranchId=n.branchId;
  st.filterOpen=false;st.filterTitle='';st.filterFormat='all';st.filterSort='default';st.filterGenres=[];
  // A node restored from the cloud backup (or never fully loaded) has no
  // cached Discogs data — fetch it now instead of rendering an empty panel.
  ensureNodeLoaded(id);
  // Silently re-fetch an artist/label node that was added before a
  // track-data fix — otherwise it keeps showing whatever was baked into it
  // back then forever.
  if(n&&(n.type==='label'||n.type==='artist')&&n.loaded&&!n.loading&&n.data?._v!==TRACK_DATA_VERSION)retryNode(id);
  rr();
}
function togglePin(id){const n=getNode(id);if(n)n.pinned=!n.pinned;rr();}
function addTag(nodeId,tag){
  const t=tag.trim().replace(/^#/,'');if(!t)return;
  const n=getNode(nodeId);if(n&&!n.tags.includes(t))n.tags=[...n.tags,t];
  st.tagNodeId=null;st.tagVal='';rr();
}
function removeTag(nodeId,tag){const n=getNode(nodeId);if(n)n.tags=n.tags.filter(t=>t!==tag);rr();}
function toggleLike(id){
  st.likes[id]=!st.likes[id];
  if(st.likes[id]){
    const found=findTrackAndNode(id);
    const tr=found?.track||discoveredTracks[id]; // discoveredTracks: liked straight from a Related Tracks pick, never opened as a node
    logEvent('like',{track_id:id,title:tr?.title||null,artist:tr?.trackArtistName||tr?.label||null,genre:tr?.genre||null,year:tr?.year||null,
      node_type:found?.node?.type||null,node_discogs_id:found?.node?.discogsId||null,node_name:found?.node?.name||null});
    if(tr){
      // trackArtistName (the track's own real per-track credit, when
      // Discogs lists one) now wins over the browsed node's name — same
      // fix as trackRows' displayArtist above, so a liked/history snapshot
      // doesn't freeze in the same wrong attribution.
      const artistName=tr.artistName||tr.trackArtistName||tr.releaseArtistName||(found?.node?.type==='label'?(tr.exploreName||found.node.name):found?.node?.name)||tr.label||'';
      st.likedTracks[id]={id,title:tr.title,artistName,year:tr.year,label:tr.label,labelId:tr.labelId,trackArtistId:tr.trackArtistId,genre:tr.genre,thumbUrl:tr.thumbUrl,videoId:tr.videoId};
    }
  }else{
    delete st.likedTracks[id];
  }
  rr();
}
function removeChip(name){st.chips=st.chips.filter(c=>c!==name);rr();}
function addBranch(){if(!st.isPremium&&st.branches.length>=FREE_WOOD_LIMIT){st.premiumModal=true;rr();return;}const id='b'+Date.now();st.branches=[...st.branches,{id,name:'Branch '+(st.branches.length+1)}];st.activeBranchId=id;rr();}
function removeBranch(id){
  if(st.branches.length<=1)return;
  st.branches=st.branches.filter(b=>b.id!==id);st.nodes=st.nodes.filter(n=>n.branchId!==id);
  if(st.activeBranchId===id)st.activeBranchId=st.branches[0].id;
  if(!getNode(st.selectedId))st.selectedId=st.nodes.filter(n=>n.branchId===st.activeBranchId)[0]?.id||null;rr(); // [0] — see removeNode's own comment
}
function renameBranch(id,name){const b=getBranch(id);if(b&&name.trim())b.name=name.trim();st.renameId=null;rr();}
// Live search-as-you-type: doSearch (Enter/button) does an immediate lookup and
// auto-picks a single result; liveSearchTick (debounced, on every keystroke) only
// ever populates the suggestion dropdown, never auto-navigates and never counts
// toward the search-count gamification metric. searchGen guards against an older
// in-flight request overwriting results from a newer, still-being-typed query.
let searchDebTimer=null,searchGen=0;
function doSearch(){
  if(searchDebTimer){clearTimeout(searchDebTimer);searchDebTimer=null;}
  const q=st.q.trim();if(!q)return;
  const myGen=++searchGen;
  st.loading=true;st.err='';st.results=[];rr();
  searchDiscogs(q).then(res=>{
    if(myGen!==searchGen)return;
    st.loading=false;incrementSearch();
    if(!res.length){st.err='No results';rr();return;}
    if(res.length===1){pickResult(res[0]);return;}
    st.results=res;rr();
  }).catch(e=>{if(myGen!==searchGen)return;st.loading=false;st.err=e.message;rr();});
}
function liveSearchTick(){
  const q=st.q.trim();
  if(q.length<2)return;
  const myGen=++searchGen;
  st.loading=true;st.err='';rr();
  searchDiscogs(q).then(res=>{
    if(myGen!==searchGen)return;
    st.loading=false;
    if(!res.length){st.err='No results';st.results=[];rr();return;}
    st.results=res;rr();
  }).catch(e=>{if(myGen!==searchGen)return;st.loading=false;st.err=e.message;rr();});
}
function pickResult(r){
  st.results=[];st.q='';st.loading=false;st.err='';
  if(r.type==='release'){resolveReleaseAndOpen(r);return;}
  addNode(r.type,r.id,r.title,null,st.activeBranchId);
}
// A release isn't a node type the tree understands on its own — resolve it
// to whichever node actually makes sense to open. Fetches the real release
// detail rather than parsing the search result's "Artist - Title" string,
// since that string breaks down for various-artist releases (multiple
// artists joined with " / ") — this uses the release's own structured
// artists[]/labels[] instead, same reasoning already applied elsewhere in
// this codebase against fuzzy title-based matching.
async function resolveReleaseAndOpen(r){
  st.loading=true;rr();
  try{
    const rd=await dReq('/releases/'+r.id);
    const primaryArtist=rd.artists?.[0];
    const isVarious=primaryArtist&&/^various$/i.test(primaryArtist.name.trim());
    if(primaryArtist&&!isVarious){
      addNode('artist',primaryArtist.id,stripDiscogsSuffix(primaryArtist.name),null,st.activeBranchId);
    }else if(rd.labels?.[0]){
      // Various-artists release — the label is the more useful entry point
      // than any single one of the many credited artists.
      addNode('label',rd.labels[0].id,rd.labels[0].name,null,st.activeBranchId);
    }else{
      st.err='Could not find an artist or label for that release.';
      st.loading=false;rr();return;
    }
    // addNode() (or selectNode() inside it, if this node was already open)
    // already set st.selectedId synchronously — capture it now so the
    // tracks section knows which node to watch, sort/filter stays exactly
    // whatever it already was (never touched here), only WHICH page gets
    // shown changes once the target is found.
    st.scrollToRelease={releaseId:r.id,titleNorm:normalizeStr(rd.title||''),nodeId:st.selectedId};
  }catch(e){
    st.err='Could not open that release: '+e.message;
  }
  st.loading=false;rr();
}

function applyFilters(tracks){
  let r=tracks.filter(t=>{
    if(st.filterTitle&&!t.title.toLowerCase().includes(st.filterTitle.toLowerCase()))return false;
    if(st.filterFormat==='digital'&&!t.digital)return false;
    if(st.filterFormat==='vinyl'&&t.digital)return false;
    if(st.filterGenres.length){
      const tg=t.genre?t.genre.split(' · '):[];
      if(!st.filterGenres.some(g=>tg.includes(g)))return false;
    }
    return true;
  });
  // yr() treats year=0 or missing as -1 so those sort last (not first) when descending
  const yr=t=>(t.year&&t.year>0)?t.year:-1;
  switch(st.filterSort){
    case 'chrono':     r=[...r].sort((a,b)=>yr(a)-yr(b));break;
    case 'antichrono': r=[...r].sort((a,b)=>yr(b)-yr(a));break;
    case 'az':         r=[...r].sort((a,b)=>a.title.localeCompare(b.title,'en'));break;
    case 'za':         r=[...r].sort((a,b)=>b.title.localeCompare(a.title,'en'));break;
    case 'genre':      r=[...r].sort((a,b)=>(a.genre||'zzz').localeCompare(b.genre||'zzz','en'));break;
    default:
      // Newest first. Within same year, tracks with a video ID come before those without.
      // Does NOT read invalidYtIds (mutated async) — keeps the comparator pure and consistent.
      r=[...r].sort((a,b)=>{
        const yd=yr(b)-yr(a);
        if(yd!==0)return yd;
        return (b.videoId?1:0)-(a.videoId?1:0);
      });
      break;
  }
  return r;
}

// ── DOM helpers ────────────────────────────────────────────
function findBcMatch(parentNodeId,title){
  const bc=bcCacheMap[parentNodeId];
  if(!bc||!bc.tracks.length)return null;
  // Aggressive normalization: lowercase, keep only letters/digits/spaces
  const norm=s=>s.toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  const t=norm(title);
  if(!t)return null;
  const tWords=t.split(' ').filter(w=>w.length>1);

  let bestScore=0,bestUrl=null;
  for(const r of bc.tracks){
    if(!r.url||!r.title)continue;
    const bt=norm(r.title);
    // 1. Exact
    if(bt===t)return r.url;
    // 2. One contains the other → score by length ratio
    if(bt.includes(t)||t.includes(bt)){
      const sc=Math.min(t.length,bt.length)/Math.max(t.length,bt.length);
      if(sc>bestScore){bestScore=sc;bestUrl=r.url;}
      continue;
    }
    // 3. Word overlap → score = overlap / max(tWords, btWords)
    const btWords=bt.split(' ').filter(w=>w.length>1);
    const overlap=tWords.filter(w=>btWords.includes(w)).length;
    if(tWords.length>0&&btWords.length>0){
      const sc=overlap/Math.max(tWords.length,btWords.length);
      if(sc>=0.5&&sc>bestScore){bestScore=sc;bestUrl=r.url;}
    }
  }
  return bestScore>=0.5?bestUrl:null;
}

// ── Follow ──────────────────────────────────────────────────
function loadFollows(){}
function toggleFollow(node){
  const existing=st.follows.find(f=>f.discogs_id===node.discogsId&&f.type===node.type);
  if(existing){
    st.follows=st.follows.filter(f=>f.discogs_id!==node.discogsId||f.type!==node.type);
  } else {
    st.follows=[{id:Date.now(),discogs_id:node.discogsId,type:node.type,name:node.name,thumb:node.data?.imageUrl||null,followed_at:new Date().toISOString()},...st.follows];
    logEvent('follow',{type:node.type,discogs_id:node.discogsId,name:node.name});
  }
  saveSt();rr();
}

// ── Follow scan (new releases) ───────────────────────────────
// Light version, deliberately: checks run at login and every 20 minutes
// while the tab stays open, nothing happens while the app is closed. A
// true always-on background scan would need a real server-side scheduled
// job plus its own Discogs-quota budgeting shared across every user's
// session — same shape of problem as the YouTube quota work, not taken on
// here without a concrete need for it yet.
let followScanRunning=false;
const FOLLOW_SCAN_BATCH=6;
function isOwnedRelease(rel){
  return rel.type==='master'?st.discogsCollMasterIds.includes(rel.id):st.discogsCollReleaseIds.includes(rel.id);
}
async function scanFollowsForNewReleases(){
  // Explicitly ALL of st.follows, not just whichever ones happen to also
  // be open as tree nodes right now — those are two separate, unrelated
  // sets (a followed artist may never have been explored, and an explored
  // node may not be followed).
  if(followScanRunning||!st.follows.length)return;
  followScanRunning=true;
  const found=[];
  try{
    for(let i=0;i<st.follows.length;i+=FOLLOW_SCAN_BATCH){
      const batch=st.follows.slice(i,i+FOLLOW_SCAN_BATCH);
      const results=await Promise.all(batch.map(async f=>{
        const key=f.type+':'+f.discogs_id;
        try{
          const path=f.type==='label'?'/labels/'+f.discogs_id+'/releases':'/artists/'+f.discogs_id+'/releases';
          const rd=await dReq(path,{per_page:'25',sort:'year',sort_order:'desc'});
          let rels=rd.releases||[];
          // Same "Main" preference fetchArtistData() already uses for an
          // artist's own discography — a remix credit or a various-artists
          // compilation appearance isn't really "a new release BY them" in
          // the sense this notification means. Labels have no such
          // distinction (it's just their catalog), so left as-is.
          if(f.type==='artist'){
            const mainOnly=rels.filter(r=>r.role==='Main');
            if(mainOnly.length)rels=mainOnly;
          }
          return{f,key,rels};
        }catch(e){console.warn('WaxTree: follow scan failed for',f.name,e);return{f,key,rels:null};}
      }));
      for(const{f,key,rels}of results){
        if(rels===null)continue;
        const known=new Set(st.followScanKnownIds[key]||[]);
        // Baseline on the FIRST-ever check for this followed entry —
        // otherwise following someone with a long back catalog would flag
        // their entire history as "new" the moment this feature first
        // runs, or the moment the user follows someone new.
        const isFirstCheck=!(key in st.followScanKnownIds);
        const newOnes=isFirstCheck?[]:rels.filter(r=>!known.has(r.id)&&!isOwnedRelease(r));
        st.followScanKnownIds[key]=rels.map(r=>r.id);
        // Cap how many releases from ONE artist/label fetch full detail in
        // a single scan — a burst of activity from one prolific source
        // shouldn't crowd out (or quota-starve) everyone else being
        // checked in the same pass.
        for(const rel of newOnes.slice(0,5)){
          try{
            let fetchId,rdFull;
            if(rel.type==='master'){
              if(rel.main_release){fetchId=rel.main_release;rdFull=await dReq('/releases/'+fetchId);}
              else{fetchId='m'+rel.id;rdFull=await dReq('/masters/'+rel.id);}
            }else{
              fetchId=rel.id;rdFull=await dReq('/releases/'+fetchId);
            }
            const entries=buildTrackEntries(rdFull,fetchId,`https://www.discogs.com/release/${rel.id}`,rel.year,null,rel.thumb||'');
            const track=entries.find(t=>t.videoId)||entries[0];
            if(track){
              // buildTrackEntries only fills trackArtistName for various-
              // artist releases — a normal solo release leaves it null,
              // which would make toggleLike's resolution chain fall back
              // to the release's LABEL name as the "artist". Not found
              // via any tree node here (findTrackAndNode never matches),
              // so this is the only chance to get it right.
              if(!track.trackArtistName)track.trackArtistName=f.type==='artist'?f.name:(rdFull.artists?.[0]?stripDiscogsSuffix(rdFull.artists[0].name):f.name);
              discoveredTracks[track.id]=track; // so toggleLike/playlist can resolve it, same pattern Related Tracks uses
              found.push({track,followName:f.name,followType:f.type,followThumb:f.thumb,releaseTitle:rdFull.title||rel.title||'',followDiscogsId:f.discogs_id});
            }
          }catch(e){console.warn('WaxTree: fetching new release detail failed for',f.name,e);}
        }
      }
      saveSt(); // persist known-ids progressively — a scan spans many batches, no reason to lose earlier progress if later ones fail
    }
  }finally{
    followScanRunning=false;
    if(found.length){st.newReleasesFound=found;st.newReleasesModal=true;}
    rr();
  }
}

async function uploadAvatar(file){
  if(file.size>10*1024*1024)throw new Error('Photo must be under 10 MB');
  const dataUrl=await new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=reject;
    reader.onload=e=>{
      const img=new Image();
      img.onerror=reject;
      img.onload=()=>{
        const MAX=200;
        const ratio=Math.min(MAX/img.width,MAX/img.height,1);
        const w=Math.round(img.width*ratio),h=Math.round(img.height*ratio);
        const cv=document.createElement('canvas');
        cv.width=w;cv.height=h;
        cv.getContext('2d').drawImage(img,0,0,w,h);
        resolve(cv.toDataURL('image/jpeg',0.82));
      };
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
  });
  localStorage.setItem(AVATAR_KEY,dataUrl);
  return dataUrl;
}
function getAvatarUrl(){return localStorage.getItem(AVATAR_KEY)||null;}

// ── Release card (groups all tracks of one EP/Album into one row) ──
// Collapses same-titled tracks that came from different Discogs release-id
// variants of one release (e.g. a coloured vinyl pressing and a plain
// digital-only listing of the exact same EP) into a single row — keeps
// whichever copy already has the most complete data and fills in gaps from
// the rest, recording their ids as altIds so inDiscogsCollection()/
// inDiscogsWantlist() still catch a match on ANY variant afterwards.
function mergeReleaseVariantTracks(tracks){
  const byTitle=new Map();
  tracks.forEach(t=>{
    const key=normalizeStr(t.title);
    const existing=byTitle.get(key);
    // Preserve whatever altIds the row already carries (e.g. a master_id
    // entry from buildTrackEntries — see its own comment) rather than
    // resetting to empty; a track with only one title-row on this page
    // still needs its own altIds checked, not just merged duplicates.
    if(!existing){byTitle.set(key,{...t,altIds:[...(t.altIds||[])]});return;}
    if(t.id!==existing.id)existing.altIds.push(t.id);
    if(t.altIds?.length)existing.altIds.push(...t.altIds);
    if(!existing.duration&&t.duration)existing.duration=t.duration;
    if(!existing.videoId&&t.videoId)existing.videoId=t.videoId;
    if(!existing.bpm&&t.bpm)existing.bpm=t.bpm;
    if(!existing.thumbUrl&&t.thumbUrl)existing.thumbUrl=t.thumbUrl;
    if(t.hasVinyl)existing.hasVinyl=true;
    if(t.digital)existing.digital=true;
  });
  return[...byTitle.values()];
}
// A node counts as fully explored when nothing is left in its normal
// browsable list — mirrors exactly what buildNodePanel already computes to
// decide what shows there (owned-in-collection releases pulled into their
// own section, "Already Listened" releases excluded too — see its own
// notOwned/listenedGroups/browsableTracks), just run against the node's
// full unfiltered track list instead of whatever filter happens to be
// active, so the sidebar badge doesn't depend on transient UI filter state.
// Deliberately binary, NOT a percentage/coverage metric — that was tried
// and reverted before (2026-07-18, see memory/
// project_waxtree_track_playability_gap): YouTube's video-matching quota
// caps playability well under 100% independent of actual listening
// behavior, so a raw "% of catalog" figure would be structurally
// misleading rather than a genuine progress signal. This only ever fires
// when there's truly nothing left to dig through right now.
function nodeFullyExplored(node){
  const tracks=node.data?.tracks;
  if(!tracks?.length)return false;
  const notOwned=tracks.filter(t=>!inDiscogsCollection(t));
  if(!notOwned.length)return true; // everything already owned
  if(!st.alreadyListened.length)return false; // nothing owned and nothing ever marked listened — definitely not done, skip the grouping work below
  const notOwnedGroups=groupTracksByRelease(notOwned);
  const listenedGroups=notOwnedGroups.filter(g=>st.alreadyListened.includes(g.key));
  const listenedTrackIds=new Set(listenedGroups.flatMap(g=>g.tracks.flatMap(t=>[t.id,...(t.altIds||[])])));
  return notOwned.every(t=>listenedTrackIds.has(t.id));
}
function groupTracksByRelease(tracks){
  const groups=[];
  const byKey=new Map();
  for(const t of tracks){
    // Group by the release's conceptual identity — title plus the TRUE
    // record label id — rather than by Discogs release id itself: a vinyl
    // pressing, a coloured variant, and a separate digital-only listing of
    // the exact same EP are still, to a digger, "the same release" and
    // shouldn't turn into two or three near-identical cards each missing
    // some of the ownership tags the others have. Must be trueLabelId (or
    // labelId, for artist-node tracks where it's never touched), NOT the
    // display-purpose t.label string — on a label node t.label holds the
    // per-track ARTIST credit (see fetchLabelData), which legitimately
    // differs per track on a various-artists release; keying on it split
    // one release into one card per credited artist.
    const labelKey=t.trueLabelId!=null?'id:'+t.trueLabelId:(t.labelId!=null?'id:'+t.labelId:normalizeStr(t.label||''));
    const key=normalizeStr(t.album||t.title)+'|'+labelKey;
    let g=byKey.get(key);
    if(!g){g={key,tracks:[]};byKey.set(key,g);groups.push(g);}
    g.tracks.push(t);
  }
  groups.forEach(g=>{g.tracks=mergeReleaseVariantTracks(g.tracks);});
  return groups;
}

sb.auth.onAuthStateChange((event)=>{
  if(event!=='SIGNED_OUT')return;
  // SIGNED_OUT fires both for a real, explicit sign-out AND as a side
  // effect of a failed background refresh attempt (e.g. a transient
  // network blip right as a backgrounded tab wakes up) — the SDK can't
  // tell those apart, so neither can this handler at face value. Rather
  // than trust the event blindly and redirect (which is exactly the
  // "everything I was doing just vanished" failure the user keeps
  // reporting), ask Supabase directly for a fresh session first: a real
  // sign-out has nothing to recover and this resolves near-instantly, but
  // a spurious event tied to a momentary refresh failure often has a
  // valid stored refresh token that a second attempt succeeds with. Only
  // redirect if that check also comes back empty.
  console.warn('[WaxTree] SIGNED_OUT event received — verifying before redirecting to login');
  sb.auth.getSession().then(({data:{session}})=>{
    if(session){console.warn('[WaxTree] SIGNED_OUT was spurious — session recovered, staying put');wtSession=session;return;}
    console.warn('[WaxTree] SIGNED_OUT confirmed — no recoverable session, redirecting to login');
    window.location.href='/login';
  });
});


// Runs immediately, before the session check below — if localStorage is
// already near/at quota, this is what gives Supabase's own session-token
// write room to succeed instead of silently failing and bouncing straight
// back to /login. TTL purge alone isn't enough for unexpired-but-large
// caches (see enforceCacheBudget's own comment), so both run here.
purgeExpiredCache();
{
  // Protect whatever node the user is about to land on — st.nodes/
  // selectedId are already populated from loadSt() by this point, so this
  // is known before ensureNodeLoaded(st.selectedId) runs further down.
  const selNode=getNode(st.selectedId);
  const selKey=selNode?(selNode.type==='label'?'l8:':'a7:')+selNode.discogsId:null;
  enforceCacheBudget(selKey);
}

(async()=>{
  // A single null getSession() here isn't proof there's no session — confirmed
  // live 2026-08-03: right after a successful sign-in, a fresh page load can
  // read localStorage a beat before the just-created session has actually
  // landed there, producing an instant sign-in → bounced-back-to-login loop
  // with no error anywhere. /login now verifies before handing off (see
  // its own comment), but this retries independently too, since /app
  // can also be reached other ways (bookmark, back button).
  let session=(await sb.auth.getSession()).data.session;
  for(let attempt=0;attempt<3 && !session;attempt++){
    await new Promise(r=>setTimeout(r,250));
    session=(await sb.auth.getSession()).data.session;
  }
  if(!session){window.location.href='/login';return;}
  wtSession=session;
  st.searchCount=wtSession.user.user_metadata?.search_count||0;
  st.ownedTracks=loadOwnedTracks()||wtSession.user.user_metadata?.owned_tracks||[];
  st.isPremium=wtSession.user.user_metadata?.premium===true;
  // Nudge anyone who's never linked a music source yet, every login, until
  // they do — checks both the local scan and the Discogs sync (either one
  // counts), and also the cloud-persisted track count so a user who synced
  // on another device doesn't get re-nagged on a fresh browser with empty
  // localStorage (see buildLocalLibrarySection's own libCount for the same
  // fallback pattern).
  const hasSyncedAnything=!!st.discogsCollSyncedAt||st.ownedTracks.length>0||!!wtSession.user.user_metadata?.library_track_count;
  if(!hasSyncedAnything){st.librariesModal=true;st.librariesTab='sync';st.welcomeSyncIntro=true;}
  engineReady=true;
  paint();
  loadFollows();
  handleDiscogsCallback();
  ensureNodeLoaded(st.selectedId);
  // Wait for the cloud pull to settle first — it may bring in follows (or
  // followScanKnownIds) this device's local copy doesn't have yet, e.g. a
  // follow added on another device. hydrateFromCloud() never rejects (its
  // own try/catch swallows failures), so .then() always fires. The
  // interval is a light re-check while the tab stays open — no server-
  // side/background component when the app itself isn't open, by design
  // (the "light version" — see project_waxtree memory).
  hydrateFromCloud().then(()=>{
    scanFollowsForNewReleases();
    setInterval(scanFollowsForNewReleases,20*60*1000);
  });
  // A plain page reload restores st.nodes from localStorage directly — it never
  // calls selectNode(), so the version check there alone would never fire for
  // a node that's already selected before the reload. Sweep once at boot too.
  st.nodes.filter(n=>(n.type==='label'||n.type==='artist')&&n.loaded&&!n.loading&&n.data?._v!==TRACK_DATA_VERSION).forEach(n=>retryNode(n.id));
  // Resume the library<->Discogs match automatically if there's unfinished
  // work and the user has engaged with it before (checked at least one
  // artist already). A refresh always stops any in-progress run — it's
  // just in-memory JS state — and requiring a fresh "Continue matching"
  // click every single time made a 3000-artist library feel like it kept
  // restarting instead of steadily making progress. Clicking Stop still
  // works as expected — it just won't auto-resume again until the next reload.
  if(st.ownedTracks.length){
    const checkedNow=loadCheckedArtists();
    const totalArtistsNow=new Set(st.ownedTracks.map(t=>t.artistNorm).filter(Boolean)).size;
    if(checkedNow.size>0&&checkedNow.size<totalArtistsNow)matchLibraryWithDiscogs();
  }
})();

export function subscribeWaxTree(listener){reactListeners.add(listener);return()=>reactListeners.delete(listener);}
export function getWaxTreeSnapshot(){return storeVersion;}
export function getWaxTreeState(){return{state:st,ready:engineReady,session:wtSession};}

function mutateState(mutator){mutator(st);rr();}
function setTheme(theme){st.theme=theme;document.documentElement.dataset.theme=theme;document.documentElement.classList.toggle('dark',theme==='dark');rr();}
async function connectDiscogs(){
  const data=await edgeFn({action:'request_token',callback_url:location.origin+'/app'});
  sessionStorage.setItem('discogs_oauth_secret',data.oauth_token_secret);
  window.location.href=`https://www.discogs.com/oauth/authorize?oauth_token=${data.oauth_token}`;
}
function disconnectDiscogs(){
  st.discogsOAuthToken='';st.discogsOAuthSecret='';st.discogsUser='';
  st.discogsCollReleaseIds=[];st.discogsCollMasterIds=[];st.discogsCollection=[];
  st.discogsWantReleaseIds=[];st.discogsWantMasterIds=[];st.discogsWantlist=[];
  st.discogsCollSyncedAt=null;st.discogsHeroesSeen=false;rr();
}
function submitYoutubeLink(trackId,videoId){
  ytMatches[trackId]=videoId;saveYtMatches(ytMatches);pushUserSubmittedYtMatch(trackId,videoId);
  const found=findTrackAndNode(trackId);
  if(found){
    found.track.videoId=videoId;
    lsSet((found.node.type==='label'?'l8:':'a7:')+found.node.discogsId,found.node.data);
  }
  rr();
}
function logQueue(track,node){
  logEvent('queue',{track_id:track.id,title:track.title,artist:track.artistName,genre:track.genre||null,year:track.year||null,
    node_type:node?.type||null,node_discogs_id:node?.discogsId||null,node_name:node?.name||null});
}
async function resolveStoreUrl(source,{isLabel,artist,label,title}){
  const fallback=source==='bc'
    ?`https://bandcamp.com/search?q=${encodeURIComponent(title)}&item_type=a`
    :`https://www.beatport.com/search?q=${encodeURIComponent(title)}`;
  const body={artist:isLabel?(artist||''):artist,label:isLabel?label:(label||''),title,release:title};
  try{
    const{data}=await sb.functions.invoke(source==='bc'?'bc-search':'bp-search',{body});
    return data?.tracks?.[0]?.url||fallback;
  }catch(error){console.error(`[${source.toUpperCase()} error]`,error?.message||error);return fallback;}
}
function registerRelatedTrack(card){
  discoveredTracks[card.playId]={id:card.playId,videoId:card.videoId,title:card.title,trackArtistName:card.artist,thumbUrl:card.thumbUrl,duration:null,resolved:card.resolved,discogsUrl:card.discogsUrl,cosineId:card.cosineId};
}
function playRelated(card){registerRelatedTrack(card);doPlay(card.playId,card.videoId,card.title,card.artist);}
// GenreYearResults renders real ReleaseCard/TrackRow rows — same as any
// artist/label page — instead of a lightweight custom card, so every
// track gets its own working play button (correctly colored once a video
// resolves) for free, no bespoke play logic needed here. But a bare
// search result only ever has release-level summary fields (no
// tracklist), so this fetches each release's real detail first, same as
// fetchArtistData/fetchLabelData already do per release, and reuses
// buildTrackEntries' own parsing rather than re-deriving it. Session-only
// cache (not persisted), same treatment as bcCacheMap.
let genreYearReleaseCache={}; // releaseId → {tracks,loading,err}
async function fetchGenreYearReleaseDetails(releaseIds){
  const toFetch=releaseIds.filter(id=>!genreYearReleaseCache[id]);
  if(!toFetch.length)return;
  toFetch.forEach(id=>{genreYearReleaseCache[id]={tracks:[],loading:true,err:null};});
  rr();
  // Same FETCH_BATCH concurrency fetchArtistData already uses for its own
  // per-release fetches, but marked foreground: this is capped tightly
  // (max PAGE_SIZE=15 per page, never an open-ended discography walk) and
  // fires only in direct response to the human opening/paging results —
  // confirmed live that leaving it on the default paced path made simply
  // opening the results page queue for up to 62s behind unrelated
  // exploration traffic despite each Discogs call taking well under a
  // second on its own.
  for(let i=0;i<toFetch.length;i+=FETCH_BATCH){
    const batch=toFetch.slice(i,i+FETCH_BATCH);
    await Promise.all(batch.map(async id=>{
      try{
        const rd=await dReq('/releases/'+id,{},{foreground:true});
        genreYearReleaseCache[id]={tracks:buildTrackEntries(rd,id,`https://www.discogs.com/release/${id}`,rd.year,null,''),loading:false,err:null};
      }catch(e){
        genreYearReleaseCache[id]={tracks:[],loading:false,err:e.message};
      }
    }));
    rr();
  }
}
function getGenreYearReleaseDetail(releaseId){return genreYearReleaseCache[releaseId]||null;}
function getTrackVideo(track,artistName,nodeName){
  if(track.videoId)return track.videoId;
  if(track.id in ytMatches)return ytMatches[track.id]||null;
  return resolveTrackVideoId(track.id,track.title,artistName,track.duration,nodeName);
}
function getExploreTargets(trackId,artistName){
  const track=findTrack(trackId);
  const node=findTrackAndNode(trackId)?.node;
  const resolved=discoveredTracks[trackId]?.resolved;
  const targets=[];
  if(node?.type==='artist')targets.push({type:'artist',id:node.discogsId,name:node.name});
  else if(track?.trackArtistId)targets.push({type:'artist',id:track.trackArtistId,name:artistName});
  else if(resolved?.type==='artist')targets.push({type:'artist',id:resolved.discogsId,name:resolved.discogsName});
  if(node?.type==='label')targets.push({type:'label',id:node.discogsId,name:node.name});
  else if(track?.labelId)targets.push({type:'label',id:track.labelId,name:track.label});
  else if(resolved?.type==='label')targets.push({type:'label',id:resolved.discogsId,name:resolved.discogsName});
  return targets.filter((target,index,list)=>target.id&&list.findIndex(item=>item.type===target.type&&item.id===target.id)===index);
}

export const waxTreeActions={
  addBranch,addNode,addTag,ancestry,addExploreYear,addGenreYearNode,applyFilters,computeDiggingHeroes,connectDiscogs,disconnectDiscogs,doPlay,doSearch,fetchBandcamp,
  findBcMatch,findTrack,findTrackContext:findTrackAndNode,genreColor,getAvatarUrl,getBranch,getExploreTargets,getLevelFromCount,getNode,getProgressToNext,getRelatedView,getTrackVideo,
  getDigitalLibraryEntries,groupTracksByRelease,handleDiscogsCallback,inDiscogsCollection,inDiscogsWantlist,isOwned,linkLibrary,logQueue,
  liveSearchTick,matchLibraryWithDiscogs,moveNodeToBranch,mutateState,nodeFullyExplored,parseYoutubeUrlInput,pickResult,removeChip,removeExploreYear,
  fetchGenreYearReleaseDetails,getGenreYearReleaseDetail,
  playAdjacentTrack,playRelated,registerRelatedTrack,removeBranch,removeNode,removeTag,renameBranch,reorderBranch,repositionNode,retryGenreYearNode,retryNode,scanFollowsForNewReleases,
  resolveStoreUrl,selectNode,setTheme,stopPlay,submitYoutubeLink,syncDiscogsAccount,syncYtPlayer,toggleExploreStyle,toggleFollow,toggleLike,togglePin,uploadAvatar,
  ytGetSnapshot,ytSeekFraction,ytTogglePlayPause,
  baseTitleKey,extractRemixCandidate,getResolvedRemixArtist,normalizeStr,
  freeNodeLimit:FREE_NODE_LIMIT,freeWoodLimit:FREE_WOOD_LIMIT,
  exploreStyles:EXPLORE_STYLES,exploreGenreYearMaxCombos:GENRE_YEAR_MAX_COMBOS,
  supabase:sb,
};
