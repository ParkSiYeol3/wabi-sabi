import type { Metadata } from "next";
import { Clock, MapPin, AtSign, Mail } from "lucide-react";
import { Container } from "@/components/container";
import { MapCard } from "@/components/map-card";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "WABI-SABI 매장 방문 안내 및 문의",
};

export default function ContactPage() {
  return (
    <Container className="py-16">
      <h1 className="text-center text-2xl font-semibold">
        방문 안내 <span className="text-wabi-fg-muted">Visit Us</span>
      </h1>

      <div className="mt-12 grid gap-12 md:grid-cols-2 md:items-start">
        {/* a11y: dt/dd 없는 dl 은 마크업 위반(Lighthouse definition-list) → ul (홈과 동일) */}
        <ul className="space-y-8">
          <Item icon={<Clock className="size-5" strokeWidth={1.5} />} title="영업 시간">
            <p>{site.hours}</p>
            <p className="text-wabi-fg-muted">{site.closed}</p>
          </Item>
          <Item icon={<MapPin className="size-5" strokeWidth={1.5} />} title="위치">
            <p>{site.place}</p>
            <p className="text-wabi-fg-muted">{site.address}</p>
            <p className="text-wabi-fg-muted">{site.addressNote}</p>
          </Item>
          <Item icon={<AtSign className="size-5" strokeWidth={1.5} />} title="인스타그램">
            <a href={site.instagramUrl} className="hover:underline">
              {site.instagram}
            </a>
          </Item>
          <Item icon={<Mail className="size-5" strokeWidth={1.5} />} title="문의">
            <a href={`mailto:${site.email}`} className="hover:underline">
              {site.email}
            </a>
          </Item>
        </ul>
        <MapCard />
      </div>
    </Container>
  );
}

function Item({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span className="mt-0.5 text-wabi-fg" aria-hidden>
        {icon}
      </span>
      <div className="text-sm">
        <h2 className="font-medium">{title}</h2>
        <div className="mt-1 space-y-0.5">{children}</div>
      </div>
    </li>
  );
}
