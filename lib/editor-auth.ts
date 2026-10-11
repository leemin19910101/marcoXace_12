import { env } from 'cloudflare:workers';
export const COOKIE = '__Host-kakin-blood-editor';
export const SESSION_SECONDS = 12 * 60 * 60;
export async function hash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export async function credentialTag(){return hash(JSON.stringify([env.EDITOR_USERNAME,env.EDITOR_PASSWORD]));}
export function sameOrigin(request:Request){const origin=request.headers.get('origin');return (!origin||origin===new URL(request.url).origin)&&request.headers.get('sec-fetch-site')!=='cross-site';}
export function tokenFrom(request:Request){const token=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);return token&&/^[a-f0-9]{64}$/.test(token)?token:null;}
export function sessionCookie(token:string,seconds=SESSION_SECONDS){return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${seconds}`;}
export async function isEditor(request:Request){if(!env.EDITOR_USERNAME||!env.EDITOR_PASSWORD)return false;const token=tokenFrom(request);if(!token)return false;const row=await env.DB!.prepare('SELECT credential_tag FROM editor_sessions WHERE token_hash = ? AND expires_at > ?').bind(await hash(token),Date.now()).first<{credential_tag:string}>();return !!row&&row.credential_tag===await credentialTag();}
export async function sameSecret(a:string,b:string){const [x,y]=await Promise.all([hash(a),hash(b)]);let diff=0;for(let i=0;i<x.length;i++)diff|=x.charCodeAt(i)^y.charCodeAt(i);return diff===0;}
