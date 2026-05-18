import Link from "next/link";

export default function YetkisizPage() {
  return (
    <div className="min-h-full grid place-items-center p-6">
      <div className="card card-neon p-6 max-w-lg w-full">
        <h1 className="text-2xl font-semibold">Yetkisiz Erişim</h1>
        <p className="text-[color:var(--muted)] mt-2">
          Bu sayfaya erişim yetkiniz yok.
        </p>
        <div className="mt-4">
          <Link className="btn-primary" href="/">
            Ana Sayfa
          </Link>
        </div>
      </div>
    </div>
  );
}
