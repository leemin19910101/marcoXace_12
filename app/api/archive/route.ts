import { isEditor, sameOrigin } from '../../../lib/editor-auth';
import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { seed } from '../../../lib/archive-data';
import { applyCharacterProfiles } from '../../../lib/character-profiles';
const tr=z.object({title:z.string().max(200),subtitle:z.string().max(500),body:z.string().max(180000),images:z.array(z.string().regex(/^\/api\/media\/[a-f0-9-]+\.(png|jpg|gif|webp)$/)).max(150).optional()});
const settings=z.object({headline:z.string().max(200),intro:z.string().max(2000),synopsisTitle:z.string().max(300),synopsis:z.string().max(20000)});
const schema=z.object({revision:z.number().int().nonnegative(),data:z.object({characterProfileVersion:z.number().int().nonnegative().optional(),entries:z.array(z.object({id:z.string().regex(/^[a-zA-Z0-9-]{1,80}$/),category:z.enum(['characters','illustrations','comics','novels','extras']),code:z.string().max(80),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),images:z.array(z.string().regex(/^\/api\/media\/[a-f0-9-]+\.(png|jpg|gif|webp)$/)).max(150),translations:z.object({zh:tr,ja:tr,en:tr})})).max(500),settings:z.object({zh:settings,ja:settings,en:settings})})});
export async function GET(){try{const row=await env.DB!.prepare('SELECT payload, revision FROM archive WHERE id = ?').bind('main').first<{payload:string;revision:number}>();return Response.json({data:row?applyCharacterProfiles(JSON.parse(row.payload)):seed,revision:row?.revision??0},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'storage_unavailable'},{status:503});}}
export async function PUT(request:Request){
 try{
 if(!sameOrigin(request))return Response.json({error:'origin'},{status:403});
 if(!await isEditor(request))return Response.json({error:'authentication_required'},{status:401});
 const raw=await request.text();if(raw.length>1800000)return Response.json({error:'too_large'},{status:413});
 const parsed=schema.safeParse(JSON.parse(raw));if(!parsed.success)return Response.json({error:'invalid_data'},{status:400});
 const {data,revision}=parsed.data;if(new Set(data.entries.map(e=>e.id)).size!==data.entries.length)return Response.json({error:'duplicate_id'},{status:400});
 const payload=JSON.stringify(data);
 const result=revision===0?await env.DB!.prepare('INSERT INTO archive (id,payload,revision) VALUES (?, ?, 1) ON CONFLICT(id) DO NOTHING').bind('main',payload).run():await env.DB!.prepare('UPDATE archive SET payload = ?, revision = revision + 1 WHERE id = ? AND revision = ?').bind(payload,'main',revision).run();
 if(!result.meta.changes)return Response.json({error:'conflict'},{status:409});
 return Response.json({revision:revision+1});
 }catch{return Response.json({error:'save_failed'},{status:500});}
}
