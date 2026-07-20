"use client";

export default function GlobalError({error, reset}: {error: Error & {digest?: string}; reset: () => void}) {
  return <main className="appError" role="alert"><span>OKFL OS recovered an error</span><h1>This view couldn’t finish loading.</h1>
    <p>{error.message || "The underlying data or service was unavailable."}</p><button type="button" onClick={reset}>Try again</button></main>;
}
