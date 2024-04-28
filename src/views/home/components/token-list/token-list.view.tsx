import { BigNumber, utils as ethersUtils } from "ethers"
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react"

import { isChainNativeCustomToken } from "src/adapters/storage"
import { ReactComponent as InfoIcon } from "src/assets/icons/info.svg"
import { ReactComponent as MagnifyingGlassIcon } from "src/assets/icons/magnifying-glass.svg"
import { ReactComponent as XMarkIcon } from "src/assets/icons/xmark.svg"
import { TOKEN_BLACKLIST, isEagleTETHToken, isSepoliaTSMToken } from "src/constants"
import { useTokensContext } from "src/contexts/tokens.context"
import { AsyncTask, Chain, Token } from "src/domain"
import { useCallIfMounted } from "src/hooks/use-call-if-mounted"
import { isTokenEther, selectTokenAddress } from "src/utils/tokens"
import { useTokenListStyles } from "src/views/home/components/token-list/token-list.styles"
import { TokenSelectorHeader } from "src/views/home/components/token-selector-header/token-selector-header.view"
import { Icon } from "src/views/shared/icon/icon.view"
import { Spinner } from "src/views/shared/spinner/spinner.view"
import { TokenBalance } from "src/views/shared/token-balance/token-balance.view"
import { Typography } from "src/views/shared/typography/typography.view"

interface SelectedChains {
  from: Chain
  to: Chain
}

interface TokenListProps {
  account: string
  chains: SelectedChains
  onClose: () => void
  onNavigateToTokenAdder: (token: Token) => void
  onNavigateToTokenInfo: (token: Token) => void
  onSelectToken: (token: Token) => void
  tokens: Token[];
  // reloadBalances:any
}

export const TokenList: FC<TokenListProps> = ({
  account,
  chains,
  onClose,
  onNavigateToTokenAdder,
  onNavigateToTokenInfo,
  onSelectToken,
  tokens,
  // reloadBalances
}) => {
  const classes = useTokenListStyles()
  const callIfMounted = useCallIfMounted()
  const { getErc20TokenBalance, getTokenFromAddress,TETHToken } = useTokensContext()
  const [searchInputValue, setSearchInputValue] = useState<string>("")
  const [filteredTokens, setFilteredTokens] = useState<Token[]>([])
  const [customToken, setCustomToken] = useState<AsyncTask<Token, string>>({
    status: "pending"
  })
  const inputRef = useRef<HTMLInputElement>(null)
 const [newTokens,setNewTokens]=useState<Token[]>(tokens)

  const getTokenBalance = useCallback( (token: Token, chain: Chain): Promise<BigNumber> => {
      if (isTokenEther(token)) {
        return chain.provider.getBalance(account)
      } else {
        return getErc20TokenBalance({
          accountAddress: account,
          chain: chain,
          tokenAddress: selectTokenAddress(token, chain)
        })
      }
    }, [account, getErc20TokenBalance] )

  const updateTokenList = ( searchTerm: string) => {
    const newFilteredTokens: any[] = []
    setCustomToken({ status: "pending" })
    if (ethersUtils.isAddress(searchTerm) && newFilteredTokens.length === 0) {
      if (TOKEN_BLACKLIST.includes(searchTerm)) {
        setCustomToken({
          error: "We do not support this token at the moment.",
          status: "failed"
        })
      } else {
        setCustomToken({ status: "loading" })
        void getTokenFromAddress({
          address: searchTerm,
          chain: chains.from
        }).then((token: Token) => {
            getTokenBalance(token, chains.from).then((balance) => {
                callIfMounted(() => {
                  setCustomToken((currentCustomToken) =>
                    currentCustomToken.status === "pending"
                      ? currentCustomToken
                      : {
                          data: { ...token, balance: { data: balance, status: "successful" } },
                          status: "successful",
                        }
                  )
                })
            }).catch(() => {
                callIfMounted(() => {
                  setCustomToken((currentCustomToken) =>
                    currentCustomToken.status === "pending"
                      ? currentCustomToken
                      : {
                          data: {
                            ...token,
                            balance: { error: "Couldn't retrieve token balance", status: "failed" },
                          },
                          status: "successful",
                        }
                  )
                })
            })
        }).catch(() => callIfMounted(() => {
              setCustomToken({
                error: "The token couldn't be found on the selected network.",
                status: "failed",
              })
            })
          )
      }
    }
  }

  const onSearchInputchange = (value: string): void => {
    setSearchInputValue(value)
    updateTokenList(value)
    if (value === "") {
      setCustomToken({ status: "pending" })
    }
  }

  const reloadBalances=()=>{
    // Load the balances of all the tokens of the primary chain (from)
    // const areTokensPending = tokens?.some((tkn) => tkn.balance?.status === "pending")

    const areTokensPending = true
    // console.log({account,areTokensPending})
    if (chains && tokens && areTokensPending) {
      const getUpdatedTokens = (tokens: Token[] , updatedToken: Token) =>
        tokens.map((tkn) =>tkn.address === updatedToken.address && tkn.chainId === updatedToken.chainId ? updatedToken : tkn)

      setNewTokens(() => tokens.map((token: Token) => {
          getTokenBalance(token, chains.from).then((balance): void => {
              callIfMounted(() => {
                const updatedToken: Token = {
                  ...token,
                  balance: {
                    data: balance,
                    status: "successful",
                  }
                }
                setNewTokens((currentTokens) => getUpdatedTokens(currentTokens, updatedToken))
              })
          }).catch(() => {
              callIfMounted(() => {
                const updatedToken: Token = {
                  ...token,
                  balance: {
                    error: "Couldn't retrieve token balance",
                    status: "failed",
                  }
                }
                setNewTokens((currentTokens) => getUpdatedTokens(currentTokens, updatedToken))
              })
          })
          return { ...token, balance: { status: "loading" } }
        })
      )
    }
  }
  useEffect(()=>{
    reloadBalances()
  },[])
  useEffect(() => {
    if (customToken.status === "successful") {
      setFilteredTokens([customToken.data])
    }
  }, [customToken])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, []);

  useEffect(() => {
    setFilteredTokens(newTokens)
  }, [newTokens,account])

  const error = customToken.status === "failed" ? customToken.error : searchInputValue.length > 0 && filteredTokens.length === 0 ? "No result found" : undefined

  const tokensLists=useMemo(()=>filteredTokens.filter(itm=>!itm.is01).filter((itm)=>itm.chainId === chains.from.chainId),[filteredTokens,chains?.from,account])

  if(!TETHToken){
    return <div></div>
  }
  return (
    <div className={classes.tokenList}>
      <TokenSelectorHeader onClose={onClose} title="Select token" />
      <div className={classes.searchInputContainer}>
        <MagnifyingGlassIcon className={classes.searchIcon} />
        <input
          className={classes.searchInput}
          onChange={(event) => {
            onSearchInputchange(event.target.value);
          }}
          placeholder="Enter token name or address"
          ref={inputRef}
          type="search"
          value={searchInputValue}
        />
        {searchInputValue !== "" && (
          <button className={classes.clearSearchButton} onClick={() => onSearchInputchange("")}>
            <XMarkIcon className={classes.clearSearchButtonIcon} />
          </button>
        )}
      </div>
      <div className={classes.list}>
        {customToken.status === "loading" ? (
          <div className={classes.centeredElement}>
            <Spinner />
          </div>
        ) : error ? (
          <Typography className={classes.centeredElement} type="body2">
            {error}
          </Typography>
        ) : (
          tokensLists.map((token) => {
            const isImportedCustomToken = isChainNativeCustomToken(token, chains.from) || isEagleTETHToken(token,TETHToken) || isSepoliaTSMToken(token);
            const isNonImportedCustomToken =
              !isImportedCustomToken &&
              customToken.status === "successful" &&
              customToken.data.address === token.address;

            if (isNonImportedCustomToken) {
              return (
                <div
                  className={classes.tokenButtonWrapper}
                  key={`${token.chainId}-${token.address}`}
                >
                  <button className={classes.tokenButton} onClick={() => onSelectToken(token)} role="button" >
                    <div className={classes.tokenInfo}>
                      <Icon className={classes.tokenIcon} isRounded size={24} url={token.logoURI} />
                      <Typography type="body1">{token.name}</Typography>
                    </div>
                  </button>
                  <button className={classes.addTokenButton} onClick={() => onNavigateToTokenAdder(token)}>
                    <Typography type="body1">Add token</Typography>
                  </button>
                </div>
              )
            } else {
              return (
                <div
                  className={classes.tokenButtonWrapper}
                  key={`${token.chainId}-${token.address}`}
                >
                  <button
                    className={classes.tokenButton}
                    onClick={() => onSelectToken(token)}
                    role="button"
                  >
                    <div className={classes.tokenInfoWithBalance}>
                      <Icon className={classes.tokenIcon} isRounded size={24} url={token.logoURI} />
                      <Typography type="body1">{token.name}</Typography>
                      <div className={classes.tokenBalanceWrapper}>
                        <TokenBalance
                          chain={chains.from}
                          account={account}
                          spinnerSize={16}
                          token={token}
                          typographyProps={{ className: classes.tokenBalance, type: "body2" }}
                        />
                      </div>
                    </div>
                  </button>
                  <button
                    className={classes.tokenInfoButton}
                    onClick={() => onNavigateToTokenInfo(token)}
                  >
                    <InfoIcon className={classes.tokenInfoButtonIcon} />
                  </button>
                </div>
              )
            }
          })
        )}
      </div>
    </div>
  )
}
