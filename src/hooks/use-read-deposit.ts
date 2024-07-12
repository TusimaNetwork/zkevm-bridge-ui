import { BigNumber } from "ethers";
import { useTokensContext } from "src/contexts/tokens.context";
import { Bridge, Deposit, DepositResult, Env } from "src/domain";
import { serializeBridgeId } from "src/utils/serializers";
import useSWR from "swr";
import { useDispatch, activitySlice,selectActivity,useSelector } from "../lib/redux";
import { useProvidersContext } from "src/contexts/providers.context";
import { useMemo } from "react";
type DepositProps = {
  env: Env;
  apiDeposit: DepositResult;
};

type BridgeProps = {
  deposit: Deposit;
};
export function useReadDeposit(params: DepositProps) {
  const { getToken } = useTokensContext();
  const dispatch = useDispatch();

  const activity = useSelector(selectActivity)
  const { connectedProvider } = useProvidersContext();
  const account = useMemo(() => {
    if (connectedProvider.status === "successful") {
      return connectedProvider.data.account;
    }
    return "";
  }, []);
  const fetchDeposit = async ({ env, apiDeposit }: DepositProps): Promise<Deposit> => {
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
    } = apiDeposit;

    return getToken({
      env,
      originNetwork: network_id,
      destNetId: dest_net,
      tokenOriginAddress: orig_addr,
    }).then(({ token, origtoken }: any) => ({
      amount: BigNumber.from(amount),
      blockNumber: block_num,
      claim:
        claim_tx_hash !== ""
          ? { status: "claimed", txHash: claim_tx_hash }
          : ready_for_claim
          ? { status: "ready" }
          : { status: "pending" },
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
    }));
  };

  const fetchBridge = async ({ deposit }: BridgeProps): Promise<Bridge> => {
    const {
      amount,
      blockNumber,
      claim,
      depositCount,
      depositTxHash,
      destinationAddress,
      from,
      globalIndex,
      to,
      token,
      origtoken,
      tokenOriginNetwork,
    } = deposit;

    const fiatAmount = undefined;

    const id = serializeBridgeId({
      depositCount,
      networkId: from.networkId,
    });

    let bridge: Bridge;
    switch (claim.status) {
      case "pending": {
        bridge = {
          amount,
          blockNumber,
          depositCount,
          depositTxHash,
          destinationAddress,
          fiatAmount,
          from,
          globalIndex,
          id,
          status: "initiated",
          to,
          token,
          origtoken,
          tokenOriginNetwork,
        };
        break;
      }
      case "ready": {
        bridge = {
          amount,
          blockNumber,
          depositCount,
          depositTxHash,
          destinationAddress,
          fiatAmount,
          from,
          globalIndex,
          id,
          status: "on-hold",
          to,
          token,
          origtoken,
          tokenOriginNetwork,
        };
        break;
      }
      case "claimed": {
        bridge = {
          amount,
          blockNumber,
          claimTxHash: claim.txHash,
          depositCount,
          depositTxHash,
          destinationAddress,
          fiatAmount,
          from,
          globalIndex,
          id,
          status: "completed",
          to,
          token,
          origtoken,
          tokenOriginNetwork,
        };
        break;
      }
    }
    dispatch(activitySlice.actions.addActivity({account, bridge}))
    return bridge;
  };

  const readDeposit = async (params: DepositProps) => {
    const deposit = await fetchDeposit(params);
    if (deposit) {
      return fetchBridge({ deposit });
    }
    return undefined;
  };
  const { data: result_data, isLoading } = useSWR(params, params.env ? readDeposit : null);
  const deposit=useMemo(()=>{
    const txs = activity.lists[account] ?? {}
    const apiDeposit=params.apiDeposit
    const result = txs[`${apiDeposit.from.chainId}-${apiDeposit.tx_hash}`] ?? result_data
    return result
  },[result_data,account,activity,params]) 
  console.log({activity})
  return deposit;
}
