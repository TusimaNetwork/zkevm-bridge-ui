import { BigNumber } from "ethers";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useMatches, useNavigate, useNavigation, useParams, useRevalidator } from "react-router-dom";

import { addCustomToken, getChainCustomTokens, removeCustomToken } from "src/adapters/storage";
import { ReactComponent as ArrowDown } from "src/assets/icons/arrow-down.svg";
import { ReactComponent as CaretDown } from "src/assets/icons/caret-down.svg";
import {  getEtherToken, getToToken, isEagleChain, isEaglePETH,  } from "src/constants";
import { useEnvContext } from "src/contexts/env.context";
import { useProvidersContext } from "src/contexts/providers.context";
import { useTokensContext } from "src/contexts/tokens.context";
import { AsyncTask, Chain, FormData, Token } from "src/domain";
import { useAddnetwork } from "src/hooks/use-addnetwork";
import { useCallIfMounted } from "src/hooks/use-call-if-mounted";
import { FromLabel } from "src/utils/labels";
import { isTokenEther, selectTokenAddress } from "src/utils/tokens";
import { isAsyncTaskDataAvailable } from "src/utils/types";
import { AmountInput } from "src/views/home/components/amount-input/amount-input.view";
import { useBridgeFormStyles } from "src/views/home/components/bridge-form/bridge-form.styles";
import { TokenSelector } from "src/views/home/components/token-selector/token-selector.view";
import { Button } from "src/views/shared/button/button.view";
import { Card } from "src/views/shared/card/card.view";
import { ChainList } from "src/views/shared/chain-list/chain-list.view";
import { ErrorMessage } from "src/views/shared/error-message/error-message.view";
import { Icon } from "src/views/shared/icon/icon.view";
import { NetworkSelectorTabs } from "src/views/shared/network-selector-tabs/network-selector-tabs.view";
import { Spinner } from "src/views/shared/spinner/spinner.view";
import { TokenBalance } from "src/views/shared/token-balance/token-balance.view";
import { Typography } from "src/views/shared/typography/typography.view";

interface BridgeFormProps {
  account: string;
  formData?: FormData;
  onResetForm: () => void;
  onSubmit: (formData: FormData) => void;
}

interface SelectedChains {
  from: Chain;
  to: Chain;
}

export const BridgeForm: FC<BridgeFormProps> = ({ account, formData, onResetForm, onSubmit }) => {
  const classes = useBridgeFormStyles()
  const callIfMounted = useCallIfMounted()
  const env = useEnvContext()
  const { getErc20TokenBalance, tokens: defaultTokens } = useTokensContext()
  const { connectedProvider, connectWallet } = useProvidersContext()
  const [balanceFrom, setBalanceFrom] = useState<AsyncTask<BigNumber, string>>({
    status: "pending",
  })
  const navigate =useNavigate()
  const {hash:asHash} = useLocation()
  const [balanceTo, setBalanceTo] = useState<AsyncTask<BigNumber, string>>({ status: "pending" })
  const [inputError, setInputError] = useState<string>()
  const [selectedChains1, setSelectedChains] = useState<SelectedChains>()
  const [selectToken, setSelectToken] = useState<Token>()
  const [amount, setAmount] = useState<BigNumber>()
  const [chains, setChains] = useState<Chain[]>()
  const [tokens, setTokens] = useState<Token[]>()
  const [isTokenListOpen, setIsTokenListOpen] = useState(false)
  const { onAddNetwork } = useAddnetwork()

  const onAmountInputChange = ({ amount, error }: { amount?: BigNumber; error?: string }) => {
    setAmount(amount)
    setInputError(error)
  }

  const supportedChainIds = useMemo(() => (env ? env.chains.map((chain) => chain.chainId) : []),[env])

  const hash = useMemo(()=>{
    const has = asHash.split('#')[1]
    const [,ZkEVMChain] = env?.chains || []

    if(!has){
      return ZkEVMChain && 
      connectedProvider.status === "successful" && 
      connectedProvider.data.chainId === ZkEVMChain.chainId ? FromLabel.Withdraw.toLocaleLowerCase():FromLabel.Deposit.toLocaleLowerCase()
    }
    return has
  },[asHash,connectedProvider,env?.chains])

  const selectedChains = useMemo(()=>{
    if(env){
      const [chain1,chain2]= env.chains
      const [from,to] = hash === FromLabel.Deposit.toLocaleLowerCase() ? [chain1,chain2]:[chain2,chain1]
      return {
        from,to
      }
    }
  },[hash,env])

  const token = useMemo(()=>{
    if(!selectedChains){
      return
    }
    return selectToken ?? getEtherToken(selectedChains.from)
  },[selectToken,selectedChains?.from])

  const onChainButtonClick = (from: Chain) => {
    if (env) {
      const hash = from.key==="ethereum"?FromLabel.Deposit.toLocaleLowerCase():FromLabel.Withdraw.toLocaleLowerCase()
        navigate(`#${hash}`,{replace:true})
        setSelectToken(undefined)
        setChains(undefined)
        setAmount(undefined)
    }
  }

  const onTokenDropdownClick = () => {
    setIsTokenListOpen(true);
  }

  const onSelectToken = (token: Token) => {
    setSelectToken(token)
    setIsTokenListOpen(false)
    setAmount(undefined)
  }

  const fromToken=useMemo(()=>{
    return token
  },[token,selectedChains])

  const toToken=useMemo(()=>{
    if(selectedChains && fromToken){
      return getToToken(fromToken)
    }
  },[token,selectedChains])

  const onCloseTokenSelector = () => {
    setIsTokenListOpen(false)
  }

  const onAddToken = (token: Token) => {
    if (tokens) {
      // We don't want to store the balance of the user in the local storage
      const { address, chainId, decimals, logoURI, name, symbol, wrappedToken } = token
      addCustomToken({ address, chainId, decimals, logoURI, name, symbol, wrappedToken })
      setTokens([token, ...tokens])
    }
  }

  const onRemoveToken = (tokenToRemove: Token) => {
    if (tokens) {
      removeCustomToken(tokenToRemove)
      setTokens(
        tokens.filter(
          (token) =>
            !(token.address === tokenToRemove.address && token.chainId === tokenToRemove.chainId)
        )
      )
      if (selectedChains && tokenToRemove.address === token?.address) {
        setSelectToken(undefined)
      }
    }
  }

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (notLogin) {
      connectWallet()
      return;
    } else if (!isPrivate) {
      selectedChains ? onAddNetwork(selectedChains.from) : ""
      return;
    } else if (selectedChains && token && amount) {
      onSubmit({
        amount: amount,
        from: selectedChains.from,
        to: selectedChains.to,
        token: token,
      })
    }
  }

  const getTokenBalance = useCallback(
    (token: Token, chain: Chain): Promise<BigNumber> => {
      if (isTokenEther(token)) {
        return chain.provider.getBalance(account);
      } else {
        return getErc20TokenBalance({
          accountAddress: account,
          chain: chain,
          tokenAddress: selectTokenAddress(token, chain),
        });
      }
    },
    [account, getErc20TokenBalance]
  )

  useEffect(() => {
    // Load all the tokens for the selected chain without their balance
    if (selectedChains && defaultTokens) {
      const { from } = selectedChains;
      const chainTokens = [...getChainCustomTokens(from), ...defaultTokens];
      setTokens(
        chainTokens.map((token) => ({
          ...token,
          balance: {
            status: "pending",
          },
        }))
      )
    }
  }, [defaultTokens, selectedChains])

  useEffect(() => {
    // Load the balances of all the tokens of the primary chain (from)
    const areTokensPending = tokens?.some((tkn) => tkn.balance?.status === "pending")

    if (selectedChains && tokens && areTokensPending) {
      const getUpdatedTokens = (tokens: Token[] | undefined, updatedToken: Token) =>
        tokens ? tokens.map((tkn) =>tkn.address === updatedToken.address && tkn.chainId === updatedToken.chainId ? updatedToken : tkn) : undefined

      setTokens(() =>
        tokens.map((token: Token) => {
          getTokenBalance(token, selectedChains.from).then((balance): void => {
              callIfMounted(() => {
                const updatedToken: Token = {
                  ...token,
                  balance: {
                    data: balance,
                    status: "successful",
                  },
                }
                setTokens((currentTokens) => getUpdatedTokens(currentTokens, updatedToken))
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
                setTokens((currentTokens) => getUpdatedTokens(currentTokens, updatedToken))
              })
            })
          return { ...token, balance: { status: "loading" } }
        })
      )
    }
  }, [callIfMounted, defaultTokens, getTokenBalance, selectedChains, tokens])

  useEffect(() => {
    // Load the balance of the selected token in both networks
    if (selectedChains && fromToken && toToken) {
      const loadBalance = async (chain:Chain,token:Token, setBalance:(v:AsyncTask<BigNumber, string>)=>void) => {
        setBalance({ status: "loading" })
        let balanceOrError:any
        try {
          balanceOrError = await getTokenBalance(token, chain)
        } catch (error) {
          balanceOrError = error
        }
        callIfMounted(() => {
          if (balanceOrError instanceof Error) {
            setBalance({ error: balanceOrError.message || "Couldn't retrieve token balance", status: "failed" })
          } else {
            setBalance({ data: balanceOrError, status: "successful" })
          }
        })
      }
  
      loadBalance(selectedChains.from,fromToken, setBalanceFrom)
      loadBalance(selectedChains.to,toToken, setBalanceTo)
    }
  }, [callIfMounted, getTokenBalance, selectedChains, toToken,fromToken])

  const notLogin = useMemo(
    () => connectedProvider.status === "successful" && !connectedProvider.data.account,
    [connectedProvider]
  )

  const isPrivate = useMemo(
    () =>
      connectedProvider.status === "successful"
        ? supportedChainIds.includes(connectedProvider.data.chainId)
        : false,
    [supportedChainIds, connectedProvider]
  )

  useEffect(() => {
      setAmount(undefined)
  }, [connectedProvider, env, isPrivate])

  useEffect(() => {
    // Load default form values
    if (formData) {
      setSelectedChains({ from: formData.from, to: formData.to })
      setSelectToken(formData.token)
      setAmount(formData.amount)
      onResetForm()
    }
  }, [formData, onResetForm])

  if (!env || !selectedChains || !tokens || !token || !toToken) {
    return (
      <div className={classes.spinner}>
        <Spinner />
        <div style={{height:80,width:80}}/>
      </div>
    )
  }

  return (
    <form className={classes.form} onSubmit={onFormSubmit}>
      <NetworkSelectorTabs onClick={onChainButtonClick} chainId={token.chainId} chains={env.chains}/>
      <Card className={classes.card}>
        <div className={classes.row}>
          <div className={classes.leftBox}>
            <Typography type="body2">From</Typography>
            <button className={classes.fromChain} onClick={() => setChains(env.chains)} type="button">
              <selectedChains.from.Icon className={classes.icons} />
              <Typography type="body1">{selectedChains.from.name}</Typography>
              <CaretDown />
            </button>
          </div>
          <div className={classes.rightBox}>
            <Typography type="body2">Balance</Typography>
            <TokenBalance spinnerSize={14} token={{ ...token, balance: balanceFrom }} typographyProps={{ type: "body1" }}/>
          </div>
        </div>
        <div className={`${classes.row} ${classes.middleRow}`}>
          <button className={classes.tokenSelector} onClick={onTokenDropdownClick} type="button">
            <Icon isRounded size={24} url={token.logoURI} />
            <Typography type="h2">{token.symbol}</Typography>
            <CaretDown />
          </button>
          <AmountInput balance={
              balanceFrom && isAsyncTaskDataAvailable(balanceFrom)
                ? balanceFrom.data
                : BigNumber.from(0)
            }
            disabled={!isPrivate}
            onChange={onAmountInputChange}
            token={token}
            value={amount} />
        </div>
      </Card>
      <div className={classes.arrowRow}>
        <ArrowDown className={classes.arrowDownIcon}/>
      </div>
      <Card className={classes.card}>
        <div className={classes.row}>
          <div className={classes.leftBox}>
            <Typography type="body2">To</Typography>
            <div className={classes.toChain}>
              <selectedChains.to.Icon className={classes.icons}/>
              <Typography type="body1">{selectedChains.to.name}</Typography>
            </div>
          </div>
          <div className={classes.rightBox}>
            <Typography type="body2">Balance</Typography>
            <TokenBalance spinnerSize={14} token={{ ...toToken, balance: balanceTo }} typographyProps={{ type: "body1" }}/>
          </div>
        </div>
      </Card>
      <div className={classes.button}>
        <Button disabled={isPrivate && !notLogin && (!amount || amount.isZero() || inputError !== undefined)} type="submit">
          {notLogin ? "Connect Wallet" : isPrivate ? "Continue" : "Exchange to Ethereum"}
        </Button>
        {amount && inputError && <ErrorMessage error={inputError}/>}
      </div>
      {chains && (
        <ChainList
          chains={chains}
          onClick={onChainButtonClick}
          onClose={() => setChains(undefined)}
        />
      )}
      {isTokenListOpen && (
        <TokenSelector
          account={account}
          chains={selectedChains}
          onAddToken={onAddToken}
          onClose={onCloseTokenSelector}
          onRemoveToken={onRemoveToken}
          onSelectToken={onSelectToken}
          tokens={tokens}
        />
      )}
    </form>
  );
};
