import type { Metadata } from "next";
import { ImageIcon } from "lucide-react";
import { Container } from "@/components/container";

export const metadata: Metadata = {
  title: "About",
  description: "와비-사비, 불완전함과 무상함의 아름다움을 받아들이는 미학",
};

const values = [
  { en: "Imperfection", ko: "불완전함 속에서 발견하는 독특한 아름다움" },
  { en: "Simplicity", ko: "단순함이 만들어내는 깊이있는 여백" },
  { en: "Authenticity", ko: "장인의 손길이 담긴 진정성있는 작품" },
];

export default function AboutPage() {
  return (
    <>
      <Container className="py-16">
        <h1 className="text-center text-2xl font-semibold">About</h1>

        <div className="mt-12 grid gap-12 md:grid-cols-2 md:items-start">
          <div>
            <h2 className="text-xl font-semibold">
              철학 <span className="text-wabi-fg-muted">Philosophy</span>
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-7 text-wabi-fg-muted">
              <p>
                わび-さび (Wabi-sabi)는 불완전함과 무상함의 아름다움을 받아들이는
                일본의 미학입니다.
              </p>
              <p>
                우리는 시간의 흔적이 담긴 수공예 도자기와 생활 오브제를
                큐레이션합니다. 각 제품은 장인의 손길이 닿은 유일무이한
                작품입니다.
              </p>
              <p>
                10년 넘게 오가바의 도자기로 만든 라면을 먹어온 우리가, 생각한
                도자기를 만들어주었으면 하고 오가바 작가님께 주문을 했습니다.
                주문하신 분들만이 가지실 수 있는 특별한 작품들입니다.
              </p>
              <p className="pt-2 text-wabi-fg">
                <strong className="font-medium">Open</strong> 오후 12:00 – 7:00
                <br />
                <strong className="font-medium">Closed</strong> 수요일 휴무
              </p>
            </div>
          </div>
          <div className="flex aspect-square items-center justify-center bg-wabi-muted">
            <ImageIcon
              className="size-10 text-wabi-fg-muted/40"
              strokeWidth={1}
              aria-hidden
            />
          </div>
        </div>
      </Container>

      <section className="bg-wabi-subtle">
        <Container className="py-20">
          <h2 className="text-center text-xl font-semibold">Our Values</h2>
          <div className="mt-12 grid gap-10 text-center md:grid-cols-3">
            {values.map((v) => (
              <div key={v.en}>
                <h3 className="text-base font-medium">{v.en}</h3>
                <p className="mt-3 text-sm text-wabi-fg-muted">{v.ko}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
