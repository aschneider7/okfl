import { isCommissioner } from "@/lib/commissionerAuth";
import { CommissionerLogin } from "@/components/CommissionerLogin";
import { CommissionerDashboard } from "@/components/CommissionerDashboard";
export const dynamic="force-dynamic";
export default async function CommissionerPage(){return (await isCommissioner())?<CommissionerDashboard/>:<CommissionerLogin/>}
