import {useDraft} from "../context/DraftContext";
import {RecommendationCard} from "./RecommendationCard";

export function BestAvailable() {
  const {recommendations, setSelectedPlayer, userOnClock} = useDraft();
  return <article className="draftV2Recommendations"><header><span className="eyebrow">Your board</span><h2>Top recommendations</h2></header>
    {recommendations.slice(0, 5).map((row, index) => <RecommendationCard key={row.player.name}
      recommendation={row} rank={index + 1} disabled={!userOnClock} onSelect={() => setSelectedPlayer(row.player)} />)}
  </article>;
}
