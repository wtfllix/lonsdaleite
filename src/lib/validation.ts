import {z} from 'zod';
export const bilingual=z.object({zh:z.string().max(12000),en:z.string().max(12000)});
export const safeUrl=z.string().max(2000).refine(value=>{if(value==='')return true;if(/^\/api\/media\/[a-zA-Z0-9.-]+$/.test(value))return true;try{return new URL(value).protocol==='https:';}catch{return false;}},'Use HTTPS or uploaded media');
export const mediaSchema=z.object({url:safeUrl,caption:z.string().max(500),credit:z.string().max(300),source:safeUrl});
export const showSchema=z.object({id:z.string().regex(/^[a-z0-9-]+$/).max(80),city:bilingual,country:bilingual,date:z.string().regex(/^2024-\d{2}-\d{2}$/),venue:bilingual,encore:z.boolean(),published:z.boolean(),intro:bilingual,moments:bilingual,outfits:bilingual,setlist:z.array(z.string().min(1).max(200)).max(100),images:z.array(mediaSchema).max(50),videos:z.array(mediaSchema).max(20),sources:z.array(safeUrl).max(30)});
export const settingsSchema=z.object({contact:z.union([z.literal(''),z.email()]),tracks:z.array(z.object({id:z.string().min(1).max(80),title:z.string().min(1).max(200),artist:z.string().max(200),url:safeUrl.refine(v=>v.length>0)})).max(100)});
export const emailSchema=z.email().max(254).transform(s=>s.trim().toLowerCase());
export const memorySchema=z.object({body:z.string().trim().min(1).max(1000),show_id:z.string().max(80).nullable()});
export const nicknameSchema=z.string().trim().min(1).max(30);
