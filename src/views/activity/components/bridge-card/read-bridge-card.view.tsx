import { BigNumber } from "ethers";
import { FC, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrency } from "src/adapters/storage";
import { ReactComponent as BridgeL1Icon } from "src/assets/icons/l1-bridge.svg";
import { ReactComponent as BridgeL2Icon } from "src/assets/icons/l2-bridge.svg";
import { useBridgeContext } from "src/contexts/bridge.context";
import { useUIContext } from "src/contexts/ui.context";
import { AsyncTask, Bridge, ChainKey, DepositResult, Env, PendingBridge } from "src/domain";
import { useBatchNumberOfL2Block } from "src/hooks/use-batch-number-of-l2-block";
import { useReadDeposit } from "src/hooks/use-read-deposit";
import { routes } from "src/routes";
import { formatFiatAmount, formatTokenAmount } from "src/utils/amounts";
import { getBridgeStatus, getCurrencySymbol } from "src/utils/labels";
import { isAsyncTaskDataAvailable } from "src/utils/types";
import { useBridgeCardStyles } from "src/views/activity/components/bridge-card/bridge-card.styles";
import { Card } from "src/views/shared/card/card.view";
import { Icon } from "src/views/shared/icon/icon.view";
import { Typography } from "src/views/shared/typography/typography.view";
import { LoadingBridgeCard } from "./load-bridge-card.view";

export interface BridgeCardItmProps {
  bridge: Bridge;
  env: Env;
  isFinaliseDisabled: boolean;
  lastVerifiedBatch: AsyncTask<BigNumber, string>;
  // networkError: boolean;
  onClaim?: () => void;
  showFiatAmount: boolean;
}
interface BridgeCardProps {
  apiDeposit: DepositResult;
  lastVerifiedBatch: AsyncTask<BigNumber, string>;
  env: Env;
}
export const ReadBridgeCard: React.FC<BridgeCardProps> = ({ apiDeposit, env, lastVerifiedBatch }) => {
  const [areBridgesDisabled, setAreBridgesDisabled] = useState<boolean>(false)
  // const [lastVerifiedBatch, setLastVerifiedBatch] = useState<AsyncTask<BigNumber, string>>({
  //   status: "pending",
  // })
  //"0x870c85885c880425a4b0a2af4403e6ea2ce6a04fcaf81dadea1dde6b54f39541"
  // const [wrongNetworkBridges, setWrongNetworkBridges] = useState<string[]>([])
  const bridge = useReadDeposit({ env, apiDeposit })
  // const bridge = undefined
  const { claim } = useBridgeContext()
  const { openSnackbar } = useUIContext()
  // const callIfMounted = useCallIfMounted()
  // const { notifyError } = useErrorContext()
  const onClaim = async (bridge: Bridge) => {
    if (bridge.status === "on-hold") {
      setAreBridgesDisabled(true)
      try {
        const res = await claim({bridge})
        console.log('hash:',res.hash)
        openSnackbar({
          text: "Transaction successfully submitted.",
          type: "success-msg",
        })
        // await res.wait()
      } catch (e) {
        // console.log(e)
        setAreBridgesDisabled(false)
      }
    }
  }


  return bridge ? <CardItem bridge={bridge}
    env={env}
    isFinaliseDisabled={areBridgesDisabled}
    lastVerifiedBatch={lastVerifiedBatch}
    // networkError={bridge.status === "pending" ? false:wrongNetworkBridges.includes(bridge.id)}
    onClaim={() => onClaim(bridge)}
    showFiatAmount={env !== undefined && env.fiatExchangeRates.areEnabled}
  /> : <LoadingBridgeCard apiDeposit={apiDeposit} />
};

const CardItem: FC<BridgeCardItmProps> = ({
  bridge,
  env,
  isFinaliseDisabled,
  lastVerifiedBatch,
  // networkError,
  onClaim,
  showFiatAmount,
}) => {
  const { amount, fiatAmount, from, status, to, token, origtoken } = bridge
  const classes = useBridgeCardStyles()
  const navigate = useNavigate()

  const [blockNumber, fromKey] = bridge.status !== "pending" ? [bridge.blockNumber, bridge.from.key] : [undefined, undefined]

  const batchNumberOfL2Block = useBatchNumberOfL2Block({ blockNumber, env, fromKey, status })

  const onClaimButtonClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.stopPropagation()
    if (onClaim) {
      onClaim()
    }
  };

  const onCardClick = (bridge: Exclude<Bridge, PendingBridge>) => {
    //给这个参数禁用了。下面使用了link标签跳转
    // return
    navigate(`${routes.bridgeDetails.path.split(":")[0]}${bridge.id}`)
  }

  const preferredCurrencySymbol = getCurrencySymbol(getCurrency())

  const tokenAmountString = `${formatTokenAmount(amount, token)} ${origtoken.symbol}`

  const fiatAmountString = showFiatAmount ? `${preferredCurrencySymbol}${fiatAmount ? formatFiatAmount(fiatAmount) : "--"}` : undefined

  const remainingBatchesMsg: string = useMemo(()=>{
    if ( isAsyncTaskDataAvailable(lastVerifiedBatch) && isAsyncTaskDataAvailable(batchNumberOfL2Block) ) {
      return `Waiting for validity proof. Tx will be confirmed in ${Math.max( batchNumberOfL2Block.data.sub(lastVerifiedBatch.data).toNumber(), 0 )} batches`
    } else if (lastVerifiedBatch.status === "failed" || batchNumberOfL2Block.status === "failed") {
      return "Waiting for validity proof. This may take between 15 min and 1 hour"
    } else {
      return "Waiting for validity proof"
    }
  },[batchNumberOfL2Block,lastVerifiedBatch]) 

  const BridgeAmount = (
    <div className={classes.token}>
      <Icon className={classes.tokenIcon} isRounded size={20} url={origtoken.logoURI} />
      <Typography type="body1">{tokenAmountString}</Typography>
    </div>
  );

  const BridgeIcon = to.key === ChainKey.ethereum ? <BridgeL1Icon /> : <BridgeL2Icon />

  const BridgeLabel = (
    <Typography className={classes.label} type="body1">
      {to.key === ChainKey.ethereum ? "Bridge to L1" : "Bridge to L2"}
    </Typography>
  );

  const BridgeStatus = (
    <span
      className={`${classes.statusBox} ${status === "completed" ? classes.greenStatus : classes.pendingStatus
        }`}
    >
      {getBridgeStatus(status, from)}
    </span>
  );

  const FiatAmount = (
    <Typography className={classes.fiat} type="body1">
      {fiatAmountString}
    </Typography>
  );

  switch (bridge.status) {
    case "pending": {
      return (
        <Card className={classes.card}>
          <div className={classes.top}>
            <div className={classes.infoContainer}>
              <div className={classes.circle}>{BridgeIcon}</div>
              <div className={classes.info}>
                <div className={classes.row}>
                  {BridgeLabel}
                  {fiatAmountString && BridgeAmount}
                </div>
                <div className={classes.row}>
                  {BridgeStatus}
                  {fiatAmountString && FiatAmount}
                </div>
              </div>
              {!fiatAmountString && <div className={classes.amount}>{BridgeAmount}</div>}
            </div>
          </div>
        </Card>
      );
    }
    case "initiated": {
      if (bridge.from.key === ChainKey.ethereum) {
        return (
          <Card className={classes.card} onClick={() => onCardClick(bridge)}>
            {/* <Link to={`${routes.bridgeDetails.path.split(":")[0]}${bridge.id}`}> */}
            <div className={classes.top}>
              <div className={classes.infoContainer}>
                <div className={classes.circle}>{BridgeIcon}</div>
                <div className={classes.info}>
                  <div className={classes.row}>
                    {BridgeLabel}
                    {fiatAmountString && BridgeAmount}
                  </div>
                  <div className={classes.row}>
                    {BridgeStatus}
                    {fiatAmountString && FiatAmount}
                  </div>
                </div>
                {!fiatAmountString && <div className={classes.amount}>{BridgeAmount}</div>}
              </div>
            </div>
            {/* </Link> */}
          </Card>
        );
      } else {
        return (
          <Card className={classes.card} onClick={() => onCardClick(bridge)}>
            {/* <Link to={`${routes.bridgeDetails.path.split(":")[0]}${bridge.id}`}> */}
            <div className={classes.top}>
              <div className={classes.row}>
                <p className={classes.steps}>STEP 1/2</p>
              </div>
              <div className={classes.infoContainer}>
                <div className={classes.circle}>{BridgeIcon}</div>
                <div className={classes.info}>
                  <div className={classes.row}>
                    {BridgeLabel}
                    {fiatAmountString && BridgeAmount}
                  </div>
                  <div className={classes.row}>
                    {BridgeStatus}
                    {fiatAmountString && FiatAmount}
                  </div>
                </div>
                {!fiatAmountString && <div className={classes.amount}>{BridgeAmount}</div>}
              </div>
            </div>
            <div className={classes.bottom}>
              <Typography type="body2">{remainingBatchesMsg}</Typography>
              <button className={classes.finaliseButton} disabled>
                Claim
              </button>
            </div>
            {/* </Link> */}
          </Card>
        );
      }
    }
    case "on-hold": {
      if (bridge.from.key === ChainKey.ethereum) {
        return (
          <Card className={classes.card} onClick={() => onCardClick(bridge)}>
            {/* <Link to={`${routes.bridgeDetails.path.split(":")[0]}${bridge.id}`}> */}
            <div className={classes.top}>
              <div className={classes.infoContainer}>
                <div className={classes.circle}>{BridgeIcon}</div>
                <div className={classes.info}>
                  <div className={classes.row}>
                    {BridgeLabel}
                    {fiatAmountString && BridgeAmount}
                  </div>
                  <div className={classes.row}>
                    {BridgeStatus}
                    {fiatAmountString && FiatAmount}
                  </div>
                </div>
                {!fiatAmountString && <div className={classes.amount}>{BridgeAmount}</div>}
              </div>
            </div>
            {/* </Link> */}
          </Card>
        );
      } else {
        return (
          <Card className={classes.card} onClick={() => onCardClick(bridge)}>
            {/* <Link to={`${routes.bridgeDetails.path.split(":")[0]}${bridge.id}`}> */}
            <div className={classes.top}>
              <div className={classes.row}>
                <p className={classes.steps}>STEP 2/2</p>
              </div>
              <div className={classes.infoContainer}>
                <div className={classes.circle}>{BridgeIcon}</div>
                <div className={classes.info}>
                  <div className={classes.row}>
                    {BridgeLabel}
                    {fiatAmountString && BridgeAmount}
                  </div>
                  <div className={classes.row}>
                    {BridgeStatus}
                    {fiatAmountString && FiatAmount}
                  </div>
                </div>
                {!fiatAmountString && <div className={classes.amount}>{BridgeAmount}</div>}
              </div>
            </div>
            <div className={classes.bottom}>
              {/* {networkError ? (
                <ErrorMessage error={`Switch to ${to.name} to continue`} type="body2" />
              ) : ( */}
              <Typography type="body2">Signature required to finalise the bridge</Typography>
              {/* )} */}
              <button
                className={classes.finaliseButton}
                disabled={isFinaliseDisabled}
                onClick={onClaimButtonClick}
              >
                Claim
              </button>
            </div>
            {/* </Link> */}
          </Card>
        );
      }
    }
    case "completed": {
      return (
        <Card className={classes.card} onClick={() => onCardClick(bridge)}>
          {/* <Link to={`${routes.bridgeDetails.path.split(":")[0]}${bridge.id}`}> */}
          <div className={classes.top}>
            <div className={classes.infoContainer}>
              <div className={classes.circle}>{BridgeIcon}</div>
              <div className={classes.info}>
                <div className={classes.row}>
                  {BridgeLabel}
                  {fiatAmountString && BridgeAmount}
                </div>
                <div className={classes.row}>
                  {BridgeStatus}
                  {fiatAmountString && FiatAmount}
                </div>
              </div>
              {!fiatAmountString && <div className={classes.amount}>{BridgeAmount}</div>}
            </div>
          </div>
          {/* </Link> */}
        </Card>
      );
    }
  }
};
