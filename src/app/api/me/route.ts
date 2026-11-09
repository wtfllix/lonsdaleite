import {NextResponse} from 'next/server';
import {api,body,currentUser,requireUser,fail} from '@/lib/server';
import {nicknameSchema} from '@/lib/validation';
import {query} from '@/lib/db';
export const GET=api(async()=>NextResponse.json({user:await currentUser()},{headers:{'Cache-Control':'no-store'}}));
export const PATCH=api(async request=>{const user=await requireUser();const result=nicknameSchema.safeParse((await body(request)).nickname);if(!result.success)fail(400,'昵称需要1–30个字符 / Nickname must be 1–30 characters');await query('UPDATE users SET nickname=$1 WHERE id=$2',[result.data,user.id]);return NextResponse.json({user:{...user,nickname:result.data}});});
