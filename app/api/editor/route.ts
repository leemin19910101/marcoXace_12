import { env } from 'cloudflare:workers';
import {credentialTag,hash,isEditor,sameOrigin,sameSecret,sessionCookie,tokenFrom,SESSION_SECONDS} from '../../../lib/editor-auth';
const json=(data:unknown,status=200,extra:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...extra}});
export async function GET(request:Request){try{return json({authenticated:await isEditor(request)});}catch{return json({error:'unavailable'},503);}}
export async function POST(request:Request){try{
 if(!sameOrigin(request))return json({error:'origin'},403);
 if(!env.EDITOR_USERNAME||!env.EDITOR_PASSWORD)return json({error:'unavailable'},503);
 if(Number(request.headers.get('content-length'))>4096)return json({error:'invalid'},400);
 const raw=await request.text();if(raw.length>4096)return json({error:'invalid'},400);
 let body:{username?:unknown;password?:unknown};try{body=JSON.parse(raw);}catch{return json({error:'invalid'},400);}
 if(!body||typeof body.username!=='string'||typeof body.password!=='string'||body.username.length>128||body.password.length>256)return json({error:'invalid'},400);
 const now=Date.now(),key=await hash(request.headers.get('cf-connecting-ip')||request.headers.get('oai-authenticated-user-id')||'anonymous');
 const attempts=await env.DB!.prepare('INSERT INTO editor_login_attempts (key,attempts,resets_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts = CASE WHEN resets_at <= ? THEN 1 ELSE attempts + 1 END, resets_at = CASE WHEN resets_at <= ? THEN excluded.resets_at ELSE resets_at END RETURNING attempts,resets_at').bind(key,now+900000,now,now).first<{attempts:number;resets_at:number}>();
 if(!attempts||attempts.attempts>10)return json({error:'rate_limited'},429,{'Retry-After':String(Math.max(1,Math.ceil(((attempts?.resets_at||now+900000)-now)/1000)))});
 const [userMatches,passwordMatches]=await Promise.all([sameSecret(body.username.trim(),env.EDITOR_USERNAME),sameSecret(body.password,env.EDITOR_PASSWORD)]);
 if(!userMatches||!passwordMatches)return json({error:'invalid_credentials'},401);
 const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
 const old=tokenFrom(request);
 await env.DB!.batch([
 env.DB!.prepare('DELETE FROM editor_sessions WHERE expires_at <= ? OR token_hash = ?').bind(now,old?await hash(old):''),
 env.DB!.prepare('INSERT INTO editor_sessions (token_hash,expires_at,credential_tag) VALUES (?,?,?)').bind(await hash(token),now+SESSION_SECONDS*1000,await credentialTag()),
 env.DB!.prepare('DELETE FROM editor_login_attempts WHERE key = ? OR resets_at <= ?').bind(key,now)
 ]);
 return json({authenticated:true},200,{'Set-Cookie':sessionCookie(token)});
 }catch{return json({error:'unavailable'},503);}}
export async function DELETE(request:Request){try{if(!sameOrigin(request))return json({error:'origin'},403);const token=tokenFrom(request);if(token)await env.DB!.prepare('DELETE FROM editor_sessions WHERE token_hash = ?').bind(await hash(token)).run();return json({authenticated:false},200,{'Set-Cookie':sessionCookie('',0)});}catch{return json({error:'unavailable'},503);}}
