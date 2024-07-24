import { utils as ethersUtils } from "ethers"
import { FC, useEffect, useMemo, useRef, useState } from "react"

import { isChainNativeCustomToken } from "src/adapters/storage"
import { ReactComponent as InfoIcon } from "src/assets/icons/info.svg"
import { ReactComponent as MagnifyingGlassIcon } from "src/assets/icons/magnifying-glass.svg"
import { ReactComponent as XMarkIcon } from "src/assets/icons/xmark.svg"
import { TOKEN_BLACKLIST, isEagleWETHToken, isSepoliaTSMToken } from "src/constants"
import { useTokensContext } from "src/contexts/tokens.context"
import { AsyncTask, Chain, Token } from "src/domain"
import { useCallIfMounted } from "src/hooks/use-call-if-mounted"
import { useTokenBalance } from "src/hooks/use-token-balance"
import { useTokenListStyles } from "src/views/home/components/token-list/token-list.styles"
import { TokenSelectorHeader } from "src/views/home/components/token-selector-header/token-selector-header.view"
import { Icon } from "src/views/shared/icon/icon.view"
import { Spinner } from "src/views/shared/spinner/spinner.view"
import { TokenBalance } from "src/views/shared/token-balance/token-balance.view"
import { Typography } from "src/views/shared/typography/typography.view"
import useSWR from "swr"

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
}

export const TokenList: FC<TokenListProps> = ({
  account,
  chains,
  onClose,
  onNavigateToTokenAdder,
  onNavigateToTokenInfo,
  onSelectToken,
  tokens,
}) => {
  const classes = useTokenListStyles()
  const { getTokenFromAddress } = useTokensContext()
  const [searchInputValue, setSearchInputValue] = useState<string>("")
 
  const inputRef = useRef<HTMLInputElement>(null)

  const searchTokenInfo = async (searchInput: string):Promise<AsyncTask<Token, string>> => {
    if (ethersUtils.isAddress(searchInput)) {
      if (TOKEN_BLACKLIST.includes(searchInput)) {
        return {
          error: "We do not support this token at the moment.",
          status: "failed"
        }
      }
      try{
        const token =  await getTokenFromAddress({
          address: searchInput,
          chain: chains.from
        })
        return {
          data: { ...token },
          status: "successful",
        }
      }catch(e){
        return {
          error: "The token couldn't be found on the selected network.",
          status: "failed",
        }
      }
    }
    return { status: "pending" }
  }

  const { data: searchToken } = useSWR(searchInputValue, searchTokenInfo)
  const customToken:AsyncTask<Token, string> = useMemo(()=>{
    if(searchToken){
      return searchToken
    }
    return ethersUtils.isAddress(searchInputValue) ? { status: "loading" }:{ status: "pending" }
  },[searchToken,searchInputValue])


  const onSearchInputchange = (value: string): void => {
    setSearchInputValue(value)
  }

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, []);
  const filteredTokens = useMemo(() => {
    if (customToken.status === 'successful') {
      return [customToken.data]
    }
    return tokens
  }, [customToken, tokens])
  const error = customToken.status === "failed" ? customToken.error : searchInputValue.length > 0 && tokens.length === 0 ? "No result found" : undefined

  const tokensLists = useMemo(() => filteredTokens.filter(itm => !itm.is01).filter((itm) => itm.chainId === chains.from.chainId), [filteredTokens, chains?.from, account])

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
        {customToken.status === "loading" || tokensLists.length === 0 ? (
          <div className={classes.centeredElement}>
            <Spinner />
          </div>
        ) : error ? (
          <Typography className={classes.centeredElement} type="body2">
            {error}
          </Typography>
        ) : (
          tokensLists.map((token) => {
            const isImportedCustomToken = isChainNativeCustomToken(token, chains.from) || isEagleWETHToken(token) || isSepoliaTSMToken(token);
            const isNonImportedCustomToken = !isImportedCustomToken && customToken.status === "successful" && customToken.data.address === token.address;

            console.log({isImportedCustomToken,isNonImportedCustomToken})
            if (isNonImportedCustomToken) {
              return <div className={classes.tokenButtonWrapper} key={`${token.chainId}-${token.address}`}>
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
            } else {
              return (
                <div className={classes.tokenButtonWrapper} key={`${token.chainId}-${token.address}`}>
                  <button className={classes.tokenButton} onClick={() => onSelectToken(token)} role="button">
                    <div className={classes.tokenInfoWithBalance}>
                      <Icon className={classes.tokenIcon} isRounded size={24} url={token.logoURI} />
                      <Typography type="body1">{token.name}</Typography>
                      <div className={classes.tokenBalanceWrapper}>
                        <UserToken chain={chains.from} account={account} token={token} className={classes.tokenBalance} />
                      </div>
                    </div>
                  </button>
                  <button className={classes.tokenInfoButton} onClick={() => onNavigateToTokenInfo(token)}>
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

const UserToken: FC<{ token: Token, chain: Chain, account: string, className: string }> = ({ token, chain, account, className }) => {
  const balance = useTokenBalance(chain, token)
  return <TokenBalance
    chain={chain}
    account={account}
    spinnerSize={16}
    token={{
      ...token,
      balance: balance
    }}
    typographyProps={{ className, type: "body2" }}
  />
}