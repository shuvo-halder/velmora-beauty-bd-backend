import React, { useEffect } from "react";
import axios from "axios";

export const AnalyticsScriptLoader: React.FC = () => {
  useEffect(() => {
    let isMounted = true;

    async function loadAnalyticsConfig() {
      try {
        const res = await axios.get("/api/storefront/v1/settings/public");
        if (!isMounted) return;

        const analytics = res.data?.data?.analytics || res.data?.analytics;
        if (!analytics || !analytics.enableAnalytics) return;

        // 1. Google Tag Manager (GTM)
        const gtmId = analytics.googleTagManagerId || analytics.gtmContainerId;
        if (gtmId && !document.getElementById("gtm-script")) {
          const script = document.createElement("script");
          script.id = "gtm-script";
          script.async = true;
          script.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');`;
          document.head.appendChild(script);
        }

        // 2. Google Analytics 4 (GA4)
        const ga4Id = analytics.googleAnalyticsId || analytics.ga4MeasurementId;
        if (ga4Id && !document.getElementById("ga4-script")) {
          const gaScript = document.createElement("script");
          gaScript.id = "ga4-script";
          gaScript.async = true;
          gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`;
          document.head.appendChild(gaScript);

          const configScript = document.createElement("script");
          configScript.id = "ga4-config-script";
          configScript.innerHTML = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', '${ga4Id}');
          `;
          document.head.appendChild(configScript);
        }

        // 3. Meta / Facebook Pixel
        const fbPixelId = analytics.facebookPixelId || analytics.metaPixelId;
        if (fbPixelId && !document.getElementById("fb-pixel-script")) {
          const fbScript = document.createElement("script");
          fbScript.id = "fb-pixel-script";
          fbScript.innerHTML = `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${fbPixelId}');
            fbq('track', 'PageView');
          `;
          document.head.appendChild(fbScript);
        }
      } catch (err) {
        console.warn("Failed to load storefront analytics configuration:", err);
      }
    }

    loadAnalyticsConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  return null;
};
