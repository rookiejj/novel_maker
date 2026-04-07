export default function Header() {
  return (
    <header className="border-b border-stone-100 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
        <div>
          <h1 className="font-serif text-xl font-bold tracking-tight text-stone-800">서사</h1>
          <p className="text-[10px] text-stone-400 tracking-widest uppercase">Your story, every day</p>
        </div>
      </div>
    </header>
  );
}