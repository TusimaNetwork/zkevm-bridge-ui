import { BigNumber } from "ethers";
import { useTokensContext } from "src/contexts/tokens.context";
import { Bridge, Deposit, DepositResult, Env } from "src/domain";
import { deserializeBridgeId, serializeBridgeId } from "src/utils/serializers";
import useSWR from "swr";
import { useDispatch, activitySlice, selectActivity, useSelector } from "../lib/redux";
import { useEffect, useMemo, useState } from "react";
import { useActiveChainId } from "./use-active-chainId";
import { useBridgeContext } from "src/contexts/bridge.context";
import { getDeposit } from "src/adapters/bridge-api";
type DepositProps = {
  env?: Env;
  apiDeposit?: DepositResult;
  bridgeId?: string
  now?: number
};

type BridgeProps = {
  deposit: DepositResult;
};
export function useReadDeposit({ apiDeposit, env, bridgeId }: DepositProps) {
  const { getToken } = useTokensContext()
  const dispatch = useDispatch()
  const { lists: activity } = useSelector(selectActivity)
  const { account } = useActiveChainId()
  const [now, setNow] = useState(Date.now())
  const determineBridgeStatus = (claim: any): any => {
    return claim.status === "pending" ? "initiated" : claim.status === "ready" ? "on-hold" : "completed"
  }
  const abortController = new AbortController()
  const readDeposit = async ({ env, apiDeposit }: DepositProps): Promise<Bridge | undefined> => {
    if (!env || !apiDeposit) {
      throw new Error('env and deposit are required for fetching');
    }
    const {
      amount,
      block_num,
      claim_tx_hash,
      deposit_cnt,
      dest_addr,
      dest_net,
      global_index,
      network_id,
      orig_addr,
      orig_net,
      ready_for_claim,
      tx_hash,
      from,
      to,
      metadata,
    } = apiDeposit
    const claim = claim_tx_hash !== "" ? { status: "claimed", txHash: claim_tx_hash } : ready_for_claim ? { status: "ready" } : { status: "pending" }
    const id = serializeBridgeId({
      depositCount: deposit_cnt,
      networkId: from.networkId
    })
    // console.log({ id })
    return await getToken({
      env,
      originNetwork: orig_net,
      // destNetId: dest_net,
      tokenOriginAddress: orig_addr,
    }).then(({ token, origtoken }: any) => {
      // console.log("token",token)
      let bridge: Bridge = {
        ...{
          amount: BigNumber.from(amount),
          blockNumber: block_num,
          claim,
          depositCount: deposit_cnt,
          depositTxHash: tx_hash,
          destinationAddress: dest_addr,
          fiatAmount: undefined,
          from,
          globalIndex: global_index,
          to,
          token,
          origtoken,
          tokenOriginNetwork: orig_net,
          originNetwork: network_id,
          destNetId: dest_net,
          claimTxHash: claim_tx_hash,
          metadata,
        },
        id,
        status: determineBridgeStatus(claim),
      }
      // console.log("ddafdsafds",claim_tx_hash,result)
      // console.log("update bridge",bridge)
      dispatch(activitySlice.actions.addActivity({ account, bridge }))
      return bridge
    }).catch((e) => {
      console.error(e)
      return undefined
    })


  }
  const initDeposit = async ({ apiDeposit, bridgeId, env }: DepositProps): Promise<DepositResult | undefined> => {
    if (!env) {
      throw new Error('env and deposit are required for fetching');
    }

    if (apiDeposit) {
      return apiDeposit
    }

    const parsedBridgeId = deserializeBridgeId(bridgeId)
    if (parsedBridgeId.success) {
      const { depositCount, networkId } = parsedBridgeId.data
      const deposit = await getDeposit({
        abortSignal: abortController.signal,
        apiUrl: env.bridgeApiUrl,
        depositCount, networkId
      })
      const from = env.chains.find((chain) => chain.networkId === deposit.network_id)
      const to = env.chains.find((chain) => chain.networkId === deposit.dest_net)
      if (from && to) {
        return { ...deposit, from, to }
      }
    }
  }

  const { data: deposit } = useSWR({
    env,
    apiDeposit,
    bridgeId
  }, initDeposit, {
    refreshInterval: 1000 * 30,
  })

  const { data: result_data,  } = useSWR({
    env,
    apiDeposit: deposit,
    now,
  }, readDeposit, {
    refreshInterval: 30 * 1000,
    focusThrottleInterval: 100 * 1000
  })

  return useMemo(() => {
    if (!deposit) {
      return null
    }
    const txs = activity[account] ?? {}
    const result = copyJson(txs[`${deposit.from.chainId}-${deposit.tx_hash}`] ?? result_data)
    if (result && env) {
      result['to'] = env?.chains.find(itm => itm.chainId === result.to.chainId) || result.to
      result['from'] = env?.chains.find(itm => itm.chainId === result.from.chainId) || result.from
    }
    return result
  }, [result_data, account, activity, env, deposit])
}

const copyJson = (json: any) => {
  if (!json) {
    return null
  }
  return JSON.parse(JSON.stringify(json))
}