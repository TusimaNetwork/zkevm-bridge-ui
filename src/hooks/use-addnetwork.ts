import { useCallback, useState } from "react";
import { useEnvContext } from "src/contexts/env.context";
import { useProvidersContext } from "src/contexts/providers.context";
import { useUIContext } from "src/contexts/ui.context";
import { useCallIfMounted } from "./use-call-if-mounted";
import { useErrorContext } from "src/contexts/error.context";
import { Message } from "src/domain";
import { parseError } from "src/adapters/error";
import { isMetaMaskUserRejectedRequestError } from "src/utils/types";

export function useAddnetwork(): {
  isAddNetworkButtonDisabled: any;
  onAddNetwork: any;
} {
  const [isAddNetworkButtonDisabled, setIsAddNetworkButtonDisabled] = useState(false);
  const { addNetwork } = useProvidersContext();

  const { openSnackbar } = useUIContext();
  const callIfMounted = useCallIfMounted();
  const { notifyError } = useErrorContext();

  const onAddNetwork = (polygonZkEVMChain: any): void => {
    const successMsg: Message = {
      text: `${polygonZkEVMChain.name} network successfully added`,
      type: "success-msg",
    };
    setIsAddNetworkButtonDisabled(true);
    addNetwork(polygonZkEVMChain)
      .then(() => {
        callIfMounted(() => {
          openSnackbar(successMsg);
        });
      })
      .catch((error: any) => {
        callIfMounted(() => {
          void parseError(error).then((parsed) => {
            if (parsed === "wrong-network") {
              openSnackbar(successMsg);
            } else if (isMetaMaskUserRejectedRequestError(error) === false) {
              notifyError(error);
            }
          });
        });
      })
      .finally(() => {
        callIfMounted(() => {
          setIsAddNetworkButtonDisabled(false);
        });
      });
  };

  return {
    isAddNetworkButtonDisabled,
    onAddNetwork,
  };
}
