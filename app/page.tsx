"use client";
import {Suspense} from 'react';
import Providers from './providers';
import {SearchEngine3} from '@/components/SearchEngine3';
function SearchFallback(){return <div className="search3Loading">Building the OKFL knowledge index…</div>}
export default function Home(){return <Providers><Suspense fallback={<SearchFallback/>}><SearchEngine3/></Suspense></Providers>}
