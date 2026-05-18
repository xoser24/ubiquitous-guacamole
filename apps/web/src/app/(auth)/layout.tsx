export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative">
      {/* Foto arkaplan */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/auth-bg.jpg)" }}
        />
        {/* okunabilirlik için premium overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/55 to-black/75" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(212,175,55,.18),transparent_50%),radial-gradient(circle_at_70%_40%,rgba(34,211,238,.18),transparent_55%)]" />
      </div>

      <div className="min-h-screen grid place-items-center p-4">
        {children}
      </div>

      <footer className="absolute bottom-0 left-0 right-0 p-3 text-center text-xs text-white/60">
        © {new Date().getFullYear()} Altınordu Spor Kulübü • Yönetim Sistemi
      </footer>
    </div>
  );
}
