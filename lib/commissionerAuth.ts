import {getAccountFromRequest} from "@/lib/accountServer";

export async function isCommissioner(request:Request) {
  const account=await getAccountFromRequest(request);
  return account?.role==="commissioner"&&!account.mustChangePassword;
}
