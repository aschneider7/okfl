type ErrorRecord={message?:unknown;details?:unknown;hint?:unknown;code?:unknown};

export function serverErrorMessage(error:unknown,fallback:string){
  if(error instanceof Error&&error.message.trim())return error.message.trim();
  if(typeof error==="string"&&error.trim())return error.trim();
  if(error&&typeof error==="object"){
    const value=error as ErrorRecord;
    const parts=[value.message,value.details,value.hint]
      .filter((part):part is string=>typeof part==="string"&&Boolean(part.trim()))
      .map((part)=>part.trim());
    if(parts.length)return [...new Set(parts)].join(" ");
    if(typeof value.code==="string"&&value.code.trim())return `${fallback} (${value.code.trim()})`;
  }
  return fallback;
}

export function keeperServerError(error:unknown,fallback:string){
  const message=serverErrorMessage(error,fallback);
  const code=error&&typeof error==="object"&&"code" in error?String((error as ErrorRecord).code||""):"";
  const searchable=`${message} ${code}`.toLowerCase();
  if(searchable.includes("keeper_eligibility")||searchable.includes("save_official_keeper_submission")||searchable.includes("set_official_keeper_lock")||searchable.includes("pgrst202")||searchable.includes("pgrst205")){
    return "Keeper database setup is incomplete. Run supabase/008_keeper_integrity.sql in the Supabase SQL Editor, then retry.";
  }
  if(searchable.includes("keeper_windows")||searchable.includes("keeper_submissions")){
    return "Official keeper tables are missing. Run supabase/006_official_keepers_and_auth_draft.sql, then migration 008, and retry.";
  }
  return message;
}
