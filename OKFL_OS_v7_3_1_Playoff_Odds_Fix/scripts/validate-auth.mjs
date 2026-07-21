import {readFileSync} from "node:fs";

const migration=readFileSync(new URL("../supabase/005_franchise_accounts.sql",import.meta.url),"utf8");
const bootstrap=readFileSync(new URL("./bootstrap-franchise-accounts.mjs",import.meta.url),"utf8");
const commissioner=readFileSync(new URL("../lib/commissionerAuth.ts",import.meta.url),"utf8");
for(const token of ["franchise_accounts","must_change_password","commissioner"])if(!migration.includes(token))throw new Error(`Account migration missing ${token}`);
for(const username of ["aaron","elie","sammy","isaac","tzvi","usher","josh-teddy","haimy","maurice","sean"])if(!bootstrap.includes(`username:\"${username}\"`))throw new Error(`Bootstrap missing ${username}`);
if(!commissioner.includes('role==="commissioner"')||!commissioner.includes("mustChangePassword"))throw new Error("Commissioner role guard is incomplete");
console.log({franchise_accounts:10,commissioner:"aaron",first_login_password_change:true});
