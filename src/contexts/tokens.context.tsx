import {FC, PropsWithChildren, createContext, useCallback, useContext, useMemo, useRef} from "react"
import { BigNumber } from "ethers"
import { Web3Provider } from "@ethersproject/providers"
import * as ethereum from "src/adapters/ethereum"
import tokenIconDefaultUrl from "src/assets/icons/tokens/erc20-icon.svg"
import { useEnvContext } from "src/contexts/env.context"
import { useProvidersContext } from "src/contexts/providers.context"
import { Chain, Env, Token } from "src/domain"
import { Erc20__factory } from "src/types/contracts/erc-20"
import axios from "src/utils/axios"
import { isTokenEther } from "src/utils/tokens"
import { isAsyncTaskDataAvailable } from "src/utils/types"
import {
  TSMNAVToken03} from "src/constants"
import { AddWrappedTokenParams, useTokens } from "src/hooks/use-tokens"
import { useCustomTokens } from "src/hooks/use-custom-tokens"





interface GetTokenFromAddressParams {
  address: string
  chain: Chain
}

interface GetTokenParams {
  env: Env
  originNetwork: number
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
  const { changeNetwork, connectedProvider } = useProvidersContext()
  const fetchedTokens = useRef<Token[]>([])

  const {getNativeTokenInfo,addWrappedToken,tokens} = useTokens(env)

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
      // cache
    }: GetTokenParams): Promise<{ token: Token; origtoken: Token }> => {
      const form_chain = env.chains.find((chain) => chain.networkId === originNetwork)
      if (!form_chain) {
        throw new Error(`The chain with the originNetwork "${originNetwork}" could not be found in the list of supported Chains`)
      }
      // const to_chain = env.chains.find((chain) => chain.networkId === destNetId);
      // if (!to_chain) {
      //   throw new Error(`The chain with the originNetwork "${destNetId}" could not be found in the list of supported Chains`)
      // }

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
        const chain = form_chain;
        // const chain = to_chain;
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


  const value = useMemo(() => {
    return {
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
