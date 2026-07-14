"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleMapEmbed } from "@/components/google-map-embed";
import { site } from "@/lib/site";

// 네이버 지도 상시 표시 (#119) — 지도 칸에 네이버 지도가 항상 떠 있어야 한다.
//
// 네이버 클라우드 플랫폼 Maps JS SDK 는 클라이언트 ID 가 필요하다(무료 티어).
// 좌표를 하드코딩하지 않고 SDK 의 Geocoder 로 도로명 주소를 변환한다 — 주소가
// 바뀌어도 site.ts 한 곳만 고치면 된다.
//
// 키가 없으면 이 컴포넌트를 아예 렌더하지 않는다(map-card 가 구글 임베드로 폴백).

declare global {
  interface Window {
    // 키 인증 실패 시 네이버 SDK 가 호출하는 전역 콜백 (문서화된 유일한 실패 신호)
    navermap_authFailure?: () => void;
    naver?: {
      maps: {
        Map: new (el: HTMLElement, opts: object) => object;
        Marker: new (opts: object) => object;
        LatLng: new (lat: number, lng: number) => object;
        Service?: {
          geocode: (
            opts: { query: string },
            cb: (
              status: string,
              res: { v2: { addresses: { x: string; y: string }[] } },
            ) => void,
          ) => void;
          Status: { OK: string };
        };
      };
    };
  }
}

const SDK_ID = "naver-maps-sdk";

export function NaverMap({ clientId }: { clientId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let drawn = false;

    const fail = () => {
      if (!cancelled) setFailed(true);
    };

    // geocoder 서브모듈은 maps.js 의 load 이벤트 이후에 별도 스크립트로 더 받아온다.
    // 그래서 load 직후엔 naver.maps 는 있어도 naver.maps.Service 가 아직 undefined 다
    // (실제로 "Cannot read properties of undefined (reading 'geocode')" 로 터졌다).
    // Service 가 준비될 때까지 폴링한 뒤 지오코딩한다.
    const waitForService = (): Promise<boolean> =>
      new Promise((resolve) => {
        const started = Date.now();
        const tick = () => {
          if (cancelled) return resolve(false);
          if (window.naver?.maps?.Service) return resolve(true);
          if (Date.now() - started > 6000) return resolve(false);
          setTimeout(tick, 100);
        };
        tick();
      });

    const draw = async () => {
      // 잘못된 키면 SDK 스크립트는 200 으로 내려오지만 maps 네임스페이스가 없다.
      if (cancelled || !ref.current) return;
      if (!window.naver?.maps) return fail();

      const ready = await waitForService();
      const naver = window.naver;
      const service = naver?.maps?.Service;
      if (cancelled || !ref.current) return;
      if (!ready || !naver || !service) return fail();

      service.geocode({ query: site.roadAddress }, (status, res) => {
        if (cancelled || !ref.current) return;
        const hit =
          status === service.Status.OK ? res.v2.addresses[0] : undefined;
        if (!hit) {
          // 지오코딩 실패 시 빈 회색 박스를 남기지 않고 구글 지도로 되돌린다.
          return fail();
        }
        const center = new naver.maps.LatLng(Number(hit.y), Number(hit.x));
        const map = new naver.maps.Map(ref.current, {
          center,
          zoom: 17,
          // 상시 노출용이라 조작 UI 는 최소로 — 자세히 보려면 링크로 이동한다.
          scrollWheel: false,
        });
        new naver.maps.Marker({ position: center, map });
        drawn = true;
      });
    };

    // 키 인증 실패(도메인 미등록·만료 등)는 SDK 가 이 전역 콜백으로만 알린다.
    window.navermap_authFailure = fail;

    if (window.naver?.maps) {
      draw();
    } else {
      const existing = document.getElementById(SDK_ID) as HTMLScriptElement | null;
      const script = existing ?? document.createElement("script");
      if (!existing) {
        script.id = SDK_ID;
        script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}&submodules=geocoder`;
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", draw);
      script.addEventListener("error", fail);
    }

    // 위 경로 어디서도 실패를 알려주지 못하는 경우(무응답·인증 콜백 누락)의 최후 방어.
    // 지도 칸이 영구히 빈 채로 남지 않도록 폴백으로 넘긴다.
    // 서브모듈 대기(최대 6초)를 앞지르지 않도록 그보다 길게 잡는다.
    const timer = setTimeout(() => {
      if (!drawn) fail();
    }, 10_000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [clientId]);

  // SDK 로드·지오코딩 실패 시에도 지도 칸을 비워두지 않는다.
  if (failed) return <GoogleMapEmbed />;

  return (
    <div
      ref={ref}
      role="img"
      aria-label={`${site.place} 위치 지도 — ${site.roadAddress}`}
      className="h-full w-full"
    />
  );
}
