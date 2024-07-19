import { useMemo } from "react";
import { useProvidersContext } from "src/contexts/providers.context";

export const useActiveChainId = () => {
  const { connectedProvider } = useProvidersContext();
  return useMemo(() => {
    if (connectedProvider.status === "successful") {
      return {
        account: connectedProvider.data.account ?? "",
        chainId: connectedProvider.data.chainId ?? undefined,
      };
    }
    return {
      chainId: undefined,
      account: "",
    };
  }, [connectedProvider]);
};
