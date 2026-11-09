export type Lang = 'zh' | 'en';
export type Bilingual = {zh: string; en: string};
export type Media = {url: string; caption: string; credit: string; source: string};
export type Show = {
  id: string; city: Bilingual; country: Bilingual; date: string; venue: Bilingual;
  encore: boolean; published: boolean; intro: Bilingual; moments: Bilingual; outfits: Bilingual;
  setlist: string[]; images: Media[]; videos: Media[]; sources: string[];
};
export type Track = {id: string; title: string; artist: string; url: string};
export type SiteSettings = {tracks: Track[]; contact: string};
export type User = {id: string; email: string; nickname: string; role: 'fan' | 'admin'};
export type Memory = {id: string; user_id: string; nickname: string; show_id: string | null; body: string; status: 'pending' | 'approved' | 'rejected'; reason: string; created_at: number};
const empty = (): Bilingual => ({zh: '', en: ''});
const stops: [string, string, string, string, string, string, string[], boolean?][] = [
  ['首尔','Seoul','韩国','South Korea','KSPO DOME','KSPO DOME',['03-16','03-17']],
  ['东京','Tokyo','日本','Japan','武藏野之森综合体育广场','Musashino Forest Sport Plaza',['03-23','03-24']],
  ['新加坡','Singapore','新加坡','Singapore','圣淘沙名胜世界宴会厅','Resorts World Ballroom, Sentosa',['03-28']],
  ['胡志明市','Ho Chi Minh City','越南','Vietnam','富寿体育馆','Phu Tho Indoor Sports Stadium',['04-06','04-07']],
  ['马尼拉','Manila','菲律宾','Philippines','Smart Araneta Coliseum','Smart Araneta Coliseum',['04-13']],
  ['千叶','Chiba','日本','Japan','幕张展览馆 国际展示场 9–11号馆','Makuhari Messe International Exhibition Halls 9–11',['04-20','04-21']],
  ['福冈','Fukuoka','日本','Japan','福冈海洋展览馆 A馆','Marine Messe Fukuoka Hall A',['04-27','04-28']],
  ['台北','Taipei','中国台湾','Taiwan','国立体育大学综合体育馆','NTSU Arena (Linkou Arena)',['05-04','05-05']],
  ['神户','Kobe','日本','Japan','神户世界纪念馆','Kobe World Memorial Hall',['05-10','05-11','05-12']],
  ['仙台','Sendai','日本','Japan','宫城县综合运动公园综合体育馆','Sekisui Heim Super Arena',['05-16','05-17']],
  ['雅加达','Jakarta','印度尼西亚','Indonesia','ICE BSD Hall 5–6','ICE BSD Hall 5–6',['06-01','06-02']],
  ['香港','Hong Kong','中国香港','Hong Kong','亚洲国际博览馆 10号馆','AsiaWorld-Expo Hall 10',['06-08','06-09','06-10']],
  ['曼谷','Bangkok','泰国','Thailand','IMPACT Exhibition Hall 7–8','IMPACT Exhibition Hall 7–8',['06-15','06-16']],
  ['澳门','Macau','中国澳门','Macau','银河综艺馆','Galaxy Arena',['06-29']],
  ['首尔','Seoul','韩国','South Korea','KSPO DOME','KSPO DOME',['07-27','07-28'],true],
];
export const tourSources = [
  'https://en.wikipedia.org/wiki/Lonsdaleite_Tour',
  'https://en.wikipedia.org/wiki/Lonsdaleite_Tour',
  'https://wp.tstar.jp/event/wpjrbkh/',
];
export const seedShows: Show[] = stops.flatMap(([zh,en,cz,ce,vz,ve,dates,encore]) => dates.map(date => ({
  id: `${en.toLowerCase().replaceAll(' ', '-')}-${date}`, city:{zh,en}, country:{zh:cz,en:ce}, date:`2024-${date}`,
  venue:{zh:vz,en:ve}, encore:!!encore, published:true, intro:empty(), moments:empty(), outfits:empty(), setlist:[],images:[],videos:[],sources:[en === 'Macau' ? tourSources[0] : ['Tokyo','Chiba','Fukuoka','Kobe','Sendai'].includes(en) ? tourSources[2] : tourSources[1]],
})));
export function groupShows(shows: Show[]) {
  const groups: {key: string; shows: Show[]}[] = [];
  for (const show of [...shows].sort((a,b)=>a.date.localeCompare(b.date))) {
    const key = `${show.city.en}${show.encore ? '-encore' : ''}`;
    const last = groups.at(-1);
    if(last?.key === key) last.shows.push(show); else groups.push({key,shows:[show]});
  }
  return groups;
}
export function localText(value: Bilingual, lang: Lang) {return value[lang] || value[lang === 'zh' ? 'en' : 'zh'];}
