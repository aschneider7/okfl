import {Page} from "@/components/Page";
import {DraftRankingsClient} from "@/components/DraftRankingsClient";

export default function DraftRankingsPage(){
  return <Page title="My Draft Board" subtitle="Build a private player order that follows you into the live room while the official Sleeper board updates beside it."><DraftRankingsClient/></Page>;
}
