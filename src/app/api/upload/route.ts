import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {NextResponse} from 'next/server';
import {api,requireUser,fail,audit} from '@/lib/server';
import {S3Client,PutObjectCommand} from '@aws-sdk/client-s3';
export const POST=api(async request=>{
 const user=await requireUser(true);
 if(Number(request.headers.get('content-length')||0)>25*1024*1024)fail(413,'文件限25MB / Maximum file size is 25 MB');
 const form=await request.formData(),file=form.get('file');
 if(!(file instanceof File)||file.size>25*1024*1024||file.size===0)fail(400,'请选择不超过25MB的文件 / Choose a file up to 25 MB');
 const bytes=Buffer.from(await file.arrayBuffer());
 let ext='',mime='';
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){ext='png';mime='image/png';}
 else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255){ext='jpg';mime='image/jpeg';}
 else if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'){ext='webp';mime='image/webp';}
 else if(bytes.toString('ascii',0,3)==='ID3'||(bytes[0]===255&&(bytes[1]&224)===224)){ext='mp3';mime='audio/mpeg';}
 else if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WAVE'){ext='wav';mime='audio/wav';}
 else if(bytes.toString('ascii',0,4)==='OggS'){ext='ogg';mime='audio/ogg';}
 else fail(400,'支持 JPG、PNG、WebP、MP3、WAV、OGG / Unsupported file format');
 const name=`${randomUUID()}.${ext}`;
 let url:string;
 if(process.env.S3_BUCKET){
  if(!process.env.S3_PUBLIC_URL||!process.env.S3_ENDPOINT)fail(503,'媒体服务配置不完整 / Media storage is not configured');
  const client=new S3Client({endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION||'ap-guangzhou',credentials:{accessKeyId:process.env.S3_ACCESS_KEY_ID||'',secretAccessKey:process.env.S3_SECRET_ACCESS_KEY||''},forcePathStyle:process.env.S3_FORCE_PATH_STYLE==='true'});
  await client.send(new PutObjectCommand({Bucket:process.env.S3_BUCKET,Key:name,Body:bytes,ContentType:mime}));
  url=process.env.S3_PUBLIC_URL.replace(/\/$/,'')+'/'+name;
 }else{
  if(process.env.NODE_ENV==='production'&&process.env.ALLOW_LOCAL_MEDIA!=='true')fail(503,'请配置媒体存储 / Configure media storage');
  const dir=path.join(process.cwd(),'data','media');await mkdir(dir,{recursive:true});await writeFile(path.join(dir,name),bytes);url='/api/media/'+name;
 }
 await audit(user.id,'media.upload',name);
 return NextResponse.json({url,mime},{status:201});
});
