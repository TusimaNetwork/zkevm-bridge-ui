import { BigNumber } from "ethers";
import { useState } from "react";
import { getCurrency } from "src/adapters/storage";
import { FIAT_DISPLAY_PRECISION, getEtherToken } from "src/constants";
import { AsyncTask, Gas, FormData, Env } from "src/domain";
import { formatFiatAmount, formatTokenAmount, multiplyAmounts } from "src/utils/amounts";
import { calculateMaxTxFee } from "src/utils/fees";
import { getCurrencySymbol } from "src/utils/labels";
export const useFee = ({
  formData,
  estimatedGas,
  env,
  maxAmountConsideringFee,
}: {
  formData?: FormData
  estimatedGas: AsyncTask<Gas, string>
  env?: Env;
  maxAmountConsideringFee?: BigNumber
}) => {
  const [bridgedTokenFiatPrice, setBridgedTokenFiatPrice] = useState<BigNumber>()
  const [etherTokenFiatPrice, setEtherTokenFiatPrice] = useState<BigNumber>()
  const currencySymbol = getCurrencySymbol(getCurrency())
  if (!maxAmountConsideringFee || !env || estimatedGas?.status !== "successful" || !formData) {
    return {}
  }
  
  const { from, to, token } = formData
  const etherToken = getEtherToken(from)

  const fiatAmount =
    bridgedTokenFiatPrice &&
    multiplyAmounts(
      {
        precision: FIAT_DISPLAY_PRECISION,
        value: bridgedTokenFiatPrice,
      },
      {
        precision: token.decimals,
        value: maxAmountConsideringFee,
      },
      FIAT_DISPLAY_PRECISION
    )

  const fee = calculateMaxTxFee(estimatedGas.data)
  const fiatFee = env.fiatExchangeRates.areEnabled && etherTokenFiatPrice && multiplyAmounts(
      {
        precision: FIAT_DISPLAY_PRECISION,
        value: etherTokenFiatPrice
      },
      {
        precision: etherToken.decimals,
        value: fee
      },
      FIAT_DISPLAY_PRECISION
    )
  const tokenAmountString = `${ maxAmountConsideringFee.gt(0) ? formatTokenAmount(maxAmountConsideringFee, token) : "0" } ${token.symbol}`
  
  const fiatAmountString = env.fiatExchangeRates.areEnabled ? `${currencySymbol}${fiatAmount ? formatFiatAmount(fiatAmount) : "--"}` : undefined

  const absMaxPossibleAmountConsideringFee = formatTokenAmount(
    maxAmountConsideringFee.abs(),
    etherToken
  )

  const feeBaseErrorString = "You don't have enough ETH to cover the transaction fee"
  const feeErrorString = maxAmountConsideringFee.isNegative()
    ? `${feeBaseErrorString}\nYou need at least ${absMaxPossibleAmountConsideringFee} extra ETH`
    : maxAmountConsideringFee.eq(0)
    ? `${feeBaseErrorString}\nThe maximum transferable amount is 0 after considering the fee`
    : undefined

  const etherFeeString = `${formatTokenAmount(fee, etherToken)} ${etherToken.symbol}`
  const fiatFeeString = fiatFee ? `${currencySymbol}${formatFiatAmount(fiatFee)}` : undefined
  const feeString = fiatFeeString ? `${etherFeeString} ~ ${fiatFeeString}` : etherFeeString

  // useEffect(() => {
  //   if (formData) {
  //     const { from, token } = formData;
  //     const etherToken = getEtherToken(from);

  //     // Get the fiat price of Ether
  //     getTokenPrice({ chain: from, token: etherToken })
  //       .then((etherPrice) => {
  //         callIfMounted(() => {
  //           setEtherTokenFiatPrice(etherPrice);
  //           if (isTokenEther(token)) {
  //             setBridgedTokenFiatPrice(etherPrice);
  //           }
  //         });
  //       })
  //       .catch(() =>
  //         callIfMounted(() => {
  //           setEtherTokenFiatPrice(undefined);
  //           if (isTokenEther(token)) {
  //             setBridgedTokenFiatPrice(undefined);
  //           }
  //         })
  //       );

  //     // Get the fiat price of the bridged token when it's not Ether
  //     if (!isTokenEther(token)) {
  //       getTokenPrice({ chain: from, token })
  //         .then((tokenPrice) => {
  //           callIfMounted(() => {
  //             setBridgedTokenFiatPrice(tokenPrice);
  //           });
  //         })
  //         .catch(() =>
  //           callIfMounted(() => {
  //             setBridgedTokenFiatPrice(undefined);
  //           })
  //         );
  //     }
  //   }
  // }, [formData, estimatedGas, getTokenPrice, callIfMounted]);

  return {
    token,
    tokenAmountString,
    fiatAmountString,
    from,
    to,
    feeString,
    feeErrorString,
  };
};
