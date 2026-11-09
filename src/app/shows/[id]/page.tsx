import {notFound} from 'next/navigation';
import {getShows} from '@/lib/server';
import {ShowDetail} from '@/components/show-detail';
export async function generateMetadata({params}:{params:Promise<{id:string}>}){const {id}=await params;const show=(await getShows()).find(s=>s.id===id);return {title:show?`${show.city.en} ${show.date}${show.encore?' [dot]':''}`:'Show not found'};}
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;const shows=await getShows(),show=shows.find(s=>s.id===id);if(!show)notFound();return <main id="main"><ShowDetail show={show} shows={shows} standalone/></main>;}
