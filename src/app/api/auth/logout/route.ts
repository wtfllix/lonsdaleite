import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {api,digest} from '@/lib/server';
import {query} from '@/lib/db';
export const POST=api(async()=>{const jar=await cookies();const token=jar.get('lonsdaleite_session')?.value;if(token)await query('DELETE FROM sessions WHERE token=$1',[digest(token)]);const response=NextResponse.json({ok:true});response.cookies.set('lonsdaleite_session','',{httpOnly:true,path:'/',maxAge:0});return response;});
