"use client";

import {useEffect} from "react";

declare global{interface Window{okflInstallPrompt?:any}}

export function PwaBootstrap(){
  useEffect(()=>{
    if("serviceWorker" in navigator)navigator.serviceWorker.register("/firebase-messaging-sw.js",{scope:"/"}).catch(()=>{});
    const capture=(event:Event)=>{event.preventDefault();window.okflInstallPrompt=event;window.dispatchEvent(new Event("okfl:install-ready"));};
    window.addEventListener("beforeinstallprompt",capture);return()=>window.removeEventListener("beforeinstallprompt",capture);
  },[]);
  return null;
}
