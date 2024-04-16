import { BigNumber } from "ethers";
import { FC, useCallback, useEffect, useState } from "react";
import { useTokensContext } from "src/contexts/tokens.context";

import { Chain, Token } from "src/domain";
import { formatTokenAmount } from "src/utils/amounts";
import { isTokenEther, selectTokenAddress } from "src/utils/tokens";
import { isAsyncTaskDataAvailable } from "src/utils/types";
import { Spinner } from "src/views/shared/spinner/spinner.view";
import { useTokenBalanceStyles } from "src/views/shared/token-balance/token-balance.styles";
import { Typography, TypographyProps } from "src/views/shared/typography/typography.view";

interface TokenBalanceProps {
  spinnerSize: number;
  token: Token;
  typographyProps: TypographyProps;
  account:string
  chain: Chain;
}

export const TokenBalance: FC<TokenBalanceProps> = ({ spinnerSize, token,chain, typographyProps,account }) => {
  const classes = useTokenBalanceStyles();
  const [balance,setBalance]=useState(token.balance);
  const { getErc20TokenBalance } = useTokensContext()

  const getTokenBalance = useCallback(
    (token: Token, chain: Chain): Promise<BigNumber> => {
      if (isTokenEther(token)) {
        return chain.provider.getBalance(account)
      } else {
        return getErc20TokenBalance({
          accountAddress: account,
          chain: chain,
          tokenAddress: selectTokenAddress(token, chain)
        })
      }
    },[account, getErc20TokenBalance])
 
  useEffect(()=>{
    if(!account){
      setBalance({ data: BigNumber.from(0), status: "successful" })
      return 
    }
    getTokenBalance(token,chain).then(balance=>{
      setBalance({ data: balance, status: "successful" })
    })
  },[account])
  const loader = (
    <div className={classes.loader}>
      <Spinner size={spinnerSize} />
      <Typography {...typographyProps}>&nbsp;{token.symbol}</Typography>
    </div>
  );


  if (!token.balance) {
    return loader;
  }

  switch (token.balance.status) {
    case "pending":
    case "loading":
    case "reloading": {
      return loader;
    }
    case "successful":
    case "failed": {
      const formattedTokenAmount = formatTokenAmount(
        isAsyncTaskDataAvailable(token.balance) ? token.balance.data : BigNumber.from(0),
        token
      );

      return (
        <Typography {...typographyProps}>{`${formattedTokenAmount} ${token.symbol}`}</Typography>
      );
    }
  }
};
