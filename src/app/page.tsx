import Dashboard from "./components/Dashboard";
import SettingsButton from "./components/SettingsButton";

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-app/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-3.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            股
          </span>
          <div className="leading-tight">
            <h1 className="text-[15px] font-semibold tracking-tight">
              我的股票摘要站
            </h1>
            <p className="text-[11px] text-faint">
              即時報價 · 走勢 · 籌碼 · 新聞
            </p>
          </div>
          <span className="ml-auto hidden text-[11px] text-faint sm:block">
            報價 TWSE MIS ｜ 資料 FinMind ｜ 新聞 Yahoo
          </span>
          <div className="ml-auto sm:ml-3">
            <SettingsButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">
        <Dashboard />
      </main>

      <footer className="border-t border-line px-5 py-6 text-center text-[11px] text-faint">
        資料僅供參考，不構成投資建議。
      </footer>
    </>
  );
}
