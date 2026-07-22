export function Page({title, subtitle, children}: {title: string; subtitle?: string; children: React.ReactNode}) {
  return <section className="page"><div className="pageHead"><div><span>OKFL intelligence suite</span><h1>{title}</h1></div>{subtitle && <p>{subtitle}</p>}</div>{children}</section>;
}

export function Loading() { return <div className="card loadingCard"><span />Loading OKFL data…</div>; }
