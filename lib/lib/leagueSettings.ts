export const OKFL_SETTINGS_LEAGUE_ID="okfl";

export type ManagedRule={
  id:string;
  category:string;
  rule:string;
  status:"draft"|"published";
  sortOrder:number;
  updatedAt:string|null;
};

export type PublicLeagueSettings={
  rulebookVersion:string;
  noticeActive:boolean;
  noticeTitle:string;
  noticeBody:string;
  noticeHref:string;
  updatedAt:string|null;
};

export const defaultLeagueSettings:PublicLeagueSettings={
  rulebookVersion:"2026.1",
  noticeActive:false,
  noticeTitle:"",
  noticeBody:"",
  noticeHref:"",
  updatedAt:null,
};

export function mapSettings(row:any):PublicLeagueSettings{
  if(!row)return defaultLeagueSettings;
  return {
    rulebookVersion:String(row.rulebook_version||defaultLeagueSettings.rulebookVersion),
    noticeActive:Boolean(row.notice_active),
    noticeTitle:String(row.notice_title||""),
    noticeBody:String(row.notice_body||""),
    noticeHref:String(row.notice_href||""),
    updatedAt:row.updated_at?String(row.updated_at):null,
  };
}

export function mapRule(row:any):ManagedRule{
  return {id:String(row.id),category:String(row.category),rule:String(row.rule),status:row.status==="draft"?"draft":"published",sortOrder:Number(row.sort_order||0),updatedAt:row.updated_at?String(row.updated_at):null};
}

export function settingsMigrationMissing(error:any){
  const message=String(error?.message||error||"").toLowerCase();
  return message.includes("league_settings")||message.includes("league_rules")||message.includes("schema cache")||message.includes("relation")&&message.includes("does not exist");
}
