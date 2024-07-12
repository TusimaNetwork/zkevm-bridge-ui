import { useMemo, useRef } from "react";
import { useProvidersContext } from "src/contexts/providers.context";
import { useTokensContext } from "src/contexts/tokens.context";
import { useEnvContext } from "src/contexts/env.context";
import { PAGE_SIZE } from "src/constants";
import useSWR from "swr";
import { getDeposits } from "src/adapters/bridge-api";
import { DepositResult } from "src/domain";
import { useBridgeContext } from "src/contexts/bridge.context";

type props ={
  deposits:DepositResult[]
}
export const usePendingBridges = ({deposits}:props) => {
  const { claim, fetchBridges, getPendingBridges } = useBridgeContext(); 
  
  const readPending=async({deposits}:props)=>{
    getPendingBridges(deposits).then((data) => {
     return {
      data, status: "successful" 
     } 
    })
  }
  const {data}=useSWR({deposits},readPending)
}
