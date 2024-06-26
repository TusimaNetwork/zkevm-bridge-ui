import {FC, PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react"
import { BigNumber, constants as ethersConstants } from "ethers"
import { Web3Provider } from "@ethersproject/providers"
import * as ethereum from "src/adapters/ethereum"
import { cleanupCustomTokens, getCustomTokens } from "src/adapters/storage"
import { getEthereumErc20Tokens } from "src/adapters/tokens"
import tokenIconDefaultUrl from "src/assets/icons/tokens/erc20-icon.svg"
import { useEnvContext } from "src/contexts/env.context"
import { useErrorContext } from "src/contexts/error.context"
import { useProvidersContext } from "src/contexts/providers.context"
import { Chain, ChainKey, Env, EthereumChainId, Token } from "src/domain"
import { Bridge__factory } from "src/types/contracts/bridge"
import { Erc20__factory } from "src/types/contracts/erc-20"
import axios from "src/utils/axios"
import { isTokenEther } from "src/utils/tokens"
import { isAsyncTaskDataAvailable } from "src/utils/types"
import {
  ETHNavToken,
  ETH_TOKEN_LOGO_URI,
  TSMAddressZero,
  TSMNAVToken00,
  TSMNAVToken01,
  TSMNAVToken02,
  TSMNAVToken03,
  TSMToken,
  getEtherToken,
  getExchangeAddress
} from "src/constants"

interface ComputeWrappedTokenAddressParams {
  nativeChain: Chain
  otherChain: Chain
  token: Token
}

interface GetNativeTokenInfoParams {
  address: string
  chain: Chain
}

interface AddWrappedTokenParams {
  token: Token
}

interface GetTokenFromAddressParams {
  address: string
  chain: Chain
}

interface GetTokenParams {
  env: Env
  originNetwork: number
  destNetId: number
  tokenOriginAddress: string
  cache?:boolean
}

interface GetErc20TokenBalanceParams {
  accountAddress: string
  chain: Chain
  tokenAddress: string
}

interface ApproveParams {
  amount: BigNumber
  from: Chain
  owner: string
  provider: Web3Provider
  spender: string
  token: Token
}

interface TokensContext {
  addWrappedToken: (params: AddWrappedTokenParams) => Promise<Token>
  approve: (params: ApproveParams) => Promise<void>
  getErc20TokenBalance: (params: GetErc20TokenBalanceParams) => Promise<BigNumber>
  getToken: (params: GetTokenParams) => Promise<{ token: Token; origtoken: Token }>
  getTokenFromAddress: (params: GetTokenFromAddressParams) => Promise<Token>
  tokens?: Token[]
  TETHToken?: Token
}

const tokensContextNotReadyMsg = "The tokens context is not yet ready"

const tokensContext = createContext<TokensContext>({
  addWrappedToken: () => Promise.reject(tokensContextNotReadyMsg),
  approve: () => Promise.reject(tokensContextNotReadyMsg),
  getErc20TokenBalance: () => Promise.reject(tokensContextNotReadyMsg),
  getToken: () => Promise.reject(tokensContextNotReadyMsg),
  getTokenFromAddress: () => Promise.reject(tokensContextNotReadyMsg),
})

const TokensProvider: FC<PropsWithChildren> = (props) => {
  const env = useEnvContext()
  const { notifyError } = useErrorContext()
  const { changeNetwork, connectedProvider } = useProvidersContext()
  const [tokens, setTokens] = useState<Token[]>()
  const fetchedTokens = useRef<Token[]>([])
  const [TETHToken, setTETHToken] = useState<Token>()

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
   * Provided a token and a chain, when the token is wrapped, returns the native token's networkId and address and throws otherwise
   */
  const getNativeTokenInfo = useCallback(({
      address,
      chain,
    }: GetNativeTokenInfoParams): Promise<{
      originNetwork: number
      originTokenAddress: string
    }> => {
      const bridgeContract = Bridge__factory.connect(chain.bridgeContractAddress, chain.provider)
      if([
        TETHToken?.address.toLocaleLowerCase(),
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
          throw new Error(`Can not find a native token for the address "${address}"`)
        }
        return tokenInfo
      }).catch((e)=>{
        return new Promise((_resolve, reject)=>{
          reject(e)
        })
      })
    }, [TETHToken] )

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
            notifyError(e)
            return Promise.resolve(token)
          })
      }
    }, [env, computeWrappedTokenAddress, notifyError] )

  const getTokenFromAddress = useCallback(
    async ({ address, chain }: GetTokenFromAddressParams): Promise<Token> => {
      if (!env) {
        throw Error("The env is not ready")
      }
      const erc20Contract = Erc20__factory.connect(address, chain.provider)
      const name = await erc20Contract.name()
      const decimals = await erc20Contract.decimals()
      const symbol = await erc20Contract.symbol()
      const trustWalletLogoUrl = `/icons/tokens/${address}/logo.png`
      const logoURI = await axios.head(trustWalletLogoUrl).then(() => trustWalletLogoUrl).catch(() => tokenIconDefaultUrl)

      return getNativeTokenInfo({ address, chain }).then(({ originNetwork, originTokenAddress }) => {
          // the provided address belongs to a wrapped token
          const originalTokenChain = env.chains.find((chain) => chain.networkId === originNetwork)
          if (!originalTokenChain) {
            throw Error(`Could not find a chain that matched the originNetwork ${originNetwork}`)
          }
          return {
            address: originTokenAddress,
            chainId: chain.chainId,
            decimals,
            logoURI,
            name,
            symbol,
            wrappedToken: {
              address,
              chainId: chain.chainId
            }
          }
      }).catch((e) => {
          console.debug(e)
          // the provided address belongs to a native token
          return addWrappedToken({
            token: {
              address,
              chainId: chain.chainId,
              decimals,
              logoURI,
              name,
              symbol
            }
          })
      })
    }, [addWrappedToken, env, getNativeTokenInfo] )

  const fetchToken = (tokenAddress: string, chain: Chain | Token) => {
    const newtoken_list = [
      TSMNAVToken03,
      ...getCustomTokens(),
      ...(tokens || []),
      ...fetchedTokens.current
    ]
    const token = newtoken_list.find( (token) =>
        (token.address === tokenAddress && token.chainId === chain.chainId) ||
        (token.wrappedToken && token.wrappedToken.address === tokenAddress && token.wrappedToken.chainId === chain.chainId)
    )
    // console.log({newtoken_list})
    return token
  }

  const getToken = useCallback(
    async ({
      env,
      originNetwork,
      tokenOriginAddress: newAddress,
      destNetId,
      cache
    }: GetTokenParams): Promise<{ token: Token; origtoken: Token }> => {
      const form_chain = env.chains.find((chain) => chain.networkId === originNetwork)
      if (!form_chain) {
        throw new Error(`The chain with the originNetwork "${originNetwork}" could not be found in the list of supported Chains`)
      }
      const to_chain = env.chains.find((chain) => chain.networkId === destNetId);
      if (!to_chain) {
        throw new Error(`The chain with the originNetwork "${destNetId}" could not be found in the list of supported Chains`)
      }

      //如果原链是二层链，并且地址是0x0000000000000000000000000000000000000000，目标链要显示tsm的地址
      //如果原链是一层链，并且地址是0x0000000000000000000000000000000000000000，目标链要显示teth的地址
      //如果原链是一层链，并且地址是0x0000000000000000000000000000000000000001，目标链显示teth的地址
      //const tokenAddress = getExchangeAddress(newAddress)
      //const originTokenAddress = getExchangeAddress(newAddress)
      //token 用在了提币上
      const token = fetchToken(newAddress, form_chain)
      //origtoken 是用在了展示上
      const origtoken = fetchToken(newAddress,form_chain)

      // console.log({newAddress,form_chain})
      if (token) {
        return { token, origtoken: origtoken || token }
      } else {
        const chain = to_chain;
        const token = await getTokenFromAddress({ address: newAddress, chain: chain })
          .then((token) => {
            fetchedTokens.current = [...fetchedTokens.current, token]
            return token
          })
          .catch(() => {
            throw new Error(
              `The token with the address "${newAddress}" could not be found either in the list of supported Tokens or in the blockchain "${chain.name}" with chain id "${chain.chainId}"`
            )
          })
        return { token, origtoken: origtoken || token }
      }
    }, [tokens, getTokenFromAddress] )

  const getErc20TokenBalance = useCallback(
    async ({ accountAddress, chain, tokenAddress }: GetErc20TokenBalanceParams) => {
      if (isTokenEther(tokenAddress)) {
        return Promise.reject(new Error("Ether is not supported as ERC20 token"))
      }
      const erc20Contract = Erc20__factory.connect(tokenAddress, chain.provider)
      return await erc20Contract.balanceOf(accountAddress)
    }, [] )

  const approve = useCallback(
    ({ amount, from, owner, provider, spender, token }: ApproveParams) => {
      if (!isAsyncTaskDataAvailable(connectedProvider)) {
        throw new Error("Connected provider is not available")
      }

      const executeApprove = async () => ethereum.approve({ amount, from, owner, provider, spender, token })

      if (from.chainId === connectedProvider.data.chainId) {
        return executeApprove()
      } else {
        return changeNetwork(from)
          .catch(() => {
            throw "wrong-network"
          })
          .then(executeApprove)
      }
    }, [connectedProvider, changeNetwork])

  const initTokens = (TETHToken: Token) => {
    if (env) {
      setTETHToken(TETHToken)
      const ethereumChains = env.chains.map((chain) => chain.chainId)
      getEthereumErc20Tokens()
        .then((ethereumErc20Tokens) =>
          Promise.all(
            ethereumErc20Tokens
              .filter((token) => ethereumChains.includes(token.chainId))
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
                  // console.log({sss})
                  // return token
                }else{
                  const resToken =  await addWrappedToken({ token })
                  // console.log({resToken,token})
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
                TETHToken,
                ...chainTokens
              ]
              cleanupCustomTokens(tokens)
              setTokens(tokens)
            })
            .catch(notifyError)
        )
        .catch(notifyError)
    }
  }

  const initEPTHToken = async () => {
    if (env) {
      const polygonzkevm = env.chains.find((itm) => itm.key === ChainKey.polygonzkevm)
      if (polygonzkevm) {
        // console.log({polygonzkevm},polygonzkevm.bridgeContractAddress, polygonzkevm.provider)
        const contract = Bridge__factory.connect(
          polygonzkevm.bridgeContractAddress,
          polygonzkevm.provider
        )
        // console.log({contract})
        contract.getTokenWrappedAddress("0", TSMAddressZero).then((address) => initTokens({
              address,
              chainId: EthereumChainId.EAGLE,
              decimals: 18,
              logoURI: ETH_TOKEN_LOGO_URI,
              name: "TETH",
              symbol: "TETH",
            })
          ).catch(console.log)
      }
    }
  }

  // initialize tokens
  useEffect(() => {
    initEPTHToken()
  }, [env, addWrappedToken, notifyError])

  const value = useMemo(() => {
    return {
      TETHToken,
      addWrappedToken,
      approve,
      getErc20TokenBalance,
      getToken,
      getTokenFromAddress,
      tokens,
    };
  }, [tokens, getTokenFromAddress, getToken, getErc20TokenBalance, addWrappedToken, approve])

  return <tokensContext.Provider value={value} {...props} />
}

const useTokensContext = (): TokensContext => {
  return useContext(tokensContext)
}

export { TokensProvider, useTokensContext }
