import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function NotFoundPage() {
  return (
    <Container className="grid min-h-[70vh] place-items-center py-16 text-center">
      <div className="max-w-md">
        <p className="text-sm font-bold uppercase tracking-wider text-green-700">404 · Page not found</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">This page isn&apos;t in the syllabus.</h1>
        <p className="mt-4 leading-7 text-slate-600">The link may be outdated, or the page may have moved. Head home to continue your preparation.</p>
        <ButtonLink href="/" className="mt-7">Return home</ButtonLink>
      </div>
    </Container>
  );
}
