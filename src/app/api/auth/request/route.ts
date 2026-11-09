import {NextResponse} from 'next/server';
import nodemailer from 'nodemailer';
import {api,body,fail,digest,makeCode,rateLimit} from '@/lib/server';
import {emailSchema} from '@/lib/validation';
import {query} from '@/lib/db';
export const POST=api(async request=>{
 const parsed=emailSchema.safeParse((await body(request)).email);if(!parsed.success)fail(400,'请输入有效邮箱 / Enter a valid email');
 const email=parsed.data;
 await rateLimit('otp-hour:'+digest(email),6,3600000);
 await rateLimit('otp-global',500,3600000);
 const code=makeCode(),now=Date.now();
 const reserved=await query('INSERT INTO otp (email,digest,expires_at,sent_at,attempts) VALUES ($1,$2,$3,$4,0) ON CONFLICT (email) DO UPDATE SET digest=$2,expires_at=$3,sent_at=$4,attempts=0 WHERE otp.sent_at<=$5 RETURNING email',[email,digest(email+':'+code),now+600000,now,now-60000]);
 if(!reserved.length)fail(429,'请等待60秒后重发 / Wait 60 seconds before resending');
 const dev=process.env.NODE_ENV!=='production'&&process.env.DEV_EMAIL_MODE==='true';
 try{
  if(dev){console.info(`[local email] ${email}: ${code}`);}else{
   if(!process.env.SMTP_HOST||!process.env.SMTP_FROM)fail(503,'邮件服务尚未配置 / Email service is not configured');
   const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||465),secure:process.env.SMTP_SECURE!=='false',auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}:undefined,connectionTimeout:10000,socketTimeout:15000});
   await transport.sendMail({from:process.env.SMTP_FROM,to:email,subject:'Lonsdaleite · 登录验证码 / Sign-in code',text:`你的验证码 / Your sign-in code: ${code}\n10分钟内有效，请勿分享。 / Expires in 10 minutes. Do not share this code.`});
  }
 }catch(error){await query('DELETE FROM otp WHERE email=$1 AND digest=$2',[email,digest(email+':'+code)]);throw error;}
 return NextResponse.json({ok:true,...(dev?{devCode:code}:{})});
});
