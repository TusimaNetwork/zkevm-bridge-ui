import { useMemo, useRef } from "react";
import { useProvidersContext } from "src/contexts/providers.context";
import { useTokensContext } from "src/contexts/tokens.context";
import { useEnvContext } from "src/contexts/env.context";
import { PAGE_SIZE } from "src/constants";
import useSWR from "swr";
import { getDeposits } from "src/adapters/bridge-api";
import { DepositResult } from "src/domain";

export const useBridges = () => {
  const { tokens } = useTokensContext()
  const env = useEnvContext()
  const { connectedProvider } = useProvidersContext()
  const fetchBridgesAbortController = useRef<AbortController>(new AbortController())
  const params = useMemo(() => {
    if (env && connectedProvider.status === "successful" && tokens) {
      return {
        abortSignal: fetchBridgesAbortController.current.signal,
        apiUrl: env.bridgeApiUrl,
        env,
        ethereumAddress: connectedProvider.data.account,
        limit: PAGE_SIZE,
        offset: 0,
        type: "load",
      }
    }
    return null
  }, [env, connectedProvider, tokens])
  const { data:deposits_result, isLoading:is_loading, error } = useSWR(params, getDeposits)

  const deposits:DepositResult[]=useMemo(()=>{
    if (deposits_result && env) {
      const newArr = []
      for (let index = 0; index < deposits_result.deposits.length; index++) {
        const element = deposits_result.deposits[index];
        const from = env.chains.find((chain) => chain.networkId === element.network_id)
        const to = env.chains.find((chain) => chain.networkId === element.dest_net)
        if(from && to){
          newArr.push({
            ...element,
            from: from,
            to: to,
          })
        }
      }
      return newArr
    }
    return []
  },[deposits_result,env])
  return {
    deposits,
    total: deposits_result?.total,
    isLoading: is_loading,
    error,
  }
}
