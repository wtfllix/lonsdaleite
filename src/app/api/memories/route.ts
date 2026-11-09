import {randomUUID} from 'node:crypto';
import {NextResponse} from 'next/server';
import {api,body,fail,requireUser,rateLimit,getShows} from '@/lib/server';
import {memorySchema} from '@/lib/validation';
import {query} from '@/lib/db';
export const GET=api(async request=>{
 const url=new URL(request.url),mine=url.searchParams.get('mine')==='1';
 const offset=Math.max(0,Math.min(100000,Number(url.searchParams.get('offset'))||0));
 const show=url.searchParams.get('show');
 let where="m.status='approved'";
 const args:unknown[]=[];
 if(!mine){const ids=(await getShows()).map(s=>s.id);if(ids.length){args.push(...ids);where+=` AND (m.show_id IS NULL OR m.show_id IN (${ids.map((_,i)=>'$'+(i+1)).join(',')}))`;}else where+=' AND m.show_id IS NULL';}
 if(mine){const user=await requireUser();where='m.user_id=$1';args.push(user.id);}
 if(show){args.push(show);where+=` AND m.show_id=$${args.length}`;}
 args.push(offset);
 const rows=await query(`SELECT m.id, ${mine?'m.user_id, m.reason,':''} m.show_id,m.body,m.status,m.created_at,u.nickname FROM memories m JOIN users u ON m.user_id=u.id WHERE ${where} ORDER BY m.created_at DESC,m.id DESC LIMIT 25 OFFSET $${args.length}`,args);
 const [{total}]=await query<{total:number}>(`SELECT COUNT(*) AS total FROM memories m WHERE ${where}`,args.slice(0,-1));
 return NextResponse.json({memories:rows,total:Number(total),hasMore:offset+rows.length<Number(total)},{headers:{'Cache-Control':'no-store'}});
});
export const POST=api(async request=>{
 const user=await requireUser();if(!user.nickname)fail(400,'请先设置昵称 / Set your nickname first');
 const result=memorySchema.safeParse(await body(request));if(!result.success)fail(400,'回忆需要1–1000字 / Memory must be 1–1000 characters');
 if(result.data.show_id&&!(await getShows()).some(s=>s.id===result.data.show_id))fail(400,'场次不存在 / Show not found');
 await rateLimit('memory:'+user.id,5,3600000);
 const id=randomUUID();await query('INSERT INTO memories (id,user_id,show_id,body,created_at) VALUES ($1,$2,$3,$4,$5)',[id,user.id,result.data.show_id,result.data.body,Date.now()]);
 return NextResponse.json({id,status:'pending'},{status:201});
});
export const PATCH=api(async request=>{
 const user=await requireUser(),input=await body(request),result=memorySchema.safeParse(input);
 if(!result.success||typeof input.id!=='string')fail(400,'无效回忆 / Invalid memory');
 if(result.data.show_id&&!(await getShows()).some(s=>s.id===result.data.show_id))fail(400,'场次不存在 / Show not found');
 await rateLimit('memory-edit:'+user.id,20,3600000);
 const rows=await query("UPDATE memories SET body=$1,show_id=$2,status='pending',reason='' WHERE id=$3 AND user_id=$4 RETURNING id",[result.data.body,result.data.show_id,input.id,user.id]);
 if(!rows.length)fail(404,'回忆不存在 / Memory not found');return NextResponse.json({ok:true});
});
export const DELETE=api(async request=>{const user=await requireUser(),input=await body(request);if(typeof input.id!=='string')fail(400,'无效回忆 / Invalid memory');const rows=await query('DELETE FROM memories WHERE id=$1 AND user_id=$2 RETURNING id',[input.id,user.id]);if(!rows.length)fail(404,'回忆不存在 / Memory not found');return NextResponse.json({ok:true});});
