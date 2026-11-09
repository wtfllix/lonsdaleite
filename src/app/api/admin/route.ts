import {NextResponse} from 'next/server';
import {api,body,requireUser,fail,getShows,getSettings,audit} from '@/lib/server';
import {settingsSchema,showSchema} from '@/lib/validation';
import {query} from '@/lib/db';
export const GET=api(async request=>{
 await requireUser(true);const url=new URL(request.url);const offset=Math.max(0,Number(url.searchParams.get('offset'))||0);
 const status=url.searchParams.get('status')||'pending';if(!['pending','approved','rejected'].includes(status))fail(400,'Invalid status');
 const memories=await query('SELECT m.*,u.nickname FROM memories m JOIN users u ON m.user_id=u.id WHERE m.status=$1 ORDER BY m.created_at DESC,m.id DESC LIMIT 25 OFFSET $2',[status,offset]);
 const [{total}]=await query<{total:number}>('SELECT COUNT(*) AS total FROM memories WHERE status=$1',[status]);
 const logs=await query('SELECT a.action,a.target,a.created_at,u.nickname FROM audit a JOIN users u ON a.actor_id=u.id ORDER BY a.created_at DESC LIMIT 30');
 return NextResponse.json({shows:await getShows(true),settings:await getSettings(),memories,total:Number(total),hasMore:offset+memories.length<Number(total),logs},{headers:{'Cache-Control':'no-store'}});
});
export const PUT=api(async request=>{
 const user=await requireUser(true),input=await body(request);
 if(input.type==='show'){
  const result=showSchema.safeParse(input.show);if(!result.success)fail(400,'场次数据格式不正确 / Invalid show data');
  if(!(await getShows(true)).some(s=>s.id===result.data.id))fail(404,'场次不存在 / Show not found');
  await query('UPDATE shows SET document=$1 WHERE id=$2',[JSON.stringify(result.data),result.data.id]);await audit(user.id,'show.update',result.data.id);
 }else if(input.type==='settings'){
  const result=settingsSchema.safeParse(input.settings);if(!result.success)fail(400,'设置格式不正确 / Invalid settings');
  await query('UPDATE settings SET document=$1 WHERE id=$2',[JSON.stringify(result.data),'site']);await audit(user.id,'settings.update','site');
 }else if(input.type==='moderate'){
  if(!['approved','rejected'].includes(input.status)||typeof input.id!=='string'||typeof input.reason!=='string'||input.reason.length>500)fail(400,'无效审核 / Invalid review');
  if(input.status==='rejected'&&!input.reason.trim())fail(400,'请填写原因 / A reason is required');
  const rows=await query('UPDATE memories SET status=$1,reason=$2 WHERE id=$3 RETURNING id',[input.status,input.reason.trim(),input.id]);if(!rows.length)fail(404,'回忆不存在 / Memory not found');
  await audit(user.id,'memory.'+input.status,input.id);
 }else fail(400,'无效操作 / Invalid action');
 return NextResponse.json({ok:true});
});
