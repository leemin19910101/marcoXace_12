const json = (data, status=200) => new Response(JSON.stringify(data), {status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const hash = async text => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const secret = () => crypto.randomUUID()+crypto.randomUUID();
let initialized;
async function init(env){
 if(!env.DB) throw new Error('DATABASE_UNAVAILABLE');
 if(!initialized) initialized=(async()=>{
  await env.DB.batch([
   env.DB.prepare('CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, data TEXT NOT NULL, published INTEGER NOT NULL, updated TEXT NOT NULL)'),
   env.DB.prepare('CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, mime TEXT NOT NULL, data BLOB NOT NULL)'),
   env.DB.prepare('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)'),
   env.DB.prepare('CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL)'),
   env.DB.prepare('CREATE TABLE IF NOT EXISTS attempts (address TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL)')
  ]);
  if(!await env.DB.prepare("SELECT value FROM settings WHERE key='seeded'").first()){
   const res=await env.ASSETS.fetch(new Request('https://assets/content.json'));
   const seed=await res.json();
   await env.DB.batch([...seed.map(r=>env.DB.prepare('INSERT OR IGNORE INTO records VALUES (?, ?, ?, ?)').bind(r.id,JSON.stringify({...r,images:[],updated:'2026-10-01'}),1,'2026-10-01')),env.DB.prepare("INSERT OR IGNORE INTO settings VALUES ('seeded','1')")]);
  }
 })().catch(e=>{initialized=null;throw e});
 return initialized;
}
async function authorized(req,env){const t=req.headers.get('cookie')?.match(/(?:^|;\s*)archive_session=([^;]+)/)?.[1];return t&&await env.DB.prepare('SELECT token FROM sessions WHERE token=? AND expires>?').bind(await hash(t),Date.now()).first();}
function validate(r){
 if(!r||!['小說','漫畫','插畫'].includes(r.type)||typeof r.title!=='string'||!r.title.trim()||r.title.length>150) return '請填入有效的作品類型與標題。';
 if(typeof r.body!=='string'||r.body.length>200000) return '正文過長，請限制在 20 萬字以內。';
 if(!Array.isArray(r.tags)||r.tags.length>12||r.tags.some(t=>typeof t!=='string'||t.length>30))return '標籤格式不正確。';
 if(!Array.isArray(r.images)||r.images.length>100||r.images.some(m=>!m||typeof m.id!=='string'||!/^[a-f0-9-]{36}$/.test(m.id)))return '圖片資料不正確。';
 if(r.type==='小說'&&!r.body.trim())return '小說需要正文。';
 if(r.type!=='小說'&&!r.images.length)return '請至少上傳一張圖片。';
 if(r.mainComic&&r.type!=='漫畫')return '主篇必須是漫畫。';
 return null;
}
export default {async fetch(req,env){
 const url=new URL(req.url);let path=url.pathname;
 try{
  if(!path.startsWith('/api/'))return env.ASSETS.fetch(req);
  await init(env);
  const mutation=!['GET','HEAD'].includes(req.method);
  if(mutation&&req.headers.get('Origin')!==url.origin)return json({error:'來源驗證失敗。'},403);
  if(path==='/api/login'&&req.method==='POST'){
   const address=await hash(req.headers.get('CF-Connecting-IP')||'unknown');
   const attempts=await env.DB.prepare('SELECT count,expires FROM attempts WHERE address=?').bind(address).first();
   if(attempts&&attempts.expires>Date.now()&&attempts.count>=10)return json({error:'嘗試次數過多，請 15 分鐘後再試。'},429);
   const {password}=await req.json();const stored=await env.DB.prepare("SELECT value FROM settings WHERE key='password'").first();
   if(typeof password!=='string'||await hash(password)!==(stored?.value||await hash(env.ARCHIVE_ADMIN_KEY||secret()))){
    await env.DB.prepare('INSERT INTO attempts VALUES (?,?,?) ON CONFLICT(address) DO UPDATE SET count=?, expires=?').bind(address,1,Date.now()+900000,attempts&&attempts.expires>Date.now()?attempts.count+1:1,Date.now()+900000).run();
    return json({error:'管理密碼不正確。'},401);
   }
   const token=secret();await env.DB.prepare('INSERT INTO sessions VALUES (?,?)').bind(await hash(token),Date.now()+86400000).run();
   await env.DB.prepare('DELETE FROM attempts WHERE address=?').bind(address).run();
   return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':`archive_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`}});
  }
  if(path==='/api/session')return json({authenticated:!!await authorized(req,env)});
  if(path==='/api/records'&&req.method==='GET'){
   const admin=url.searchParams.has('admin')&&await authorized(req,env);
   const rows=await env.DB.prepare(admin?'SELECT data FROM records ORDER BY updated DESC,rowid ASC':'SELECT data FROM records WHERE published=1 ORDER BY updated DESC,rowid ASC').all();
   return json(rows.results.map(r=>JSON.parse(r.data)));
  }
  if(path.startsWith('/api/media/')&&req.method==='GET'){
   const id=path.slice(11);const m=await env.DB.prepare('SELECT mime,data FROM media WHERE id=?').bind(id).first();
   if(!m)return json({error:'圖片不存在。'},404);
   // Draft media remains private even if its UUID is known.
   const refs=await env.DB.prepare('SELECT published FROM records WHERE data LIKE ?').bind('%'+id+'%').all();
   if(!refs.results.some(r=>r.published)&&!await authorized(req,env))return json({error:'圖片未公開。'},404);
   return new Response(new Uint8Array(m.data),{headers:{'Content-Type':m.mime,'Cache-Control':refs.results.some(r=>r.published)?'public,max-age=300':'no-store','X-Content-Type-Options':'nosniff'}});
  }
  if(!await authorized(req,env))return json({error:'請先登入管理頁。'},401);
  if(path==='/api/logout'&&req.method==='POST'){
   const t=req.headers.get('cookie')?.match(/(?:^|;\s*)archive_session=([^;]+)/)?.[1];if(t)await env.DB.prepare('DELETE FROM sessions WHERE token=?').bind(await hash(t)).run();
   return new Response('{}',{headers:{'Content-Type':'application/json','Set-Cookie':'archive_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'}});
  }
  if(path==='/api/password'&&req.method==='POST'){
   const {password}=await req.json();if(typeof password!=='string'||password.length<12||password.length>200)return json({error:'請設定 12 至 200 字元的管理密碼。'},400);
   await env.DB.prepare("INSERT INTO settings VALUES ('password',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(await hash(password)).run();
   return json({ok:true});
  }
  if(path==='/api/media'&&req.method==='POST'){
   const mime=req.headers.get('Content-Type');if(!['image/webp','image/jpeg','image/png','image/gif'].includes(mime))return json({error:'僅接受 JPG、PNG、WebP、GIF。'},400);
   const data=await req.arrayBuffer();if(data.byteLength>1800000)return json({error:'單張圖片請小於 1.8 MB。'},413);
   const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO media VALUES (?,?,?)').bind(id,mime,data).run();return json({id,url:'/api/media/'+id});
  }
  if(path==='/api/records'&&req.method==='POST'){
   const input=await req.json();const error=validate(input);if(error)return json({error},400);
   for(const m of input.images){if(!await env.DB.prepare('SELECT id FROM media WHERE id=?').bind(m.id).first())return json({error:'有圖片尚未上傳完成。'},400);}
   const id=input.id||crypto.randomUUID();if(!/^[a-zA-Z0-9-]{1,80}$/.test(id))return json({error:'作品識別碼不正確。'},400);
   const r={id,type:input.type,title:input.title.trim(),officialTitle:String(input.officialTitle||input.title).slice(0,200),number:String(input.number||'041-'+id.slice(0,8)).slice(0,40),summary:String(input.summary||'').slice(0,1000),body:input.body,tags:input.tags,images:input.images.map(m=>({id:m.id,url:'/api/media/'+m.id,name:String(m.name||'').slice(0,150)})),published:!!input.published,restricted:!!input.restricted,mainComic:!!input.mainComic,sample:!!input.sample,assessment:String(input.assessment||'').slice(0,1500),updated:new Date().toISOString()};
   if(r.mainComic){const existing=await env.DB.prepare('SELECT id,data FROM records WHERE id<>?').bind(id).all();await env.DB.batch(existing.results.map(x=>{let d=JSON.parse(x.data);d.mainComic=false;return env.DB.prepare('UPDATE records SET data=? WHERE id=?').bind(JSON.stringify(d),x.id)}));}
   await env.DB.prepare('INSERT INTO records VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,published=excluded.published,updated=excluded.updated').bind(id,JSON.stringify(r),+r.published,r.updated).run();return json(r);
  }
  if(path.startsWith('/api/records/')&&req.method==='DELETE'){
   await env.DB.prepare('DELETE FROM records WHERE id=?').bind(decodeURIComponent(path.slice(13))).run();return json({ok:true});
  }
  return json({error:'找不到此操作。'},404);
 }catch(e){console.error('Archive error:',e.message);return json({error:e.message==='DATABASE_UNAVAILABLE'?'內容服務尚未啟用。':'操作未完成，請稍後重試。'},503);}
}};
