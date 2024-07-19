import { FC, useState } from "react";

import { ReactComponent as ArrowRightIcon } from "src/assets/icons/arrow-right.svg";
import { ETH_TOKEN_LOGO_URI, TSM_TOKEN_LOGO_URI } from "src/constants";
import { useEnvContext } from "src/contexts/env.context";
import { useFormContext } from "src/contexts/form.context";
import { EthereumChainId } from "src/domain";
import { useApprove } from "src/hooks/use-approve";
import { useBridge } from "src/hooks/use-bridge";
import { useFee } from "src/hooks/use-fee";
import { useInputMaxAmount } from "src/hooks/use-input-max-amount";
import { isAsyncTaskDataAvailable } from "src/utils/types";
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
  const classes = useBridgeConfirmationStyles();
  const env = useEnvContext();
  const { formData } = useFormContext();
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

  const { token } = formData;
  
  return (
        <BridgeButton
          approvalTask={approvalTask}
          isDisabled={maxAmountConsideringFee.lte(0) || isBridgeInProgress}
          isTxApprovalRequired={tokenSpendPermission.type === "approval"}
          onApprove={onApprove}
          onBridge={onBridge}
          token={token}
        />
  );
};
