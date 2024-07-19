import { useEffect, useMemo, useRef } from "react"
import { useTokensContext } from "src/contexts/tokens.context"
import { useEnvContext } from "src/contexts/env.context"
import { PAGE_SIZE } from "src/constants"
import useSWR from "swr"
import { getDeposits } from "src/adapters/bridge-api"
import { DepositResult } from "src/domain"
import { useDispatch,activitySlice, useSelector, selectActivity } from "src/lib/redux"

type props = {
  page: number; 
  account: string;
};
export const useBridges = ({ account, page }: props) => {
  const { tokens } = useTokensContext()
  const dispatch = useDispatch()
  const {arrlist,arttotal} = useSelector(selectActivity)
  const env = useEnvContext()
  const fetchBridgesAbortController = useRef<AbortController>(new AbortController())
  const params = useMemo(() => {
    const limit = (page) * PAGE_SIZE
    if (env && account && tokens ) {
      return {
        abortSignal: fetchBridgesAbortController.current.signal,
        apiUrl: env.bridgeApiUrl,
        env,
        ethereumAddress: account,
        limit ,
        offset: 0,
        type: "load",
      }
    }
    return null
  }, [env, account, tokens,page])
  const { data: deposits_result, isLoading: is_loading, error } = useSWR(params, getDeposits,{
    refreshInterval: 1000 * 30,
    revalidateOnFocus: false
  })
  const total=useMemo(()=>deposits_result?.total || 0,[deposits_result])
  const deposits:DepositResult[] | undefined = useMemo(()=>{
    if (deposits_result && env) {
      const newArr:DepositResult[] = []
      for (let index = 0; index < deposits_result.deposits.length; index++) {
        const element = deposits_result.deposits[index]
        const from = env.chains.find((chain) => chain.networkId === element.network_id)
        const to = env.chains.find((chain) => chain.networkId === element.dest_net)
        if (from && to) {
          newArr.push({
            ...element,
            from: from,
            to: to,
            status:"read"
          })
        }
      }
      return newArr
    }
    return undefined
  },[env,deposits_result])
  useEffect(()=>{
    if(deposits && account){
      dispatch(activitySlice.actions.addListActivity({lists:deposits,account,total}))
    }
  },[deposits,account,total])
  return {
    deposits:arrlist[account] ?? deposits,
    total:arttotal[account] ?? total,
    isLoading: is_loading,
    error,
  };
};
