import { constants as ethersConstants } from "ethers";
import { FC, useMemo } from "react";

import { ReactComponent as CopyIcon } from "src/assets/icons/copy.svg";
import { ReactComponent as NewWindowIcon } from "src/assets/icons/new-window.svg";
import { TSMToken, getToToken } from "src/constants";
import { useEnvContext } from "src/contexts/env.context";
import { useTokensContext } from "src/contexts/tokens.context";
import { ChainKey, EthereumChainId, Token } from "src/domain";
import { getShortenedEthereumAddress } from "src/utils/addresses";
import { copyToClipboard } from "src/utils/browser";
import { isTokenEther } from "src/utils/tokens";
import { useTokenInfoTableStyles } from "src/views/home/components/token-info-table/token-info-table.styles";
import { Typography } from "src/views/shared/typography/typography.view";

interface TokenInfoTableProps {
  className?: string;
  token: Token;
}

export const TokenInfoTable: FC<TokenInfoTableProps> = ({ className, token }) => {
  const classes = useTokenInfoTableStyles()
  const env = useEnvContext()
  const { TETHToken } = useTokensContext()
  
  if (!env) {
    return null;
  }
  const ethereum = env.chains[0]
  const polygonZkEVM = env.chains[1]
  const nameRow = (
    <div className={classes.row}>
      <Typography className={classes.alignRow} type="body2">
        Token name
      </Typography>
      <Typography className={classes.alignRow} type="body1">
        {token.name}
      </Typography>
    </div>
  );

  const symbolRow = (
    <div className={classes.row}>
      <Typography className={classes.alignRow} type="body2">
        Token symbol
      </Typography>
      <Typography className={classes.alignRow} type="body1">
        {token.symbol}
      </Typography>
    </div>
  );

  const decimalsRow = (
    <div className={classes.row}>
      <Typography className={classes.alignRow} type="body2">
        Token decimals
      </Typography>
      <Typography className={classes.alignRow} type="body1">
        {token.decimals}
      </Typography>
    </div>
  );
  // console.log({token},'1222')
  const l1TokenAddress = useMemo(() => {
    return token.chainId === EthereumChainId.EAGLE && isTokenEther(token)
      ? TSMToken.address || ''
      : ethersConstants.AddressZero
  }, [token, TETHToken])

  const l2TokenAddress = useMemo(() => {

    return token.chainId === EthereumChainId.SEPOLIA && isTokenEther(token)
      ? TETHToken?.address || ''
      : ethersConstants.AddressZero
  }, [token, TETHToken])

  if (isTokenEther(token)) {
    const ethereumRow = (
      <div className={classes.row}>
        <Typography className={classes.alignRow} type="body2">
          <ethereum.Icon className={classes.chainIcon} />
          L1 token address
        </Typography>
        <div className={classes.rowRightBlock}>
          <Typography className={classes.alignRow} type="body1">
            {getShortenedEthereumAddress(l1TokenAddress)}
          </Typography>
          {!isTokenEther(l1TokenAddress) &&  (
            <>
              <button
                className={classes.button}
                onClick={() => {
                  copyToClipboard(l1TokenAddress)
                }}
              >
                <CopyIcon className={classes.copyIcon} />
              </button>
              <a
                className={classes.button}
                href={`${ethereum.explorerUrl}/address/${l1TokenAddress}`}
                rel="noreferrer"
                target="_blank"
              >
                <NewWindowIcon className={classes.newWindowIcon} />
              </a>
            </>
          )}
        </div>
      </div>
    )

    const polygonZkEVMRow = (
      <div className={classes.row}>
        <Typography className={classes.alignRow} type="body2">
          <polygonZkEVM.Icon className={classes.chainIcon} />
          L2 token address
        </Typography>
        <div className={classes.rowRightBlock}>
          <Typography className={classes.alignRow} type="body1">
            {getShortenedEthereumAddress(l2TokenAddress)}
          </Typography>
          {!isTokenEther(l2TokenAddress) && (
            <>
              <button
                className={classes.button}
                onClick={() => {
                  copyToClipboard(l2TokenAddress);
                }}
              >
                <CopyIcon className={classes.copyIcon} />
              </button>
              <a
                className={classes.button}
                href={`${polygonZkEVM.explorerUrl}/address/${l2TokenAddress}`}
                rel="noreferrer"
                target="_blank"
              >
                <NewWindowIcon className={classes.newWindowIcon} />
              </a>
            </>
          )}
        </div>
      </div>
    )

    return (
      <div className={`${classes.wrapper} ${className || ""}`}>
        {ethereumRow}
        {polygonZkEVMRow}
        {nameRow}
        {symbolRow}
        {decimalsRow}
      </div>
    )
  } else {

    const nativeTokenAddress = useMemo(()=>{
      if(token.address === TETHToken?.address){
        return ethersConstants.AddressZero
      }
      return token.address
    },[token,TETHToken])

    
    const wrappedTokenAddress = useMemo(()=>{
      if(token.address === TETHToken?.address){
        return TETHToken.address 
      }
      if(token.address === TSMToken?.address){
        return ethersConstants.AddressZero
      }
      return token.wrappedToken?.address
    },[token,TETHToken])
    
    const nativeAddressRow = ethereum ? (
      <div className={classes.row}>
        <Typography className={classes.alignRow} type="body2">
          <ethereum.Icon className={classes.chainIcon} />
          {`L1 token address`}
        </Typography>
        <div className={classes.rowRightBlock}>
          <Typography className={classes.tokenAddress} type="body1">
            {getShortenedEthereumAddress(nativeTokenAddress)}
          </Typography>
          {!isTokenEther(nativeTokenAddress) && <><button
            className={classes.button}
            onClick={() => {
              copyToClipboard(nativeTokenAddress);
            }}
          >
            <CopyIcon className={classes.copyIcon} />
          </button>
          <a
            className={classes.button}
            href={`${ethereum.explorerUrl}/address/${nativeTokenAddress}`}
            rel="noreferrer"
            target="_blank"
          >
            <NewWindowIcon className={classes.newWindowIcon} />
          </a></>}
        </div>
      </div>
    ) : null

    const wrappedAddressRow =
    polygonZkEVM && wrappedTokenAddress ? (
        <div className={classes.row}>
          <Typography className={classes.alignRow} type="body2">
            <polygonZkEVM.Icon className={classes.chainIcon} />
            {`L2 token address`}
          </Typography>
          <div className={classes.rowRightBlock}>
            <Typography className={classes.tokenAddress} type="body1">
              {getShortenedEthereumAddress(wrappedTokenAddress)}
            </Typography>
           {!isTokenEther(wrappedTokenAddress) && <>
            <button
              className={classes.button}
              onClick={() => {
                copyToClipboard(wrappedTokenAddress);
              }}
            >
              <CopyIcon className={classes.copyIcon} />
            </button>
            <a
              className={classes.button}
              href={`${polygonZkEVM.explorerUrl}/address/${wrappedTokenAddress}`}
              rel="noreferrer"
              target="_blank"
            >
              <NewWindowIcon className={classes.newWindowIcon} />
            </a>
           </>} 
          </div>
        </div>
      ) : null

    return (
      <div className={`${classes.wrapper} ${className || ""}`}>
        {nativeAddressRow}
        {wrappedAddressRow}
        {nameRow}
        {symbolRow}
        {decimalsRow}
      </div>
    )
  }
}
