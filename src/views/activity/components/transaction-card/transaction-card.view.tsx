import { FC } from "react";

import useTransactionCardStyles from "src/views/activity/components/transaction-card/transaction-card.styles";
import { ReactComponent as TransferL1Icon } from "src/assets/icons/l1-transfer.svg";
import { ReactComponent as TransferL2Icon } from "src/assets/icons/l2-transfer.svg";
import { ReactComponent as ReloadIcon } from "src/assets/icons/spinner.svg";
import Typography from "src/views/shared/typography/typography.view";
import Card from "src/views/shared/card/card.view";
import { useNavigate } from "react-router-dom";
import routes from "src/routes";
import Icon from "src/views/shared/icon/icon.view";
import { Transaction, getTransactionStatusText } from "src/domain";
import { useEnvContext } from "src/contexts/env.context";
import { useBridgeContext } from "src/contexts/bridge.context";
import { formatEther } from "ethers/lib/utils";

export interface TransactionCardProps {
  transaction: Transaction;
}

const layerIcons = [TransferL1Icon, TransferL2Icon];

const TransactionCard: FC<TransactionCardProps> = ({ transaction }) => {
  const { status, destinationNetwork, depositCount, amount } = transaction;
  const classes = useTransactionCardStyles();
  const navigate = useNavigate();
  const env = useEnvContext();
  const { claim } = useBridgeContext();
  const LayerIcon = status !== "completed" ? ReloadIcon : layerIcons[destinationNetwork];
  const actionText = destinationNetwork === 0 ? "Transfer to L1" : "Transfer to L2";
  const id = `${destinationNetwork}-${depositCount}`;

  // ToDo: parse the error
  const onClaim = () => {
    if (transaction.status === "on-hold") {
      const {
        tokenAddress,
        destinationAddress,
        merkleProof,
        exitRootNumber,
        mainExitRoot,
        rollupExitRoot,
      } = transaction;
      const originNetwork = destinationNetwork === 0 ? 1 : 0;

      void claim(
        tokenAddress,
        amount,
        originNetwork.toString(),
        destinationNetwork,
        destinationAddress,
        merkleProof,
        exitRootNumber,
        mainExitRoot,
        rollupExitRoot
      );
    }
  };

  return (
    <Card
      className={classes.card}
      onClick={() => navigate(`${routes.transactionDetails.path.split(":")[0]}${id}`)}
    >
      {status === "initiated" && <p className={classes.steps}>STEP 1/2</p>}
      {status === "on-hold" && <p className={classes.steps}>STEP 2/2</p>}
      <div className={classes.row}>
        <div className={classes.actionCircle}>
          <LayerIcon />
        </div>
        <div className={classes.actionColumn}>
          <Typography type="body1">{actionText}</Typography>
          <span
            className={`${classes.statusBox} ${status === "completed" ? classes.greenStatus : ""}`}
          >
            {getTransactionStatusText(status)}
          </span>
        </div>
        <div className={classes.tokenColumn}>
          <div className={classes.token}>
            {env && <Icon url={env.tokens.ETH.logoURI} className={classes.tokenIcon} size={20} />}
            <Typography type="body1">{formatEther(amount)} ETH</Typography>
          </div>
        </div>
      </div>
      {status === "initiated" && (
        <div className={classes.bottom}>
          <Typography type="body2">Step 2 will require signature.</Typography>
          <button disabled className={classes.finaliseButton}>
            Finalise
          </button>
        </div>
      )}
      {status === "on-hold" && (
        <div className={classes.bottom}>
          <Typography type="body2">Sign required to finalise transaction.</Typography>
          <button onClick={onClaim} className={classes.finaliseButton}>
            Finalise
          </button>
        </div>
      )}
    </Card>
  );
};

export default TransactionCard;
