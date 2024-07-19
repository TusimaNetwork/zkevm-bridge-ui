import { BigNumber } from "ethers";
import { useCallback, useMemo } from "react";
import { useProvidersContext } from "src/contexts/providers.context";
import { AsyncTask, Chain, Token } from "src/domain";
import { isTokenEther, selectTokenAddress } from "src/utils/tokens";
import { useActiveChainId } from "./use-active-chainId";
import { useTokensContext } from "src/contexts/tokens.context";
import useSWR from "swr";
type props = {
  token?: Token, chain?: Chain,account?:string
}
export const useTokenBalance = (chain?: Chain, token?: Token) => {
  const { account } = useActiveChainId()
  const { getErc20TokenBalance } = useTokensContext()
  const getTokenBalance = ({token,chain,account}:props): Promise<BigNumber> => {
    if(!chain || !token || !account){
      throw 'chain or token or account is empty'
    }
    if (isTokenEther(token)) {
      return chain.provider.getBalance(account);
    } else {
      const tokenAddress = selectTokenAddress(token, chain)
      return getErc20TokenBalance({
        accountAddress: account,
        chain: chain,
        tokenAddress
      });
    }
  }
  const loadBalance = async ({chain,token,account}:props):Promise<AsyncTask<BigNumber, string> > => {
    if(!chain || !token || !account){
      throw 'chain or token or account is empty'
    }
    try {
      const data = await getTokenBalance({token, chain,account})
      return {
        status: "successful",
        data
      }
    } catch (error) {
      console.error(error,token,chain)
      return { error: "Couldn't retrieve token balance", status: "failed" }
    }

  }
  const {data}=useSWR({account,chain,token},loadBalance)
  const balance: AsyncTask<BigNumber, string> = useMemo(() => {
    if(!data){
      return {
        status: "loading"
      }
    }
    return data
  }, [data])
  return balance
};
