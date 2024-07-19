import { BigNumber } from "ethers";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBridgeContext } from "src/contexts/bridge.context";
import { useProvidersContext } from "src/contexts/providers.context";
import { useTokensContext } from "src/contexts/tokens.context";
import { useUIContext } from "src/contexts/ui.context";
import { AsyncTask, Gas, TokenSpendPermission, FormData } from "src/domain";
import { routes } from "src/routes";
import { calculateMaxTxFee } from "src/utils/fees";
import { isTokenEther, selectTokenAddress } from "src/utils/tokens";
import { isAsyncTaskDataAvailable, isMetaMaskUserRejectedRequestError } from "src/utils/types";
import { useCallIfMounted } from "./use-call-if-mounted";
import { parseError } from "src/adapters/error";
import { useErrorContext } from "src/contexts/error.context";
import { getPermit, isContractAllowedToSpendToken } from "src/adapters/ethereum";
export const useApprove = ({
  formData,
  setError,
}: {
  formData?: FormData;
  setError?: any;
}) => {
  const { connectedProvider } = useProvidersContext();
  const [approvalTask, setApprovalTask] = useState<AsyncTask<null, string>>({
    status: "pending",
  });
  const { notifyError } = useErrorContext();
  const { approve, getErc20TokenBalance, tokens } = useTokensContext();
  const callIfMounted = useCallIfMounted();
  const [tokenSpendPermission, setTokenSpendPermission] = useState<TokenSpendPermission>();
  const [tokenBalance, setTokenBalance] = useState<BigNumber>();

  const onApprove = (e?:MouseEvent) => {
    e?.stopPropagation()
    if (isAsyncTaskDataAvailable(connectedProvider) && formData) {
      setApprovalTask({ status: "loading" });
      const { amount, from, token } = formData;
      void approve({
        amount,
        from,
        owner: connectedProvider.data.account,
        provider: connectedProvider.data.provider,
        spender: from.bridgeContractAddress,
        token,
      })
        .then(() => {
          callIfMounted(() => {
            setApprovalTask({ data: null, status: "successful" });
            setTokenSpendPermission({ type: "none" });
          });
        })
        .catch((error) => {
          callIfMounted(() => {
            if (isMetaMaskUserRejectedRequestError(error)) {
              setApprovalTask({ status: "pending" });
            } else {
              void parseError(error).then((parsed) => {
                if (parsed === "wrong-network") {
                  setError(`Switch to ${from.name} to continue`);
                  setApprovalTask({ status: "pending" });
                } else {
                  setApprovalTask({ error: parsed, status: "failed" });
                  notifyError(parsed);
                }
              });
            }
          });
        });
    }
  }; 
  useEffect(() => {
    if (connectedProvider.status === "successful" && formData) {
      const { amount, from, token } = formData;

      if (isTokenEther(token)) {
        setTokenSpendPermission({ type: "none" });
      } else {
        isContractAllowedToSpendToken({
          amount: amount,
          from: from,
          owner: connectedProvider.data.account,
          provider: from.provider,
          spender: from.bridgeContractAddress,
          token: token,
        })
          .then((isAllowed) => {
            callIfMounted(() => {
              if (isAllowed) {
                setTokenSpendPermission({ type: "none" });
              } else {
                getPermit({
                  chain: from,
                  token,
                })
                  .then((permit) => {
                    callIfMounted(() => {
                      setTokenSpendPermission({ permit, type: "permit" });
                    });
                  })
                  .catch(() => {
                    setTokenSpendPermission({ type: "approval" });
                  });
              }
            });
          })
          .catch(notifyError);
      }
    }
  }, [formData, connectedProvider, notifyError, callIfMounted]);

  useEffect(() => {
    // Load the balance of the token when it's not available
    if (formData?.token.balance && isAsyncTaskDataAvailable(formData.token.balance)) {
      setTokenBalance(formData.token.balance.data);
    } else if (formData && connectedProvider.status === "successful") {
      const { from, token } = formData;

      if (isTokenEther(token)) {
        void from.provider
          .getBalance(connectedProvider.data.account)
          .then((balance) =>
            callIfMounted(() => {
              setTokenBalance(balance);
            })
          )
          .catch((error) => {
            callIfMounted(() => {
              notifyError(error);
              setTokenBalance(undefined);
            });
          });
      } else {
        getErc20TokenBalance({
          accountAddress: connectedProvider.data.account,
          chain: from,
          tokenAddress: selectTokenAddress(token, from),
        })
          .then((balance) =>
            callIfMounted(() => {
              setTokenBalance(balance);
            })
          )
          .catch(() =>
            callIfMounted(() => {
              setTokenBalance(undefined);
            })
          );
      }
    }
  }, [connectedProvider, formData?.amount, getErc20TokenBalance, notifyError, callIfMounted]);

  return {
    approvalTask,
    onApprove,
    tokenBalance,
    tokenSpendPermission
  };
};
