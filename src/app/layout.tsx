import type {Metadata} from 'next';
import '@fontsource/cormorant-garamond/latin-300.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/noto-sans-sc/400.css';
import './globals.css';
import {SiteProvider} from '@/components/site-provider';
import {getShows,getSettings} from '@/lib/server';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:{default:'LONSDALEITE · 那些光，依然闪耀',template:'%s · LONSDALEITE'},description:'边伯贤 2024 Lonsdaleite 亚洲巡演粉丝纪念馆。沿着光，重温每一座城市、每一个夜晚。A fan-made archive of BAEKHYUN’s 2024 Asia tour.',robots:{index:true,follow:true}};
export default async function RootLayout({children}:{children:React.ReactNode}){
 const [shows,settings]=await Promise.all([getShows(),getSettings()]);
 return <html lang="zh-CN"><body><a href="#main" className="skip-link">跳转到内容 / Skip to content</a><SiteProvider contact={settings.contact} tracks={settings.tracks} shows={shows}>{children}</SiteProvider></body></html>;
}
