import type { BankTransferInfo } from "@/types";

export function hasBankTransferInfo(info: BankTransferInfo): boolean {
  return !!(
    info.bankName &&
    info.branchName &&
    info.accountType &&
    info.accountNumber &&
    info.accountHolder
  );
}
