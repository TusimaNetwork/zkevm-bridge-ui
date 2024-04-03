import { FC, useMemo, useState } from "react";
import {
  DEPOSIT_CHECK_WORD,
  ETH_TOKEN_LOGO_URI,
  POLYGON_PRIVACY_POLICY_URL,
  POLYGON_TERMS_AND_CONDITIONS_URL,
  POLYGON_ZKEVM_RISK_DISCLOSURES_URL,
  TSM_TOKEN_LOGO_URI,
} from "src/constants";
import { useEnvContext } from "src/contexts/env.context";
import { useFormContext } from "src/contexts/form.context";
import { ReactComponent as ArrowRightIcon } from "src/assets/icons/arrow-right.svg";
import { EthereumChainId, FormData } from "src/domain";
import { useApprove } from "src/hooks/use-approve";
import { useBridge } from "src/hooks/use-bridge";
import { useFee } from "src/hooks/use-fee";
import { useInputMaxAmount } from "src/hooks/use-input-max-amount";
import { isAsyncTaskDataAvailable } from "src/utils/types";
import { useBridgeConfirmationStyles } from "src/views/bridge-confirmation/bridge-confirmation.styles";
import { useDepositWarningModalStyles } from "src/views/home/components/deposit-warning-modal/deposit-warning-modal.styles";
import { TextMatchForm } from "src/views/home/components/text-match-form/text-match-form.view";
import { Card } from "src/views/shared/card/card.view";
import { ExternalLink } from "src/views/shared/external-link/external-link.view";
import { Header } from "src/views/shared/header/header.view";
import { Icon } from "src/views/shared/icon/icon.view";
import { PageLoader } from "src/views/shared/page-loader/page-loader.view";
import { Portal } from "src/views/shared/portal/portal.view";
import { Typography } from "src/views/shared/typography/typography.view";
import { BridgeButton } from "src/views/bridge-confirmation/components/bridge-button/bridge-button.view";
import { ApprovalInfo } from "src/views/bridge-confirmation/components/approval-info/approval-info.view";
import { ErrorMessage } from "src/views/shared/error-message/error-message.view";

interface DepositWarningModalProps {
  formData: FormData;
  onAccept: (formData: FormData, hideDepositWarning: boolean) => void;
  onCancel: () => void;
}

export const DepositWarningModal: FC<DepositWarningModalProps> = ({
  formData,
  onAccept,
  onCancel,
}) => {
  const classes2 = useDepositWarningModalStyles();
  const classes = useBridgeConfirmationStyles();
  const env = useEnvContext();
  // const { formData } = useFormContext();
  // const [tokenBalance, setTokenBalance] = useState<BigNumber>();
  const [error, setError] = useState<string>();

  const { onApprove, tokenSpendPermission, approvalTask ,tokenBalance} = useApprove({
    formData,
    setError,
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
    setError
  })
  const { tokenAmountString, feeString, feeErrorString } = useFee({
      formData:formData,
      estimatedGas,
      env,
      maxAmountConsideringFee,
    })

  
  // if (
  //   !env ||
  //   !formData ||
  //   !tokenBalance ||
  //   !isAsyncTaskDataAvailable(estimatedGas) ||
  //   !maxAmountConsideringFee ||
  //   !tokenSpendPermission
  // ) {
    // return <PageLoader />;
  // }

  const { from, to, token } = formData;
  const onCancelCard = (e?:MouseEvent) => {
   e?.stopPropagation()
  };
  return (
    <Portal>
      <div onClick={onCancel} className={classes2.background}>
        <Card onClick={onCancelCard} className={classes.card}>
        
      <Header backTo={{ routeKey: "home" }} title="Confirm Bridge" />
      {!env ||
      !formData ||
      !tokenBalance ||
      !isAsyncTaskDataAvailable(estimatedGas) ||
      !maxAmountConsideringFee ||
      !tokenSpendPermission?<div style={{height:466,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <PageLoader />
      </div>:
      <>
      <Card className={classes.card}>
        <Icon className={classes.tokenIcon} isRounded size={46} url={token.logoURI} />
        <Typography type="h1">{tokenAmountString}</Typography>
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
      </>}
        </Card>
      </div>
    </Portal>
  );
};
