import { BigNumber } from "ethers";
import { ReactComponent as BridgeL1Icon } from "src/assets/icons/l1-bridge.svg";
import { ReactComponent as BridgeL2Icon } from "src/assets/icons/l2-bridge.svg";
import { AsyncTask, Bridge, ChainKey, DepositResult, Env } from "src/domain";
import { formatTokenAmount } from "src/utils/amounts";
import { getBridgeStatus } from "src/utils/labels";
import { useBridgeCardStyles } from "src/views/activity/components/bridge-card/bridge-card.styles";
import { Card } from "src/views/shared/card/card.view";
import { Icon } from "src/views/shared/icon/icon.view";
import { Typography } from "src/views/shared/typography/typography.view";
import { PendingTx } from "src/utils/serializers";
import ValueSkeleton from "src/components/ValueSkeleton";

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
  apiDeposit: PendingTx;
  status?:string
}
export const LoadBridgeCard: React.FC<BridgeCardProps> = ({ apiDeposit,status="Processing" }) => {
  const classes = useBridgeCardStyles()

  const { to, token, amount } = apiDeposit
  const tokenAmountString = `${formatTokenAmount(amount, token)} ${token.symbol}`

  const BridgeAmount = (
    <div className={classes.token}>
      <Icon className={classes.tokenIcon} isRounded size={20} url={token.logoURI} />
      <Typography type="body1">{tokenAmountString}</Typography>
    </div>
  )

  const BridgeLabel = (
    <Typography className={classes.label} type="body1">
      {to.key === ChainKey.ethereum ? "Bridge to L1" : "Bridge to L2"}
    </Typography>
  )
  const BridgeIcon = to.key === ChainKey.ethereum ? <BridgeL1Icon /> : <BridgeL2Icon />

  const BridgeStatus = (
    <span className={`${classes.statusBox} ${classes.pendingStatus}`}>
     {status} 
    </span>
  )

  return (
    <Card className={classes.card}>
      <div className={classes.top}>
        <div className={classes.infoContainer}>
          <div className={classes.circle}>{BridgeIcon}</div>
          <div className={classes.info}>
            <div className={classes.row}>
              {BridgeLabel}
            </div>
            <div className={classes.row}>{BridgeStatus}</div>
          </div>
          {<div className={classes.amount}>{BridgeAmount}</div>}
        </div>
      </div>
    </Card>
  )
}

export const LoadingBridgeCard: React.FC<{apiDeposit:DepositResult}> = ({ apiDeposit }) => {
  const classes = useBridgeCardStyles()

  const { to,  amount } = apiDeposit
  // const tokenAmountString = `${formatTokenAmount(amount, token)} ${token.symbol}`

  const BridgeAmount = (
    <div className={classes.token}>
      {/* <Icon className={classes.tokenIcon} isRounded size={20} url={token.logoURI} />
      <Typography type="body1">{tokenAmountString}</Typography> */}
      <ValueSkeleton width={50}/>
    </div>
  )

  const BridgeLabel = (
    <Typography className={classes.label} type="body1">
      {to.key === ChainKey.ethereum ? "Bridge to L1" : "Bridge to L2"}
    </Typography>
  )
  const BridgeIcon = to.key === ChainKey.ethereum ? <BridgeL1Icon /> : <BridgeL2Icon />

  const BridgeStatus = (
    <ValueSkeleton width={50}/>
    // <span className={`${classes.statusBox} ${classes.pendingStatus}`}>
    // </span>
  )

  
  return (
    <Card className={classes.card}>
      <div className={classes.top}>
        <div className={classes.infoContainer}>
          <div className={classes.circle}>{BridgeIcon}</div>
          <div className={classes.info}>
            <div className={classes.row}>
              {BridgeLabel}
            </div>
            <div className={classes.row}>{BridgeStatus}</div>
          </div>
          {<div className={classes.amount}>{BridgeAmount}</div>}
        </div>
      </div>
    </Card>
  )
}