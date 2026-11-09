import {test,expect,type APIRequestContext} from '@playwright/test';
import {mkdirSync} from 'node:fs';
const origin='http://localhost:43127';
const headers={origin};
async function signIn(api:APIRequestContext,email:string){const sent=await api.post('/api/auth/request',{headers,data:{email}});expect(sent.status()).toBe(200);const {devCode}=await sent.json();expect(devCode).toMatch(/^\d{6}$/);const verified=await api.post('/api/auth/verify',{headers,data:{email,code:devCode}});expect(verified.status()).toBe(200);return {code:devCode,user:(await verified.json()).user};}

test('desktop tour, direct links, language, player, modal and keepsake work',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('.hero h1')).toContainText('LONSDALEITE');await expect(page.locator('.city-chapter')).toHaveCount(15);await expect(page.locator('.show-row')).toHaveCount(29);
 await expect(page.locator('audio')).not.toHaveAttribute('autoplay');expect(await page.locator('audio').evaluate((el:HTMLAudioElement)=>el.paused)).toBe(true);
 await page.getByRole('button',{name:'播放背景音乐',exact:true}).click();await expect(page.getByText('音乐曲目正在整理中。')).toBeVisible();await page.getByRole('button',{name:'收起播放器'}).click();
 await page.getByRole('link',{name:'重启这段旅程'}).click();
 const first=page.locator('.show-row').first();await first.click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page).toHaveURL(/shows\/seoul-03-16/);
 await page.getByRole('tab',{name:'完整歌单'}).click();await expect(page.getByText('资料待补充 · 核实后收录')).toBeVisible();
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'保存纪念票根'}).click();expect((await downloaded).suggestedFilename()).toBe('lonsdaleite-seoul-03-16.png');
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page).toHaveURL(/#journey$/);await expect(first).toBeFocused();
 await page.evaluate(()=>window.scrollTo(0,0));await page.getByRole('button',{name:'切换到英文'}).click();await expect(page.getByRole('link',{name:'The journey',exact:true})).toBeVisible();await page.reload();await expect(page.locator('html')).toHaveAttribute('lang','en');
 await page.getByRole('button',{name:'Switch to Chinese'}).click();await page.evaluate(()=>window.scrollTo(0,0));await page.evaluate(()=>document.fonts.ready);
 mkdirSync('artifacts',{recursive:true});await page.screenshot({path:'artifacts/home-desktop.png'});
 await page.goto('/shows/seoul-07-28');await expect(page.locator('.show-banner h1')).toContainText('[dot]');await expect(page.locator('.show-detail.standalone')).toBeVisible();
 await page.goto('/shows/not-a-show');await expect(page.getByRole('heading',{name:'404'})).toBeVisible();expect(errors).toEqual([]);
});

test('mobile layout, navigation and account form remain usable',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);expect(overflow).toBe(false);
 await page.getByRole('button',{name:'登录',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('textbox',{name:'邮箱地址'}).fill('ui-fan@example.com');await page.getByRole('button',{name:'发送验证码'}).click();await expect(page.locator('.dev-note strong')).toBeVisible();const code=await page.locator('.dev-note strong').innerText();await page.getByRole('textbox',{name:'六位验证码'}).fill(code);await page.getByRole('button',{name:'验证并登录'}).click();await expect(page.getByRole('heading',{name:'属于你的回忆'})).toBeVisible();await page.getByRole('textbox',{name:'公开昵称'}).fill('银色星光');await page.getByRole('button',{name:'保存',exact:true}).click();await expect(page.getByText('昵称已保存')).toBeVisible();await page.keyboard.press('Escape');
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'artifacts/home-mobile.png'});
 await page.getByRole('link',{name:'重启这段旅程'}).click();await page.getByRole('button',{name:'选择一站'}).click();await page.locator('.timeline-nav').getByRole('link',{name:/首尔.*dot/}).click();await expect(page).toHaveURL(/#Seoul-encore$/);await page.locator('#Seoul-encore .show-row').last().click();await expect(page.getByRole('dialog')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 await page.getByRole('dialog').getByRole('button',{name:'写下我的回忆'}).click();await page.getByRole('textbox',{name:'你的回忆',exact:true}).fill('这是浏览器测试的文字回忆，等待审核。');await page.getByRole('button',{name:'收藏这段回忆'}).click();await expect(page.getByRole('heading',{name:'你的故事，收到了。'})).toBeVisible();
});

test('OTP, ownership, moderation, upload and admin publishing enforce boundaries',async({playwright,page})=>{
 const fan=await playwright.request.newContext({baseURL:origin}),other=await playwright.request.newContext({baseURL:origin}),admin=await playwright.request.newContext({baseURL:origin}),guest=await playwright.request.newContext({baseURL:origin});
 try{
  expect((await guest.post('/api/auth/request',{headers:{origin:'https://evil.example'},data:{email:'fan@example.com'}})).status()).toBe(403);
  expect((await guest.post('/api/memories',{headers,data:{body:'hello',show_id:null}})).status()).toBe(401);
  const login=await signIn(fan,'fan@example.com');
  expect((await fan.post('/api/auth/verify',{headers,data:{email:'fan@example.com',code:login.code}})).status()).toBe(400);
  expect((await fan.post('/api/auth/request',{headers,data:{email:'fan@example.com'}})).status()).toBe(200);
  expect((await fan.post('/api/auth/request',{headers,data:{email:'fan@example.com'}})).status()).toBe(429);
  expect((await fan.get('/api/admin')).status()).toBe(403);
  expect((await fan.patch('/api/me',{headers,data:{nickname:'测试星光'}})).status()).toBe(200);
  expect((await fan.post('/api/memories',{headers,data:{body:' '.repeat(3),show_id:null}})).status()).toBe(400);
  const created=await fan.post('/api/memories',{headers,data:{body:'一段只在审核通过后出现的回忆。',show_id:'seoul-03-16'}});expect(created.status()).toBe(201);const {id}=await created.json();
  expect((await (await guest.get('/api/memories')).json()).memories.some((m:{id:string})=>m.id===id)).toBe(false);
  const own=await (await fan.get('/api/memories?mine=1')).json();expect(own.memories.find((m:{id:string})=>m.id===id).status).toBe('pending');
  await signIn(other,'other@example.com');expect((await other.patch('/api/memories',{headers,data:{id,body:'stolen',show_id:null}})).status()).toBe(404);expect((await other.delete('/api/memories',{headers,data:{id}})).status()).toBe(404);
  await signIn(admin,'curator@example.com');await admin.patch('/api/me',{headers,data:{nickname:'档案管理员'}});
  expect((await admin.put('/api/admin',{headers,data:{type:'moderate',id,status:'approved',reason:''}})).status()).toBe(200);
  const publicMemories=await (await guest.get('/api/memories')).json();const published=publicMemories.memories.find((m:{id:string})=>m.id===id);expect(published.body).toContain('审核');expect(published.email).toBeUndefined();expect(published.user_id).toBeUndefined();expect(published.reason).toBeUndefined();
  expect((await fan.patch('/api/memories',{headers,data:{id,body:'修改后需要重新审核。',show_id:'seoul-03-16'}})).status()).toBe(200);expect((await (await guest.get('/api/memories')).json()).memories.some((m:{id:string})=>m.id===id)).toBe(false);
  expect((await admin.put('/api/admin',{headers,data:{type:'moderate',id,status:'rejected',reason:''}})).status()).toBe(400);expect((await admin.put('/api/admin',{headers,data:{type:'moderate',id,status:'rejected',reason:'请补充具体的观演感受。'}})).status()).toBe(200);expect((await (await fan.get('/api/memories?mine=1')).json()).memories.find((m:{id:string})=>m.id===id).reason).toContain('观演');
  const adminData=await (await admin.get('/api/admin')).json();const show=adminData.shows.find((s:{id:string})=>s.id==='seoul-03-16');show.intro={zh:'经过核实的测试文案。',en:'Verified test archive copy.'};expect((await admin.put('/api/admin',{headers,data:{type:'show',show}})).status()).toBe(200);
  await page.goto('/shows/seoul-03-16');await expect(page.getByText('经过核实的测试文案。')).toBeVisible();
  // Real media upload + byte range, with admin-only authorization.
  const wav=Buffer.alloc(844);wav.write('RIFF');wav.writeUInt32LE(836,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(800,40);
  expect((await fan.post('/api/upload',{headers,multipart:{file:{name:'test.wav',mimeType:'audio/wav',buffer:wav}}})).status()).toBe(403);
  const upload=await admin.post('/api/upload',{headers,multipart:{file:{name:'test.wav',mimeType:'audio/wav',buffer:wav}}});expect(upload.status()).toBe(201);const {url}=await upload.json();const partial=await guest.get(url,{headers:{range:'bytes=0-15'}});expect(partial.status()).toBe(206);expect((await partial.body()).length).toBe(16);
  expect((await admin.put('/api/admin',{headers,data:{type:'settings',settings:{contact:'curator@example.com',tracks:[{id:'test',title:'Test silence',artist:'Test',url}]}}})).status()).toBe(200);
  await page.goto('/');await expect(page.locator('.player-title strong')).toHaveText('Test silence');expect(await page.locator('audio').evaluate((el:HTMLAudioElement)=>el.paused)).toBe(true);
  const storage=await admin.storageState();await page.context().addCookies(storage.cookies);await page.goto('/admin');await expect(page.getByRole('heading',{name:'回忆管理室'})).toBeVisible();await expect(page.locator('.admin-show-list button')).toHaveCount(29);await page.screenshot({path:'artifacts/admin-studio.png'});
  expect((await fan.delete('/api/memories',{headers,data:{id}})).status()).toBe(200);
  expect((await fan.post('/api/auth/logout',{headers,data:{}})).status()).toBe(200);expect((await (await fan.get('/api/me')).json()).user).toBe(null);
 }finally{await fan.dispose();await other.dispose();await admin.dispose();await guest.dispose();}
});
