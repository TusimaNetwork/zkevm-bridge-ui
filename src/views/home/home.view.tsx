import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getIsDepositWarningDismissed, setIsDepositWarningDismissed } from "src/adapters/storage";

import { ReactComponent as MetaMaskIcon } from "src/assets/icons/metamask.svg";
import { useEnvContext } from "src/contexts/env.context";
import { useFormContext } from "src/contexts/form.context";
import { useProvidersContext } from "src/contexts/providers.context";
import { ChainKey, FormData, ModalState } from "src/domain";
import { routes } from "src/routes";
import { getPartiallyHiddenEthereumAddress } from "src/utils/addresses";
import { BridgeForm } from "src/views/home/components/bridge-form/bridge-form.view";
import { DepositWarningModal } from "src/views/home/components/deposit-warning-modal/deposit-warning-modal.view";
import { Header } from "src/views/home/components/header/header.view";
import { useHomeStyles } from "src/views/home/home.styles";
import { NetworkBox } from "src/views/shared/network-box/network-box.view";
import { FaucetBox } from "src/views/shared/network-box/faucet-box.view";
import { Typography } from "src/views/shared/typography/typography.view";
import { Spinner } from "../shared/spinner/spinner.view";

export const Home = (): JSX.Element => {
  const classes = useHomeStyles()
  const navigate = useNavigate()
  const env = useEnvContext()
  const { formData, setFormData } = useFormContext()
  const { connectedProvider } = useProvidersContext()
  const [depositWarningModal, setDepositWarningModal] = useState<ModalState<FormData>>({
    status: "closed",
  })

  const onSubmitForm = (formData: FormData, hideDepositWarning?: boolean) => {
    if (hideDepositWarning) {
      setIsDepositWarningDismissed(hideDepositWarning)
    }
    setFormData(formData)
    navigate(routes.bridgeConfirmation.path)
  };

  const onCheckShowDepositWarningAndSubmitForm = (formData: FormData) => {
    // const isDepositWarningDismissed = getIsDepositWarningDismissed()

    // if ( env && env.isDepositWarningEnabled && !isDepositWarningDismissed && formData.from.key === ChainKey.ethereum ) {
    // if ( true) {
      setDepositWarningModal({
        data: formData,
        status: "open"
      })
    // } else {
    //   onSubmitForm(formData)
    // }
  }

  const onResetForm = () => {
    setFormData(undefined);
  }
  
//   return <div className={classes.contentWrapper}>
//   <Header />
//   <div className={classes.spinner}>
//   <Spinner />
//   </div>
// </div>
  return (
    <div className={classes.contentWrapper}>
      <Header />
      {connectedProvider.status === "successful" ? (
        <>
          {connectedProvider.data.account?<div className={classes.ethereumAddress}>
            <MetaMaskIcon className={classes.metaMaskIcon} />
            <Typography type="body1">
              {getPartiallyHiddenEthereumAddress(connectedProvider.data.account)}
            </Typography>
          </div>:<div className={classes.no_ethereumAddress}>
            </div>}
         
          <BridgeForm
            account={connectedProvider.data.account}
            formData={formData}
            onResetForm={onResetForm}
            onSubmit={onCheckShowDepositWarningAndSubmitForm}
          />
          {depositWarningModal.status === "open" && (
            <DepositWarningModal
              formData={depositWarningModal.data}
              onAccept={onSubmitForm}
              onCancel={() => setDepositWarningModal({ status: "closed" })}
            />
          )}
           <div className={classes.networkBoxWrapper}>
            <NetworkBox />
            <FaucetBox address={connectedProvider.data.account}/>
          </div>
        </>
      ):<div className={classes.spinner}>
        <Spinner />
      </div>}
    </div>
  )
}
