const sdkVersion="12.16.0";
const remoteImport=(url:string)=>Function("url","return import(url)")(url) as Promise<any>;

const config={
  apiKey:process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId:process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function firebaseBrowserIsConfigured(){return Boolean(config.apiKey&&config.projectId&&config.messagingSenderId&&config.appId&&process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY)}

async function messagingSdk(){
  const [appSdk,messagingSdk]=await Promise.all([remoteImport(`https://www.gstatic.com/firebasejs/${sdkVersion}/firebase-app.js`),remoteImport(`https://www.gstatic.com/firebasejs/${sdkVersion}/firebase-messaging.js`)]);
  const app=appSdk.getApps().length?appSdk.getApp():appSdk.initializeApp(config);
  return {messaging:messagingSdk.getMessaging(app),sdk:messagingSdk};
}

export async function enableFirebasePush(onRegistered:(fid:string)=>Promise<void>,onUnregistered:(fid:string)=>Promise<void>){
  if(!firebaseBrowserIsConfigured())throw new Error("Firebase browser settings are not configured yet.");
  if(!("Notification" in window)||!("serviceWorker" in navigator))throw new Error("This browser does not support app notifications.");
  const {messaging,sdk}=await messagingSdk();if(!await sdk.isSupported())throw new Error("This browser does not support Firebase notifications.");
  const permission=await Notification.requestPermission();if(permission!=="granted")throw new Error("Notifications were not allowed. You can enable them later in browser settings.");
  const serviceWorkerRegistration=await navigator.serviceWorker.register("/firebase-messaging-sw.js",{scope:"/"});
  const fid=new Promise<string>((resolve,reject)=>{const timer=window.setTimeout(()=>reject(new Error("The device registration timed out. Try again.")),15000);const stop=sdk.onRegistered(messaging,(value:string)=>{window.clearTimeout(timer);stop();resolve(value)});});
  sdk.onUnregistered(messaging,(value:string)=>{void onUnregistered(value)});
  await sdk.register(messaging,{vapidKey:process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,serviceWorkerRegistration});
  const installationId=await fid;await onRegistered(installationId);return installationId;
}

export async function disableFirebasePush(){
  if(!firebaseBrowserIsConfigured())return;
  const {messaging,sdk}=await messagingSdk();await sdk.unregister(messaging);
}
