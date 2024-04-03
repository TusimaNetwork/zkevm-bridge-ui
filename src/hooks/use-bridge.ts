import { BigNumber } from "ethers";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBridgeContext } from "src/contexts/bridge.context";
import { useProvidersContext } from "src/contexts/providers.context";
import { useUIContext } from "src/contexts/ui.context";
import { AsyncTask, Gas, TokenSpendPermission, FormData } from "src/domain";
import { routes } from "src/routes";
import { calculateMaxTxFee } from "src/utils/fees";
import { isTokenEther } from "src/utils/tokens";
import { isAsyncTaskDataAvailable, isMetaMaskUserRejectedRequestError } from "src/utils/types";
import { useCallIfMounted } from "./use-call-if-mounted";
import { useErrorContext } from "src/contexts/error.context";
import { parseError } from "src/adapters/error";
export const useBridge = ({
  formData,
  estimatedGas,
  tokenSpendPermission,
  maxAmountConsideringFee,
  setError
}: {
  formData?: FormData;
  estimatedGas: AsyncTask<Gas, string>;
  tokenSpendPermission?: TokenSpendPermission;
  maxAmountConsideringFee?: BigNumber;
  setError?:any
}) => {
  const { openSnackbar } = useUIContext();

  const { bridge, estimateBridgeGas } = useBridgeContext();
  const [isBridgeInProgress, setIsBridgeInProgress] = useState(false);
  const navigate = useNavigate();
  const { connectedProvider } = useProvidersContext();
  const { notifyError } = useErrorContext();
  const callIfMounted = useCallIfMounted();

  const onBridge = (e?:MouseEvent) => {
    e?.stopPropagation()
    if (
      formData &&
      isAsyncTaskDataAvailable(connectedProvider) &&
      isAsyncTaskDataAvailable(estimatedGas) &&
      maxAmountConsideringFee &&
      tokenSpendPermission
    ) {
      const { from, to, token } = formData;
      setIsBridgeInProgress(true);
      bridge({
        amount: maxAmountConsideringFee,
        destinationAddress: connectedProvider.data.account,
        from,
        gas: estimatedGas.data,
        to,
        token,
        tokenSpendPermission,
      }).then(() => {
          openSnackbar({
            text: "Transaction successfully submitted",
            type: "success-msg",
          });
          navigate(routes.activity.path);
          // setFormData(undefined);
        })
        .catch((error) => {
          callIfMounted(() => {
            setIsBridgeInProgress(false);
            if (isMetaMaskUserRejectedRequestError(error) === false) {
              void parseError(error).then((parsed) => {
                if (parsed === "wrong-network") {
                  setError(`Switch to ${from.name} to continue`);
                } else {
                  notifyError(error);
                }
              });
            }
          });
        });
    }
  }

  return {
    onBridge,
    isBridgeInProgress,
  };
};
