import { AsyncTask, Env } from "src/domain";
import useSWR from "swr";
import { RollupManager__factory } from "src/types/contracts/rollup-manager";
import { AUTO_REFRESH_RATE } from "src/constants";
import { BigNumber } from "ethers";

export function useLastVerifiedBatch(env:Env|undefined) {

  const readBatch = async ({env}:{env:Env}): Promise<AsyncTask<BigNumber, string>> => {
    if (!env) {
      return { status: "pending" }
    }
    const ethereum = env.chains[0];
    const rollupManagerContract = RollupManager__factory.connect(
      ethereum.rollupManagerAddress,
      ethereum.provider
    )
    try {
      const newLastVerifiedBatch = await rollupManagerContract.getLastVerifiedBatch(
        rollupManagerContract.rollupAddressToID(env.chains[0].poeContractAddress)
      )
      return {
        status: "successful",
        data: newLastVerifiedBatch
      }
    } catch (error) {
      return {
        status: "failed",
        error: "An error occurred getting the last verified batch"
      }
    }
  }

  const {data:lastVerifiedBatch} = useSWR({env},readBatch,{refreshInterval:AUTO_REFRESH_RATE})
  return lastVerifiedBatch || {status:"pending"}
}
