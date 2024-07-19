import { useCallback, useMemo } from "react";
import { getEthereumErc20Tokens } from "src/adapters/tokens";
import { ETHNavToken, TSMNAVToken00, TSMNAVToken01, TSMNAVToken02, TSMToken, WETHToken } from "src/constants";
import { useProvidersContext } from "src/contexts/providers.context";
import { Chain, Env, EthereumChainId, Token } from "src/domain";
import { Bridge__factory } from "src/types/contracts/bridge";
import { BigNumber, constants as ethersConstants } from "ethers"
import { isTokenEther } from "src/utils/tokens";
import useSWR from "swr";
import { useCustomTokens } from "./use-custom-tokens";
interface GetNativeTokenInfoParams {
  address: string
  chain: Chain
}

export interface AddWrappedTokenParams {
  token: Token
}
interface ComputeWrappedTokenAddressParams {
  nativeChain: Chain
  otherChain: Chain
  token: Token
}

export const useTokens = (env?:Env) => {

  const {cleanupCustomTokens,getCustomTokens} = useCustomTokens()
    /**
   * Provided a token and a chain, when the token is wrapped, returns the native token's networkId and address and throws otherwise
   */
    const getNativeTokenInfo = ({
      address,
      chain,
    }: GetNativeTokenInfoParams): Promise<{
      originNetwork: number
      originTokenAddress: string
    }> => {
      const bridgeContract = Bridge__factory.connect(chain.bridgeContractAddress, chain.provider)
      if([
        WETHToken?.address.toLocaleLowerCase(),
        TSMToken?.address.toLocaleLowerCase()
      ].includes(address.toLocaleLowerCase())){
        return new Promise((resolve, _reject)=>{
          resolve({
            originNetwork: 1, 
            originTokenAddress: address
          })
        })
      }
      return bridgeContract.wrappedTokenToTokenInfo(address).then((tokenInfo) => {
        if (tokenInfo.originTokenAddress === ethersConstants.AddressZero) {
          // console.log(tokenInfo.originTokenAddress === ethersConstants.AddressZero,tokenInfo.originTokenAddress , ethersConstants.AddressZero,chain)
          throw new Error(`Can not find a native token for the address "${address}",${tokenInfo}`)
        }
        return tokenInfo
      }).catch((e)=>{
        return new Promise((_resolve, reject)=>{
          reject(e)
        })
      })
    }

  /**
   * Provided a token, its native chain and any other chain, computes the address of the wrapped token on the other chain
   */
  const computeWrappedTokenAddress = useCallback(
    async ({ nativeChain, otherChain, token }: ComputeWrappedTokenAddressParams): Promise<string> => {
      if (isTokenEther(token)) {
        throw Error("Can't precalculate the wrapper address of Ether")
      }
      
      const bridgeContract = Bridge__factory.connect(
        otherChain.bridgeContractAddress,
        otherChain.provider
      )

      const res = await bridgeContract.precalculatedWrapperAddress(
        nativeChain.networkId,
        token.address,
        token.name,
        token.symbol,
        token.decimals
      )
     
      return res
    },
    []
  )
   
  /**
   * Provided a token, if its property wrappedToken is missing, adds it and returns the new token
   * Important: It's assumed that the token is native to the chain declared in token.chainId
   */
  const addWrappedToken = useCallback( ({ token }: AddWrappedTokenParams): Promise<Token> => {
    if (token.wrappedToken || isTokenEther(token)) {
      return Promise.resolve(token)
    } else {
      if (!env) {
        throw Error("The env is not available")
      }
      const ethereumChain = env.chains[0]
      const polygonZkEVMChain = env.chains[1]
      const nativeChain = token.chainId === ethereumChain.chainId ? ethereumChain : polygonZkEVMChain
      const wrappedChain = nativeChain.chainId === ethereumChain.chainId ? polygonZkEVMChain : ethereumChain

      return computeWrappedTokenAddress({
        nativeChain,
        otherChain: wrappedChain,
        token,
      }).then((wrappedAddress) => {
          const newToken: Token = {
            ...token,
            wrappedToken: {
              address: wrappedAddress,
              chainId: wrappedChain.chainId,
            },
          }
          return newToken
        })
        .catch((e) => {
          console.log({
            nativeChain,
            otherChain: wrappedChain,
            token,
          })
          // notifyError(e)
          return Promise.resolve(token)
        })
    }
  }, [env, computeWrappedTokenAddress, ] ) 
  const getTokens = async({env,index}:{env:Env,index:string}):Promise<Token[]>=>{
    const ethereumChains = env.chains.map((chain) => chain.chainId)
    return getEthereumErc20Tokens().then((ethereumErc20Tokens) =>
        Promise.all(
          ethereumErc20Tokens.filter((token) => ethereumChains.includes(token.chainId))
            .map(async (token) => {
              if(token.chainId === EthereumChainId.EAGLE){
                // console.log({token})
                const {originTokenAddress} = await getNativeTokenInfo({
                  address: token.address,
                  chain:env.chains[1]
                })
                return {
                  ...token,
                  wrappedToken:{
                    address:originTokenAddress,
                    chainId: env.chains[0].chainId
                  }
                }
              }else{
                const resToken =  await addWrappedToken({ token })
                return resToken
              }
            })
        ).then((chainTokens) => {
            const tokens = [
              TSMNAVToken00,
              TSMNAVToken01,
              TSMNAVToken02,
              ETHNavToken,
              TSMToken,
              WETHToken,
              ...chainTokens
            ]
            cleanupCustomTokens(tokens)
            return tokens
          })
      )
  }
  // const {data:token_data} = useSWR({env,index:'get_tokens'},getTokens)
  const { data: tokensData } = useSWR({ env, index: 'get_tokens' },({env,index})=>{
    if(!env){
      return undefined
    }
    return getTokens({env,index})
  });

  const tokens=useMemo(()=>{
    if(tokensData){
      return getCustomTokens.concat(tokensData || [])
    }
  },[tokensData,getCustomTokens])
  return {
    addWrappedToken,
    tokens,
    getNativeTokenInfo,
  }
};
