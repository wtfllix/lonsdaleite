import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { seedShows } from './tour';
type Row = Record<string, unknown>;
type Connection = {query: <T = Row>(sql: string, args?: unknown[]) => Promise<T[]>};
const globalDb = globalThis as unknown as {lonsdaleiteDb?: Promise<Connection>};
async function connect(): Promise<Connection> {
  let db: Connection;
  if (process.env.DATABASE_URL) {
    const {Pool} = await import('pg');
    const pool = new Pool({connectionString: process.env.DATABASE_URL, max: 10});
    db = {query: async <T>(sql: string, args: unknown[] = []) => (await pool.query(sql, args)).rows as T[]};
  } else {
    if(process.env.NODE_ENV === 'production' && process.env.ALLOW_SQLITE !== 'true') throw new Error('Production requires DATABASE_URL (or explicitly ALLOW_SQLITE=true for local smoke tests).');
    const {DatabaseSync} = await import('node:sqlite');
    const filename = process.env.SQLITE_PATH || path.join(process.cwd(),'data','lonsdaleite.db');
    mkdirSync(path.dirname(filename),{recursive:true});
    const sqlite = new DatabaseSync(filename);
    sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    db = {query: async <T>(sql: string, args: unknown[] = []) => {
      const bound: (string | number | null)[] = [];
      const translated = sql.replace(/\$(\d+)/g,(_,n)=>{bound.push(args[Number(n)-1] as string|number|null);return '?';});
      const stmt = sqlite.prepare(translated);
      return (stmt.columns().length ? stmt.all(...bound) : (stmt.run(...bound), [])) as T[];
    }};
  }
  const schema = [
    'CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, nickname TEXT NOT NULL, role TEXT NOT NULL DEFAULT \'fan\', created_at BIGINT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at BIGINT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS otp (email TEXT PRIMARY KEY, digest TEXT NOT NULL, expires_at BIGINT NOT NULL, sent_at BIGINT NOT NULL, attempts BIGINT NOT NULL DEFAULT 0)',
    'CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count BIGINT NOT NULL, expires_at BIGINT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS shows (id TEXT PRIMARY KEY, document TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, document TEXT NOT NULL)',
    "CREATE TABLE IF NOT EXISTS memories (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), show_id TEXT REFERENCES shows(id), body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', reason TEXT NOT NULL DEFAULT '', created_at BIGINT NOT NULL)",
    'CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES users(id), action TEXT NOT NULL, target TEXT NOT NULL, created_at BIGINT NOT NULL)',
    'CREATE INDEX IF NOT EXISTS memories_status_date ON memories(status, created_at)',
    'CREATE INDEX IF NOT EXISTS memories_user ON memories(user_id)',
  ];
  for(const sql of schema) await db.query(sql);
  for(const show of seedShows) await db.query('INSERT INTO shows (id, document) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',[show.id,JSON.stringify(show)]);
  await db.query('INSERT INTO settings (id, document) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',['site',JSON.stringify({tracks:[],contact:''})]);
  return db;
}
export async function database(){return globalDb.lonsdaleiteDb ??= connect();}
export async function query<T = Row>(sql:string,args:unknown[]=[]):Promise<T[]>{return (await database()).query<T>(sql,args);}
