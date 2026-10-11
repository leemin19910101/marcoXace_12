import { isEditor, sameOrigin } from '../../../lib/editor-auth';
import { env } from 'cloudflare:workers';
export async function POST(request:Request){
 try{
 if(!sameOrigin(request))return Response.json({error:'origin'},{status:403});
 if(!await isEditor(request))return Response.json({error:'authentication_required'},{status:401});
 if(Number(request.headers.get('content-length'))>12582912+4096)return Response.json({error:'file_size'},{status:413});
 const form=await request.formData();const file=form.get('file');if(!(file instanceof File)||file.size>12582912||file.size===0)return Response.json({error:'file_size'},{status:400});
 const bytes=new Uint8Array(await file.arrayBuffer());let ext='',type='';
 if(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71){ext='png';type='image/png';}
 else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255){ext='jpg';type='image/jpeg';}
 else if(String.fromCharCode(...bytes.slice(0,6)).match(/^GIF8[79]a$/)){ext='gif';type='image/gif';}
 else if(String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP'){ext='webp';type='image/webp';}
 if(!ext)return Response.json({error:'file_type'},{status:400});
 const key=crypto.randomUUID()+'.'+ext;await env.BUCKET!.put(key,bytes,{httpMetadata:{contentType:type}});return Response.json({url:'/api/media/'+key});
 }catch{return Response.json({error:'upload_failed'},{status:500});}
}
