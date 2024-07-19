import { BigNumber } from "ethers";
import { FC, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { ReactComponent as ArrowDown } from "src/assets/icons/arrow-down.svg";
import { ReactComponent as CaretDown } from "src/assets/icons/caret-down.svg";
import { WETHToken, getEtherToken, getToToken, } from "src/constants";
import { useEnvContext } from "src/contexts/env.context";
import { useProvidersContext } from "src/contexts/providers.context";
import { useTokensContext } from "src/contexts/tokens.context";
import { Chain, ChainKey, FormData, Token } from "src/domain";
import { useAddnetwork } from "src/hooks/use-addnetwork";
import { useApprove } from "src/hooks/use-approve";
import { useCallIfMounted } from "src/hooks/use-call-if-mounted";
import { useCustomTokens } from "src/hooks/use-custom-tokens";
import { useInputMaxAmount } from "src/hooks/use-input-max-amount";
import { useTokenBalance } from "src/hooks/use-token-balance";
import { FromLabel } from "src/utils/labels";
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

export const BridgeForm: FC<BridgeFormProps> = ({ account, onSubmit }) => {
  const classes = useBridgeFormStyles()
  const env = useEnvContext()
  const { tokens } = useTokensContext()
  const { connectedProvider, connectWallet } = useProvidersContext()
  
  const navigate = useNavigate()
  const { hash: asHash } = useLocation()
  const [inputError, setInputError] = useState<string>()
  const [selectToken, setSelectToken] = useState<Token>()
  const [amount, setAmount] = useState<BigNumber>()
  const [chains, setChains] = useState<Chain[]>()
  const [isTokenListOpen, setIsTokenListOpen] = useState(false)
  const { onAddNetwork } = useAddnetwork()

  const {addCustomToken,removeCustomToken}=useCustomTokens()


  const supportedChainIds = useMemo(() => (env ? env.chains.map((chain) => chain.chainId) : []), [env])

  const hash = useMemo(() => {
    const has = asHash.split('#')[1]
    const [, ZkEVMChain] = env?.chains || []

    if (!has) {
      return ZkEVMChain && connectedProvider.status === "successful" &&
        connectedProvider.data.chainId === ZkEVMChain.chainId ? FromLabel.Withdraw.toLocaleLowerCase() : FromLabel.Deposit.toLocaleLowerCase()
    }

    return has
  }, [asHash, connectedProvider, env?.chains])

  const selectedChains: SelectedChains | undefined = useMemo(() => {
    if (env) {
      const [chain1, chain2] = env.chains
      const [from, to] = hash === FromLabel.Deposit.toLocaleLowerCase() ? [chain1, chain2] : [chain2, chain1]
      return {
        from, to
      }
    }
  }, [hash, env])
  const fromToken = useMemo(() => {
    if (!selectedChains) {
      return
    }
    return selectToken ?? getEtherToken(selectedChains.from)
  }, [selectToken, selectedChains?.from])


  const toToken = useMemo(() => {
    // console.log({fromToken})
    if (selectedChains && fromToken) {
      return getToToken(fromToken)
    }
  }, [fromToken, selectedChains, WETHToken])

  const balanceFrom = useTokenBalance(selectedChains?.from, fromToken)
  const balanceTo = useTokenBalance(selectedChains?.to, toToken)
  const onChainButtonClick = (from: Chain) => {
    if (env) {
      const hash = from.key === ChainKey.ethereum ? FromLabel.Deposit.toLocaleLowerCase() : FromLabel.Withdraw.toLocaleLowerCase()
      navigate(`#${hash}`, { replace: true })
      setSelectToken(undefined)
      setChains(undefined)
      setAmount(undefined)
    }
  }
  const onAmountInputChange = ({ amount, error }: { amount?: BigNumber; error?: string }) => {
    if (!fromToken) return
    setAmount(amount)
    setInputError(error)
  }
  const onTokenDropdownClick = () => {
    setIsTokenListOpen(true);
  }

  const onSelectToken = (token: Token) => {
    setSelectToken(token)
    setIsTokenListOpen(false)
    setAmount(undefined)
  }


  const onCloseTokenSelector = () => {
    setIsTokenListOpen(false)
  }

  const tokenBalance2 = useMemo(() => {
    return balanceFrom?.status === "successful" ? balanceFrom.data : undefined
  }, [balanceFrom])

  const formData2 = useMemo(() => {
    if (!selectedChains || !fromToken || balanceFrom?.status !== "successful") {
      return
    }
    return {
      amount: balanceFrom.data,
      from: selectedChains.from,
      to: selectedChains.to,
      token: fromToken
    }
  }, [selectedChains, balanceFrom?.status, fromToken])
  // console.log({tokenBalance2:tokenBalance2?.toString(),token:token?.symbol})
  const { tokenSpendPermission } = useApprove({
    formData: formData2,
    // setError,
  })
  const { maxAmountConsideringFee, estimatedGas } = useInputMaxAmount({
    formData: formData2,
    tokenBalance: tokenBalance2,
    tokenSpendPermission
  })

  const onRemoveToken = (tokenToRemove: Token) => {
    if (tokens) {
      removeCustomToken(tokenToRemove)
      // setTokens(tokens.filter((token) => !(token.address === tokenToRemove.address && token.chainId === tokenToRemove.chainId)))
      if (selectedChains && tokenToRemove.address === fromToken?.address) {
        setSelectToken(undefined)
      }
    }
  }

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (notLogin) {
      connectWallet()
      return
    } else if (!isPrivate) {
      selectedChains ? onAddNetwork(selectedChains.from) : ""
      return
    } else if (selectedChains && fromToken && amount) {
      onSubmit({
        amount: amount,
        from: selectedChains.from,
        to: selectedChains.to,
        token: fromToken,
      })
    }
  }
  

  const notLogin = useMemo(
    () => connectedProvider.status === "successful" && !connectedProvider.data.account,
    [connectedProvider]
  )

  const isPrivate = useMemo(
    () => connectedProvider.status === "successful" ? supportedChainIds.includes(connectedProvider.data.chainId) : false,
    [supportedChainIds, connectedProvider]
  )

  useEffect(() => {
    setAmount(undefined)
  }, [connectedProvider, env, isPrivate])

  if (!env || !selectedChains || !tokens || !fromToken || !toToken) {
    return <div className={classes.spinner}>
      <Spinner />
      <div style={{ height: 80, width: 80 }} />
    </div>
  }

  return (
    <form className={classes.form} onSubmit={onFormSubmit}>
      <NetworkSelectorTabs onClick={onChainButtonClick} chainId={fromToken.chainId} chains={env.chains} />
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
            <TokenBalance spinnerSize={14} chain={selectedChains.from} account={account} token={{ ...fromToken, balance: balanceFrom }} typographyProps={{ type: "body1" }} />
          </div>
        </div>
        <div className={`${classes.row} ${classes.middleRow}`}>
          <button className={classes.tokenSelector} onClick={onTokenDropdownClick} type="button">
            <Icon isRounded size={24} url={fromToken.logoURI} />
            <Typography type="h2">{fromToken.symbol}</Typography>
            <CaretDown />
          </button>
          <AmountInput balance={ balanceFrom && isAsyncTaskDataAvailable(balanceFrom) ? balanceFrom.data : BigNumber.from(0) }
            maxAmountConsideringFee={maxAmountConsideringFee}
            disabled={!isPrivate}
            onChange={onAmountInputChange}
            token={fromToken}
            maxLength={6}
            value={amount} />
        </div>
      </Card>
      <div className={classes.arrowRow}>
        <ArrowDown className={classes.arrowDownIcon} />
      </div>
      <Card className={classes.card}>
        <div className={classes.row}>
          <div className={classes.leftBox}>
            <Typography type="body2">To</Typography>
            <div className={classes.toChain}>
              <selectedChains.to.Icon className={classes.icons} />
              <Typography type="body1">{selectedChains.to.name}</Typography>
            </div>
          </div>
          <div className={classes.rightBox}>
            <Typography type="body2">Balance</Typography>
            <TokenBalance spinnerSize={14} chain={selectedChains.from} account={account} token={{ ...toToken,balance: balanceTo}} typographyProps={{ type: "body1" }} />
          </div>
        </div>
      </Card>
      <div className={classes.button}>
        <Button disabled={isPrivate && !notLogin && (!amount || amount.isZero() || inputError !== undefined)} type="submit">
          {notLogin ? "Connect Wallet" : isPrivate ? "Continue" : "Exchange to Ethereum"}
        </Button>

        {amount && inputError && <ErrorMessage error={inputError} />}
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
          // reloadBalances={reloadBalances}
          account={account}
          chains={selectedChains}
          onAddToken={addCustomToken}
          onClose={onCloseTokenSelector}
          onRemoveToken={onRemoveToken}
          onSelectToken={onSelectToken}
          tokens={tokens}
        />
      )}
    </form>
  );
};
