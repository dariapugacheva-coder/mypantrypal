import Link from "next/link";
import { Penguin } from "@/components/mascot/Penguin";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 gutter text-center">
      <Penguin mood="think" size={100} />
      <h1 className="text-2xl font-semibold">This page isn&apos;t in the fridge</h1>
      <Link href="/home" className="rounded-xl bg-mint px-4 py-2.5 font-medium text-mint-on">Go home</Link>
    </main>
  );
}
