import { randomBytes, randomInt, randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { query } from './db';
import type { User, Show, SiteSettings } from './tour';
export class HttpError extends Error {constructor(public status:number,message:string){super(message);}}
export function fail(status:number,message:string):never{throw new HttpError(status,message);}
export function api(handler:(request:Request)=>Promise<Response>){return async(request:Request)=>{
  try {
    if(request.method !== 'GET') {
      const origin = request.headers.get('origin');
      const expected = process.env.APP_URL ? new URL(process.env.APP_URL).origin : new URL(request.url).origin;
      if(!origin || origin !== expected) fail(403,'请求来源无效 / Invalid request origin');
    }
    return await handler(request);
  } catch(error) {
    if(error instanceof HttpError) return NextResponse.json({error:error.message},{status:error.status});
    if(error instanceof SyntaxError) return NextResponse.json({error:'无效的数据 / Invalid data'},{status:400});
    console.error('[api]',error instanceof Error ? error.message : 'Unexpected error');
    return NextResponse.json({error:'暂时无法完成，请稍后再试 / Please try again later'},{status:500});
  }
};}
export async function body(request:Request) {
  if(Number(request.headers.get('content-length') || 0)>200_000) fail(413,'内容过大 / Request too large');
  const raw=await request.text();
  if(raw.length>200_000) fail(413,'内容过大 / Request too large');
  const parsed=JSON.parse(raw);
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))fail(400,'无效的数据 / Invalid data');
  return parsed;
}
export function digest(value:string){
  const secret=process.env.AUTH_SECRET;
  if(!secret && process.env.NODE_ENV==='production') throw new Error('AUTH_SECRET is required in production');
  return createHmac('sha256',secret || 'local-development-only-do-not-deploy').update(value).digest('hex');
}
export function equalDigest(a:string,b:string){return a.length===b.length && timingSafeEqual(Buffer.from(a),Buffer.from(b));}
export async function currentUser():Promise<User|null>{
  const token=(await cookies()).get('lonsdaleite_session')?.value;
  if(!token)return null;
  const [user]=await query<User>('SELECT u.id, u.email, u.nickname, u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=$1 AND s.expires_at>$2',[digest(token),Date.now()]);
  return user||null;
}
export async function requireUser(admin=false){const user=await currentUser();if(!user)fail(401,'请先登录 / Please sign in');if(admin&&user.role!=='admin')fail(403,'没有管理权限 / Admin access required');return user;}
export async function rateLimit(key:string,limit:number,windowMs:number){
  const now=Date.now();
  const [row]=await query<{count:number}>('INSERT INTO rate_limits (key,count,expires_at) VALUES ($1,1,$2) ON CONFLICT (key) DO UPDATE SET count=CASE WHEN rate_limits.expires_at<=$3 THEN 1 ELSE rate_limits.count+1 END, expires_at=CASE WHEN rate_limits.expires_at<=$3 THEN $2 ELSE rate_limits.expires_at END RETURNING count',[key,now+windowMs,now]);
  if(Number(row.count)>limit)fail(429,'操作太频繁，请稍后再试 / Too many attempts, please try later');
}
export async function audit(userId:string,action:string,target:string){await query('INSERT INTO audit (id,actor_id,action,target,created_at) VALUES ($1,$2,$3,$4,$5)',[randomUUID(),userId,action,target,Date.now()]);}
export async function getShows(all=false):Promise<Show[]>{
  const rows=await query<{document:string}>('SELECT document FROM shows');
  return rows.map(row=>JSON.parse(row.document) as Show).filter(show=>all||show.published).sort((a,b)=>a.date.localeCompare(b.date));
}
export async function getSettings():Promise<SiteSettings>{const [row]=await query<{document:string}>('SELECT document FROM settings WHERE id=$1',['site']);return JSON.parse(row.document);}
export const makeCode=()=>String(randomInt(100000,1000000));
export const makeToken=()=>randomBytes(32).toString('hex');
