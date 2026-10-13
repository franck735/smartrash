import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

const parseAuthParams = (url: string) => {
  const parsed = new URL(url);
  const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const searchParams = parsed.searchParams;

  return {
    code: searchParams.get("code") ?? hashParams.get("code"),
    accessToken: searchParams.get("access_token") ?? hashParams.get("access_token"),
    refreshToken: searchParams.get("refresh_token") ?? hashParams.get("refresh_token"),
  };
};

const NativeAppBridge = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const handleDeepLink = async (url: string) => {
      try {
        const { code, accessToken, refreshToken } = parseAuthParams(url);

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          navigate("/dashboard", { replace: true });
          return;
        }

        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
          navigate("/dashboard", { replace: true });
        }
      } catch {
        // Ignore invalid callback URLs and keep current route.
      }
    };

    let listener: PluginListenerHandle | undefined;

    CapacitorApp.addListener("appUrlOpen", ({ url }) => {
      void handleDeepLink(url);
    }).then((handle) => {
      listener = handle;
    });

    void CapacitorApp.getLaunchUrl().then((launch) => {
      if (launch?.url) {
        void handleDeepLink(launch.url);
      }
    });

    return () => {
      void listener?.remove();
    };
  }, [navigate]);

  return null;
};

export default NativeAppBridge;
