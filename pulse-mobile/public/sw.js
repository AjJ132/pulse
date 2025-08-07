if(!self.define){let e,s={};const a=(a,c)=>(a=new URL(a+".js",c).href,s[a]||new Promise(s=>{if("document"in self){const e=document.createElement("script");e.src=a,e.onload=s,document.head.appendChild(e)}else e=a,importScripts(a),s()}).then(()=>{let e=s[a];if(!e)throw new Error(`Module ${a} didn't register its module`);return e}));self.define=(c,t)=>{const i=e||("document"in self?document.currentScript.src:"")||location.href;if(s[i])return;let n={};const f=e=>a(e,i),r={module:{uri:i},exports:n,require:f};s[i]=Promise.all(c.map(e=>r[e]||f(e))).then(e=>(t(...e),n))}}define(["./workbox-00a24876"],function(e){"use strict";importScripts(),self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute([{url:"/_next/static/4VVXTG8vvWtM51HagXHsq/_buildManifest.js",revision:"d40f7ccd4d43f191f8a7acf78aa441c0"},{url:"/_next/static/4VVXTG8vvWtM51HagXHsq/_ssgManifest.js",revision:"b6652df95db52feb4daf4eca35380933"},{url:"/_next/static/chunks/4bd1b696-cf72ae8a39fa05aa.js",revision:"cf72ae8a39fa05aa"},{url:"/_next/static/chunks/766-1cd631173aa77bb4.js",revision:"1cd631173aa77bb4"},{url:"/_next/static/chunks/964-38db4bd4892fef52.js",revision:"38db4bd4892fef52"},{url:"/_next/static/chunks/app/_not-found/page-c3803d3185c69e96.js",revision:"c3803d3185c69e96"},{url:"/_next/static/chunks/app/layout-9955483d24a0016a.js",revision:"9955483d24a0016a"},{url:"/_next/static/chunks/app/page-ca8e3839ae0a6abd.js",revision:"ca8e3839ae0a6abd"},{url:"/_next/static/chunks/framework-7c95b8e5103c9e90.js",revision:"7c95b8e5103c9e90"},{url:"/_next/static/chunks/main-ac4614d2b7422761.js",revision:"ac4614d2b7422761"},{url:"/_next/static/chunks/main-app-32affce209e1ff59.js",revision:"32affce209e1ff59"},{url:"/_next/static/chunks/pages/_app-0a0020ddd67f79cf.js",revision:"0a0020ddd67f79cf"},{url:"/_next/static/chunks/pages/_error-03529f2c21436739.js",revision:"03529f2c21436739"},{url:"/_next/static/chunks/polyfills-42372ed130431b0a.js",revision:"846118c33b2c0e922d7b3a7676f81f6f"},{url:"/_next/static/chunks/webpack-8c94b35adf29e9b1.js",revision:"8c94b35adf29e9b1"},{url:"/_next/static/css/590e9bcef7391a19.css",revision:"590e9bcef7391a19"},{url:"/_next/static/media/569ce4b8f30dc480-s.p.woff2",revision:"ef6cefb32024deac234e82f932a95cbd"},{url:"/_next/static/media/747892c23ea88013-s.woff2",revision:"a0761690ccf4441ace5cec893b82d4ab"},{url:"/_next/static/media/8d697b304b401681-s.woff2",revision:"cc728f6c0adb04da0dfcb0fc436a8ae5"},{url:"/_next/static/media/93f479601ee12b01-s.p.woff2",revision:"da83d5f06d825c5ae65b7cca706cb312"},{url:"/_next/static/media/9610d9e46709d722-s.woff2",revision:"7b7c0ef93df188a852344fc272fc096b"},{url:"/_next/static/media/ba015fad6dcf6784-s.woff2",revision:"8ea4f719af3312a055caf09f34c89a77"},{url:"/file.svg",revision:"d09f95206c3fa0bb9bd9fefabfd0ea71"},{url:"/globe.svg",revision:"2aaafa6a49b6563925fe440891e32717"},{url:"/icon.svg",revision:"07eb5c86e03fb3cdb33f2cfca0fd5888"},{url:"/manifest.json",revision:"1a7a897d64609fe74016b0ae9b817b67"},{url:"/next.svg",revision:"8e061864f388b47f33a1c3780831193e"},{url:"/offline.html",revision:"dbcb5c3a617923794f3a4e2cfc001daa"},{url:"/push-worker.js",revision:"f67fa1fcb107e1329e0438608acc2d04"},{url:"/vercel.svg",revision:"c0af2f507b369b085b35ef4bbe3bcf1e"},{url:"/window.svg",revision:"a2760511c65806022ad20adf74370ff3"}],{ignoreURLParametersMatching:[]}),e.cleanupOutdatedCaches(),e.registerRoute("/",new e.NetworkFirst({cacheName:"start-url",plugins:[{cacheWillUpdate:async({request:e,response:s,event:a,state:c})=>s&&"opaqueredirect"===s.type?new Response(s.body,{status:200,statusText:"OK",headers:s.headers}):s}]}),"GET"),e.registerRoute(/^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,new e.CacheFirst({cacheName:"google-fonts-webfonts",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:31536e3})]}),"GET"),e.registerRoute(/^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,new e.StaleWhileRevalidate({cacheName:"google-fonts-stylesheets",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:604800})]}),"GET"),e.registerRoute(/\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,new e.StaleWhileRevalidate({cacheName:"static-font-assets",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:604800})]}),"GET"),e.registerRoute(/\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,new e.StaleWhileRevalidate({cacheName:"static-image-assets",plugins:[new e.ExpirationPlugin({maxEntries:64,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\/_next\/static\/.+\/.+\.(js|css)$/,new e.StaleWhileRevalidate({cacheName:"static-resources",plugins:[]}),"GET"),e.registerRoute(/^https:\/\/.*\.execute-api\..*\.amazonaws\.com\/.*/i,new e.NetworkFirst({cacheName:"api-cache",networkTimeoutSeconds:10,plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:3600})]}),"GET")});

// ===== PUSH NOTIFICATION HANDLING =====

// Handle push notifications
self.addEventListener('push', async (event) => {
  console.log('[SW] Push event received:', event);

  if (!event.data) {
    console.log('[SW] Push event has no data');
    return;
  }

  try {
    const data = JSON.parse(event.data.text());
    console.log('[SW] Push data:', data);
    
    // Extract notification data - handle both formats
    const title = data.title || data.message || 'New Notification';
    const body = data.body || data.message || '';
    const icon = data.icon || '/icon.svg';
    const badge = data.badge || '/icon.svg';
    const tag = data.tag || 'default';
    const url = data.data?.click_action || data.url || '/';

    const options = {
      body: body,
      icon: icon,
      badge: badge,
      tag: tag,
      data: {
        url: url,
        timestamp: new Date().toISOString(),
        ...data
      },
      actions: [
        {
          action: 'open',
          title: 'Open App'
        },
        {
          action: 'close',
          title: 'Close'
        }
      ],
      requireInteraction: false,
      silent: false,
      vibrate: [200, 100, 200]
    };

    console.log('[SW] Showing notification:', { title, options });

    event.waitUntil(
      self.registration.showNotification(title, options)
    );

    console.log('[SW] Notification displayed successfully');
  } catch (error) {
    console.error('[SW] Error processing push event:', error);
    
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('New Notification', {
        body: 'You have a new message',
        icon: '/icon.svg',
        badge: '/icon.svg',
        data: { url: '/' }
      })
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received:', event);
  
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};
  const url = data.url || '/';

  console.log('[SW] Notification click action:', action, 'URL:', url);

  if (action === 'close') {
    console.log('[SW] Notification closed by user');
    return;
  }

  // Handle the notification click (open/default action)
  event.waitUntil(
    (async () => {
      try {
        // Get all window clients
        const clients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true
        });

        console.log('[SW] Found clients:', clients.length);

        // Check if there's already a window open with our app
        for (const client of clients) {
          if (client.url.includes(self.location.origin)) {
            console.log('[SW] Focusing existing client:', client.url);
            await client.focus();
            
            // Navigate to the specified URL if needed
            if (url !== '/' && client.navigate) {
              await client.navigate(url);
            }
            return;
          }
        }

        // If no existing window, open a new one
        console.log('[SW] Opening new window:', url);
        const newClient = await self.clients.openWindow(url);
        if (newClient) {
          await newClient.focus();
        }
      } catch (error) {
        console.error('[SW] Error handling notification click:', error);
        // Fallback - just open the app
        await self.clients.openWindow('/');
      }
    })()
  );
});

console.log('[SW] Push notification handling added to service worker');