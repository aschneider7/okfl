import type {CommissionerRecap} from "@/lib/commissionerRecap";

export function RecapArticle({recap,preview=false}:{recap:CommissionerRecap;preview?:boolean}){
  return <article className={preview?"commissionerArticle preview":"commissionerArticle"}>
    <header><span className="eyebrow">OKFL WEEK {recap.week} · COMMISSIONER RECAP</span><h2>{recap.headline}</h2><p>{recap.dek}</p><div><span>{recap.status==="published"?"Published":"Draft preview"}</span>{recap.updatedBy&&<span>Edited by {recap.updatedBy}</span>}</div></header>
    {recap.quote&&<blockquote>{recap.quote}</blockquote>}
    <div className="recapArticleBody">{recap.sections.map((section)=><section key={section.key}><span>{section.label}</span>{section.body.split(/\n\n+/).map((paragraph,index)=><p key={index}>{paragraph}</p>)}</section>)}</div>
  </article>;
}
