import {readFile} from 'node:fs/promises';
import path from 'node:path';
export async function GET(request:Request,{params}:{params:Promise<{name:string}>}){
 const {name}=await params;
 if(!/^[a-f0-9-]{36}\.(jpg|png|webp|mp3|wav|ogg)$/.test(name))return new Response('Not found',{status:404});
 try{
  const data=await readFile(path.join(process.cwd(),'data','media',name));
  const types:Record<string,string>={jpg:'image/jpeg',png:'image/png',webp:'image/webp',mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg'};
  const headers={'Content-Type':types[name.split('.').at(-1)!],'Cache-Control':'public,max-age=31536000,immutable','Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff'};
  const range=request.headers.get('range');
  if(range){const match=/^bytes=(\d+)-(\d*)$/.exec(range);if(!match)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${data.length}`}});const start=Number(match[1]),end=Math.min(match[2]?Number(match[2]):data.length-1,data.length-1);if(start>end||start>=data.length)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${data.length}`}});return new Response(data.subarray(start,end+1),{status:206,headers:{...headers,'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':String(end-start+1)}});}
  return new Response(data,{headers:{...headers,'Content-Length':String(data.length)}});
 }catch{return new Response('Not found',{status:404});}
}
