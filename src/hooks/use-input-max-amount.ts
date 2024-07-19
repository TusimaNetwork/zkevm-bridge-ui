import { BigNumber } from "ethers";
import { useMemo, useState } from "react";
import { useBridgeContext } from "src/contexts/bridge.context";
import { useProvidersContext } from "src/contexts/providers.context";
import { AsyncTask, Gas, TokenSpendPermission, FormData } from "src/domain";
import { calculateMaxTxFee } from "src/utils/fees";
import { isTokenEther } from "src/utils/tokens";
import useSWR from "swr";

export const useInputMaxAmount = ({
  formData,
  tokenBalance,
  tokenSpendPermission,
}: {
  formData?: FormData;
  tokenBalance?: BigNumber;
  tokenSpendPermission?: TokenSpendPermission;
}) => {
  const { connectedProvider } = useProvidersContext();
  const { estimateBridgeGas } = useBridgeContext();

  const { data: result, isLoading } = useSWR(
    [connectedProvider, formData, tokenBalance, tokenSpendPermission],
    async () => {
      if (
        connectedProvider.status === "successful" &&
        //     estimatedGas.status === "pending" &&
        formData &&
        tokenBalance &&
        tokenSpendPermission
      ) {
        const { amount, from, to, token } = formData;
        const destinationAddress = connectedProvider.data.account;
        const gas:Gas = await estimateBridgeGas({
          destinationAddress,
          from,
          to,
          token,
          tokenSpendPermission,
        });

        const newFee = calculateMaxTxFee(gas)

        if (!newFee) {
          return {
            gas: { error: "Gas data is not available", status: "failed" },
          };
        }

        const newMaxAmountConsideringFee = (() => {
          if (isTokenEther(token)) {
            const amountConsideringFee = amount.add(newFee);
            const tokenBalanceRemainder = amountConsideringFee.sub(tokenBalance);
            const doesAmountExceedsTokenBalance = tokenBalanceRemainder.isNegative();
            const newMaxAmountConsideringFee = !doesAmountExceedsTokenBalance ? amount.sub(tokenBalanceRemainder) : amount;
            return newMaxAmountConsideringFee;
          } else {
            return amount;
          }
        })();
        return {
          maxAmountConsideringFee: newMaxAmountConsideringFee,
          gas: { data: gas, status: "successful" },
        };
      }
      return { gas: { status: "pending" } };
    }
  );

  const estimatedGas:any = useMemo(() => {
    if (isLoading || !result) return { status: "loading" };
    if(result?.gas){
	return result.gas
    }
    return { status: "pending" };
  }, [result, isLoading]);
  const maxAmountConsideringFee = useMemo(() => {
    return result?.maxAmountConsideringFee;
  }, [result, isLoading]);
  return {
    isLoading,
    estimatedGas,
    maxAmountConsideringFee,
  };
};
