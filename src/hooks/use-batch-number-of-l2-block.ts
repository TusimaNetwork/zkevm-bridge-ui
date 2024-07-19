import { AsyncTask, ChainKey, Env } from "src/domain";
import useSWR from "swr";
import { RollupManager__factory } from "src/types/contracts/rollup-manager";
import { AUTO_REFRESH_RATE } from "src/constants";
import { BigNumber } from "ethers";
import { isAsyncTaskDataAvailable } from "src/utils/types";
import { getBatchNumberOfL2Block } from "src/adapters/ethereum";

type props={
  blockNumber:number | undefined,
  env:Env,
  fromKey:ChainKey | undefined,
  status:string
}
export function useBatchNumberOfL2Block(props:props) {

  const readOfL2Block = async ({blockNumber, env, fromKey, status}:props): Promise<AsyncTask<BigNumber, string>> => {
    if (status === "initiated" && fromKey === ChainKey.polygonzkevm && blockNumber) {
      try{
        const newBatchNumberOfL2Block= await getBatchNumberOfL2Block(env.chains[1].provider, blockNumber)
        return {
          data: newBatchNumberOfL2Block,
          status: "successful",
        }
      }catch(e){
        return {
          error: "An error occurred getting the batch number of the L2 block",
          status: "failed",
        }
      }
    } 
    return { status: "loading" }
  }

  const {data:batchNumberOfL2Block} = useSWR({...props},readOfL2Block,{refreshInterval:AUTO_REFRESH_RATE})
  return batchNumberOfL2Block || { status: "loading" }
}
