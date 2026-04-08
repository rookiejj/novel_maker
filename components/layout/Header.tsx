export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-brand-100 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-xl items-center px-4 py-3.5">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-lg font-bold tracking-tight text-brand-700">한편</h1>
          <span className="text-[11px] font-medium text-brand-300 tracking-wide">
            아무도 읽지 않는 이야기를 씁니다
          </span>
        </div>
      </div>
    </header>
  );
}