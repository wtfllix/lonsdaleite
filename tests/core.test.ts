import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {seedShows,groupShows} from '../src/lib/tour';
import {memorySchema,showSchema,settingsSchema,safeUrl} from '../src/lib/validation';
process.env.SQLITE_PATH=path.join(mkdtempSync(path.join(tmpdir(),'lonsdaleite-unit-')),'test.db');

test('complete tour has 29 unique dated shows across 14 cities and 15 chapters',()=>{
 assert.equal(seedShows.length,29);assert.equal(new Set(seedShows.map(s=>s.id)).size,29);assert.equal(new Set(seedShows.map(s=>s.city.en)).size,14);
 const groups=groupShows(seedShows);assert.equal(groups.length,15);assert.equal(groups[0].shows[0].date,'2024-03-16');assert.equal(groups.at(-1)?.shows.at(-1)?.date,'2024-07-28');
 assert.equal(seedShows.filter(s=>s.encore).length,2);
 for(const [city,count] of [['Ho Chi Minh City',2],['Taipei',2],['Kobe',3],['Sendai',2],['Hong Kong',3],['Macau',1]] as const) assert.equal(seedShows.filter(s=>s.city.en===city).length,count,city);
 assert.equal(seedShows.find(s=>s.city.en==='Singapore')?.date,'2024-03-28');
 assert.equal(seedShows.find(s=>s.city.en==='Manila')?.venue.en,'Smart Araneta Coliseum');
 for(const show of seedShows)assert.ok(showSchema.safeParse(show).success,show.id);
});
test('plain-text memories enforce bounded nonempty content',()=>{
 assert.equal(memorySchema.safeParse({body:'  ',show_id:null}).success,false);assert.equal(memorySchema.safeParse({body:'a'.repeat(1001),show_id:null}).success,false);
 assert.deepEqual(memorySchema.parse({body:'  那一晚的光。  ',show_id:null}),{body:'那一晚的光。',show_id:null});
});
test('media and settings reject executable and insecure URLs',()=>{
 for(const url of ['javascript:alert(1)','data:text/html,hello','http://example.com/test','//example.com/file'])assert.equal(safeUrl.safeParse(url).success,false);
 assert.ok(safeUrl.safeParse('https://example.com/audio.mp3').success);assert.ok(safeUrl.safeParse('/api/media/example.mp3').success);
 assert.equal(settingsSchema.safeParse({contact:'bad',tracks:[]}).success,false);
});
test('database seeds idempotently and enforces ownership constraints',async()=>{
 const {query}=await import('../src/lib/db');
 const rows=await query<{id:string}>('SELECT id FROM shows');assert.equal(rows.length,29);
 await assert.rejects(query('INSERT INTO memories (id,user_id,show_id,body,created_at) VALUES ($1,$2,$3,$4,$5)',['bad','missing',null,'test',Date.now()]));
 const records=await query<{document:string}>('SELECT document FROM shows WHERE id=$1',[seedShows[0].id]);assert.equal(JSON.parse(records[0].document).date,'2024-03-16');
});
