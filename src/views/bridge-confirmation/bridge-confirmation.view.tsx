import { BigNumber } from "ethers";
import { FC, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { parseError } from "src/adapters/error";
import { getPermit, isContractAllowedToSpendToken } from "src/adapters/ethereum";
import { getCurrency } from "src/adapters/storage";
import { ReactComponent as ArrowRightIcon } from "src/assets/icons/arrow-right.svg";
import { ETH_TOKEN_LOGO_URI, FIAT_DISPLAY_PRECISION, TSM_TOKEN_LOGO_URI, getEtherToken } from "src/constants";
import { useBridgeContext } from "src/contexts/bridge.context";
import { useEnvContext } from "src/contexts/env.context";
import { useErrorContext } from "src/contexts/error.context";
import { useFormContext } from "src/contexts/form.context";
import { usePriceOracleContext } from "src/contexts/price-oracle.context";
import { useProvidersContext } from "src/contexts/providers.context";
import { useTokensContext } from "src/contexts/tokens.context";
import { useUIContext } from "src/contexts/ui.context";
import { AsyncTask, EthereumChainId, Gas, TokenSpendPermission } from "src/domain";
import { useApprove } from "src/hooks/use-approve";
import { useBridge } from "src/hooks/use-bridge";
import { useCallIfMounted } from "src/hooks/use-call-if-mounted";
import { useFee } from "src/hooks/use-fee";
import { useInputMaxAmount } from "src/hooks/use-input-max-amount";
import { routes } from "src/routes";
import { formatFiatAmount, formatTokenAmount, multiplyAmounts } from "src/utils/amounts";
import { calculateMaxTxFee } from "src/utils/fees";
import { getCurrencySymbol } from "src/utils/labels";
import { isTokenEther, selectTokenAddress } from "src/utils/tokens";
import {
  isAsyncTaskDataAvailable,
  isEthersInsufficientFundsError,
  isMetaMaskUserRejectedRequestError,
} from "src/utils/types";
import { useBridgeConfirmationStyles } from "src/views/bridge-confirmation/bridge-confirmation.styles";
import { ApprovalInfo } from "src/views/bridge-confirmation/components/approval-info/approval-info.view";
import { BridgeButton } from "src/views/bridge-confirmation/components/bridge-button/bridge-button.view";
import { Card } from "src/views/shared/card/card.view";
import { ErrorMessage } from "src/views/shared/error-message/error-message.view";
import { Header } from "src/views/shared/header/header.view";
import { Icon } from "src/views/shared/icon/icon.view";
import { PageLoader } from "src/views/shared/page-loader/page-loader.view";
import { Typography } from "src/views/shared/typography/typography.view";

export const BridgeConfirmation: FC = () => {
  const callIfMounted = useCallIfMounted();
  const classes = useBridgeConfirmationStyles();
  const navigate = useNavigate();
  const env = useEnvContext();
  const { notifyError } = useErrorContext();
  const { bridge, estimateBridgeGas } = useBridgeContext();
  const { formData, setFormData } = useFormContext();
  const { openSnackbar } = useUIContext();
  const { connectedProvider } = useProvidersContext();
  const { getTokenPrice } = usePriceOracleContext();
  const { approve, getErc20TokenBalance, tokens } = useTokensContext();
  // const [tokenBalance, setTokenBalance] = useState<BigNumber>();
  const [bridgedTokenFiatPrice, setBridgedTokenFiatPrice] = useState<BigNumber>();
  const [etherTokenFiatPrice, setEtherTokenFiatPrice] = useState<BigNumber>();
  const [error, setError] = useState<string>();
 
  const currencySymbol = getCurrencySymbol(getCurrency());



  const { onApprove, tokenSpendPermission, approvalTask ,tokenBalance} = useApprove({
    formData,
    // setError,
  })
  const { maxAmountConsideringFee, estimatedGas } = useInputMaxAmount({
    formData:formData,
    tokenBalance:tokenBalance,
    tokenSpendPermission,
  })
  const { onBridge, isBridgeInProgress } = useBridge({
    formData:formData,
    estimatedGas,
    tokenSpendPermission,
    maxAmountConsideringFee,
  })
  const { tokenAmountString, feeString, feeErrorString } = useFee({
      formData:formData,
      estimatedGas,
      env,
      maxAmountConsideringFee,
    })

  if (
    !env ||
    !formData ||
    !tokenBalance ||
    !isAsyncTaskDataAvailable(estimatedGas) ||
    !maxAmountConsideringFee ||
    !tokenSpendPermission
  ) {
    return <PageLoader />;
  }

  const { from, to, token } = formData;
  // const etherToken = getEtherToken(from);

  // const fiatAmount =
  //   bridgedTokenFiatPrice &&
  //   multiplyAmounts(
  //     {
  //       precision: FIAT_DISPLAY_PRECISION,
  //       value: bridgedTokenFiatPrice,
  //     },
  //     {
  //       precision: token.decimals,
  //       value: maxAmountConsideringFee,
  //     },
  //     FIAT_DISPLAY_PRECISION
  //   );

  // const fee = calculateMaxTxFee(estimatedGas.data);
  // const fiatFee =
  //   env.fiatExchangeRates.areEnabled &&
  //   etherTokenFiatPrice &&
  //   multiplyAmounts(
  //     {
  //       precision: FIAT_DISPLAY_PRECISION,
  //       value: etherTokenFiatPrice,
  //     },
  //     {
  //       precision: etherToken.decimals,
  //       value: fee,
  //     },
  //     FIAT_DISPLAY_PRECISION
  //   );

  // const tokenAmountString = `${
  //   maxAmountConsideringFee.gt(0) ? formatTokenAmount(maxAmountConsideringFee, token) : "0"
  // } ${token.symbol}`;

  // const fiatAmountString = env.fiatExchangeRates.areEnabled
  //   ? `${currencySymbol}${fiatAmount ? formatFiatAmount(fiatAmount) : "--"}`
  //   : undefined;

  // const absMaxPossibleAmountConsideringFee = formatTokenAmount(
  //   maxAmountConsideringFee.abs(),
  //   etherToken
  // );

  // const feeBaseErrorString = "You don't have enough ETH to cover the transaction fee";
  // const feeErrorString = maxAmountConsideringFee.isNegative()
  //   ? `${feeBaseErrorString}\nYou need at least ${absMaxPossibleAmountConsideringFee} extra ETH`
  //   : maxAmountConsideringFee.eq(0)
  //   ? `${feeBaseErrorString}\nThe maximum transferable amount is 0 after considering the fee`
  //   : undefined;

  // const etherFeeString = `${formatTokenAmount(fee, etherToken)} ${etherToken.symbol}`;
  // const fiatFeeString = fiatFee ? `${currencySymbol}${formatFiatAmount(fiatFee)}` : undefined;
  // const feeString = fiatFeeString ? `${etherFeeString} ~ ${fiatFeeString}` : etherFeeString;

  return (
    <div className={classes.contentWrapper}>
      <Header backTo={{ routeKey: "home" }} title="Confirm Bridge" />
      <Card className={classes.card}>
        <Icon className={classes.tokenIcon} isRounded size={46} url={token.logoURI} />
        <Typography type="h1">{tokenAmountString}</Typography>
        {/* {fiatAmountString && (
          <Typography className={classes.fiat} type="body2">
            {fiatAmountString}
          </Typography>
        )} */}
        <div className={classes.chainsRow}>
          <div className={classes.chainBox}>
            <from.Icon className={classes.icons}/>
            <Typography className={classes.chainName} type="body1">
              {from.name}
            </Typography>
          </div>
          <ArrowRightIcon className={classes.arrowIcon} />
          <div className={classes.chainBox}>
            <to.Icon className={classes.icons}/>
            <Typography className={classes.chainName} type="body1">
              {to.name}
            </Typography>
          </div>
        </div>
        <div className={classes.feeBlock}>
          <Typography type="body2">Estimated gas fee</Typography>
          <div className={classes.fee}>
            <Icon isRounded size={20} url={token.chainId === EthereumChainId.EAGLE?TSM_TOKEN_LOGO_URI:ETH_TOKEN_LOGO_URI} />
            <Typography type="body1">{feeString}</Typography>
          </div>
        </div>
      </Card>
      <div className={classes.button}>
        <BridgeButton
          approvalTask={approvalTask}
          isDisabled={maxAmountConsideringFee.lte(0) || isBridgeInProgress}
          isTxApprovalRequired={tokenSpendPermission.type === "approval"}
          onApprove={onApprove}
          onBridge={onBridge}
          token={token}
        />
        {tokenSpendPermission.type === "approval" && <ApprovalInfo />}
        {error && <ErrorMessage error={error} />}
      </div>
      {feeErrorString && <ErrorMessage className={classes.error} error={feeErrorString} />}
    </div>
  );
};
