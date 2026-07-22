import {readFileSync} from "node:fs";

const migration=readFileSync(new URL("../supabase/005_franchise_accounts.sql",import.meta.url),"utf8");
const commissionerPromotion=readFileSync(new URL("../supabase/012_add_haimy_commissioner.sql",import.meta.url),"utf8");
const bootstrap=readFileSync(new URL("./bootstrap-franchise-accounts.mjs",import.meta.url),"utf8");
const commissioner=readFileSync(new URL("../lib/commissionerAuth.ts",import.meta.url),"utf8");
for(const token of ["franchise_accounts","must_change_password","commissioner"])if(!migration.includes(token))throw new Error(`Account migration missing ${token}`);
for(const username of ["aaron","elie","sammy","isaac","tzvi","usher","josh-teddy","haimy","maurice","sean"])if(!bootstrap.includes(`username:\"${username}\"`))throw new Error(`Bootstrap missing ${username}`);
for(const username of ["aaron","haimy"])if(!bootstrap.includes(`username:\"${username}\",displayName:`)||!bootstrap.match(new RegExp(`username:\"${username}\"[^\\n]+role:\"commissioner\"`)))throw new Error(`Bootstrap does not grant Commissioner access to ${username}`);
for(const token of ["F08","haimy","commissioner"])if(!commissionerPromotion.includes(token))throw new Error(`Haimy Commissioner migration missing ${token}`);
if(!commissioner.includes('role==="commissioner"')||!commissioner.includes("mustChangePassword"))throw new Error("Commissioner role guard is incomplete");
console.log({franchise_accounts:10,commissioners:["aaron","haimy"],first_login_password_change:true});
