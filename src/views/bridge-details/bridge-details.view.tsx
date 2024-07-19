import { BigNumber } from "ethers";
import { FC, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { parseError } from "src/adapters/error";
import { getTxFeePaid } from "src/adapters/ethereum";
import { getCurrency } from "src/adapters/storage";
import { ReactComponent as NewWindowIcon } from "src/assets/icons/new-window.svg";
import { getEtherToken } from "src/constants";
import { useBridgeContext } from "src/contexts/bridge.context";
import { useEnvContext } from "src/contexts/env.context";
import { useErrorContext } from "src/contexts/error.context";
import { Bridge, ChainKey, Env } from "src/domain";
import { useCallIfMounted } from "src/hooks/use-call-if-mounted";
import { useReadDeposit } from "src/hooks/use-read-deposit";
import { formatFiatAmount, formatTokenAmount } from "src/utils/amounts";
import { getBridgeStatus, getCurrencySymbol } from "src/utils/labels";
import { isMetaMaskUserRejectedRequestError } from "src/utils/types";
import { useBridgeDetailsStyles } from "src/views/bridge-details/bridge-details.styles";
import { Chain } from "src/views/bridge-details/components/chain/chain";
import { Button } from "src/views/shared/button/button.view";
import { Card } from "src/views/shared/card/card.view";
import { ErrorMessage } from "src/views/shared/error-message/error-message.view";
import { Header } from "src/views/shared/header/header.view";
import { Icon } from "src/views/shared/icon/icon.view";
import { PageLoader } from "src/views/shared/page-loader/page-loader.view";
import { Typography } from "src/views/shared/typography/typography.view";
import useSWR from "swr";

interface Fees {
  step1?: BigNumber;
  step2?: BigNumber;
}

const calculateFees = (bridge: Bridge): Promise<Fees> => {

  const step1Promise = getTxFeePaid({ chain: bridge.from, txHash: bridge.depositTxHash });

  const step2Promise = bridge.status === "completed" ? getTxFeePaid({ chain: bridge.to, txHash: bridge.claimTxHash }) : Promise.resolve(undefined);

  return Promise.all([step1Promise, step2Promise]).then(([step1, step2]) => ({
    step1,
    step2,
  }));
};

export const BridgeDetails: FC = () => {
  const { bridgeId } = useParams();
  const env = useEnvContext();

  const classes = useBridgeDetailsStyles();

  const bridge = useReadDeposit({ env, bridgeId });

  if(!bridge || !env){
    return  <div className={classes.contentWrapper}>
      <Header backTo={{ routeKey: "activity" }} title="Bridge Details" />
      <div style={{height:300}}/>
      <PageLoader />
      </div>
  }
  return <DetailItem bridge={bridge} env={env}/>
 
}


const DetailItem: React.FC<{
  bridge: Bridge;
  env: Env
}> = ({ bridge, env }) => {
  // const [ethFees, setEthFees] = useState<Fees>({});
  const [fiatFees, setFiatFees] = useState<Fees>({});
  const [fiatAmount, setFiatAmount] = useState<BigNumber>();
  const [isFinaliseButtonDisabled, setIsFinaliseButtonDisabled] = useState<boolean>(false);
  const currencySymbol = getCurrencySymbol(getCurrency());
  const classes = useBridgeDetailsStyles();
  const { claim } = useBridgeContext();
  const navigate = useNavigate();
  const callIfMounted = useCallIfMounted();
  const [incorrectNetworkMessage, setIncorrectNetworkMessage] = useState<string>();
  const { notifyError } = useErrorContext();

  const { data: ethFees } = useSWR(bridge, calculateFees)
  const { amount, from, status, to, token, origtoken } = bridge

  const bridgeTxUrl = `${from.explorerUrl}/tx/${bridge.depositTxHash}`;
  const claimTxUrl = bridge.status === "completed" ? `${to.explorerUrl}/tx/${bridge.claimTxHash}` : undefined;

  const { step1: step1EthFee, step2: step2EthFee } = ethFees || {};
  const { step1: step1FiatFee, step2: step2FiatFee } = fiatFees;

  const fromEthToken = getEtherToken(from);
  const toEthToken = getEtherToken(to);

  const tokenAmountString = `${formatTokenAmount(amount, token)} ${origtoken.symbol}`;

  const fiatAmountString = env.fiatExchangeRates.areEnabled ? `${currencySymbol}${fiatAmount ? formatFiatAmount(fiatAmount) : "--"}` : undefined;

  const step1FeeString = `${step1EthFee ? formatTokenAmount(step1EthFee, fromEthToken) : "--"} ${fromEthToken.symbol}`;
  const step1FiatFeeString = env.fiatExchangeRates.areEnabled ? `${currencySymbol}${step1FiatFee ? formatFiatAmount(step1FiatFee) : "--"}` : undefined;

  const step2FeeString = `${step2EthFee ? formatTokenAmount(step2EthFee, toEthToken) : "--"} ${toEthToken.symbol}`;
  const step2FiatFeeString = env.fiatExchangeRates.areEnabled ? `${currencySymbol}${step2FiatFee ? formatFiatAmount(step2FiatFee) : "--"}` : undefined;

  const dotClass = bridge.status === "completed" ? classes.dotCompleted : bridge.status === "on-hold" ? classes.dotOnHold : classes.dotProcessing
  const onClaim = () => {
    if (bridge.status === "on-hold") {
      setIsFinaliseButtonDisabled(true)
      claim({ bridge: bridge }).catch((error) => {
          callIfMounted(() => {
            setIsFinaliseButtonDisabled(false);
            if (isMetaMaskUserRejectedRequestError(error) === false) {
              void parseError(error).then((parsed) => {
                if (parsed === "wrong-network") {
                  setIncorrectNetworkMessage(`Switch to ${bridge.to.name} to continue`);
                } else {
                  notifyError(error);
                }
              })
            }
          })
        })
    }
  }

  console.log({bridge})
  return (
    <div className={classes.contentWrapper}>
      <Header backTo={{ routeKey: "activity" }} title="Bridge Details" />
      <Card className={classes.card}>
        <div className={classes.balance}>
          <Icon className={classes.tokenIcon} isRounded size={48} url={origtoken.logoURI} />
          <Typography type="h1">{tokenAmountString}</Typography>
          <Typography className={classes.fiat} type="h2">
            {fiatAmountString}
          </Typography>
        </div>
        <div className={classes.row}>
          <Typography className={classes.alignRow} type="body2">
            Status
          </Typography>
          <Typography className={classes.alignRow} type="body1">
            <span className={dotClass} />
            {getBridgeStatus(status, from)}
          </Typography>
        </div>
        <div className={classes.row}>
          <Typography className={classes.alignRow} type="body2">
            From
          </Typography>
          <Chain chain={from} className={classes.alignRow} />
        </div>
        <div className={classes.row}>
          <Typography className={classes.alignRow} type="body2">
            To
          </Typography>
          <Chain chain={to} className={classes.alignRow} />
        </div>
        <div className={classes.row}>
          <Typography className={classes.alignRow} type="body2">
            Step 1 Fee ({bridge.from.name})
          </Typography>
          <Typography className={classes.alignRow} type="body1">
            {step1FeeString}
            {step1FiatFeeString ? ` ~ ${step1FiatFeeString}` : ""}
          </Typography>
        </div>
        {bridge.status === "completed" && (
          <div className={classes.row}>
            <Typography className={classes.alignRow} type="body2">
              Step 2 Fee ({bridge.to.name})
            </Typography>
            <Typography className={classes.alignRow} type="body1">
              {step2FeeString}
              {step2FiatFeeString ? ` ~ ${step2FiatFeeString}` : ""}
            </Typography>
          </div>
        )}
        <div className={classes.row}>
          <Typography className={classes.alignRow} type="body2">
            Track step 1 transaction
          </Typography>
          <a
            className={classes.explorerButton}
            href={bridgeTxUrl}
            rel="noreferrer"
            target="_blank"
          >
            <NewWindowIcon /> <Typography type="body1">View on explorer</Typography>
          </a>
        </div>
        {claimTxUrl && (
          <div className={`${classes.row} ${classes.lastRow}`}>
            <Typography className={classes.alignRow} type="body2">
              Track step 2 transaction
            </Typography>
            <a
              className={classes.explorerButton}
              href={claimTxUrl}
              rel="noreferrer"
              target="_blank"
            >
              <NewWindowIcon /> <Typography type="body1">View on explorer</Typography>
            </a>
          </div>
        )}
      </Card>
      {(status === "initiated" || (status === "on-hold" && from.key === ChainKey.polygonzkevm)) && (
        <div className={classes.finaliseRow}>
          <Button disabled={status === "initiated" || isFinaliseButtonDisabled} onClick={onClaim} >
            Claim
          </Button>
          {incorrectNetworkMessage && <ErrorMessage error={incorrectNetworkMessage} />}
        </div>
      )}
    </div>
  );
}