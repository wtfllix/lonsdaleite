import {Home} from '@/components/home';
import {getShows} from '@/lib/server';
export default async function Page(){return <Home shows={await getShows()}/>;}
