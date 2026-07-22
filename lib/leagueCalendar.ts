export const CALENDAR_LEAGUE_ID="okfl";

export const calendarCategories=["league","keeper","draft","matchup","waiver","trade","vote","social"] as const;
export type CalendarCategory=(typeof calendarCategories)[number];

export type LeagueCalendarEvent={
  id:string;
  title:string;
  description:string;
  category:CalendarCategory;
  startsAt:string;
  endsAt:string|null;
  allDay:boolean;
  href:string;
  source:"calendar"|"keepers"|"vote";
  editable:boolean;
};

export function mapCalendarEvent(row:any):LeagueCalendarEvent{
  const category=calendarCategories.includes(row.category)?row.category:"league";
  return {id:String(row.id),title:String(row.title||"League event"),description:String(row.description||""),category,startsAt:String(row.starts_at),endsAt:row.ends_at?String(row.ends_at):null,allDay:Boolean(row.all_day),href:String(row.href||""),source:"calendar",editable:true};
}

export function calendarMigrationMissing(error:any){
  const message=String(error?.message||error||"").toLowerCase();
  return message.includes("league_calendar_events")||message.includes("schema cache")||message.includes("relation")&&message.includes("does not exist");
}
